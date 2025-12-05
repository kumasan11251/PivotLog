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
