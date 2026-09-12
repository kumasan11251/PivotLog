/**
 * 日付計算ユーティリティ
 * 「1日の開始時刻」設定を考慮した日付計算を提供
 */

/**
 * 開始時刻を考慮した「今日」の日付を取得
 * @param dayStartHour 1日の開始時刻（0-12）
 * @returns YYYY-MM-DD形式の日付文字列
 */
export const getEffectiveToday = (dayStartHour: number = 0): string => {
  const now = new Date();
  const currentHour = now.getHours();

  // 現在時刻が開始時刻より前の場合、前日として扱う
  if (currentHour < dayStartHour) {
    now.setDate(now.getDate() - 1);
  }

  return formatDateToString(now);
};

/**
 * Date オブジェクトを YYYY-MM-DD 形式に変換（ローカル時間基準）
 * @param date Date オブジェクト
 * @returns YYYY-MM-DD形式の日付文字列
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateString = (dateString: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return formatDateToString(date) === dateString ? date : null;
};

export const addDaysToDateString = (dateString: string, days: number): string => {
  const date = parseLocalDateString(dateString);
  if (!date) throw new Error(`Invalid local date string: ${dateString}`);
  date.setDate(date.getDate() + days);
  return formatDateToString(date);
};

export const isDateAfterToday = (dateString: string): boolean => {
  const date = parseLocalDateString(dateString);
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

/**
 * 開始時刻を考慮して、指定した日付が「今日」かどうかを判定
 * @param dateString YYYY-MM-DD形式の日付
 * @param dayStartHour 1日の開始時刻（0-12）
 * @returns 今日ならtrue
 */
export const isEffectiveToday = (dateString: string, dayStartHour: number = 0): boolean => {
  return dateString === getEffectiveToday(dayStartHour);
};

/**
 * 開始時刻を考慮した日付でDateオブジェクトを取得
 * 現在時刻が開始時刻より前なら、前日の日付のDateを返す
 * @param dayStartHour 1日の開始時刻（0-12）
 * @returns Date オブジェクト（時刻は00:00:00）
 */
export const getEffectiveTodayDate = (dayStartHour: number = 0): Date => {
  const now = new Date();
  const currentHour = now.getHours();

  // 現在時刻が開始時刻より前の場合、前日として扱う
  if (currentHour < dayStartHour) {
    now.setDate(now.getDate() - 1);
  }

  // 時刻部分をリセット
  now.setHours(0, 0, 0, 0);
  return now;
};

/**
 * 指定日を含む週（日曜始まり）の7日分の日付文字列を返す
 * @param dateString YYYY-MM-DD形式の日付
 */
export const getWeekDateStrings = (dateString: string): string[] => {
  const date = parseLocalDateString(dateString);
  if (!date) throw new Error(`Invalid local date string: ${dateString}`);
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return formatDateToString(d);
  });
};

const JP_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 「9月7日」または「9月7日（日）」の形式に整形する
 */
export const formatJapaneseMonthDay = (dateString: string, withWeekday = false): string => {
  const date = parseLocalDateString(dateString);
  if (!date) return dateString;
  const base = `${date.getMonth() + 1}月${date.getDate()}日`;
  return withWeekday ? `${base}（${JP_WEEKDAYS[date.getDay()]}）` : base;
};

/**
 * 指定日から月単位で前後した日付を返す（日は月末で丸める）
 * 例: 2026-08-31 の1ヶ月後 → 2026-09-30
 */
export const addMonthsToDateString = (dateString: string, months: number): string => {
  const date = parseLocalDateString(dateString);
  if (!date) throw new Error(`Invalid local date string: ${dateString}`);
  const targetMonthStart = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTarget = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth() + 1,
    0
  ).getDate();
  targetMonthStart.setDate(Math.min(date.getDate(), lastDayOfTarget));
  return formatDateToString(targetMonthStart);
};

/**
 * 指定日を含む月のカレンダーグリッド（日曜始まり・7列）を返す
 * 月外のマスは null
 */
export const getMonthGridWeeks = (dateString: string): (string | null)[][] => {
  const date = parseLocalDateString(dateString);
  if (!date) throw new Error(`Invalid local date string: ${dateString}`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = Array.from({ length: startDayOfWeek }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(formatDateToString(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

/**
 * 指定日を含む月のカレンダーグリッドが覆う全日付（月外の前後日も含む）を返す
 * グリッドは常に週単位なので、指定日を含む週の7日分も必ず含まれる
 */
export const getMonthGridDateStrings = (dateString: string): string[] => {
  const date = parseLocalDateString(dateString);
  if (!date) throw new Error(`Invalid local date string: ${dateString}`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const gridStart = new Date(year, month, 1);
  gridStart.setDate(1 - gridStart.getDay());
  const lastDay = new Date(year, month + 1, 0);
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const result: string[] = [];
  for (const d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    result.push(formatDateToString(d));
  }
  return result;
};
