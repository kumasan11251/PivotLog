/**
 * WeeklyInsightContext
 * 週次インサイトの生成をバックグラウンドで管理するContext
 * 画面遷移しても生成が継続される
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { loadUserSettings } from '../utils/storage';
import { calculateCurrentAge, calculateTimeLeft } from '../utils/timeCalculations';
import {
  getDiariesByDateRangeFromFirestore,
  getWeeklyInsightFromFirestore,
  saveWeeklyInsightToFirestore,
} from '../services/firebase/firestore';
import {
  generateWeeklyInsightV2ViaCloudFunctions,
  GenerateWeeklyInsightRequest,
} from '../services/firebase/functions';
import type { WeeklyInsightData, WeeklyInsightDataV2 } from '../types/weeklyInsight';
import {
  getWeekInfoFromKey,
  MIN_ENTRIES_FOR_INSIGHT,
} from '../utils/weekUtils';

/** 生成タスクの状態 */
export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

/** 生成タスク情報 */
interface GenerationTask {
  status: GenerationStatus;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

/** V1またはV2のインサイトデータ */
type WeeklyInsightUnion = WeeklyInsightData | WeeklyInsightDataV2;

interface WeeklyInsightContextType {
  /** 各週の生成状態 */
  generationTasks: Map<string, GenerationTask>;
  /** 特定の週の生成状態を取得 */
  getGenerationStatus: (weekKey: string) => GenerationStatus;
  /** インサイト生成を開始（バックグラウンド実行） */
  startGeneration: (weekKey: string) => Promise<void>;
  /** インサイトを再生成（キャッシュを無視して強制的に生成） */
  regenerateGeneration: (weekKey: string) => Promise<void>;
  /** 生成完了時のコールバックを登録 */
  subscribeToCompletion: (weekKey: string, callback: (insight: WeeklyInsightUnion | null, error?: string) => void) => () => void;
  /** 生成結果を取得（キャッシュから） */
  getGeneratedInsight: (weekKey: string) => Promise<WeeklyInsightUnion | null>;
}

const WeeklyInsightContext = createContext<WeeklyInsightContextType | null>(null);

interface WeeklyInsightProviderProps {
  children: React.ReactNode;
}

export const WeeklyInsightProvider: React.FC<WeeklyInsightProviderProps> = ({ children }) => {
  // 生成タスクの状態を管理
  const [generationTasks, setGenerationTasks] = useState<Map<string, GenerationTask>>(new Map());

  // コールバック登録用のRef（再レンダリング時に失われないように）
  const completionCallbacksRef = useRef<Map<string, Set<(insight: WeeklyInsightUnion | null, error?: string) => void>>>(new Map());

  // 進行中のPromiseを保持（重複実行防止）
  const activeGenerationsRef = useRef<Map<string, Promise<WeeklyInsightUnion | null>>>(new Map());

  // 特定の週の生成状態を取得
  const getGenerationStatus = useCallback((weekKey: string): GenerationStatus => {
    const task = generationTasks.get(weekKey);
    return task?.status || 'idle';
  }, [generationTasks]);

  // タスク状態を更新するヘルパー
  const updateTask = useCallback((weekKey: string, update: Partial<GenerationTask>) => {
    setGenerationTasks(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(weekKey) || { status: 'idle', startedAt: Date.now() };
      newMap.set(weekKey, { ...existing, ...update });
      return newMap;
    });
  }, []);

