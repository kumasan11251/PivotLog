/**
 * 月次インサイト管理用カスタムフック
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getDiariesByDateRangeFromFirestore,
  getMonthlyInsightFromFirestore,
  deleteMonthlyInsightFromFirestore,
  getRecentMonthlyInsightsFromFirestore,
  MonthlyInsightDocument,
} from '../services/firebase/firestore';
import { useMonthlyInsightContext } from '../contexts/MonthlyInsightContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import type { MonthlyInsightData, MonthlyInsightState, MonthlyTheme } from '../types/monthlyInsight';

// ユーティリティ関数を再エクスポート（後方互換性のため）
export {
  MIN_ENTRIES_FOR_MONTHLY_INSIGHT,
  getMonthKey,
  getMonthStartDate,
  getMonthEndDate,
  formatDateString,
  getMonthInfoFromKey,
  getPreviousMonthKey,
  getNextMonthKey,
  isMonthBeforeCurrent,
  isLastMonth,
  isCurrentMonth,
  getMonthDisplayName,
  getMonthDisplayFull,
  getDaysInMonth,
  getLastMonthKey,
  type MonthInfo,
} from '../utils/monthUtils';

// ローカルで使用するためにインポート
import {
  MIN_ENTRIES_FOR_MONTHLY_INSIGHT,
  getMonthInfoFromKey,
  getPreviousMonthKey,
  getNextMonthKey,
  isMonthBeforeCurrent,
  getLastMonthKey,
  type MonthInfo,
} from '../utils/monthUtils';

interface UseMonthlyInsightOptions {
  /** 自動で先月のインサイトを読み込むか */
  autoLoadLastMonth?: boolean;
  /** 初期表示する月（指定がなければ先月） */
  initialMonthKey?: string;
}

interface UseMonthlyInsightReturn {
  /** 現在表示中のインサイトデータ */
  insight: MonthlyInsightData | null;
  /** 最近のインサイト一覧 */
  recentInsights: MonthlyInsightDocument[];
  /** 読み込み/生成状態 */
  state: MonthlyInsightState;
  /** エラーメッセージ */
  error: string | null;
  /** 現在選択中の月の記録数 */
  currentMonthEntryCount: number;
  /** インサイト生成可能か */
  canGenerateInsight: boolean;
  /** 現在選択中の月のインサイトを読み込み/生成 */
  loadOrGenerateCurrentMonthInsight: () => Promise<void>;
  /** 特定の月のインサイトを読み込み */
  loadInsightForMonth: (monthKey: string) => Promise<void>;
  /** 最近のインサイト一覧を読み込み */
  loadRecentInsights: () => Promise<void>;
  /** 現在選択中の月情報 */
  currentMonthInfo: MonthInfo;
  /** 先月の月情報 */
  lastMonthInfo: MonthInfo;
  /** 月を選択（ナビゲーション用） */
  selectMonth: (monthKey: string) => void;
  /** 前の月に移動 */
  goToPreviousMonth: () => void;
  /** 次の月に移動 */
  goToNextMonth: () => void;
  /** 次の月に移動可能か（今月以降には移動不可） */
  canGoToNextMonth: boolean;
  /** 現在選択中の月がキャッシュ済み（生成済み）か */
  isCurrentMonthCached: boolean;
  /** キャッシュ状態を再チェック */
  refreshCacheStatus: () => Promise<void>;
  /** 先月の記録数（バナー表示用・後方互換性） */
  lastMonthEntryCount: number;
  /** 先月のインサイトを読み込み/生成（後方互換性） */
  loadOrGenerateLastMonthInsight: () => Promise<void>;
  /** インサイトを再生成（キャッシュを無視） */
  regenerateCurrentMonthInsight: () => Promise<void>;
  /** 現在の月のキャッシュを削除 */
  deleteCurrentMonthCache: () => Promise<void>;
  /** 再生成が許可されているか（プレミアム && キャッシュ済み） */
  canRegenerate: boolean;
}

