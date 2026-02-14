/**
 * 週次インサイト管理用カスタムフック
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { loadUserSettings } from '../utils/storage';
import { calculateCurrentAge, calculateTimeLeft } from '../utils/timeCalculations';
import {
  getDiariesByDateRangeFromFirestore,
  getWeeklyInsightFromFirestore,
  saveWeeklyInsightToFirestore,
  deleteWeeklyInsightFromFirestore,
  getRecentWeeklyInsightsFromFirestore,
  WeeklyInsightDocument,
} from '../services/firebase/firestore';
import {
  generateWeeklyInsightV2ViaCloudFunctions,
  GenerateWeeklyInsightRequest,
} from '../services/firebase/functions';
import { useWeeklyInsightContext } from '../contexts/WeeklyInsightContext';
import type {
  WeeklyInsightData,
  WeeklyInsightDataV2,
  WeeklyInsightState,
} from '../types/weeklyInsight';

/** V1またはV2のインサイトデータ */
type WeeklyInsightUnion = WeeklyInsightData | WeeklyInsightDataV2;

// ユーティリティ関数を再エクスポート（後方互換性のため）
export {
  MIN_ENTRIES_FOR_INSIGHT,
  getISOWeekNumber,
  getWeekKey,
  getWeekStartDate,
  getWeekEndDate,
  formatDateString,
  getWeekInfoFromKey,
  getPreviousWeekKey,
  getNextWeekKey,
  isWeekBeforeCurrent,
  isLastWeek,
  type WeekInfo,
} from '../utils/weekUtils';

import {
  MIN_ENTRIES_FOR_INSIGHT,
  getWeekKey,
  getWeekInfoFromKey,
  getPreviousWeekKey,
  getNextWeekKey,
  isWeekBeforeCurrent,
  type WeekInfo,
} from '../utils/weekUtils';

// 開発モード: trueにするとインサイトの再生成が可能になる
// リリース時はfalseに戻す
export const DEV_MODE_ALLOW_REGENERATE = true;

interface UseWeeklyInsightOptions {
  /** 自動で先週のインサイトを読み込むか */
  autoLoadLastWeek?: boolean;
  /** 初期表示する週（指定がなければ先週） */
  initialWeekKey?: string;
}

interface UseWeeklyInsightReturn {
  /** 現在表示中のインサイトデータ（V1またはV2） */
  insight: WeeklyInsightUnion | null;
  /** 最近のインサイト一覧 */
  recentInsights: WeeklyInsightDocument[];
  /** 読み込み/生成状態 */
  state: WeeklyInsightState;
  /** エラーメッセージ */
  error: string | null;
  /** 現在選択中の週の記録数 */
  currentWeekEntryCount: number;
  /** インサイト生成可能か */
  canGenerateInsight: boolean;
  /** 現在選択中の週のインサイトを読み込み/生成 */
  loadOrGenerateCurrentWeekInsight: () => Promise<void>;
  /** 特定の週のインサイトを読み込み */
  loadInsightForWeek: (weekKey: string) => Promise<void>;
  /** 最近のインサイト一覧を読み込み */
  loadRecentInsights: () => Promise<void>;
  /** 現在選択中の週情報 */
  currentWeekInfo: WeekInfo;
  /** 先週の週情報 */
  lastWeekInfo: WeekInfo;
  /** 週を選択（ナビゲーション用） */
  selectWeek: (weekKey: string) => void;
  /** 前の週に移動 */
  goToPreviousWeek: () => void;
  /** 次の週に移動 */
  goToNextWeek: () => void;
  /** 次の週に移動可能か（今週以降には移動不可） */
  canGoToNextWeek: boolean;
  /** 現在選択中の週がキャッシュ済み（生成済み）か */
  isCurrentWeekCached: boolean;
  /** キャッシュ状態を再チェック */
  refreshCacheStatus: () => Promise<void>;
  /** 先週の記録数（バナー表示用・後方互換性） */
  lastWeekEntryCount: number;
  /** 先週のインサイトを読み込み/生成（後方互換性） */
  loadOrGenerateLastWeekInsight: () => Promise<void>;
  /** [開発用] インサイトを再生成（キャッシュを無視） */
  regenerateCurrentWeekInsight: () => Promise<void>;
  /** [開発用] 現在の週のキャッシュを削除 */
  deleteCurrentWeekCache: () => Promise<void>;
  /** [開発用] 再生成が許可されているか */
  canRegenerate: boolean;
}

