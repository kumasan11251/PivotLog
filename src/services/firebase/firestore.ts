/**
 * Firestore サービス
 * データベース操作関連の機能を提供
 */
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './config';
import { getCurrentUser } from './auth';
import { withRetry } from '../../utils/retry';
import type { AIReflectionData } from '../../types/aiReflection';

// 型定義
export interface UserSettings {
  birthday: string; // ISO 8601 format (YYYY-MM-DD)
  targetLifespan: number; // 目標寿命（年）
  dayStartHour?: number; // 1日の開始時刻（0-12、デフォルト0）
  createdAt?: string;
  updatedAt?: string;
}

export interface DiaryEntry {
  id: string; // ユニークID（日付ベース: YYYY-MM-DD）
  date: string; // ISO 8601 format (YYYY-MM-DD)
  goodTime: string; // 時間を有効に使えたと思うこと
  wastedTime: string; // 時間を無駄にしたと思うこと
  tomorrow: string; // 明日はどう過ごしますか
  createdAt: string; // 作成日時 ISO 8601
  updatedAt: string; // 更新日時 ISO 8601
  aiReflection?: AIReflectionData; // PivotLogからの気づき（オプショナル）
}

export interface HomeDisplaySettings {
  countdownMode: 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly';
  progressMode: 'bar' | 'circle' | 'grid';
}

// ヘルパー関数
const getUserDocRef = () => {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('ユーザーがログインしていません');
  }
  return firestore().collection(COLLECTIONS.USERS).doc(user.uid);
};

// =============== ユーザー設定 ===============

/**
 * ユーザー設定を保存
 */
