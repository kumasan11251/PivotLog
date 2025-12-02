import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../services/firebase/auth';
import {
  saveUserSettingsToFirestore,
  loadUserSettingsFromFirestore,
  saveHomeDisplaySettingsToFirestore,
  loadHomeDisplaySettingsFromFirestore,
  saveDiaryEntryToFirestore,
  loadDiaryEntriesFromFirestore,
  getDiaryByDateFromFirestore,
  deleteDiaryEntryFromFirestore,
  deleteAllUserDataFromFirestore,
} from '../services/firebase/firestore';

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
  countdownMode: 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly'; // カウントダウン表示モード
  progressMode: 'bar' | 'circle'; // 進捗表示モード
}

const STORAGE_KEY = '@pivot_log_settings';
const DIARY_KEY = '@pivot_log_diaries';
const HOME_DISPLAY_KEY = '@pivot_log_home_display';
const MIGRATION_KEY = '@pivot_log_migrated';
const ONBOARDING_KEY = '@pivot_log_onboarding_complete';

/**
 * Firebaseにログイン中かどうかを確認
 */
const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * オンボーディングが完了しているかチェック
 */
export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('オンボーディング状態の読み込みに失敗:', error);
    return false;
  }
};

/**
 * オンボーディングを完了としてマーク
 */
export const setOnboardingComplete = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('オンボーディング状態の保存に失敗:', error);
    throw error;
  }
};

/**
 * AsyncStorageからFirestoreへデータを移行する
 * 初回ログイン時に一度だけ実行される
 */
export const migrateDataToFirestore = async (): Promise<{ migrated: boolean; settingsMigrated: boolean; diariesMigrated: number }> => {
  const result = { migrated: false, settingsMigrated: false, diariesMigrated: 0 };

  try {
    // 既に移行済みかチェック
    const migrationFlag = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrationFlag === 'true') {
      console.log('データ移行は既に完了しています');
      return result;
    }

    if (!isLoggedIn()) {
      console.log('ログインしていないため、移行をスキップします');
      return result;
    }

    console.log('AsyncStorage → Firestore へのデータ移行を開始...');

    // 1. ユーザー設定の移行
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEY);
    if (settingsJson) {
      const settings: UserSettings = JSON.parse(settingsJson);
      // Firestoreに既存データがあるかチェック
      const existingSettings = await loadUserSettingsFromFirestore();
      if (!existingSettings) {
        await saveUserSettingsToFirestore(settings);
        result.settingsMigrated = true;
        console.log('ユーザー設定を移行しました');
      }
    }

    // 2. 表示設定の移行
    const displayJson = await AsyncStorage.getItem(HOME_DISPLAY_KEY);
    if (displayJson) {
      const displaySettings: HomeDisplaySettings = JSON.parse(displayJson);
      const existingDisplay = await loadHomeDisplaySettingsFromFirestore();
      if (!existingDisplay) {
        await saveHomeDisplaySettingsToFirestore(displaySettings);
        console.log('表示設定を移行しました');
      }
    }

    // 3. 日記データの移行
    const diariesJson = await AsyncStorage.getItem(DIARY_KEY);
    if (diariesJson) {
      const diaries: DiaryEntry[] = JSON.parse(diariesJson);
      for (const diary of diaries) {
        // 既存の日記がないか確認してから保存
        const existingDiary = await getDiaryByDateFromFirestore(diary.id);
        if (!existingDiary) {
          await saveDiaryEntryToFirestore(diary);
          result.diariesMigrated++;
        }
      }
      console.log(`${result.diariesMigrated}件の日記を移行しました`);
    }

    // 移行完了フラグを設定
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    result.migrated = true;
    console.log('データ移行が完了しました');

    return result;
  } catch (error) {
    console.error('データ移行に失敗しました:', error);
    return result;
  }
};

/**
 * AsyncStorageにローカルデータが存在するかチェック
 */
export const hasLocalData = async (): Promise<boolean> => {
  try {
    const settings = await AsyncStorage.getItem(STORAGE_KEY);
    const diaries = await AsyncStorage.getItem(DIARY_KEY);
    return settings !== null || diaries !== null;
  } catch {
    return false;
  }
};

/**
 * 移行が完了しているかチェック
 */
export const isMigrationComplete = async (): Promise<boolean> => {
  try {
    const flag = await AsyncStorage.getItem(MIGRATION_KEY);
    return flag === 'true';
  } catch {
    return false;
  }
};

/**
 * ユーザー設定を保存する
 */
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  try {
    if (isLoggedIn()) {
      await saveUserSettingsToFirestore(settings);
    } else {
      const jsonValue = JSON.stringify(settings);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    }
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
    if (isLoggedIn()) {
      return await loadUserSettingsFromFirestore();
    } else {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    }
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
    if (isLoggedIn()) {
      await saveHomeDisplaySettingsToFirestore(settings);
    } else {
      const jsonValue = JSON.stringify(settings);
      await AsyncStorage.setItem(HOME_DISPLAY_KEY, jsonValue);
    }
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
    if (isLoggedIn()) {
      return await loadHomeDisplaySettingsFromFirestore();
    } else {
      const jsonValue = await AsyncStorage.getItem(HOME_DISPLAY_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    }
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
    if (isLoggedIn()) {
      await saveDiaryEntryToFirestore(entry);
    } else {
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
    }
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
    if (isLoggedIn()) {
      return await loadDiaryEntriesFromFirestore();
    } else {
      const jsonValue = await AsyncStorage.getItem(DIARY_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    }
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
    if (isLoggedIn()) {
      return await getDiaryByDateFromFirestore(date);
    } else {
      const diaries = await loadDiaryEntries();
      return diaries.find((entry) => entry.id === date) || null;
    }
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
    if (isLoggedIn()) {
      await deleteDiaryEntryFromFirestore(id);
    } else {
      const existingDiaries = await loadDiaryEntries();
      const filteredDiaries = existingDiaries.filter((entry) => entry.id !== id);

      const jsonValue = JSON.stringify(filteredDiaries);
      await AsyncStorage.setItem(DIARY_KEY, jsonValue);
    }
  } catch (error) {
    console.error('日記の削除に失敗しました:', error);
    throw error;
  }
};

/**
 * ユーザーの全データを削除する（アカウント削除時に使用）
 */
export const deleteAllUserData = async (): Promise<void> => {
  try {
    if (isLoggedIn()) {
      // Firestoreのデータを削除
      await deleteAllUserDataFromFirestore();
    }
    // ローカルストレージもクリア
    await AsyncStorage.multiRemove([STORAGE_KEY, DIARY_KEY, HOME_DISPLAY_KEY, MIGRATION_KEY]);
    console.log('すべてのユーザーデータを削除しました');
  } catch (error) {
    console.error('ユーザーデータの削除に失敗しました:', error);
    throw error;
  }
};