export const useWeeklyInsight = (
  options: UseWeeklyInsightOptions = {}
): UseWeeklyInsightReturn => {
  const { autoLoadLastWeek = false, initialWeekKey } = options;

  // Contextからバックグラウンド生成機能を取得
  const {
    getGenerationStatus,
    startGeneration,
    subscribeToCompletion,
    getGeneratedInsight,
  } = useWeeklyInsightContext();

  const [insight, setInsight] = useState<WeeklyInsightUnion | null>(null);
  const [recentInsights, setRecentInsights] = useState<WeeklyInsightDocument[]>([]);
  const [state, setState] = useState<WeeklyInsightState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentWeekEntryCount, setCurrentWeekEntryCount] = useState(0);
  const [isCurrentWeekCached, setIsCurrentWeekCached] = useState(false);

  // マウント状態を追跡
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 先週の週情報を計算（useMemoで最適化）
  const lastWeekInfo = useMemo((): WeekInfo => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const weekKey = getWeekKey(lastWeek);

    return {
      ...getWeekInfoFromKey(weekKey),
    };
  }, []);

  // 現在選択中の週
  const [currentWeekKey, setCurrentWeekKey] = useState<string>(
    initialWeekKey || lastWeekInfo.weekKey
  );

  // 現在選択中の週情報を計算
  const currentWeekInfo = useMemo((): WeekInfo => {
    return getWeekInfoFromKey(currentWeekKey);
  }, [currentWeekKey]);

  // 次の週に移動可能か（今週以降には移動不可）
  const canGoToNextWeek = useMemo(() => {
    const nextKey = getNextWeekKey(currentWeekKey);
    return isWeekBeforeCurrent(nextKey);
  }, [currentWeekKey]);

  // 現在選択中の週の記録数を確認
  const checkCurrentWeekEntries = useCallback(async () => {
    try {
      const entries = await getDiariesByDateRangeFromFirestore(
        currentWeekInfo.startDate,
        currentWeekInfo.endDate
      );
      setCurrentWeekEntryCount(entries.length);

      // キャッシュチェック
      const cached = await getWeeklyInsightFromFirestore(currentWeekKey);
      setIsCurrentWeekCached(!!cached);
    } catch (err) {
      console.error('週の記録数の確認に失敗:', err);
    }
  }, [currentWeekInfo.startDate, currentWeekInfo.endDate, currentWeekKey]);

  // バックグラウンド生成中の週を監視し、完了時に状態を更新
  useEffect(() => {
    const generationStatus = getGenerationStatus(currentWeekKey);

    // 生成中の場合
    if (generationStatus === 'generating') {
      setState('loading');

      // 完了コールバックを登録
      const unsubscribe = subscribeToCompletion(currentWeekKey, (generatedInsight, err) => {
        if (!isMountedRef.current) return;

        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentWeekCached(true);
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
    // insightを依存配列に入れると無限ループになるためRefで確認
    if (generationStatus === 'completed') {
      getGeneratedInsight(currentWeekKey).then(generatedInsight => {
        if (isMountedRef.current && generatedInsight) {
          setInsight(prev => {
            // 既にinsightがある場合は更新しない
            if (prev) return prev;
            setIsCurrentWeekCached(true);
            setState('loaded');
            return generatedInsight;
          });
        }
      });
    }
  }, [currentWeekKey, getGenerationStatus, subscribeToCompletion, getGeneratedInsight]);

  // インサイト生成可能かどうか
  const canGenerateInsight = currentWeekEntryCount >= MIN_ENTRIES_FOR_INSIGHT;

  // 週を選択
  const selectWeek = useCallback((weekKey: string) => {
    setCurrentWeekKey(weekKey);
    setInsight(null);
    setState('idle');
    setError(null);
    setCurrentWeekEntryCount(0); // 新しい週の記録数はcheckCurrentWeekEntriesで再取得される
    setIsCurrentWeekCached(false); // キャッシュ状態もリセット
  }, []);

  // 前の週に移動
  const goToPreviousWeek = useCallback(() => {
    const prevKey = getPreviousWeekKey(currentWeekKey);
    selectWeek(prevKey);
  }, [currentWeekKey, selectWeek]);

  // 次の週に移動
  const goToNextWeek = useCallback(() => {
    if (!canGoToNextWeek) return;
    const nextKey = getNextWeekKey(currentWeekKey);
    selectWeek(nextKey);
  }, [currentWeekKey, canGoToNextWeek, selectWeek]);

  // 現在選択中の週のインサイトを読み込み/生成
  const loadOrGenerateCurrentWeekInsight = useCallback(async () => {
    setState('loading');
    setError(null);

    // Contextの生成状態を確認
    const generationStatus = getGenerationStatus(currentWeekKey);

    // 既に生成中の場合は、完了を待つ
    if (generationStatus === 'generating') {
      // 完了コールバックを登録して待機
      return;
    }

    try {
      // まずキャッシュ（Firestore）から取得を試みる
      const cachedInsight = await getWeeklyInsightFromFirestore(currentWeekKey);

      if (cachedInsight) {
        if (isMountedRef.current) {
          // V2キャッシュの場合
          if (cachedInsight.schemaVersion === 2 && cachedInsight.intentionToAction && cachedInsight.actionSuggestion) {
            setInsight({
              weekStartDate: cachedInsight.weekStartDate,
              weekEndDate: cachedInsight.weekEndDate,
              entryCount: cachedInsight.entryCount,
              intentionToAction: cachedInsight.intentionToAction,
              patterns: cachedInsight.patterns.map(p => ({
                type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
                title: p.title,
                description: p.description,
                examples: p.examples || [],
                insight: p.insight || '',
              })),
              actionSuggestion: cachedInsight.actionSuggestion,
              generatedAt: cachedInsight.generatedAt,
              modelVersion: cachedInsight.modelVersion,
              schemaVersion: 2,
            });
          } else {
            // V1キャッシュの場合（後方互換性）
            setInsight({
              weekStartDate: cachedInsight.weekStartDate,
              weekEndDate: cachedInsight.weekEndDate,
              entryCount: cachedInsight.entryCount,
              summary: cachedInsight.summary,
              patterns: cachedInsight.patterns.map(p => ({
                ...p,
                type: p.type as WeeklyInsightData['patterns'][0]['type'],
              })),
              question: cachedInsight.question,
              generatedAt: cachedInsight.generatedAt,
              modelVersion: cachedInsight.modelVersion,
            });
          }
          setIsCurrentWeekCached(true);
          setState('loaded');
        }
        return;
      }

      // キャッシュがない場合はContextを通じてバックグラウンド生成を開始
      // Contextの startGeneration は完了まで await できる
      await startGeneration(currentWeekKey);

      // 生成完了後、キャッシュから取得
      if (isMountedRef.current) {
        const generatedInsight = await getGeneratedInsight(currentWeekKey);
        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentWeekCached(true);
          setState('loaded');
        } else {
          // 生成に失敗した場合
          const status = getGenerationStatus(currentWeekKey);
          if (status === 'error') {
            setState('error');
            setError('週次インサイトの生成に失敗しました');
          } else {
            setState('insufficient_data');
            setError(`週次インサイトの生成には${MIN_ENTRIES_FOR_INSIGHT}日以上の記録が必要です。`);
          }
        }
      }
    } catch (err) {
      console.error('[useWeeklyInsight] 週次インサイトの生成に失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '週次インサイトの生成に失敗しました');
        setState('error');
      }
    }
  }, [currentWeekKey, getGenerationStatus, startGeneration, getGeneratedInsight]);

  // 後方互換性: 先週のインサイトを読み込み/生成
  const loadOrGenerateLastWeekInsight = useCallback(async () => {
    // 先週を選択してから生成
    if (currentWeekKey !== lastWeekInfo.weekKey) {
      setCurrentWeekKey(lastWeekInfo.weekKey);
    }
    setState('loading');
    setError(null);

    try {
      // キャッシュを確認
      const cachedInsight = await getWeeklyInsightFromFirestore(lastWeekInfo.weekKey);

      if (cachedInsight) {
        if (isMountedRef.current) {
          // V2キャッシュの場合
          if (cachedInsight.schemaVersion === 2 && cachedInsight.intentionToAction && cachedInsight.actionSuggestion) {
            setInsight({
              weekStartDate: cachedInsight.weekStartDate,
              weekEndDate: cachedInsight.weekEndDate,
              entryCount: cachedInsight.entryCount,
              intentionToAction: cachedInsight.intentionToAction,
              patterns: cachedInsight.patterns.map(p => ({
                type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
                title: p.title,
                description: p.description,
                examples: p.examples || [],
                insight: p.insight || '',
              })),
              actionSuggestion: cachedInsight.actionSuggestion,
              generatedAt: cachedInsight.generatedAt,
              modelVersion: cachedInsight.modelVersion,
              schemaVersion: 2,
            });
          } else {
            // V1キャッシュの場合（後方互換性）
            setInsight({
              weekStartDate: cachedInsight.weekStartDate,
              weekEndDate: cachedInsight.weekEndDate,
              entryCount: cachedInsight.entryCount,
              summary: cachedInsight.summary,
              patterns: cachedInsight.patterns.map(p => ({
                ...p,
                type: p.type as WeeklyInsightData['patterns'][0]['type'],
              })),
              question: cachedInsight.question,
              generatedAt: cachedInsight.generatedAt,
              modelVersion: cachedInsight.modelVersion,
            });
          }
          setIsCurrentWeekCached(true);
          setState('loaded');
        }
        return;
      }

      // Contextを通じてバックグラウンド生成を開始
      await startGeneration(lastWeekInfo.weekKey);

      // 生成完了後、キャッシュから取得
      if (isMountedRef.current) {
        const generatedInsight = await getGeneratedInsight(lastWeekInfo.weekKey);
        if (generatedInsight) {
          setInsight(generatedInsight);
          setIsCurrentWeekCached(true);
          setState('loaded');
        } else {
          const status = getGenerationStatus(lastWeekInfo.weekKey);
          if (status === 'error') {
            setState('error');
            setError('週次インサイトの生成に失敗しました');
          } else {
            setState('insufficient_data');
            setError(`週次インサイトの生成には${MIN_ENTRIES_FOR_INSIGHT}日以上の記録が必要です。`);
          }
        }
      }
    } catch (err) {
      console.error('週次インサイトの生成に失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '週次インサイトの生成に失敗しました');
        setState('error');
      }
    }
  }, [lastWeekInfo, currentWeekKey, startGeneration, getGeneratedInsight, getGenerationStatus]);

  // 特定の週のインサイトを読み込み（生成なし）
  const loadInsightForWeek = useCallback(async (weekKey: string) => {
    // バックグラウンド生成中の場合は状態を同期
    const generationStatus = getGenerationStatus(weekKey);
    if (generationStatus === 'generating') {
      setState('loading');
      return; // useEffectの監視で完了時に更新される
    }

    setState('loading');
    setError(null);

    try {
      const cachedInsight = await getWeeklyInsightFromFirestore(weekKey);

      if (cachedInsight) {
        if (isMountedRef.current) {
          // V2キャッシュの場合
          if (cachedInsight.schemaVersion === 2 && cachedInsight.intentionToAction && cachedInsight.actionSuggestion) {
            setInsight({
              weekStartDate: cachedInsight.weekStartDate,
              weekEndDate: cachedInsight.weekEndDate,
              entryCount: cachedInsight.entryCount,
              intentionToAction: cachedInsight.intentionToAction,
              patterns: cachedInsight.patterns.map(p => ({
                type: p.type as WeeklyInsightDataV2['patterns'][0]['type'],
                title: p.title,
                description: p.description,
                examples: p.examples || [],
                insight: p.insight || '',
              })),
              actionSuggestion: cachedInsight.actionSuggestion,
              generatedAt: cachedInsight.generatedAt,
              modelVersion: cachedInsight.modelVersion,
              schemaVersion: 2,
            });
          } else {
            // V1キャッシュの場合（後方互換性）
            setInsight({
              weekStartDate: cachedInsight.weekStartDate,
              weekEndDate: cachedInsight.weekEndDate,
              entryCount: cachedInsight.entryCount,
              summary: cachedInsight.summary,
              patterns: cachedInsight.patterns.map(p => ({
                ...p,
                type: p.type as WeeklyInsightData['patterns'][0]['type'],
              })),
              question: cachedInsight.question,
              generatedAt: cachedInsight.generatedAt,
              modelVersion: cachedInsight.modelVersion,
            });
          }
          setState('loaded');
        }
      } else {
        if (isMountedRef.current) {
          setState('idle');
          setInsight(null);
        }
      }
    } catch (err) {
      console.error('週次インサイトの読み込みに失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '読み込みに失敗しました');
        setState('error');
      }
    }
  }, [getGenerationStatus]);

  // 最近のインサイト一覧を読み込み
  const loadRecentInsights = useCallback(async () => {
    try {
      const insights = await getRecentWeeklyInsightsFromFirestore(12);
      setRecentInsights(insights);
    } catch (err) {
      console.error('インサイト一覧の読み込みに失敗:', err);
    }
  }, []);

  // [開発用] インサイトを再生成（キャッシュを無視）
  const regenerateCurrentWeekInsight = useCallback(async () => {
    if (!DEV_MODE_ALLOW_REGENERATE) {
      console.warn('再生成は開発モードでのみ利用可能です');
      return;
    }

    setState('loading');
    setError(null);

    try {
      // キャッシュを無視して直接生成
      const entries = await getDiariesByDateRangeFromFirestore(
        currentWeekInfo.startDate,
        currentWeekInfo.endDate
      );

      if (entries.length < MIN_ENTRIES_FOR_INSIGHT) {
        setState('insufficient_data');
        setError(`週次インサイトの生成には${MIN_ENTRIES_FOR_INSIGHT}日以上の記録が必要です。この週は${entries.length}日分の記録でした。`);
        return;
      }

      // ユーザー設定を読み込み
      const settings = await loadUserSettings();
      if (!settings) {
        throw new Error('設定が見つかりません');
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
        weekStartDate: currentWeekInfo.startDate,
        weekEndDate: currentWeekInfo.endDate,
      };

      const response = await generateWeeklyInsightV2ViaCloudFunctions(request);

      // V2結果を整形
      const newInsight: WeeklyInsightDataV2 = {
        weekStartDate: currentWeekInfo.startDate,
        weekEndDate: currentWeekInfo.endDate,
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
        weekKey: currentWeekKey,
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

      if (isMountedRef.current) {
        setInsight(newInsight);
        setIsCurrentWeekCached(true);
        setState('loaded');
      }
    } catch (err) {
      console.error('週次インサイトの再生成に失敗:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : '週次インサイトの再生成に失敗しました');
        setState('error');
      }
    }
  }, [currentWeekKey, currentWeekInfo]);

  // [開発用] 現在の週のキャッシュを削除
  const deleteCurrentWeekCache = useCallback(async () => {
    if (!DEV_MODE_ALLOW_REGENERATE) {
      console.warn('キャッシュ削除は開発モードでのみ利用可能です');
      return;
    }

    try {
      await deleteWeeklyInsightFromFirestore(currentWeekKey);
      setInsight(null);
      setIsCurrentWeekCached(false);
      setState('idle');
    } catch (err) {
      console.error('キャッシュの削除に失敗:', err);
    }
  }, [currentWeekKey]);

  // 週が変更されたら記録数を確認
  useEffect(() => {
    checkCurrentWeekEntries();
  }, [checkCurrentWeekEntries]);

  // autoLoadLastWeekが有効な場合、自動で読み込み
  useEffect(() => {
    if (autoLoadLastWeek && currentWeekEntryCount >= MIN_ENTRIES_FOR_INSIGHT) {
      loadOrGenerateLastWeekInsight();
    }
  }, [autoLoadLastWeek, currentWeekEntryCount, loadOrGenerateLastWeekInsight]);

  return {
    insight,
    recentInsights,
    state,
    error,
    currentWeekEntryCount,
    canGenerateInsight,
    loadOrGenerateCurrentWeekInsight,
    loadInsightForWeek,
    loadRecentInsights,
    currentWeekInfo,
    lastWeekInfo,
    selectWeek,
    goToPreviousWeek,
    goToNextWeek,
    canGoToNextWeek,
    isCurrentWeekCached,
    refreshCacheStatus: checkCurrentWeekEntries,
    // 後方互換性
    lastWeekEntryCount: currentWeekKey === lastWeekInfo.weekKey ? currentWeekEntryCount : 0,
    loadOrGenerateLastWeekInsight,
    // 開発用
    regenerateCurrentWeekInsight,
    deleteCurrentWeekCache,
    canRegenerate: DEV_MODE_ALLOW_REGENERATE && isCurrentWeekCached,
  };
};
