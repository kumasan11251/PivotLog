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
  getDiariesByMonthFromFirestore,
  getDiariesByDateRangeFromFirestore,
  saveAIConsentToFirestore,
  loadAIConsentFromFirestore,
} from '../services/firebase/firestore';
import type { AIReflectionData } from '../types/aiReflection';
import type { AIConsentStatus } from '../types/aiConsent';
import { CURRENT_CONSENT_VERSION } from '../types/aiConsent';
import { addToSyncQueue, clearSyncQueue } from './syncQueue';

export interface UserSettings {
  birthday: string; // ISO 8601 format (YYYY-MM-DD)
  targetLifespan: number; // 目標寿命（年）
  dayStartHour?: number; // 1日の開始時刻（0-12、デフォルト0）
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
  countdownMode: 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly'; // カウントダウン表示モード
  progressMode: 'bar' | 'circle' | 'grid'; // 進捗表示モード
}

export interface ThemeSettings {
  themeMode: 'light' | 'dark' | 'system'; // テーマモード
}

export type DiaryViewMode = 'list' | 'calendar';

const STORAGE_KEY = '@pivot_log_settings';
const DIARY_KEY = '@pivot_log_diaries';
const HOME_DISPLAY_KEY = '@pivot_log_home_display';
const MIGRATION_KEY = '@pivot_log_migrated';
const ONBOARDING_KEY = '@pivot_log_onboarding_complete';
const THEME_KEY = '@pivot_log_theme';
const AI_CONSENT_KEY = '@pivot_log_ai_consent';
const DIARY_VIEW_MODE_KEY = '@pivot_log_diary_view_mode';

/**
 * Firebaseにログイン中かどうかを確認
 */
const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * UID付きキャッシュキーを生成（ログイン前データとの衝突回避）
 * isLoggedIn()チェックの内側でのみ呼ぶ前提
 */
const getCacheKey = (suffix: string): string => {
  const user = getCurrentUser();
  return `@pivot_log_cache_${user!.uid}_${suffix}`;
};

/**
 * オンボーディングが完了しているかチェック
 */
export const isOnboardingComplete = async (): Promise<boolean> => {
  try {
    const key = getCacheKey('onboarding');
    const value = await AsyncStorage.getItem(key);
    if (value === 'true') return true;
    // レガシーのグローバルキーをチェック → 見つかったら新キーへ移行
    const legacyValue = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (legacyValue === 'true') {
      await AsyncStorage.setItem(key, 'true');
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      return true;
    }
    return false;
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
    const key = getCacheKey('onboarding');
    await AsyncStorage.setItem(key, 'true');
    // レガシーのグローバルキーを削除
    await AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {});
  } catch (error) {
    console.error('オンボーディング状態の保存に失敗:', error);
    throw error;
  }
};

/**
 * オンボーディング状態をリセット（デバッグ用）
 */
export const resetOnboarding = async (): Promise<void> => {
  try {
    const key = getCacheKey('onboarding');
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('オンボーディング状態のリセットに失敗:', error);
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
  if (!isLoggedIn()) {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    return;
  }

  // 1. AsyncStorageキャッシュに即座に保存
  const cacheKey = getCacheKey('settings');
  await AsyncStorage.setItem(cacheKey, JSON.stringify(settings));

  // 2. Firestore書き込み（失敗時は同期キューへ）
  try {
    await saveUserSettingsToFirestore(settings);
  } catch {
    await addToSyncQueue({ type: 'saveSettings', data: settings });
  }
};

/**
 * ユーザー設定を読み込む
 */
export const loadUserSettings = async (): Promise<UserSettings | null> => {
  if (!isLoggedIn()) {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  }

  const cacheKey = getCacheKey('settings');

  try {
    const result = await loadUserSettingsFromFirestore();
    if (result) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    }
    return result;
  } catch {
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
};

/**
 * ホーム画面の表示設定を保存する
 */
export const saveHomeDisplaySettings = async (settings: HomeDisplaySettings): Promise<void> => {
  if (!isLoggedIn()) {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(HOME_DISPLAY_KEY, jsonValue);
    return;
  }

  // 1. AsyncStorageキャッシュに即座に保存
  const cacheKey = getCacheKey('display');
  await AsyncStorage.setItem(cacheKey, JSON.stringify(settings));

  // 2. Firestore書き込み（失敗時は同期キューへ）
  try {
    await saveHomeDisplaySettingsToFirestore(settings);
  } catch {
    await addToSyncQueue({ type: 'saveDisplaySettings', data: settings });
  }
};

/**
 * ホーム画面の表示設定を読み込む
 */
export const loadHomeDisplaySettings = async (): Promise<HomeDisplaySettings | null> => {
  if (!isLoggedIn()) {
    const jsonValue = await AsyncStorage.getItem(HOME_DISPLAY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  }

  const cacheKey = getCacheKey('display');

  try {
    const result = await loadHomeDisplaySettingsFromFirestore();
    if (result) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    }
    return result;
  } catch {
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
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
 * 日記保存／削除後にウィジェットを再同期する。
 * widgetStorage.ts は storage.ts から静的 import しているため、
 * 循環依存回避のためここでは動的 require を使う。
 */
const syncWidgetAfterDiaryChange = async (): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { syncWidgetData } = require('./widgetStorage') as typeof import('./widgetStorage');
    await syncWidgetData();
  } catch (error) {
    console.error('[storage] 日記変更後のウィジェット同期に失敗:', error);
  }
};

/**
 * 日記を保存する（新規作成または更新）
 */
export const saveDiaryEntry = async (entry: DiaryEntry): Promise<void> => {
  if (!isLoggedIn()) {
    const existingDiaries = await loadDiaryEntries();
    const index = existingDiaries.findIndex((e) => e.id === entry.id);

    if (index >= 0) {
      existingDiaries[index] = { ...entry, updatedAt: new Date().toISOString() };
    } else {
      existingDiaries.push(entry);
    }

    existingDiaries.sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(existingDiaries));
    void syncWidgetAfterDiaryChange();
    return;
  }

  // 1. キャッシュの日記配列を更新
  const cacheKey = getCacheKey('diaries');
  const cachedJson = await AsyncStorage.getItem(cacheKey);
  const cachedDiaries: DiaryEntry[] = cachedJson ? JSON.parse(cachedJson) : [];
  const index = cachedDiaries.findIndex((e) => e.id === entry.id);
  if (index >= 0) {
    cachedDiaries[index] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    cachedDiaries.push(entry);
  }
  cachedDiaries.sort((a, b) => b.date.localeCompare(a.date));
  await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedDiaries));

  // 2. Firestore書き込み（失敗時は同期キューへ）
  try {
    await saveDiaryEntryToFirestore(entry);
  } catch {
    await addToSyncQueue({ type: 'saveDiary', targetId: entry.id, data: entry });
  }

  void syncWidgetAfterDiaryChange();
};

