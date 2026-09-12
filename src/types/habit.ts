// 習慣タブのデータ型

/** 1日あたりに登録できる習慣の最大数 */
export const MAX_HABITS_PER_DAY = 3;

/** 習慣タイトルの最大文字数 */
export const MAX_HABIT_TITLE_LENGTH = 40;

export interface HabitItem {
  id: string;
  title: string;
  completed: boolean;
  /** 完了した時刻（ISO 8601）。未完了の場合は undefined */
  completedAt?: string;
  createdAt: string;
}

/** 日付（YYYY-MM-DD）→ その日の習慣一覧 */
export type HabitsByDate = Record<string, HabitItem[]>;

/** 習慣タブ上部カレンダーの表示モード（週ストリップ / 月グリッド） */
export type HabitCalendarMode = 'week' | 'month';