  // 完了コールバックを呼び出す
  const notifyCompletion = useCallback((weekKey: string, insight: WeeklyInsightUnion | null, error?: string) => {
    const callbacks = completionCallbacksRef.current.get(weekKey);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(insight, error);
        } catch (e) {
          console.error('Completion callback error:', e);
        }
      });
    }
  }, []);

  // インサイト生成を開始
  const startGeneration = useCallback(async (weekKey: string): Promise<void> => {
    // 既に生成中の場合は、そのPromiseを待つ
    const activeGeneration = activeGenerationsRef.current.get(weekKey);
    if (activeGeneration) {
      await activeGeneration;
      return;
    }

    // 既に完了している場合はスキップ
    const currentStatus = generationTasks.get(weekKey)?.status;
    if (currentStatus === 'completed') {
      return;
    }

    // 生成開始
    updateTask(weekKey, { status: 'generating', startedAt: Date.now(), error: undefined });

    const generationPromise = (async (): Promise<WeeklyInsightUnion | null> => {
      try {
        // まずキャッシュを確認
        const cached = await getWeeklyInsightFromFirestore(weekKey);
        if (cached) {
          // V2キャッシュの場合
          if (cached.schemaVersion === 2 && cached.intentionToAction && cached.actionSuggestion) {
            const insightV2: WeeklyInsightDataV2 = {
              weekStartDate: cached.weekStartDate,
              weekEndDate: cached.weekEndDate,
              entryCount: cached.entryCount,
              intentionToAction: cached.intentionToAction,
              patterns: cached.patterns.map(p => ({
                type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
                title: p.title,
                description: p.description,
                examples: p.examples || [],
                insight: p.insight || '',
              })),
              actionSuggestion: cached.actionSuggestion,
              generatedAt: cached.generatedAt,
              modelVersion: cached.modelVersion,
              schemaVersion: 2,
            };
            updateTask(weekKey, { status: 'completed', completedAt: Date.now() });
            notifyCompletion(weekKey, insightV2);
            return insightV2;
          }
          // V1キャッシュの場合（後方互換性）
          const insight: WeeklyInsightData = {
            weekStartDate: cached.weekStartDate,
            weekEndDate: cached.weekEndDate,
            entryCount: cached.entryCount,
            summary: cached.summary,
            patterns: cached.patterns.map(p => ({
              ...p,
              type: p.type as WeeklyInsightData['patterns'][0]['type'],
            })),
            question: cached.question,
            generatedAt: cached.generatedAt,
            modelVersion: cached.modelVersion,
          };
          updateTask(weekKey, { status: 'completed', completedAt: Date.now() });
          notifyCompletion(weekKey, insight);
          return insight;
        }

        // 週情報を取得
        const weekInfo = getWeekInfoFromKey(weekKey);

        // 日記エントリを取得
        const entries = await getDiariesByDateRangeFromFirestore(
          weekInfo.startDate,
          weekInfo.endDate
        );

        if (entries.length < MIN_ENTRIES_FOR_INSIGHT) {
          const errorMsg = `週次インサイトの生成には${MIN_ENTRIES_FOR_INSIGHT}日以上の記録が必要です。この週は${entries.length}日分の記録でした。`;
          updateTask(weekKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
          notifyCompletion(weekKey, null, errorMsg);
          return null;
        }

        // ユーザー設定を取得
        const settings = await loadUserSettings();
        if (!settings) {
          const errorMsg = '設定が見つかりません';
          updateTask(weekKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
          notifyCompletion(weekKey, null, errorMsg);
          return null;
        }

        const currentAge = calculateCurrentAge(settings.birthday);
        const timeLeft = calculateTimeLeft(settings.birthday, settings.targetLifespan);

        // Cloud FunctionsでV2インサイトを生成
        const request: GenerateWeeklyInsightRequest = {
          entries: entries.map(e => ({
            date: e.date,
            goodTime: e.goodTime,
            wastedTime: e.wastedTime,
            tomorrow: e.tomorrow,
          })),
          currentAge,
          remainingYears: timeLeft.totalYears,
          remainingDays: timeLeft.totalDays,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
        };

        const response = await generateWeeklyInsightV2ViaCloudFunctions(request);

        // V2結果を整形
        const newInsight: WeeklyInsightDataV2 = {
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          entryCount: entries.length,
          intentionToAction: response.intentionToAction,
          patterns: response.patterns.map(p => ({
            type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
            title: p.title,
            description: p.description,
            examples: p.examples,
            insight: p.insight,
          })),
          actionSuggestion: response.actionSuggestion,
          generatedAt: response.generatedAt,
          modelVersion: response.modelVersion,
          schemaVersion: 2,
        };

        // Firestoreに保存（V2形式）
        await saveWeeklyInsightToFirestore({
          weekKey,
          weekStartDate: newInsight.weekStartDate,
          weekEndDate: newInsight.weekEndDate,
          entryCount: newInsight.entryCount,
          // V2ではsummary/questionは使わないが、ドキュメント型の互換性のために空文字をセット
          summary: '',
          question: '',
          patterns: newInsight.patterns,
          intentionToAction: newInsight.intentionToAction,
          actionSuggestion: newInsight.actionSuggestion,
          generatedAt: newInsight.generatedAt,
          modelVersion: newInsight.modelVersion,
          schemaVersion: 2,
        });

        updateTask(weekKey, { status: 'completed', completedAt: Date.now() });
        notifyCompletion(weekKey, newInsight);
        return newInsight;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '週次インサイトの生成に失敗しました';
        console.error('週次インサイトの生成に失敗:', err);
        updateTask(weekKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
        notifyCompletion(weekKey, null, errorMsg);
        return null;
      } finally {
        // 完了後にマップから削除
        activeGenerationsRef.current.delete(weekKey);
      }
    })();

    // 進行中のPromiseを保持
    activeGenerationsRef.current.set(weekKey, generationPromise);

    // 呼び出し元には即座に返す（バックグラウンド実行）
    // ただし、await されている場合は完了を待つ
    await generationPromise;
  }, [generationTasks, updateTask, notifyCompletion]);

  // インサイトを再生成（キャッシュを無視して強制的に生成）
  const regenerateGeneration = useCallback(async (weekKey: string): Promise<void> => {
    // 既に生成中の場合は、そのPromiseを待つ
    const activeGeneration = activeGenerationsRef.current.get(weekKey);
    if (activeGeneration) {
      await activeGeneration;
      return;
    }

    // 再生成開始（キャッシュの状態に関係なく開始）
    updateTask(weekKey, { status: 'generating', startedAt: Date.now(), error: undefined });

    const generationPromise = (async (): Promise<WeeklyInsightUnion | null> => {
      try {
        // 週情報を取得
        const weekInfo = getWeekInfoFromKey(weekKey);

        // 日記エントリを取得
        const entries = await getDiariesByDateRangeFromFirestore(
          weekInfo.startDate,
          weekInfo.endDate
        );

        if (entries.length < MIN_ENTRIES_FOR_INSIGHT) {
          const errorMsg = `週次インサイトの生成には${MIN_ENTRIES_FOR_INSIGHT}日以上の記録が必要です。この週は${entries.length}日分の記録でした。`;
          updateTask(weekKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
          notifyCompletion(weekKey, null, errorMsg);
          return null;
        }

        // ユーザー設定を取得
        const settings = await loadUserSettings();
        if (!settings) {
          const errorMsg = '設定が見つかりません';
          updateTask(weekKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
          notifyCompletion(weekKey, null, errorMsg);
          return null;
        }

        const currentAge = calculateCurrentAge(settings.birthday);
        const timeLeft = calculateTimeLeft(settings.birthday, settings.targetLifespan);

        // Cloud FunctionsでV2インサイトを生成（キャッシュを無視）
        const request: GenerateWeeklyInsightRequest = {
          entries: entries.map(e => ({
            date: e.date,
            goodTime: e.goodTime,
            wastedTime: e.wastedTime,
            tomorrow: e.tomorrow,
          })),
          currentAge,
          remainingYears: timeLeft.totalYears,
          remainingDays: timeLeft.totalDays,
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
        };

        const response = await generateWeeklyInsightV2ViaCloudFunctions(request);

        // V2結果を整形
        const newInsight: WeeklyInsightDataV2 = {
          weekStartDate: weekInfo.startDate,
          weekEndDate: weekInfo.endDate,
          entryCount: entries.length,
          intentionToAction: response.intentionToAction,
          patterns: response.patterns.map(p => ({
            type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
            title: p.title,
            description: p.description,
            examples: p.examples,
            insight: p.insight,
          })),
          actionSuggestion: response.actionSuggestion,
          generatedAt: response.generatedAt,
          modelVersion: response.modelVersion,
          schemaVersion: 2,
        };

        // Firestoreに保存（V2形式で上書き）
        await saveWeeklyInsightToFirestore({
          weekKey,
          weekStartDate: newInsight.weekStartDate,
          weekEndDate: newInsight.weekEndDate,
          entryCount: newInsight.entryCount,
          summary: '',
          question: '',
          patterns: newInsight.patterns,
          intentionToAction: newInsight.intentionToAction,
          actionSuggestion: newInsight.actionSuggestion,
          generatedAt: newInsight.generatedAt,
          modelVersion: newInsight.modelVersion,
          schemaVersion: 2,
        });

        updateTask(weekKey, { status: 'completed', completedAt: Date.now() });
        notifyCompletion(weekKey, newInsight);
        return newInsight;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '週次インサイトの再生成に失敗しました';
        console.error('週次インサイトの再生成に失敗:', err);
        updateTask(weekKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
        notifyCompletion(weekKey, null, errorMsg);
        return null;
      } finally {
        // 完了後にマップから削除
        activeGenerationsRef.current.delete(weekKey);
      }
    })();

    // 進行中のPromiseを保持
    activeGenerationsRef.current.set(weekKey, generationPromise);

    // 完了を待つ
    await generationPromise;
  }, [updateTask, notifyCompletion]);

  // 完了コールバックを登録
  const subscribeToCompletion = useCallback((
    weekKey: string,
    callback: (insight: WeeklyInsightUnion | null, error?: string) => void
  ): (() => void) => {
    if (!completionCallbacksRef.current.has(weekKey)) {
      completionCallbacksRef.current.set(weekKey, new Set());
    }
    completionCallbacksRef.current.get(weekKey)!.add(callback);

    // クリーンアップ関数を返す
    return () => {
      const callbacks = completionCallbacksRef.current.get(weekKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          completionCallbacksRef.current.delete(weekKey);
        }
      }
    };
  }, []);

  // 生成結果を取得（キャッシュから）
  const getGeneratedInsight = useCallback(async (weekKey: string): Promise<WeeklyInsightUnion | null> => {
    const cached = await getWeeklyInsightFromFirestore(weekKey);
    if (!cached) return null;

    // V2キャッシュの場合
    if (cached.schemaVersion === 2 && cached.intentionToAction && cached.actionSuggestion) {
      return {
        weekStartDate: cached.weekStartDate,
        weekEndDate: cached.weekEndDate,
        entryCount: cached.entryCount,
        intentionToAction: cached.intentionToAction,
        patterns: cached.patterns.map(p => ({
          type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
          title: p.title,
          description: p.description,
          examples: p.examples || [],
          insight: p.insight || '',
        })),
        actionSuggestion: cached.actionSuggestion,
        generatedAt: cached.generatedAt,
        modelVersion: cached.modelVersion,
        schemaVersion: 2,
      };
    }

    // V1キャッシュの場合（後方互換性）
    return {
      weekStartDate: cached.weekStartDate,
      weekEndDate: cached.weekEndDate,
      entryCount: cached.entryCount,
      summary: cached.summary,
      patterns: cached.patterns.map(p => ({
        ...p,
        type: p.type as WeeklyInsightData['patterns'][0]['type'],
      })),
      question: cached.question,
      generatedAt: cached.generatedAt,
      modelVersion: cached.modelVersion,
    };
  }, []);

  const value: WeeklyInsightContextType = {
    generationTasks,
    getGenerationStatus,
    startGeneration,
    regenerateGeneration,
    subscribeToCompletion,
    getGeneratedInsight,
  };

  return (
    <WeeklyInsightContext.Provider value={value}>
      {children}
    </WeeklyInsightContext.Provider>
  );
};

/**
 * WeeklyInsightContextを使用するカスタムフック
 */
export const useWeeklyInsightContext = (): WeeklyInsightContextType => {
  const context = useContext(WeeklyInsightContext);
  if (!context) {
    throw new Error('useWeeklyInsightContext must be used within a WeeklyInsightProvider');
  }
  return context;
};
