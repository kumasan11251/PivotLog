import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../services/firebase/auth';
import {
  saveHabitDayToFirestore,
  loadAllHabitsFromFirestore,
} from '../services/firebase/firestore';
import { addToSyncQueue, getPendingHabitOperations } from './syncQueue';
import { addDaysToDateString } from './dateUtils';
import type { HabitItem, HabitsByDate, HabitCalendarMode } from '../types/habit';
import { MAX_HABITS_PER_DAY } from '../types/habit';

// 日付（YYYY-MM-DD）→ 項目一覧
// ログイン中は UID 付きキーがローカルキャッシュになり、正本は Firestore（users/{uid}/habits/{date}）。
// 読み取りは常にキャッシュから行い、syncHabitsFromFirestore() でキャッシュを最新化する。
const DAILY_KEY = '@pivot_log_habits';
// 上部カレンダーの表示モード（端末ごとのUI設定なのでユーザーには紐づけない）
const CALENDAR_MODE_KEY = '@pivot_log_habit_calendar_mode';

/** 引き継ぎ元を探すときに何日前まで見るか */
const PREVIOUS_DAY_LOOKBACK = 30;

/**
 * Firestore への書き込みが完了していない日付とその内容。
 * syncHabitsFromFirestore() が全件を取り直したときに、まだ届いていないローカル変更を
 * 古いクラウド側の内容で上書きしないために保持する。
 */
const inFlightWrites = new Map<string, HabitItem[]>();

/**
 * 保存キーを取得（ログイン中はUID付きでログイン前データとの衝突を回避）
 */
const getScopedKey = (baseKey: string): string => {
  const user = getCurrentUser();
  return user ? `${baseKey}_cache_${user.uid}` : baseKey;
};

const loadMap = async (baseKey: string): Promise<HabitsByDate> => {
  try {
    const raw = await AsyncStorage.getItem(getScopedKey(baseKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HabitsByDate;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('Failed to load habits:', error);
    return {};
  }
};

const saveToMap = async (baseKey: string, key: string, items: HabitItem[]): Promise<void> => {
  try {
    const all = await loadMap(baseKey);
    if (items.length === 0) {
      delete all[key];
    } else {
      all[key] = items.slice(0, MAX_HABITS_PER_DAY);
    }
    await AsyncStorage.setItem(getScopedKey(baseKey), JSON.stringify(all));
  } catch (error) {
    console.error('Failed to save habits:', error);
  }
};

/**
 * 指定キーより前で、いちばん最近項目があったキーとその一覧を返す（引き継ぎ元）
 */
const findPreviousInMap = async (
  baseKey: string,
  beforeKey: string,
  lookbackDays: number
): Promise<{ date: string; items: HabitItem[] } | null> => {
  const all = await loadMap(baseKey);
  const lowerBound = addDaysToDateString(beforeKey, -lookbackDays);
  const candidates = Object.keys(all)
    .filter((key) => key < beforeKey && key >= lowerBound && (all[key]?.length ?? 0) > 0)
    .sort();
  const latest = candidates[candidates.length - 1];
  return latest ? { date: latest, items: all[latest] } : null;
};

// =============== 日次 ===============

/** 指定日の習慣一覧を読み込む */
export const loadHabitsByDate = async (date: string): Promise<HabitItem[]> => {
  const all = await loadMap(DAILY_KEY);
  return all[date] ?? [];
};

/** 複数日の習慣一覧をまとめて読み込む（カレンダーの達成度表示用） */
export const loadHabitsForDates = async (dates: string[]): Promise<HabitsByDate> => {
  const all = await loadMap(DAILY_KEY);
  const result: HabitsByDate = {};
  for (const date of dates) {
    result[date] = all[date] ?? [];
  }
  return result;
};

/** 指定日より前で、いちばん最近項目があった日とその一覧（引き継ぎ元） */
export const findPreviousHabitDay = (beforeDate: string) =>
  findPreviousInMap(DAILY_KEY, beforeDate, PREVIOUS_DAY_LOOKBACK);

/**
 * 指定日の習慣一覧を保存する
 * 1. ローカルキャッシュを更新（オフラインでも即座に反映）
 * 2. ログイン中なら Firestore に書き込み、失敗時は同期キューに積んで復帰時に再送
 */
export const saveHabitsByDate = async (date: string, items: HabitItem[]): Promise<void> => {
  const limited = items.slice(0, MAX_HABITS_PER_DAY);
  inFlightWrites.set(date, limited);
  await saveToMap(DAILY_KEY, date, limited);

  if (!getCurrentUser()) {
    inFlightWrites.delete(date);
    return;
  }

  try {
    await saveHabitDayToFirestore(date, limited);
  } catch {
    await addToSyncQueue({ type: 'saveHabits', targetId: date, data: { date, items: limited } });
  } finally {
    // 後から同じ日付に新しい書き込みが始まっていれば、そちらを残す
    if (inFlightWrites.get(date) === limited) {
      inFlightWrites.delete(date);
    }
  }
};

/**
 * Firestore の習慣データでローカルキャッシュを最新化する
 * - 未ログイン時や取得失敗時はキャッシュをそのまま残して false を返す
 * - 同期キューに未送信の変更や送信中の書き込みがあれば、その日付はローカル側を優先する
 */
export const syncHabitsFromFirestore = async (): Promise<boolean> => {
  const user = getCurrentUser();
  if (!user) return false;

  try {
    const [remote, pending] = await Promise.all([
      loadAllHabitsFromFirestore(),
      getPendingHabitOperations(),
    ]);
    const merged: HabitsByDate = { ...remote };
    const localOverrides: Array<[string, HabitItem[]]> = [
      ...pending.map((op): [string, HabitItem[]] => [op.date, op.items]),
      ...inFlightWrites.entries(),
    ];
    for (const [date, items] of localOverrides) {
      if (items.length === 0) {
        delete merged[date];
      } else {
        merged[date] = items.slice(0, MAX_HABITS_PER_DAY);
      }
    }
    await AsyncStorage.setItem(`${DAILY_KEY}_cache_${user.uid}`, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.warn('Failed to sync habits from Firestore:', error);
    return false;
  }
};

// =============== カレンダー表示モード ===============

/** 習慣タブ上部カレンダーの表示モードを読み込む（未設定時は 'week'） */
export const loadHabitCalendarMode = async (): Promise<HabitCalendarMode> => {
  try {
    const value = await AsyncStorage.getItem(CALENDAR_MODE_KEY);
    return value === 'month' ? 'month' : 'week';
  } catch (error) {
    console.error('Failed to load habit calendar mode:', error);
    return 'week';
  }
};

/** 習慣タブ上部カレンダーの表示モードを保存する */
export const saveHabitCalendarMode = async (mode: HabitCalendarMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(CALENDAR_MODE_KEY, mode);
  } catch (error) {
    console.error('Failed to save habit calendar mode:', error);
  }
};

// =============== 削除 ===============

/**
 * 習慣のローカルデータをすべて削除する（アカウント削除時などに使用）
 * Firestore 側は deleteAllUserDataFromFirestore() が USER_SUBCOLLECTIONS 経由でまとめて削除する
 */
export const clearAllHabits = async (): Promise<void> => {
  try {
    const keys = [DAILY_KEY];
    const user = getCurrentUser();
    if (user) {
      keys.push(`${DAILY_KEY}_cache_${user.uid}`);
    }
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to clear habits:', error);
  }
};
