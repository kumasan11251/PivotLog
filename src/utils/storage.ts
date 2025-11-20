import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  birthday: string; // ISO 8601 format (YYYY-MM-DD)
  targetLifespan: number; // 目標寿命（年）
}

const STORAGE_KEY = '@pivot_log_settings';

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
