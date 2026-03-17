import { useState, useCallback, useMemo, useEffect } from 'react';
import { Animated, Alert } from 'react-native';
import type { AIReflectionData, AIReflectionState } from '../types/aiReflection';
import type { UsageLimitReason } from '../types/subscription';
import { DEFAULT_AI_USAGE_LIMITS } from '../types/subscription';
import { getDiaryByDate } from '../utils/storage';
import { useAIReflectionContext } from '../contexts/AIReflectionContext';
import { useSubscription } from '../contexts/SubscriptionContext';

/** 構造化エラー型 */
export interface ReflectionError {
  code?: string;   // Firebase error code (e.g. 'internal', 'resource-exhausted')
  message: string; // ユーザー向け表示メッセージ
  retryable: boolean;
}

interface UseAIReflectionProps {
  dateString: string;
  formState: {
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  };
  /** 利用制限チェック後のコールバック */
  onLimitReached?: (reason: UsageLimitReason) => void;
  /** プレミアムアップグレード導線のコールバック */
  onUpgrade?: () => void;
}

/** 拡張されたAIリフレクションの状態 */
export type ExtendedAIReflectionState = AIReflectionState | 'limit_reached';

interface UseAIReflectionReturn {
  /** AIリフレクションの状態 */
  reflectionState: ExtendedAIReflectionState;
  /** AIリフレクションのデータ */
  reflection: AIReflectionData | null;
  /** フェードインアニメーション用の値 */
  fadeAnim: Animated.Value;
  /** AIリフレクションを取得する */
  getReflection: () => Promise<void>;
  /** 保存済みのリフレクションを読み込む */
  loadSavedReflection: () => Promise<void>;
  /** リフレクションをリセットする */
  resetReflection: () => void;
  /** 最後に発生した利用制限の理由 */
  lastLimitReason: UsageLimitReason | null;
  /** 構造化エラー情報 */
  reflectionError: ReflectionError | null;
  /** ユーザー向けエラーメッセージ（reflectionErrorの派生値） */
  errorMessage: string | null;
}

/**
 * AIリフレクション機能を管理するカスタムフック
 * Contextを活用して画面遷移しても生成状態を保持する
 */
