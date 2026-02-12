/**
 * AIReflectionContext
 * AIリフレクションの生成をバックグラウンドで管理するContext
 * 画面遷移しても生成が継続される
 */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { AIReflectionData } from '../types/aiReflection';
import type { UsageLimitReason } from '../types/subscription';
import { getDiaryByDate, saveDiaryEntry, DiaryEntry, loadUserSettings, getRecentDiaryEntries } from '../utils/storage';
import { generateReflection } from '../services/ai';
import { calculateCurrentAge, calculateTimeLeft } from '../utils/timeCalculations';

/** 生成タスクの状態 */
export type ReflectionGenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

/** 生成タスク情報 */
interface ReflectionTask {
  status: ReflectionGenerationStatus;
  error?: string;
  limitReason?: UsageLimitReason;
  startedAt: number;
  completedAt?: number;
}

/** 生成開始時のパラメータ */
export interface StartGenerationParams {
  dateString: string;
  formState: {
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  };
}

/** 完了コールバックの型 */
type CompletionCallback = (
  reflection: AIReflectionData | null,
  error?: string,
  limitReason?: UsageLimitReason
) => void;

interface AIReflectionContextType {
  /** 各日付の生成状態 */
  generationTasks: Map<string, ReflectionTask>;
  /** 特定の日付の生成状態を取得 */
  getGenerationStatus: (dateString: string) => ReflectionGenerationStatus;
  /** 特定の日付の生成タスク情報を取得 */
  getGenerationTask: (dateString: string) => ReflectionTask | null;
  /** リフレクション生成を開始（バックグラウンド実行） */
  startGeneration: (params: StartGenerationParams) => Promise<void>;
  /** 生成完了時のコールバックを登録 */
  subscribeToCompletion: (dateString: string, callback: CompletionCallback) => () => void;
  /** 生成結果を取得（キャッシュから） */
  getGeneratedReflection: (dateString: string) => Promise<AIReflectionData | null>;
}

const AIReflectionContext = createContext<AIReflectionContextType | null>(null);

// 5分以上前に開始されたタスクはstaleとみなす
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

interface AIReflectionProviderProps {
  children: React.ReactNode;
}