export const useMonthlyInsight = (
  options: UseMonthlyInsightOptions = {}
): UseMonthlyInsightReturn => {
  const { autoLoadLastMonth = false, initialMonthKey } = options;

  const { isPremium } = useSubscription();

  // Contextからバックグラウンド生成機能を取得
  const {
    getGenerationStatus,
    startGeneration,
    regenerateGeneration,
    subscribeToCompletion,
    getGeneratedInsight,
  } = useMonthlyInsightContext();

  const [insight, setInsight] = useState<MonthlyInsightData | null>(null);
  const [recentInsights, setRecentInsights] = useState<MonthlyInsightDocument[]>([]);
  const [state, setState] = useState<MonthlyInsightState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentMonthEntryCount, setCurrentMonthEntryCount] = useState(0);
  const [isCurrentMonthCached, setIsCurrentMonthCached] = useState(false);

  // マウント状態を追跡
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 先月の月情報を計算（useMemoで最適化）
  const lastMonthInfo = useMemo((): MonthInfo => {
    const lastMonthKey = getLastMonthKey();
    return getMonthInfoFromKey(lastMonthKey);
  }, []);

  // 現在選択中の月
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(
    initialMonthKey || lastMonthInfo.monthKey
  );

  // 現在選択中の月情報を計算
  const currentMonthInfo = useMemo((): MonthInfo => {
    return getMonthInfoFromKey(currentMonthKey);
  }, [currentMonthKey]);

  // 次の月に移動可能か（今月以降には移動不可）
  const canGoToNextMonth = useMemo(() => {
    const nextKey = getNextMonthKey(currentMonthKey);
    return isMonthBeforeCurrent(nextKey);
  }, [currentMonthKey]);

  // 現在選択中の月の記録数を確認
  const checkCurrentMonthEntries = useCallback(async () => {
    try {
      const entries = await getDiariesByDateRangeFromFirestore(
        currentMonthInfo.startDate,
        currentMonthInfo.endDate
      );
      setCurrentMonthEntryCount(entries.length);

      // キャッシュチェック
      const cached = await getMonthlyInsightFromFirestore(currentMonthKey);
      setIsCurrentMonthCached(!!cached);
    } catch (err) {
      console.error('月の記録数の確認に失敗:', err);
    }
  }, [currentMonthInfo.startDate, currentMonthInfo.endDate, currentMonthKey]);

  // バックグラウンド生成中の月を監視し、完了時に状態を更新
  useEffect(() => {
    const generationStatus = getGenerationStatus(currentMonthKey);

    // 生成中の場合
    if (generationStatus === 'generating') {
      setState('loading');

      // 完了コールバックを登録
      const unsubscribe = subscribeToCompletion(currentMonthKey, (generatedInsight, err) => {
        if (!isMountedRef.current) return;

        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentMonthCached(true);
          setState('loaded');
        } else if (err) {
          setError(err);
          if (err.includes('記録が必要')) {
            setState('insufficient_data');
          } else {
            setState('error');
          }
        }
      });

      return unsubscribe;
    }

    // 既に完了している場合で、まだinsightがない場合はキャッシュから読み込み
    if (generationStatus === 'completed') {
      getGeneratedInsight(currentMonthKey).then(generatedInsight => {
        if (isMountedRef.current && generatedInsight) {
          setInsight(prev => {
            if (prev) return prev;
            setIsCurrentMonthCached(true);
            setState('loaded');
            return generatedInsight;
          });
        }
      });
    }
  }, [currentMonthKey, getGenerationStatus, subscribeToCompletion, getGeneratedInsight]);

  // インサイト生成可能かどうか
  const canGenerateInsight = currentMonthEntryCount >= MIN_ENTRIES_FOR_MONTHLY_INSIGHT;

  // 特定の月のインサイトを読み込み（生成なし）
  const loadInsightForMonth = useCallback(async (monthKey: string) => {
    const generationStatus = getGenerationStatus(monthKey);
    if (generationStatus === 'generating') {
      setState('loading');
      return;
    }

    setState('loading');
    setError(null);

    try {
      const cachedInsight = await getMonthlyInsightFromFirestore(monthKey);

      if (cachedInsight) {
        if (isMountedRef.current) {
          setInsight({
            monthStartDate: cachedInsight.monthStartDate,
            monthEndDate: cachedInsight.monthEndDate,
            entryCount: cachedInsight.entryCount,
            // 新セクション
            lifeContextSummary: cachedInsight.lifeContextSummary,
            storyline: cachedInsight.storyline,
            valueDiscovery: cachedInsight.valueDiscovery,
            highlights: cachedInsight.highlights,
            letterToFutureSelf: cachedInsight.letterToFutureSelf,
            growth: cachedInsight.growth,
            question: cachedInsight.question,
            generatedAt: cachedInsight.generatedAt,
            modelVersion: cachedInsight.modelVersion,
            // 後方互換性
            summary: cachedInsight.summary || cachedInsight.lifeContextSummary,
            themes: cachedInsight.themes as MonthlyTheme[] | undefined,
          });
          setState('loaded');
        }
      } else {
        if (isMountedRef.current) {
          setState('idle');
          setInsight(null);
        }
      }
    } catch (err) {
      console.error('月次インサイトの読み込みに失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
        setState('error');
      }
    }
  }, [getGenerationStatus]);

  // 月を選択
  const selectMonth = useCallback((monthKey: string) => {
    setCurrentMonthKey(monthKey);
    // insight は新しいデータがロードされるまで保持（ちらつき防止）
    // loadInsightForMonth で必要に応じてクリアされる
    setState('loading'); // loading に変更（idle だと一瞬「データなし」が表示される）
    setError(null);
    setCurrentMonthEntryCount(0);
    setIsCurrentMonthCached(false);
  }, []);

  // 前の月に移動
  const goToPreviousMonth = useCallback(() => {
    const prevKey = getPreviousMonthKey(currentMonthKey);
    selectMonth(prevKey);
    loadInsightForMonth(prevKey); // キャッシュ確認と状態遷移
  }, [currentMonthKey, selectMonth, loadInsightForMonth]);

  // 次の月に移動
  const goToNextMonth = useCallback(() => {
    if (!canGoToNextMonth) return;
    const nextKey = getNextMonthKey(currentMonthKey);
    selectMonth(nextKey);
    loadInsightForMonth(nextKey); // キャッシュ確認と状態遷移
  }, [currentMonthKey, canGoToNextMonth, selectMonth, loadInsightForMonth]);

  // 現在選択中の月のインサイトを読み込み/生成
  const loadOrGenerateCurrentMonthInsight = useCallback(async () => {
    setState('loading');
    setError(null);

    const generationStatus = getGenerationStatus(currentMonthKey);

    if (generationStatus === 'generating') {
      return;
    }

    try {
      // まずキャッシュ（Firestore）から取得を試みる
      const cachedInsight = await getMonthlyInsightFromFirestore(currentMonthKey);

      if (cachedInsight) {
        if (isMountedRef.current) {
          setInsight({
            monthStartDate: cachedInsight.monthStartDate,
            monthEndDate: cachedInsight.monthEndDate,
            entryCount: cachedInsight.entryCount,
            // 新セクション
            lifeContextSummary: cachedInsight.lifeContextSummary,
            storyline: cachedInsight.storyline,
            valueDiscovery: cachedInsight.valueDiscovery,
            highlights: cachedInsight.highlights,
            letterToFutureSelf: cachedInsight.letterToFutureSelf,
            growth: cachedInsight.growth,
            question: cachedInsight.question,
            generatedAt: cachedInsight.generatedAt,
            modelVersion: cachedInsight.modelVersion,
            // 後方互換性
            summary: cachedInsight.summary || cachedInsight.lifeContextSummary,
            themes: cachedInsight.themes as MonthlyTheme[] | undefined,
          });
          setIsCurrentMonthCached(true);
          setState('loaded');
        }
        return;
      }

      // キャッシュがない場合はContextを通じてバックグラウンド生成を開始
      await startGeneration(currentMonthKey);

      // 生成完了後、キャッシュから取得
      if (isMountedRef.current) {
        const generatedInsight = await getGeneratedInsight(currentMonthKey);
        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentMonthCached(true);
          setState('loaded');
        } else {
          const status = getGenerationStatus(currentMonthKey);
          if (status === 'error') {
            setState('error');
            setError('月次インサイトの生成に失敗しました');
          } else {
            setState('insufficient_data');
            setError(`月次インサイトの生成には${MIN_ENTRIES_FOR_MONTHLY_INSIGHT}日以上の記録が必要です。`);
          }
        }
      }
    } catch (err) {
      console.error('月次インサイトの読み込み/生成に失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '月次インサイトの読み込み/生成に失敗しました');
        setState('error');
      }
    }
  }, [currentMonthKey, getGenerationStatus, startGeneration, getGeneratedInsight]);

  // 先月のインサイトを読み込み/生成（後方互換性）
  const loadOrGenerateLastMonthInsight = useCallback(async () => {
    if (currentMonthKey !== lastMonthInfo.monthKey) {
      selectMonth(lastMonthInfo.monthKey);
    }

    setState('loading');
    setError(null);

    const generationStatus = getGenerationStatus(lastMonthInfo.monthKey);
    if (generationStatus === 'generating') {
      return;
    }

    try {
      const cachedInsight = await getMonthlyInsightFromFirestore(lastMonthInfo.monthKey);

      if (cachedInsight) {
        if (isMountedRef.current) {
          setInsight({
            monthStartDate: cachedInsight.monthStartDate,
            monthEndDate: cachedInsight.monthEndDate,
            entryCount: cachedInsight.entryCount,
            // 新セクション
            lifeContextSummary: cachedInsight.lifeContextSummary,
            storyline: cachedInsight.storyline,
            valueDiscovery: cachedInsight.valueDiscovery,
            highlights: cachedInsight.highlights,
            letterToFutureSelf: cachedInsight.letterToFutureSelf,
            growth: cachedInsight.growth,
            question: cachedInsight.question,
            generatedAt: cachedInsight.generatedAt,
            modelVersion: cachedInsight.modelVersion,
            // 後方互換性
            summary: cachedInsight.summary || cachedInsight.lifeContextSummary,
            themes: cachedInsight.themes as MonthlyTheme[] | undefined,
          });
          setIsCurrentMonthCached(true);
          setState('loaded');
        }
        return;
      }

      await startGeneration(lastMonthInfo.monthKey);

      if (isMountedRef.current) {
        const generatedInsight = await getGeneratedInsight(lastMonthInfo.monthKey);
        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentMonthCached(true);
          setState('loaded');
        } else {
          const status = getGenerationStatus(lastMonthInfo.monthKey);
          if (status === 'error') {
            setState('error');
            setError('月次インサイトの生成に失敗しました');
          } else {
            setState('insufficient_data');
            setError(`月次インサイトの生成には${MIN_ENTRIES_FOR_MONTHLY_INSIGHT}日以上の記録が必要です。`);
          }
        }
      }
    } catch (err) {
      console.error('月次インサイトの生成に失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '月次インサイトの生成に失敗しました');
        setState('error');
      }
    }
  }, [lastMonthInfo, currentMonthKey, selectMonth, startGeneration, getGeneratedInsight, getGenerationStatus]);

  // 最近のインサイト一覧を読み込み
  const loadRecentInsights = useCallback(async () => {
    try {
      const insights = await getRecentMonthlyInsightsFromFirestore(12);
      setRecentInsights(insights);
    } catch (err) {
      console.error('インサイト一覧の読み込みに失敗:', err);
    }
  }, []);

  // インサイトを再生成（キャッシュを無視）
  const regenerateCurrentMonthInsight = useCallback(async () => {
    if (!isPremium) {
      console.warn('再生成はプレミアムプランでのみ利用可能です');
      return;
    }

    setState('loading');
    setError(null);

    try {
      await regenerateGeneration(currentMonthKey);

      if (isMountedRef.current) {
        const generatedInsight = await getGeneratedInsight(currentMonthKey);
        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentMonthCached(true);
          setState('loaded');
        } else {
          const status = getGenerationStatus(currentMonthKey);
          if (status === 'error') {
            setState('error');
            setError('月次インサイトの再生成に失敗しました');
          } else {
            setState('insufficient_data');
            setError(`月次インサイトの生成には${MIN_ENTRIES_FOR_MONTHLY_INSIGHT}日以上の記録が必要です。`);
          }
        }
      }
    } catch (err) {
      console.error('月次インサイトの再生成に失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '再生成に失敗しました');
        setState('error');
      }
    }
  }, [currentMonthKey, isPremium, regenerateGeneration, getGeneratedInsight, getGenerationStatus]);

  // 現在の月のキャッシュを削除
  const deleteCurrentMonthCache = useCallback(async () => {
    try {
      await deleteMonthlyInsightFromFirestore(currentMonthKey);
      setInsight(null);
      setIsCurrentMonthCached(false);
      setState('idle');
    } catch (err) {
      console.error('キャッシュの削除に失敗:', err);
    }
  }, [currentMonthKey]);

  // 月が変更されたら記録数を確認
  useEffect(() => {
    checkCurrentMonthEntries();
  }, [checkCurrentMonthEntries]);

  // autoLoadLastMonthが有効な場合、自動で読み込み
  useEffect(() => {
    if (autoLoadLastMonth && currentMonthEntryCount >= MIN_ENTRIES_FOR_MONTHLY_INSIGHT) {
      loadOrGenerateLastMonthInsight();
    }
  }, [autoLoadLastMonth, currentMonthEntryCount, loadOrGenerateLastMonthInsight]);

  // 先月の記録数（後方互換性）
  const [lastMonthEntryCount, setLastMonthEntryCount] = useState(0);
  useEffect(() => {
    const loadLastMonthCount = async () => {
      try {
        const entries = await getDiariesByDateRangeFromFirestore(
          lastMonthInfo.startDate,
          lastMonthInfo.endDate
        );
        setLastMonthEntryCount(entries.length);
      } catch (err) {
        console.error('先月の記録数の取得に失敗:', err);
      }
    };
    loadLastMonthCount();
  }, [lastMonthInfo]);

  return {
    insight,
    recentInsights,
    state,
    error,
    currentMonthEntryCount,
    canGenerateInsight,
    loadOrGenerateCurrentMonthInsight,
    loadInsightForMonth,
    loadRecentInsights,
    currentMonthInfo,
    lastMonthInfo,
    selectMonth,
    goToPreviousMonth,
    goToNextMonth,
    canGoToNextMonth,
    isCurrentMonthCached,
    refreshCacheStatus: checkCurrentMonthEntries,
    lastMonthEntryCount,
    loadOrGenerateLastMonthInsight,
    regenerateCurrentMonthInsight,
    deleteCurrentMonthCache,
    canRegenerate: isPremium && isCurrentMonthCached,
  };
};
