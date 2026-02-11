/**
 * AI利用状況管理サービス
 *
 * AIリフレクション、週次・月次インサイトの利用状況をFirestoreで管理
 */
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './config';
import { getCurrentUser } from './auth';
import type {
  AIReflectionUsage,
  DiaryReflectionRecord,
  UsageLimitCheckResult,
  SubscriptionTier,
  AIUsageLimits,
} from '../../types/subscription';
import { DEFAULT_AI_USAGE_LIMITS } from '../../types/subscription';

// ドキュメントID
const AI_REFLECTION_USAGE_DOC = 'aiReflection';

// ヘルパー関数
const getUserUsageRef = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('ユーザーがログインしていません');
  }
  return firestore()
    .collection(COLLECTIONS.USERS)
    .doc(user.uid)
    .collection(COLLECTIONS.USAGE);
};

/**
 * 現在の年月を取得（YYYY-MM形式）
 */
export const getCurrentYearMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * 現在の日付を取得（YYYY-MM-DD形式）
 */
export const getCurrentDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * AIリフレクションの利用状況を取得
 */
export const getAIReflectionUsage = async (): Promise<AIReflectionUsage | null> => {
  try {
    const usageRef = getUserUsageRef();
    const doc = await usageRef.doc(AI_REFLECTION_USAGE_DOC).get();

    if (Boolean(doc.exists)) {
      return doc.data() as AIReflectionUsage;
    }
    return null;
  } catch (error) {
    console.error('[Usage] AIリフレクション利用状況の取得に失敗:', error);
    return null;
  }
};

/**
 * 今月の利用回数を取得
 */
export const getMonthlyUsageCount = async (): Promise<number> => {
  try {
    const usage = await getAIReflectionUsage();
    if (!usage) return 0;

    const currentMonth = getCurrentYearMonth();
    return usage.monthlyUsage?.[currentMonth]?.count || 0;
  } catch (error) {
    console.error('[Usage] 月次利用回数の取得に失敗:', error);
    return 0;
  }
};

/**
 * 特定の日記のリフレクション生成履歴を取得
 */
export const getDiaryReflectionRecord = async (
  diaryDate: string
): Promise<DiaryReflectionRecord | null> => {
  try {
    const usage = await getAIReflectionUsage();
    if (!usage) return null;

    return usage.reflectionHistory?.[diaryDate] || null;
  } catch (error) {
    console.error('[Usage] 日記リフレクション履歴の取得に失敗:', error);
    return null;
  }
};

/**
 * AIリフレクションの利用可否をチェック
 */
export const checkAIReflectionLimit = async (
  diaryDate: string,
  tier: SubscriptionTier,
  limits: AIUsageLimits = DEFAULT_AI_USAGE_LIMITS
): Promise<UsageLimitCheckResult> => {
  try {
    const usage = await getAIReflectionUsage();
    const currentMonth = getCurrentYearMonth();
    const currentDateStr = getCurrentDate();

    // 今月の利用回数
    const usedThisMonth = usage?.monthlyUsage?.[currentMonth]?.count || 0;

    // 今日の利用回数
    const usedToday = usage?.dailyUsage?.[currentDateStr] || 0;

    // この日記の総生成回数（regenerateCountは「総生成回数」）
    const diaryRecord = usage?.reflectionHistory?.[diaryDate];
    const totalGenerations = diaryRecord?.regenerateCount || 0;
    const hasExistingReflection = totalGenerations > 0;
    // 実際の再生成回数 = 総生成回数 - 1（初回生成を除く）
    const actualRegenerations = totalGenerations > 0 ? totalGenerations - 1 : 0;

    const isPremium = tier === 'premium';

    // 無料ユーザーの制限チェック
    if (!isPremium) {
      // 機能自体が利用不可（制限が0の場合）
      if (limits.freeMonthlyReflectionLimit === 0) {
        return {
          canGenerate: false,
          limitReason: 'FEATURE_NOT_AVAILABLE',
          remainingThisMonth: 0,
          remainingRegenerations: null,
          usedThisMonth,
          regenerationsUsed: actualRegenerations,
        };
      }

      // 月間制限チェック
      if (usedThisMonth >= limits.freeMonthlyReflectionLimit) {
        return {
          canGenerate: false,
          limitReason: 'MONTHLY_LIMIT_REACHED',
          remainingThisMonth: 0,
          remainingRegenerations: null,
          usedThisMonth,
          regenerationsUsed: actualRegenerations,
        };
      }

      // 再生成不可（無料ユーザーは同じ日記で再生成できない）
      if (hasExistingReflection) {
        return {
          canGenerate: false,
          limitReason: 'REGENERATE_NOT_ALLOWED',
          remainingThisMonth: limits.freeMonthlyReflectionLimit - usedThisMonth,
          remainingRegenerations: null,
          usedThisMonth,
          regenerationsUsed: actualRegenerations,
        };
      }

      return {
        canGenerate: true,
        remainingThisMonth: limits.freeMonthlyReflectionLimit - usedThisMonth,
        remainingRegenerations: null, // 無料は再生成不可
        usedThisMonth,
        regenerationsUsed: actualRegenerations,
      };
    }

    // プレミアムユーザーの制限チェック
    // 1日の利用上限チェック
    if (usedToday >= limits.premiumDailyLimit) {
      return {
        canGenerate: false,
        limitReason: 'DAILY_LIMIT_REACHED',
        remainingThisMonth: null, // 無制限
        remainingRegenerations: null, // 無制限
        usedThisMonth,
        regenerationsUsed: actualRegenerations,
      };
    }

    return {
      canGenerate: true,
      remainingThisMonth: null, // プレミアムは月間無制限
      remainingRegenerations: null, // プレミアムは再生成無制限
      usedThisMonth,
      regenerationsUsed: actualRegenerations,
    };
  } catch (error) {
    console.error('[Usage] 利用制限チェックに失敗:', error);
    // エラー時は安全のため生成を許可しない
    return {
      canGenerate: false,
      limitReason: 'MONTHLY_LIMIT_REACHED',
      remainingThisMonth: 0,
      remainingRegenerations: null,
      usedThisMonth: 0,
      regenerationsUsed: 0,
    };
  }
};

