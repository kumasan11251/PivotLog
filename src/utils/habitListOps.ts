import type { HabitItem } from '../types/habit';
import { MAX_HABITS_PER_DAY, MAX_HABIT_TITLE_LENGTH } from '../types/habit';

/**
 * 習慣リストに対する純粋な操作（日次・週次で共通利用）
 * いずれも元の配列は変更せず、新しい配列を返す
 */

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeTitle = (title: string): string => title.trim().slice(0, MAX_HABIT_TITLE_LENGTH);

/** 1件追加。空文字・上限超過なら null */
export const addHabitItem = (list: HabitItem[], title: string): HabitItem[] | null => {
  const trimmed = normalizeTitle(title);
  if (!trimmed || list.length >= MAX_HABITS_PER_DAY) return null;
  return [
    ...list,
    { id: generateId(), title: trimmed, completed: false, createdAt: new Date().toISOString() },
  ];
};

/** 複数追加（空き枠分だけ、同じタイトルは除外）。追加件数も返す */
export const addHabitItems = (
  list: HabitItem[],
  titles: string[]
): { list: HabitItem[]; added: number } => {
  const existing = new Set(list.map((item) => item.title));
  const remaining = MAX_HABITS_PER_DAY - list.length;
  if (remaining <= 0) return { list, added: 0 };
  const now = new Date().toISOString();
  const newItems: HabitItem[] = [];
  for (const title of titles) {
    const trimmed = normalizeTitle(title);
    if (!trimmed || existing.has(trimmed) || newItems.length >= remaining) continue;
    existing.add(trimmed);
    newItems.push({ id: generateId(), title: trimmed, completed: false, createdAt: now });
  }
  return newItems.length === 0 ? { list, added: 0 } : { list: [...list, ...newItems], added: newItems.length };
};

/** 完了状態を反転 */
export const toggleHabitItem = (list: HabitItem[], id: string): HabitItem[] =>
  list.map((item) =>
    item.id === id
      ? {
          ...item,
          completed: !item.completed,
          completedAt: item.completed ? undefined : new Date().toISOString(),
        }
      : item
  );

/** タイトルを更新。空文字・対象なしなら null */
export const updateHabitItemTitle = (
  list: HabitItem[],
  id: string,
  title: string
): HabitItem[] | null => {
  const trimmed = normalizeTitle(title);
  if (!trimmed || !list.some((item) => item.id === id)) return null;
  return list.map((item) => (item.id === id ? { ...item, title: trimmed } : item));
};

/** 1件削除。対象なしなら null */
export const removeHabitItem = (list: HabitItem[], id: string): HabitItem[] | null => {
  if (!list.some((item) => item.id === id)) return null;
  return list.filter((item) => item.id !== id);
};

/** 引き継ぎ候補: 前回の項目のうち、現在のリストに同じタイトルがないもの */
export const filterHabitSuggestions = (previous: HabitItem[], current: HabitItem[]): HabitItem[] => {
  const existing = new Set(current.map((item) => item.title));
  return previous.filter((item) => !existing.has(item.title));
};
