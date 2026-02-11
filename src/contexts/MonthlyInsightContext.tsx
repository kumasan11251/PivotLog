/**
 * MonthlyInsightContext - 月次インサイトのバックグラウンド生成管理
 *
 * 画面遷移後も生成を継続し、完了したら状態を通知する
 */

import React, { createContext, useContext, useCallback, useRef } from 'react';
import { loadUserSettings } from '../utils/storage';
import { calculateCurrentAge, calculateTimeLeft } from '../utils/timeCalculations';
import {
  getDiariesByDateRangeFromFirestore,
  getMonthlyInsightFromFirestore,
  saveMonthlyInsightToFirestore,
} from '../services/firebase/firestore';
import {
  generateMonthlyInsightViaCloudFunctions,
  GenerateMonthlyInsightRequest,
} from '../services/firebase/functions';
import {
  MIN_ENTRIES_FOR_MONTHLY_INSIGHT,
  getMonthInfoFromKey,
} from '../utils/monthUtils';
import type { MonthlyInsightData, MonthlyTheme } from '../types/monthlyInsight';

// ========================================
// 型定義
// ========================================

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

interface GenerationTask {
  status: GenerationStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

type CompletionCallback = (insight: MonthlyInsightData | null, error?: string) => void;

interface MonthlyInsightContextValue {
  /** 特定の月の生成状態を取得 */
  getGenerationStatus: (monthKey: string) => GenerationStatus;
  /** 月次インサイトの生成を開始（バックグラウンドで実行） */
  startGeneration: (monthKey: string) => Promise<void>;
  /** 生成完了時のコールバックを登録 */
  subscribeToCompletion: (monthKey: string, callback: CompletionCallback) => () => void;
  /** 生成済みインサイトを取得 */
  getGeneratedInsight: (monthKey: string) => Promise<MonthlyInsightData | null>;
}

// ========================================
// Context
// ========================================

const MonthlyInsightContext = createContext<MonthlyInsightContextValue | null>(null);

export const useMonthlyInsightContext = (): MonthlyInsightContextValue => {
  const context = useContext(MonthlyInsightContext);
  if (!context) {
    throw new Error('useMonthlyInsightContext must be used within MonthlyInsightProvider');
  }
  return context;
};

// ========================================
// Provider
// ========================================

interface MonthlyInsightProviderProps {
  children: React.ReactNode;
}

export const MonthlyInsightProvider: React.FC<MonthlyInsightProviderProps> = ({ children }) => {
  // 生成タスクの状態管理
  const tasksRef = useRef<Map<string, GenerationTask>>(new Map());
  // 生成中のPromiseを保持（重複実行防止）
  const generationPromisesRef = useRef<Map<string, Promise<MonthlyInsightData | null>>>(new Map());
  // 生成済みインサイトのキャッシュ
  const insightCacheRef = useRef<Map<string, MonthlyInsightData>>(new Map());
  // 完了通知のコールバック
  const completionCallbacksRef = useRef<Map<string, Set<CompletionCallback>>>(new Map());

  // ========================================
  // ヘルパー関数
  // ========================================

  const updateTask = useCallback((monthKey: string, update: Partial<GenerationTask>) => {
    const current = tasksRef.current.get(monthKey) || {
      status: 'idle',
      startedAt: Date.now(),
    };
    tasksRef.current.set(monthKey, { ...current, ...update });
  }, []);

  const notifyCompletion = useCallback((monthKey: string, insight: MonthlyInsightData | null, error?: string) => {
    const callbacks = completionCallbacksRef.current.get(monthKey);
    if (callbacks) {
      callbacks.forEach(callback => callback(insight, error));
    }
  }, []);

  // ========================================
  // Context API
  // ========================================

  const getGenerationStatus = useCallback((monthKey: string): GenerationStatus => {
    const task = tasksRef.current.get(monthKey);
    return task?.status || 'idle';
  }, []);

  const startGeneration = useCallback(async (monthKey: string): Promise<void> => {
    // 既に生成中の場合は既存のPromiseを待つ
    const existingPromise = generationPromisesRef.current.get(monthKey);
    if (existingPromise) {
      await existingPromise;
      return;
    }

    // 新しい生成タスクを開始
    const generationPromise = (async (): Promise<MonthlyInsightData | null> => {
      updateTask(monthKey, { status: 'generating', startedAt: Date.now() });

      try {
        // まずキャッシュを確認
        const cached = await getMonthlyInsightFromFirestore(monthKey);
        if (cached) {
          const insight: MonthlyInsightData = {
            monthStartDate: cached.monthStartDate,
            monthEndDate: cached.monthEndDate,
            entryCount: cached.entryCount,
            // 新セクション
            lifeContextSummary: cached.lifeContextSummary,
            storyline: cached.storyline,
            valueDiscovery: cached.valueDiscovery,
            highlights: cached.highlights,
            letterToFutureSelf: cached.letterToFutureSelf,
            growth: cached.growth,
            question: cached.question,
            generatedAt: cached.generatedAt,
            modelVersion: cached.modelVersion,
            // 後方互換性
            summary: cached.summary || cached.lifeContextSummary,
            themes: cached.themes as MonthlyTheme[] | undefined,
          };
          insightCacheRef.current.set(monthKey, insight);
          updateTask(monthKey, { status: 'completed', completedAt: Date.now() });
          notifyCompletion(monthKey, insight);
          return insight;
        }

        // 月情報を取得
        const monthInfo = getMonthInfoFromKey(monthKey);

        // 日記エントリを取得
        const entries = await getDiariesByDateRangeFromFirestore(
          monthInfo.startDate,
          monthInfo.endDate
        );

        if (entries.length < MIN_ENTRIES_FOR_MONTHLY_INSIGHT) {
          const errorMsg = `月次インサイトの生成には${MIN_ENTRIES_FOR_MONTHLY_INSIGHT}日以上の記録が必要です。この月は${entries.length}日分の記録でした。`;
          updateTask(monthKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
          notifyCompletion(monthKey, null, errorMsg);
          return null;
        }

        // ユーザー設定を取得
        const settings = await loadUserSettings();
        if (!settings) {
          const errorMsg = '設定が見つかりません';
          updateTask(monthKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
          notifyCompletion(monthKey, null, errorMsg);
          return null;
        }

        const currentAge = calculateCurrentAge(settings.birthday);
        const timeLeft = calculateTimeLeft(settings.birthday, settings.targetLifespan);

        // Cloud Functionsで生成
        const request: GenerateMonthlyInsightRequest = {
          entries: entries.map(e => ({
            date: e.date,
            goodTime: e.goodTime,
            wastedTime: e.wastedTime,
            tomorrow: e.tomorrow,
          })),
          currentAge,
          remainingYears: timeLeft.years + timeLeft.months / 12,
          remainingDays: timeLeft.totalDays,
          monthStartDate: monthInfo.startDate,
          monthEndDate: monthInfo.endDate,
          yearMonth: monthKey,
        };

        const response = await generateMonthlyInsightViaCloudFunctions(request);

        const insight: MonthlyInsightData = {
          monthStartDate: monthInfo.startDate,
          monthEndDate: monthInfo.endDate,
          entryCount: entries.length,
          // 新セクション
          lifeContextSummary: response.lifeContextSummary,
          storyline: response.storyline,
          valueDiscovery: response.valueDiscovery,
          highlights: response.highlights,
          letterToFutureSelf: response.letterToFutureSelf,
          growth: response.growth,
          question: response.question,
          generatedAt: response.generatedAt,
          modelVersion: response.modelVersion,
          // 後方互換性
          summary: response.summary || response.lifeContextSummary,
          themes: response.themes,
        };

        // Firestoreに保存
        await saveMonthlyInsightToFirestore({
          monthKey,
          ...insight,
        });

        insightCacheRef.current.set(monthKey, insight);
        updateTask(monthKey, { status: 'completed', completedAt: Date.now() });
        notifyCompletion(monthKey, insight);
        return insight;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '月次インサイトの生成に失敗しました';
        updateTask(monthKey, { status: 'error', error: errorMsg, completedAt: Date.now() });
        notifyCompletion(monthKey, null, errorMsg);
        return null;
      } finally {
        // Promiseを削除（次回は新しく生成可能に）
        generationPromisesRef.current.delete(monthKey);
      }
    })();

    generationPromisesRef.current.set(monthKey, generationPromise);
    await generationPromise;
  }, [updateTask, notifyCompletion]);

  const subscribeToCompletion = useCallback((monthKey: string, callback: CompletionCallback): (() => void) => {
    if (!completionCallbacksRef.current.has(monthKey)) {
      completionCallbacksRef.current.set(monthKey, new Set());
    }
    completionCallbacksRef.current.get(monthKey)!.add(callback);

    // unsubscribe関数を返す
    return () => {
      const callbacks = completionCallbacksRef.current.get(monthKey);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }, []);

  const getGeneratedInsight = useCallback(async (monthKey: string): Promise<MonthlyInsightData | null> => {
    // まずメモリキャッシュを確認
    const cached = insightCacheRef.current.get(monthKey);
    if (cached) {
      return cached;
    }

    // Firestoreから取得
    const firestoreData = await getMonthlyInsightFromFirestore(monthKey);
    if (firestoreData) {
      const insight: MonthlyInsightData = {
        monthStartDate: firestoreData.monthStartDate,
        monthEndDate: firestoreData.monthEndDate,
        entryCount: firestoreData.entryCount,
        // 新セクション
        lifeContextSummary: firestoreData.lifeContextSummary,
        storyline: firestoreData.storyline,
        valueDiscovery: firestoreData.valueDiscovery,
        highlights: firestoreData.highlights,
        letterToFutureSelf: firestoreData.letterToFutureSelf,
        growth: firestoreData.growth,
        question: firestoreData.question,
        generatedAt: firestoreData.generatedAt,
        modelVersion: firestoreData.modelVersion,
        // 後方互換性
        summary: firestoreData.summary || firestoreData.lifeContextSummary,
        themes: firestoreData.themes as MonthlyTheme[] | undefined,
      };
      insightCacheRef.current.set(monthKey, insight);
      return insight;
    }

    return null;
  }, []);

  const contextValue: MonthlyInsightContextValue = {
    getGenerationStatus,
    startGeneration,
    subscribeToCompletion,
    getGeneratedInsight,
  };

  return (
    <MonthlyInsightContext.Provider value={contextValue}>
      {children}
    </MonthlyInsightContext.Provider>
  );
};