/**
 * AIリフレクション生成後の利用状況を更新
 * ※ 通常はCloud Functions側で更新されるが、クライアント側でも呼び出し可能
 */
export const recordAIReflectionUsage = async (
  diaryDate: string
): Promise<void> => {
  try {
    const usageRef = getUserUsageRef();
    const currentMonth = getCurrentYearMonth();
    const now = new Date().toISOString();

    // 現在の利用状況を取得
    const doc = await usageRef.doc(AI_REFLECTION_USAGE_DOC).get();
    const currentUsage = Boolean(doc.exists) ? (doc.data() as AIReflectionUsage) : null;

    // 月次カウントを更新
    const currentMonthlyCount = currentUsage?.monthlyUsage?.[currentMonth]?.count || 0;

    // 日記の再生成カウントを更新
    const existingRecord = currentUsage?.reflectionHistory?.[diaryDate];
    const isRegenerate = existingRecord != null;

    const updatedUsage: Partial<AIReflectionUsage> = {
      monthlyUsage: {
        ...(currentUsage?.monthlyUsage || {}),
        [currentMonth]: {
          count: currentMonthlyCount + 1,
          lastGeneratedAt: now,
        },
      },
      reflectionHistory: {
        ...(currentUsage?.reflectionHistory || {}),
        [diaryDate]: {
          generatedAt: isRegenerate
            ? existingRecord.generatedAt
            : now,
          regenerateCount: isRegenerate
            ? existingRecord.regenerateCount + 1
            : 1,
          lastRegeneratedAt: isRegenerate ? now : undefined,
        },
      },
      updatedAt: now,
    };

    await usageRef.doc(AI_REFLECTION_USAGE_DOC).set(updatedUsage, { merge: true });

    console.log('[Usage] AIリフレクション利用状況を更新しました');
  } catch (error) {
    console.error('[Usage] AIリフレクション利用状況の更新に失敗:', error);
    // 利用状況の更新失敗は致命的でないので、エラーを投げない
  }
};

/**
 * 特定の日記の生成履歴を削除
 * 日記を削除した際に呼び出す（月間利用回数は維持される）
 */
export const deleteDiaryReflectionHistory = async (
  diaryDate: string
): Promise<void> => {
  try {
    const usageRef = getUserUsageRef();
    const usageDoc = await usageRef.doc(AI_REFLECTION_USAGE_DOC).get();

    if (Boolean(usageDoc.exists)) {
      const data = usageDoc.data() as AIReflectionUsage | undefined;
      if (data?.reflectionHistory && data.reflectionHistory[diaryDate]) {
        // reflectionHistoryから該当日付のエントリを削除
        const updatedReflectionHistory = { ...data.reflectionHistory };
        delete updatedReflectionHistory[diaryDate];

        await usageRef.doc(AI_REFLECTION_USAGE_DOC).update({
          reflectionHistory: updatedReflectionHistory,
          updatedAt: new Date().toISOString(),
        });
        console.log(`[Usage] 日記 ${diaryDate} の生成履歴を削除しました`);
      } else {
        console.log(`[Usage] 日記 ${diaryDate} の生成履歴は存在しませんでした`);
      }
    }
  } catch (error) {
    // エラーをログに記録するが、日記削除自体は失敗させない
    console.error('[Usage] 日記の生成履歴の削除に失敗:', error);
  }
};

/**
 * 利用状況をリセット（開発用）
 */
export const resetAIReflectionUsage = async (): Promise<void> => {
  try {
    const usageRef = getUserUsageRef();
    await usageRef.doc(AI_REFLECTION_USAGE_DOC).delete();
    console.log('[Usage] AIリフレクション利用状況をリセットしました');
  } catch (error) {
    console.error('[Usage] AIリフレクション利用状況のリセットに失敗:', error);
    throw error;
  }
};

/**
 * 生成履歴のみをリセット（開発用）
 * 月間利用回数は維持される
 */
export const resetReflectionHistory = async (): Promise<void> => {
  try {
    const usageRef = getUserUsageRef();
    await usageRef.doc(AI_REFLECTION_USAGE_DOC).update({
      reflectionHistory: {},
      updatedAt: new Date().toISOString(),
    });
    console.log('[Usage] 生成履歴をリセットしました（月間利用回数は維持）');
  } catch (error) {
    console.error('[Usage] 生成履歴のリセットに失敗:', error);
    throw error;
  }
};

/**
 * 今月の利用回数のみをリセット（開発用）
 */
export const resetMonthlyUsage = async (): Promise<void> => {
  try {
    const usageRef = getUserUsageRef();
    const currentMonth = getCurrentYearMonth();

    await usageRef.doc(AI_REFLECTION_USAGE_DOC).set(
      {
        [`monthlyUsage.${currentMonth}`]: firestore.FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log('[Usage] 今月の利用回数をリセットしました');
  } catch (error) {
    console.error('[Usage] 月次利用回数のリセットに失敗:', error);
    throw error;
  }
};