export const saveUserSettingsToFirestore = async (
  settings: UserSettings
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();

    await withRetry(
      async () => {
        await userDoc.collection(COLLECTIONS.SETTINGS).doc('user').set(
          {
            ...settings,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 設定保存リトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * ユーザー設定を読み込み
 */
export const loadUserSettingsFromFirestore = async (): Promise<UserSettings | null> => {
  try {
    const userDoc = getUserDocRef();

    return await withRetry(
      async () => {
        const doc = await userDoc.collection(COLLECTIONS.SETTINGS).doc('user').get();
        const docData = doc.data();
        return docData ? (docData as UserSettings) : null;
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 設定読み込みリトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    return null;
  }
};

// =============== 表示設定 ===============

/**
 * ホーム画面の表示設定を保存
 */
export const saveHomeDisplaySettingsToFirestore = async (
  settings: HomeDisplaySettings
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc.collection(COLLECTIONS.SETTINGS).doc('display').set(
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('表示設定の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * ホーム画面の表示設定を読み込み
 */
export const loadHomeDisplaySettingsFromFirestore = async (): Promise<HomeDisplaySettings | null> => {
  try {
    const userDoc = getUserDocRef();
    const doc = await userDoc.collection(COLLECTIONS.SETTINGS).doc('display').get();
    const docData = doc.data();

    if (docData) {
      return docData as HomeDisplaySettings;
    }
    return null;
  } catch (error) {
    console.error('表示設定の読み込みに失敗しました:', error);
    return null;
  }
};

// =============== ウィジェット設定 ===============

export interface WidgetSettingsFirestore {
  customText: string;
  messageSource?: string;
  showStreak?: boolean;
  showDiaryStatus?: boolean;
  showDateHeader?: boolean;
  countdownMode?: string;
  updatedAt?: string;
}

/**
 * ウィジェット設定をFirestoreに保存
 */
export const saveWidgetSettingsToFirestore = async (
  settings: WidgetSettingsFirestore
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc.collection(COLLECTIONS.SETTINGS).doc('widget').set(
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('ウィジェット設定の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * ウィジェット設定をFirestoreから読み込み
 */
export const loadWidgetSettingsFromFirestore = async (): Promise<WidgetSettingsFirestore | null> => {
  try {
    const userDoc = getUserDocRef();
    const doc = await userDoc.collection(COLLECTIONS.SETTINGS).doc('widget').get();
    const docData = doc.data();

    if (docData) {
      return docData as WidgetSettingsFirestore;
    }
    return null;
  } catch (error) {
    console.error('ウィジェット設定の読み込みに失敗しました:', error);
    return null;
  }
};

// =============== 日記 ===============

/**
 * 日記を保存（新規作成または更新）
 */
export const saveDiaryEntryToFirestore = async (
  entry: DiaryEntry
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    const now = new Date().toISOString();

    await withRetry(
      async () => {
        await userDoc.collection(COLLECTIONS.DIARIES).doc(entry.id).set(
          {
            ...entry,
            updatedAt: now,
          },
          { merge: true }
        );
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 日記保存リトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('日記の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * すべての日記を読み込み（日付降順）
 */
export const loadDiaryEntriesFromFirestore = async (): Promise<DiaryEntry[]> => {
  try {
    const userDoc = getUserDocRef();

    return await withRetry(
      async () => {
        const snapshot = await userDoc
          .collection(COLLECTIONS.DIARIES)
          .orderBy('date', 'desc')
          .get();
        return snapshot.docs.map((doc) => doc.data() as DiaryEntry);
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 日記一覧読み込みリトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('日記の読み込みに失敗しました:', error);
    return [];
  }
};

/**
 * 特定の日付の日記を取得
 */
export const getDiaryByDateFromFirestore = async (
  date: string
): Promise<DiaryEntry | null> => {
  try {
    const userDoc = getUserDocRef();

    return await withRetry(
      async () => {
        const doc = await userDoc.collection(COLLECTIONS.DIARIES).doc(date).get();
        const docData = doc.data();
        return docData ? (docData as DiaryEntry) : null;
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 日記取得リトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('日記の取得に失敗しました:', error);
    return null;
  }
};

/**
 * 日記を削除
 * 日記のドキュメントを削除し、関連するAIリフレクションの生成履歴も削除する
 */
export const deleteDiaryEntryFromFirestore = async (id: string): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc.collection(COLLECTIONS.DIARIES).doc(id).delete();
    console.log(`[Firestore] 日記 ${id} を削除しました`);

    // AIリフレクションの生成履歴も削除（月間利用回数は維持）
    // idは日付形式（YYYY-MM-DD）なので、そのまま使用
    try {
      const usageRef = userDoc.collection(COLLECTIONS.USAGE).doc('aiReflection');
      const usageDoc = await usageRef.get();

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        if (data?.reflectionHistory && data.reflectionHistory[id]) {
          // reflectionHistoryから該当日付のエントリを削除
          const updatedReflectionHistory = { ...data.reflectionHistory };
          delete updatedReflectionHistory[id];

          await usageRef.update({
            reflectionHistory: updatedReflectionHistory,
            updatedAt: new Date().toISOString(),
          });
          console.log(`[Firestore] 日記 ${id} の生成履歴を削除しました`);
        } else {
          console.log(`[Firestore] 日記 ${id} の生成履歴は存在しませんでした`);
        }
      }
    } catch (usageError) {
      // 生成履歴の削除に失敗しても日記削除は成功として扱う
      console.error('[Firestore] 生成履歴の削除に失敗:', usageError);
    }
  } catch (error) {
    console.error('日記の削除に失敗しました:', error);
    throw error;
  }
};

/**
 * 月ごとの日記を取得
 */
export const getDiariesByMonthFromFirestore = async (
  year: number,
  month: number
): Promise<DiaryEntry[]> => {
  try {
    const userDoc = getUserDocRef();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    return await withRetry(
      async () => {
        const snapshot = await userDoc
          .collection(COLLECTIONS.DIARIES)
          .where('date', '>=', startDate)
          .where('date', '<=', endDate)
          .orderBy('date', 'desc')
          .get();
        return snapshot.docs.map((doc) => doc.data() as DiaryEntry);
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 月別日記取得リトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('月別日記の取得に失敗しました:', error);
    return [];
  }
};

/**
 * ユーザーのすべてのデータを削除（アカウント削除時に使用）
 */
export const deleteAllUserDataFromFirestore = async (): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    const batch = firestore().batch();

    // 設定を削除
    const settingsSnapshot = await userDoc.collection(COLLECTIONS.SETTINGS).get();
    settingsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // すべての日記を削除
    const diariesSnapshot = await userDoc.collection(COLLECTIONS.DIARIES).get();
    diariesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // すべての週次インサイトを削除
    const insightsSnapshot = await userDoc.collection(COLLECTIONS.WEEKLY_INSIGHTS).get();
    insightsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // バッチ処理を実行
    await batch.commit();

    // ユーザードキュメント自体を削除（存在する場合）
    await userDoc.delete();

    console.log('Firestoreのユーザーデータを削除しました');
  } catch (error) {
    console.error('Firestoreデータの削除に失敗しました:', error);
    throw error;
  }
};

// =============== 週次インサイト ===============

/**
 * 週次インサイトのデータ構造（Firestore用・V1）
 */
export interface WeeklyInsightDocument {
  weekKey: string; // YYYY-Www形式 (例: 2026-W04)
  weekStartDate: string;
  weekEndDate: string;
  entryCount: number;
  summary: string;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
    insight?: string; // V2のみ
  }>;
  question: string;
  generatedAt: string;
  modelVersion?: string;
  // V2 追加フィールド
  schemaVersion?: 2;
  intentionToAction?: {
    achieved: Array<{
      intentionDate: string;
      intention: string;
      achievedDate: string;
      achievement: string;
    }>;
    successAnalysis: string;
    celebration: string;
  };
  actionSuggestion?: {
    mainSuggestion: {
      action: string;
      reason: string;
      suggestedTiming: string;
    };
    keepDoing?: string;
  };
}

/**
 * 週次インサイトを保存
 */
export const saveWeeklyInsightToFirestore = async (
  insight: WeeklyInsightDocument
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc
      .collection(COLLECTIONS.WEEKLY_INSIGHTS)
      .doc(insight.weekKey)
      .set({
        ...insight,
        updatedAt: new Date().toISOString(),
      });
  } catch (error) {
    console.error('[Firestore] 週次インサイトの保存に失敗しました:', error);
    throw error;
  }
};

/**
 * 特定の週の週次インサイトを取得
 */
export const getWeeklyInsightFromFirestore = async (
  weekKey: string
): Promise<WeeklyInsightDocument | null> => {
  try {
    const userDoc = getUserDocRef();
    const doc = await userDoc
      .collection(COLLECTIONS.WEEKLY_INSIGHTS)
      .doc(weekKey)
      .get();

    if (doc.exists()) {
      const data = doc.data() as WeeklyInsightDocument;
      return data;
    }
    return null;
  } catch (error) {
    console.error('[Firestore] 週次インサイトの取得に失敗しました:', error);
    return null;
  }
};

/**
 * 特定の週の週次インサイトキャッシュを削除
 */
export const deleteWeeklyInsightFromFirestore = async (
  weekKey: string
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc
      .collection(COLLECTIONS.WEEKLY_INSIGHTS)
      .doc(weekKey)
      .delete();
  } catch (error) {
    console.error('[Firestore] 週次インサイトの削除に失敗しました:', error);
    throw error;
  }
};

/**
 * 最新の週次インサイトを取得（複数件）
 */
export const getRecentWeeklyInsightsFromFirestore = async (
  limit: number = 4
): Promise<WeeklyInsightDocument[]> => {
  try {
    const userDoc = getUserDocRef();
    const snapshot = await userDoc
      .collection(COLLECTIONS.WEEKLY_INSIGHTS)
      .orderBy('weekStartDate', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as WeeklyInsightDocument);
  } catch (error) {
    console.error('週次インサイト一覧の取得に失敗しました:', error);
    return [];
  }
};

/**
 * 指定期間内の日記を取得（週次インサイト生成用）
 */
export const getDiariesByDateRangeFromFirestore = async (
  startDate: string,
  endDate: string
): Promise<DiaryEntry[]> => {
  try {
    const userDoc = getUserDocRef();

    return await withRetry(
      async () => {
        const snapshot = await userDoc
          .collection(COLLECTIONS.DIARIES)
          .where('date', '>=', startDate)
          .where('date', '<=', endDate)
          .orderBy('date', 'asc')
          .get();
        return snapshot.docs.map((doc) => doc.data() as DiaryEntry);
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, error) => {
          console.warn(`[Firestore] 期間指定日記取得リトライ (${attempt}/3):`, error.message);
        },
      }
    );
  } catch (error) {
    console.error('期間指定日記の取得に失敗しました:', error);
    return [];
  }
};

// =============== 月次インサイト ===============

/**
 * ストーリーラインのムード型
 */
type StorylineMood = 'busy' | 'peaceful' | 'challenging' | 'growing' | 'joyful' | 'reflective';

/**
 * 月次インサイトのデータ構造（Firestore用・新構造）
 * 注意：既存データとの後方互換性のため、新フィールドはオプショナル
 */
export interface MonthlyInsightDocument {
  monthKey: string; // YYYY-MM形式 (例: 2026-01)
  monthStartDate: string;
  monthEndDate: string;
  entryCount: number;
  // 新セクション（オプショナル：既存データとの互換性）
  lifeContextSummary?: string;
  storyline?: {
    beginning: {
      period: string;
      summary: string;
      keyQuote?: string;
      mood: StorylineMood;
    };
    middle: {
      period: string;
      summary: string;
      keyQuote?: string;
      mood: StorylineMood;
    };
    end: {
      period: string;
      summary: string;
      keyQuote?: string;
      mood: StorylineMood;
    };
  };
  valueDiscovery?: {
    primaryValue: {
      name: string;
      evidence: string[];
      insight: string;
    };
    secondaryValues: Array<{
      name: string;
      briefEvidence: string;
    }>;
    hiddenInsight: string;
  };
  highlights: Array<{
    date: string;
    type: 'achievement' | 'connection' | 'discovery' | 'turning_point';
    title: string;
    description: string;
    quote?: string;
  }>;
  letterToFutureSelf?: string;
  growth: {
    improvements: string[];
    challenges: string[];
    transformation?: string;
  };
  question: string;
  generatedAt: string;
  modelVersion?: string;
  // 後方互換性（旧フィールド）
  summary?: string;
  themes?: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
  }>;
}

/**
 * オブジェクトからundefined値を再帰的に除去
 * Firestoreはundefined値をサポートしないため、保存前に除去が必要
 */
const removeUndefinedFields = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // undefinedはスキップ
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // ネストされたオブジェクトを再帰的に処理
      result[key] = removeUndefinedFields(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // 配列内のオブジェクトも処理
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object'
          ? removeUndefinedFields(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result as Partial<T>;
};

/**
 * 月次インサイトを保存
 */
export const saveMonthlyInsightToFirestore = async (
  insight: MonthlyInsightDocument
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    // undefinedフィールドを除去してから保存
    const cleanedInsight = removeUndefinedFields(insight as unknown as Record<string, unknown>);
    await userDoc
      .collection(COLLECTIONS.MONTHLY_INSIGHTS)
      .doc(insight.monthKey)
      .set({
        ...cleanedInsight,
        updatedAt: new Date().toISOString(),
      });
  } catch (error) {
    console.error('[Firestore] 月次インサイトの保存に失敗しました:', error);
    throw error;
  }
};

/**
 * 特定の月の月次インサイトを取得
 */
export const getMonthlyInsightFromFirestore = async (
  monthKey: string
): Promise<MonthlyInsightDocument | null> => {
  try {
    const userDoc = getUserDocRef();
    const doc = await userDoc
      .collection(COLLECTIONS.MONTHLY_INSIGHTS)
      .doc(monthKey)
      .get();

    if (doc.exists()) {
      const data = doc.data() as MonthlyInsightDocument;
      return data;
    }
    return null;
  } catch (error) {
    console.error('[Firestore] 月次インサイトの取得に失敗しました:', error);
    return null;
  }
};

/**
 * 特定の月の月次インサイトキャッシュを削除
 */
export const deleteMonthlyInsightFromFirestore = async (
  monthKey: string
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc
      .collection(COLLECTIONS.MONTHLY_INSIGHTS)
      .doc(monthKey)
      .delete();
  } catch (error) {
    console.error('[Firestore] 月次インサイトの削除に失敗しました:', error);
    throw error;
  }
};

/**
 * 最新の月次インサイトを取得（複数件）
 */
export const getRecentMonthlyInsightsFromFirestore = async (
  limit: number = 6
): Promise<MonthlyInsightDocument[]> => {
  try {
    const userDoc = getUserDocRef();
    const snapshot = await userDoc
      .collection(COLLECTIONS.MONTHLY_INSIGHTS)
      .orderBy('monthStartDate', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as MonthlyInsightDocument);
  } catch (error) {
    console.error('月次インサイト一覧の取得に失敗しました:', error);
    return [];
  }
};

// =============== AI同意状態 ===============

import type { AIConsentStatus } from '../../types/aiConsent';

/**
 * AI同意状態を保存
 */
export const saveAIConsentToFirestore = async (
  consent: AIConsentStatus
): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc.collection(COLLECTIONS.SETTINGS).doc('aiConsent').set(
      {
        ...consent,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('AI同意状態の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * AI同意状態を読み込み
 */
export const loadAIConsentFromFirestore = async (): Promise<AIConsentStatus | null> => {
  try {
    const userDoc = getUserDocRef();
    const doc = await userDoc.collection(COLLECTIONS.SETTINGS).doc('aiConsent').get();
    const docData = doc.data();

    if (docData) {
      return docData as AIConsentStatus;
    }
    return null;
  } catch (error) {
    console.error('AI同意状態の読み込みに失敗しました:', error);
    return null;
  }
};