export const useAIReflection = ({
  dateString,
  formState,
  onLimitReached,
  onUpgrade,
}: UseAIReflectionProps): UseAIReflectionReturn => {
  const { isPremium } = useSubscription();

  // Contextから状態と関数を取得
  const {
    getGenerationStatus,
    getGenerationTask,
    startGeneration,
    subscribeToCompletion,
  } = useAIReflectionContext();

  // ローカル表示用の状態
  const [reflection, setReflection] = useState<AIReflectionData | null>(null);
  const [lastLimitReason, setLastLimitReason] = useState<UsageLimitReason | null>(null);
  const [localError, setLocalError] = useState<boolean>(false);
  const [reflectionError, setReflectionError] = useState<ReflectionError | null>(null);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  // Contextから現在の生成状態を取得
  const contextStatus = getGenerationStatus(dateString);
  const contextTask = getGenerationTask(dateString);

  // リフレクションをリセット
  const resetReflection = useCallback(() => {
    setReflection(null);
    setLastLimitReason(null);
    setLocalError(false);
    setReflectionError(null);
    fadeAnim.setValue(0);
  }, [fadeAnim]);

  // 保存済みのリフレクションを読み込む
  const loadSavedReflection = useCallback(async () => {
    // 生成中の場合は何もしない（コールバックで結果を受け取る）
    if (contextStatus === 'generating') {
      return;
    }

    try {
      const diary = await getDiaryByDate(dateString);
      if (diary?.aiReflection) {
        setReflection(diary.aiReflection);
        setLocalError(false);
        setReflectionError(null);
        fadeAnim.setValue(1); // 保存済みは即座に表示
      } else {
        resetReflection();
      }
    } catch (error) {
      console.error('リフレクションの読み込みに失敗:', error);
      resetReflection();
    }
  }, [dateString, fadeAnim, resetReflection, contextStatus]);

  // 生成完了時のコールバックを登録
  useEffect(() => {
    const unsubscribe = subscribeToCompletion(dateString, (result, error, limitReason) => {
      if (result) {
        setReflection(result);
        setLocalError(false);

        // フェードインアニメーション
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (limitReason) {
        setLastLimitReason(limitReason);
        setLocalError(true);

        // コールバックを呼び出し
        if (onLimitReached) {
          onLimitReached(limitReason);
        }

        // 利用制限エラーのアラート表示
        showLimitAlert(limitReason, {
          monthlyLimit: !isPremium ? DEFAULT_AI_USAGE_LIMITS.freeMonthlyReflectionLimit : undefined,
          onUpgrade,
        });
      } else if (error) {
        setLocalError(true);
        setReflectionError({
          code: error,
          message: '生成に失敗しました。もう一度お試しください。',
          retryable: true,
        });
      }
    });

    return unsubscribe;
  }, [dateString, subscribeToCompletion, fadeAnim, onLimitReached, isPremium, onUpgrade]);

  // AIリフレクションを取得する
  const getReflection = useCallback(async () => {
    fadeAnim.setValue(0);
    setLocalError(false);
    setReflectionError(null);
    setLastLimitReason(null);

    try {
      await startGeneration({ dateString, formState });
    } catch (error) {
      // エラーは subscribeToCompletion のコールバックで処理される
      console.error('リフレクション生成の開始に失敗:', error);
    }
  }, [dateString, formState, fadeAnim, startGeneration]);

  // reflectionStateはContextの状態とローカル状態から導出
  const reflectionState: ExtendedAIReflectionState = useMemo(() => {
    // Contextで生成中ならloading
    if (contextStatus === 'generating') {
      return 'loading';
    }

    // エラーまたは利用制限
    if (contextStatus === 'error' && contextTask?.limitReason) {
      return 'limit_reached';
    }
    if (localError && lastLimitReason) {
      return 'limit_reached';
    }
    if (contextStatus === 'error' || localError) {
      return 'error';
    }

    // リフレクションがあればloaded
    if (reflection) {
      return 'loaded';
    }

    return 'idle';
  }, [contextStatus, contextTask, reflection, localError, lastLimitReason]);

  return {
    reflectionState,
    reflection,
    fadeAnim,
    getReflection,
    loadSavedReflection,
    resetReflection,
    lastLimitReason,
    reflectionError,
    errorMessage: reflectionError?.message ?? null,
  };
};

interface ShowLimitAlertOptions {
  monthlyLimit?: number;
  featureName?: string;
  onUpgrade?: () => void;
}

/**
 * 利用制限エラーのアラートを表示
 */
export function showLimitAlert(
  limitReason: UsageLimitReason,
  options: ShowLimitAlertOptions = {},
): void {
  const { monthlyLimit, featureName = 'AIふりかえり', onUpgrade } = options;
  const buttons: { text: string; style?: 'cancel' | 'default' | 'destructive'; onPress?: () => void }[] = [
    { text: '閉じる', style: 'cancel' },
  ];
  if (onUpgrade) {
    buttons.push({ text: 'プレミアムを見る', onPress: onUpgrade });
  }

  switch (limitReason) {
    case 'MONTHLY_LIMIT_REACHED':
      Alert.alert(
        '今月の利用上限に達しました',
        monthlyLimit != null
          ? `無料プランでは月${monthlyLimit}回まで${featureName}機能をご利用いただけます。プレミアムプランにアップグレードすると無制限にご利用いただけます。`
          : `${featureName}の今月の利用上限に達しました。`,
        buttons,
      );
      break;

    case 'REGENERATE_NOT_ALLOWED':
      Alert.alert(
        '再生成はプレミアム機能です',
        featureName === 'AIふりかえり'
          ? '無料プランでは同じ日記のAIふりかえりを再生成することはできません。'
          : `無料プランでは${featureName}の再生成はご利用いただけません。`,
        buttons,
      );
      break;

    case 'DAILY_LIMIT_REACHED':
      Alert.alert(
        '本日の利用上限に達しました',
        '明日以降に再度お試しください。',
        [{ text: '閉じる', style: 'cancel' }],
      );
      break;

    default:
      Alert.alert('エラー', 'AIの生成に失敗しました。もう一度お試しください。');
  }
}
