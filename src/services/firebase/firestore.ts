/**
 * Firestore サービス
 * データベース操作関連の機能を提供
 */
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './config';
import { getCurrentUser } from './auth';

// 型定義
export interface UserSettings {
  birthday: string; // ISO 8601 format (YYYY-MM-DD)
  targetLifespan: number; // 目標寿命（年）
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
}

export interface HomeDisplaySettings {
  countdownMode: 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly';
  progressMode: 'bar' | 'circle';
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
    await userDoc.collection(COLLECTIONS.SETTINGS).doc('user').set(
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
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
    const doc = await userDoc.collection(COLLECTIONS.SETTINGS).doc('user').get();
    const docData = doc.data();

    if (docData) {
      return docData as UserSettings;
    }
    return null;
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

    await userDoc.collection(COLLECTIONS.DIARIES).doc(entry.id).set(
      {
        ...entry,
        updatedAt: now,
      },
      { merge: true }
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
    const snapshot = await userDoc
      .collection(COLLECTIONS.DIARIES)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as DiaryEntry);
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
    const doc = await userDoc.collection(COLLECTIONS.DIARIES).doc(date).get();
    const docData = doc.data();

    if (docData) {
      return docData as DiaryEntry;
    }
    return null;
  } catch (error) {
    console.error('日記の取得に失敗しました:', error);
    return null;
  }
};

/**
 * 日記を削除
 */
export const deleteDiaryEntryFromFirestore = async (id: string): Promise<void> => {
  try {
    const userDoc = getUserDocRef();
    await userDoc.collection(COLLECTIONS.DIARIES).doc(id).delete();
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

    const snapshot = await userDoc
      .collection(COLLECTIONS.DIARIES)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as DiaryEntry);
  } catch (error) {
    console.error('月別日記の取得に失敗しました:', error);
    return [];
  }
};
