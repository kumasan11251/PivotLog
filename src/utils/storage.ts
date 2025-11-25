import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  birthday: string; // ISO 8601 format (YYYY-MM-DD)
  targetLifespan: number; // 目標寿命（年）
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
  countdownMode: 'detailed' | 'daysOnly' | 'yearsOnly'; // カウントダウン表示モード
  progressMode: 'bar' | 'circle'; // 進捗表示モード
}

const STORAGE_KEY = '@pivot_log_settings';
const DIARY_KEY = '@pivot_log_diaries';
const HOME_DISPLAY_KEY = '@pivot_log_home_display';

/**
 * ユーザー設定を保存する
 */
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * ユーザー設定を読み込む
 */
export const loadUserSettings = async (): Promise<UserSettings | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    return null;
  }
};

/**
 * ホーム画面の表示設定を保存する
 */
export const saveHomeDisplaySettings = async (settings: HomeDisplaySettings): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(HOME_DISPLAY_KEY, jsonValue);
  } catch (error) {
    console.error('ホーム画面表示設定の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * ホーム画面の表示設定を読み込む
 */
export const loadHomeDisplaySettings = async (): Promise<HomeDisplaySettings | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(HOME_DISPLAY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('ホーム画面表示設定の読み込みに失敗しました:', error);
    return null;
  }
};

/**
 * ユーザー設定を削除する
 */
export const clearUserSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('設定の削除に失敗しました:', error);
    throw error;
  }
};

/**
 * 日記を保存する（新規作成または更新）
 */
export const saveDiaryEntry = async (entry: DiaryEntry): Promise<void> => {
  try {
    const existingDiaries = await loadDiaryEntries();
    const index = existingDiaries.findIndex((e) => e.id === entry.id);

    if (index >= 0) {
      // 既存の日記を更新
      existingDiaries[index] = { ...entry, updatedAt: new Date().toISOString() };
    } else {
      // 新しい日記を追加
      existingDiaries.push(entry);
    }

    // 日付順でソート（新しい順）
    existingDiaries.sort((a, b) => b.date.localeCompare(a.date));

    const jsonValue = JSON.stringify(existingDiaries);
    await AsyncStorage.setItem(DIARY_KEY, jsonValue);
  } catch (error) {
    console.error('日記の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * すべての日記を読み込む
 */
export const loadDiaryEntries = async (): Promise<DiaryEntry[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(DIARY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('日記の読み込みに失敗しました:', error);
    return [];
  }
};

/**
 * 特定の日付の日記を取得
 */
export const getDiaryByDate = async (date: string): Promise<DiaryEntry | null> => {
  try {
    const diaries = await loadDiaryEntries();
    return diaries.find((entry) => entry.id === date) || null;
  } catch (error) {
    console.error('日記の取得に失敗しました:', error);
    return null;
  }
};

/**
 * 日記を削除する
 */
export const deleteDiaryEntry = async (id: string): Promise<void> => {
  try {
    const existingDiaries = await loadDiaryEntries();
    const filteredDiaries = existingDiaries.filter((entry) => entry.id !== id);

    const jsonValue = JSON.stringify(filteredDiaries);
    await AsyncStorage.setItem(DIARY_KEY, jsonValue);
  } catch (error) {
    console.error('日記の削除に失敗しました:', error);
    throw error;
  }
};