export const AIReflectionProvider: React.FC<AIReflectionProviderProps> = ({ children }) => {
  // 生成タスクの状態を管理
  const [generationTasks, setGenerationTasks] = useState<Map<string, ReflectionTask>>(new Map());

  // コールバック登録用のRef（再レンダリング時に失われないように）
  const completionCallbacksRef = useRef<Map<string, Set<CompletionCallback>>>(new Map());

  // 進行中のPromiseを保持（重複実行防止）
  const activeGenerationsRef = useRef<Map<string, Promise<AIReflectionData | null>>>(new Map());

  // 特定の日付の生成状態を取得（タイムアウト考慮）
  const getGenerationStatus = useCallback((dateString: string): ReflectionGenerationStatus => {
    const task = generationTasks.get(dateString);
    if (!task) return 'idle';

    // タイムアウトチェック: 5分以上前に開始されたgeneratingタスクはstaleとみなす
    if (task.status === 'generating' && Date.now() - task.startedAt > GENERATION_TIMEOUT_MS) {
      return 'idle';
    }

    return task.status;
  }, [generationTasks]);

  // 特定の日付の生成タスク情報を取得
  const getGenerationTask = useCallback((dateString: string): ReflectionTask | null => {
    const task = generationTasks.get(dateString);
    if (!task) return null;

    // タイムアウトチェック
    if (task.status === 'generating' && Date.now() - task.startedAt > GENERATION_TIMEOUT_MS) {
      return { ...task, status: 'idle' };
    }

    return task;
  }, [generationTasks]);

  // タスク状態を更新するヘルパー
  const updateTask = useCallback((dateString: string, update: Partial<ReflectionTask>) => {
    setGenerationTasks(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(dateString) || { status: 'idle', startedAt: Date.now() };
      newMap.set(dateString, { ...existing, ...update });
      return newMap;
    });
  }, []);

  // 完了コールバックを呼び出す
  const notifyCompletion = useCallback((
    dateString: string,
    reflection: AIReflectionData | null,
    error?: string,
    limitReason?: UsageLimitReason
  ) => {
    const callbacks = completionCallbacksRef.current.get(dateString);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(reflection, error, limitReason);
        } catch (e) {
          console.error('Completion callback error:', e);
        }
      });
    }
  }, []);

  // リフレクション生成を開始
  const startGeneration = useCallback(async (params: StartGenerationParams): Promise<void> => {
    const { dateString, formState } = params;

    // 既に生成中の場合は、そのPromiseを待つ
    const activeGeneration = activeGenerationsRef.current.get(dateString);
    if (activeGeneration) {
      await activeGeneration;
      return;
    }

    // 生成開始
    updateTask(dateString, {
      status: 'generating',
      startedAt: Date.now(),
      error: undefined,
      limitReason: undefined,
    });

    const generationPromise = (async (): Promise<AIReflectionData | null> => {
      try {
        // ユーザー設定を読み込んで年齢と残り時間を計算
        const settings = await loadUserSettings();
        let currentAge = 30;
        let remainingYears = 50;
        let remainingDays = 18250;

        if (settings) {
          currentAge = calculateCurrentAge(settings.birthday);
          const timeLeft = calculateTimeLeft(settings.birthday, settings.targetLifespan);
          remainingYears = Math.floor(timeLeft.totalYears);
          remainingDays = Math.floor(timeLeft.totalDays);
        }

        // Phase 2: 直近3日分の日記を取得
        const recentDiaries = await getRecentDiaryEntries(dateString, 3);
        const recentEntries = recentDiaries.map((diary) => ({
          date: diary.date,
          goodTime: diary.goodTime,
          wastedTime: diary.wastedTime,
          tomorrow: diary.tomorrow,
        }));

        // AIサービスを使ってリフレクションを生成
        const newReflection = await generateReflection({
          goodTime: formState.goodTime,
          wastedTime: formState.wastedTime,
          tomorrow: formState.tomorrow,
          currentAge,
          remainingYears,
          remainingDays,
          diaryDate: dateString,
          recentEntries: recentEntries.length > 0 ? recentEntries : undefined,
        });

        // 日記にリフレクションを保存
        try {
          const existingDiary = await getDiaryByDate(dateString);
          if (existingDiary) {
            const updatedDiary: DiaryEntry = {
              ...existingDiary,
              aiReflection: newReflection,
              updatedAt: new Date().toISOString(),
            };
            await saveDiaryEntry(updatedDiary);
          } else {
            const newDiary: DiaryEntry = {
              id: dateString,
              date: dateString,
              goodTime: formState.goodTime.trim(),
              wastedTime: formState.wastedTime.trim(),
              tomorrow: formState.tomorrow.trim(),
              aiReflection: newReflection,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveDiaryEntry(newDiary);
          }
        } catch (saveError) {
          console.error('リフレクションの保存に失敗（生成は成功）:', saveError);
        }

        updateTask(dateString, { status: 'completed', completedAt: Date.now() });
        notifyCompletion(dateString, newReflection);
        return newReflection;
      } catch (err) {
        console.error('リフレクションの生成に失敗:', err);

        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorObj = err as { details?: { code?: UsageLimitReason } };

        // 利用制限エラーの検出
        let limitReason: UsageLimitReason | undefined;
        if (errorObj.details?.code) {
          limitReason = errorObj.details.code;
        } else if (errorMessage.includes('今月のAIリフレクション利用上限')) {
          limitReason = 'MONTHLY_LIMIT_REACHED';
        } else if (errorMessage.includes('同じ日記の再生成')) {
          limitReason = 'REGENERATE_NOT_ALLOWED';
        } else if (errorMessage.includes('本日の利用上限')) {
          limitReason = 'DAILY_LIMIT_REACHED';
        }

        updateTask(dateString, {
          status: 'error',
          error: errorMessage,
          limitReason,
          completedAt: Date.now(),
        });
        notifyCompletion(dateString, null, errorMessage, limitReason);
        return null;
      } finally {
        // 完了後にマップから削除
        activeGenerationsRef.current.delete(dateString);
      }
    })();

    // 進行中のPromiseを保持
    activeGenerationsRef.current.set(dateString, generationPromise);

    // 完了を待つ
    await generationPromise;
  }, [updateTask, notifyCompletion]);

  // 完了コールバックを登録
  const subscribeToCompletion = useCallback((
    dateString: string,
    callback: CompletionCallback
  ): (() => void) => {
    if (!completionCallbacksRef.current.has(dateString)) {
      completionCallbacksRef.current.set(dateString, new Set());
    }
    completionCallbacksRef.current.get(dateString)!.add(callback);

    // クリーンアップ関数を返す
    return () => {
      const callbacks = completionCallbacksRef.current.get(dateString);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          completionCallbacksRef.current.delete(dateString);
        }
      }
    };
  }, []);

  // 生成結果を取得（キャッシュから）
  const getGeneratedReflection = useCallback(async (dateString: string): Promise<AIReflectionData | null> => {
    const diary = await getDiaryByDate(dateString);
    return diary?.aiReflection ?? null;
  }, []);

  const value: AIReflectionContextType = {
    generationTasks,
    getGenerationStatus,
    getGenerationTask,
    startGeneration,
    subscribeToCompletion,
    getGeneratedReflection,
  };

  return (
    <AIReflectionContext.Provider value={value}>
      {children}
    </AIReflectionContext.Provider>
  );
};

/**
 * AIReflectionContextを使用するカスタムフック
 */
export const useAIReflectionContext = (): AIReflectionContextType => {
  const context = useContext(AIReflectionContext);
  if (!context) {
    throw new Error('useAIReflectionContext must be used within an AIReflectionProvider');
  }
  return context;
};