/**
 * すべての日記を読み込む
 */
export const loadDiaryEntries = async (): Promise<DiaryEntry[]> => {
  if (!isLoggedIn()) {
    const jsonValue = await AsyncStorage.getItem(DIARY_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  }

  const cacheKey = getCacheKey('diaries');

  try {
    const result = await loadDiaryEntriesFromFirestore();
    AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    return result;
  } catch {
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }
};

/**
 * 月別で日記を読み込む（Firestore最適化版）
 */
export const loadDiaryEntriesByMonth = async (year: number, month: number): Promise<DiaryEntry[]> => {
  if (!isLoggedIn()) {
    const jsonValue = await AsyncStorage.getItem(DIARY_KEY);
    const allDiaries: DiaryEntry[] = jsonValue != null ? JSON.parse(jsonValue) : [];
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    return allDiaries
      .filter((diary) => diary.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  const cacheKey = getCacheKey('diaries');

  try {
    const result = await getDiariesByMonthFromFirestore(year, month);
    // 月別取得成功時は全件キャッシュを更新しない（部分データのため）
    return result;
  } catch {
    // Firestore失敗時は全件キャッシュからフィルタ
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return [];
    const allDiaries: DiaryEntry[] = JSON.parse(cached);
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    return allDiaries
      .filter((diary) => diary.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
};

/**
 * 特定の日付の日記を取得
 */
export const getDiaryByDate = async (date: string): Promise<DiaryEntry | null> => {
  if (!isLoggedIn()) {
    const diaries = await loadDiaryEntries();
    return diaries.find((entry) => entry.id === date) || null;
  }

  const cacheKey = getCacheKey('diaries');

  try {
    const result = await getDiaryByDateFromFirestore(date);
    return result;
  } catch {
    // Firestore失敗時は全件キャッシュから検索
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;
    const allDiaries: DiaryEntry[] = JSON.parse(cached);
    return allDiaries.find((entry) => entry.id === date) || null;
  }
};

/**
 * 指定日付からN日前の日付を計算する
 * @param dateStr 基準日付（YYYY-MM-DD）
 * @param days 日数
 * @returns N日前の日付（YYYY-MM-DD）
 */
const getDateBefore = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 直近N日分の日記を取得（指定日付を除く）
 * Phase 2: 過去データ連携用
 * @param excludeDate 除外する日付（通常は今日）
 * @param days 取得する日数（デフォルト: 3）
 * @returns 日記エントリの配列（日付降順）
 */
export const getRecentDiaryEntries = async (
  excludeDate: string,
  days: number = 3
): Promise<DiaryEntry[]> => {
  // excludeDateの1日前から、days日分の範囲を計算
  const endDate = getDateBefore(excludeDate, 1); // 昨日
  const startDate = getDateBefore(excludeDate, days); // N日前

  if (!isLoggedIn()) {
    const allDiaries = await loadDiaryEntries();
    return allDiaries
      .filter((diary) => diary.date >= startDate && diary.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  const cacheKey = getCacheKey('diaries');

  try {
    const entries = await getDiariesByDateRangeFromFirestore(startDate, endDate);
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    // Firestore失敗時は全件キャッシュからフィルタ
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return [];
    const allDiaries: DiaryEntry[] = JSON.parse(cached);
    return allDiaries
      .filter((diary) => diary.date >= startDate && diary.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
};

/**
 * 日記を削除する
 */
export const deleteDiaryEntry = async (id: string): Promise<void> => {
  if (!isLoggedIn()) {
    const existingDiaries = await loadDiaryEntries();
    const filteredDiaries = existingDiaries.filter((entry) => entry.id !== id);
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(filteredDiaries));
    void syncWidgetAfterDiaryChange();
    return;
  }

  // 1. キャッシュから除去
  const cacheKey = getCacheKey('diaries');
  const cachedJson = await AsyncStorage.getItem(cacheKey);
  if (cachedJson) {
    const cachedDiaries: DiaryEntry[] = JSON.parse(cachedJson);
    const filtered = cachedDiaries.filter((entry) => entry.id !== id);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(filtered));
  }

  // 2. Firestore削除（失敗時は同期キューへ）
  try {
    await deleteDiaryEntryFromFirestore(id);
  } catch {
    await addToSyncQueue({ type: 'deleteDiary', targetId: id, data: { id } });
  }

  void syncWidgetAfterDiaryChange();
};

/**
 * ユーザーの全データを削除する（アカウント削除時に使用）
 */
export const deleteAllUserData = async (): Promise<void> => {
  try {
    if (isLoggedIn()) {
      // UID付きキャッシュキーを削除
      const cacheKeys = ['settings', 'display', 'diaries', 'ai_consent', 'onboarding'].map(getCacheKey);
      await AsyncStorage.multiRemove(cacheKeys);

      // 同期キューを削除
      await clearSyncQueue();

      // Firestoreのデータを削除
      await deleteAllUserDataFromFirestore();
    }
    // ローカルストレージもクリア
    await AsyncStorage.multiRemove([STORAGE_KEY, DIARY_KEY, HOME_DISPLAY_KEY, MIGRATION_KEY, ONBOARDING_KEY]);
    console.log('すべてのユーザーデータを削除しました');
  } catch (error) {
    console.error('ユーザーデータの削除に失敗しました:', error);
    throw error;
  }
};

/**
 * テーマ設定を読み込む
 */
export const loadThemeSettings = async (): Promise<ThemeSettings | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(THEME_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue) as ThemeSettings;
    }
    return null;
  } catch (error) {
    console.error('テーマ設定の読み込みに失敗しました:', error);
    return null;
  }
};

/**
 * テーマ設定を保存する
 */
export const saveThemeSettings = async (settings: ThemeSettings): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(THEME_KEY, jsonValue);
  } catch (error) {
    console.error('テーマ設定の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * 記録一覧画面の表示モードを保存（ローカルのみ）
 */
export const saveDiaryViewMode = async (mode: DiaryViewMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(DIARY_VIEW_MODE_KEY, mode);
  } catch (error) {
    console.error('Failed to save diary view mode:', error);
  }
};

/**
 * 記録一覧画面の表示モードを読み込み（未設定時は 'calendar'）
 */
export const loadDiaryViewMode = async (): Promise<DiaryViewMode> => {
  try {
    const value = await AsyncStorage.getItem(DIARY_VIEW_MODE_KEY);
    if (value === 'list' || value === 'calendar') {
      return value;
    }
    return 'calendar';
  } catch (error) {
    console.error('Failed to load diary view mode:', error);
    return 'calendar';
  }
};

// =============== AI同意状態 ===============

/**
 * AI機能の同意状態を読み込む
 */
export const loadAIConsent = async (): Promise<AIConsentStatus | null> => {
  if (!isLoggedIn()) {
    const jsonValue = await AsyncStorage.getItem(AI_CONSENT_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  }

  const cacheKey = getCacheKey('ai_consent');

  try {
    const result = await loadAIConsentFromFirestore();
    if (result) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    }
    return result;
  } catch {
    const cached = await AsyncStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
};

/**
 * AI機能の同意状態を保存する
 */
export const saveAIConsent = async (consent: AIConsentStatus): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(consent);
    await AsyncStorage.setItem(AI_CONSENT_KEY, jsonValue);

    if (isLoggedIn()) {
      await saveAIConsentToFirestore(consent);
    }
  } catch (error) {
    console.error('AI同意状態の保存に失敗しました:', error);
    throw error;
  }
};

/**
 * AI機能への同意を記録する
 */
export const recordAIConsent = async (): Promise<void> => {
  const consent: AIConsentStatus = {
    hasConsented: true,
    consentedAt: new Date().toISOString(),
    version: CURRENT_CONSENT_VERSION,
  };
  await saveAIConsent(consent);
};

/**
 * AI機能に同意済みかチェックする
 * バージョンが古い場合は再同意が必要
 */
export const hasValidAIConsent = async (): Promise<boolean> => {
  try {
    const consent = await loadAIConsent();
    if (!consent) return false;
    if (!consent.hasConsented) return false;
    // 現在のバージョンと同意したバージョンを比較
    if (consent.version < CURRENT_CONSENT_VERSION) return false;
    return true;
  } catch {
    return false;
  }
};
