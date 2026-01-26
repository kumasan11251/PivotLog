/**
 * AIリフレクション利用制限管理フック
 *
 * サブスクリプション状態と利用状況を統合して管理
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { checkAIReflectionLimit } from '../services/firebase/aiUsage';
import type { UsageLimitCheckResult } from '../types/subscription';

interface UseAIReflectionLimitProps {
  /** 日記の日付（YYYY-MM-DD形式） */
  diaryDate: string;
  /** ローカルにリフレクションがあるかどうか（AsyncStorage等） */
  hasLocalReflection?: boolean;
}

interface UseAIReflectionLimitReturn {
  /** プレミアムかどうか */
  isPremium: boolean;
  /** 今月の利用回数 */
  monthlyUsed: number;
  /** 今月の上限（無制限の場合はnull） */
  monthlyLimit: number | null;
  /** 今月の残り回数（無制限の場合はnull） */
  remainingThisMonth: number | null;
  /** 再生成可能かどうか */
  canRegenerate: boolean;
  /** この日記の再生成回数 */
  diaryRegenerateCount: number;
  /** この日記の再生成上限 */
  diaryRegenerateLimit: number;
  /** この日記の残り再生成回数 */
  remainingRegenerations: number | null;
  /** 生成可能かどうか */
  canGenerate: boolean;
  /** 制限に達している場合の理由 */
  limitReason: UsageLimitCheckResult['limitReason'];
  /** 読み込み中かどうか */
  isLoading: boolean;
  /** 利用状況を再読み込み */
  refreshUsage: () => Promise<void>;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * AIリフレクションの利用制限を管理するカスタムフック
 */
export const useAIReflectionLimit = ({
  diaryDate,
  hasLocalReflection = false,
}: UseAIReflectionLimitProps): UseAIReflectionLimitReturn => {
  const { isPremium, limits, tier } = useSubscription();

  const [usageCheck, setUsageCheck] = useState<UsageLimitCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 利用状況を取得
  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkAIReflectionLimit(diaryDate, tier, limits);
      setUsageCheck(result);
    } catch (err) {
      console.error('[useAIReflectionLimit] Error fetching usage:', err);
      setError('利用状況の取得に失敗しました');
      // エラー時はデフォルト値を設定（安全のため制限を厳しめに）
      setUsageCheck({
        canGenerate: false,
        limitReason: 'MONTHLY_LIMIT_REACHED',
        remainingThisMonth: 0,
        remainingRegenerations: 0,
        usedThisMonth: 0,
        regenerationsUsed: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [diaryDate, tier, limits]);

  // 初回読み込み
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // 既にリフレクションが生成されているか
  // 1. Firestoreの利用履歴にregenerationsUsed > 0がある
  // 2. limitReasonがREGENERATE_NOT_ALLOWEDまたはDIARY_REGENERATE_LIMIT
  // 3. ローカル（AsyncStorage）にリフレクションが保存されている
  const hasExistingReflection = useMemo(() => {
    // ローカルにリフレクションがある場合は既に生成済み
    if (hasLocalReflection) return true;

    if (!usageCheck) return false;
    // Firestoreの利用履歴で判定
    return usageCheck.regenerationsUsed > 0 ||
           usageCheck.limitReason === 'REGENERATE_NOT_ALLOWED' ||
           usageCheck.limitReason === 'DIARY_REGENERATE_LIMIT';
  }, [usageCheck, hasLocalReflection]);

  // 再生成可能かどうか
  const canRegenerate = useMemo(() => {
    if (!usageCheck) return false;

    // まだリフレクションがない場合は再生成の判定は関係ない（初回生成可能）
    if (!hasExistingReflection) {
      return true;
    }

    // 既にリフレクションがある場合
    // プレミアムユーザーは再生成可能（上限まで）
    if (isPremium) {
      return usageCheck.remainingRegenerations !== null &&
             usageCheck.remainingRegenerations > 0;
    }
    // 無料ユーザーは再生成不可
    return false;
  }, [usageCheck, isPremium, hasExistingReflection]);

  // 月間上限
  const monthlyLimit = useMemo(() => {
    if (isPremium) return null; // 無制限
    return limits.freeMonthlyReflectionLimit;
  }, [isPremium, limits]);

  // 残り再生成回数を計算
  const remainingRegenerations = useMemo(() => {
    if (!usageCheck) return null;
    return usageCheck.remainingRegenerations;
  }, [usageCheck]);

  return {
    isPremium,
    monthlyUsed: usageCheck?.usedThisMonth || 0,
    monthlyLimit,
    remainingThisMonth: usageCheck?.remainingThisMonth ?? null,
    canRegenerate,
    diaryRegenerateCount: usageCheck?.regenerationsUsed || 0,
    diaryRegenerateLimit: isPremium ? limits.premiumDiaryRegenerateLimit : 0,
    remainingRegenerations,
    canGenerate: usageCheck?.canGenerate || false,
    limitReason: usageCheck?.limitReason,
    isLoading,
    refreshUsage: fetchUsage,
    error,
  };
};

export default useAIReflectionLimit;
