import { PERSPECTIVE_MESSAGES, type PerspectiveMessage } from '../constants/perspectives';

/**
 * 日付ベースでシード値を生成（同じ日は同じ値）
 */
const getDailySeed = (): number => {
  const today = new Date();
  // YYYYMMDD形式の数値を生成
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

/**
 * シード値から疑似乱数を生成（決定論的）
 * 同じシードなら同じ結果を返す
 * Mulberry32アルゴリズムを使用（高品質な32bit PRNG）
 */
const seededRandom = (seed: number): number => {
  let t = seed + 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

/**
 * メッセージが現在の条件で表示可能かチェック
 */
const isMessageDisplayable = (
  message: PerspectiveMessage,
  currentMonth: number,
  birthdayMonth?: number
): boolean => {
  const condition = message.displayCondition;

  // 条件がなければ通年表示
  if (!condition) {
    return true;
  }

  // 誕生日月条件
  if (condition.requiresBirthday) {
    if (!birthdayMonth) {
      return false; // 誕生日情報がなければ表示しない
    }
    return currentMonth === birthdayMonth;
  }

  // 表示月条件
  if (condition.displayMonths && condition.displayMonths.length > 0) {
    return condition.displayMonths.includes(currentMonth);
  }

  return true;
};

/**
 * 表示可能なメッセージをフィルタリング
 */
const getDisplayableMessages = (
  currentMonth: number,
  birthdayMonth?: number
): PerspectiveMessage[] => {
  return PERSPECTIVE_MESSAGES.filter(msg =>
    isMessageDisplayable(msg, currentMonth, birthdayMonth)
  );
};

/**
 * 今日の視点メッセージを取得
 * 日付ベースで決定されるため、同じ日は同じメッセージが表示される
 * 季節や誕生日に応じて適切なメッセージのみを対象とする
 *
 * @param birthdayMonth ユーザーの誕生日月（1-12）。誕生日関連メッセージの表示判定に使用
 */
export const getTodayPerspectiveMessage = (birthdayMonth?: number): PerspectiveMessage => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const seed = getDailySeed();

  const displayableMessages = getDisplayableMessages(currentMonth, birthdayMonth);

  // 表示可能なメッセージがない場合はフォールバック（通常はありえない）
  if (displayableMessages.length === 0) {
    const index = Math.floor(seededRandom(seed) * PERSPECTIVE_MESSAGES.length);
    return PERSPECTIVE_MESSAGES[index];
  }

  const index = Math.floor(seededRandom(seed) * displayableMessages.length);
  return displayableMessages[index];
};

/**
 * プレースホルダーを実際の値で置換
 */
interface PerspectiveValues {
  remainingYears: number;
  remainingDays: number;
  remainingWeeks: number;
  currentAge: number;
  progressPercent: number;
}

export const formatPerspectiveMessage = (
  message: PerspectiveMessage,
  values: PerspectiveValues
): { mainText: string; subtext?: string; emoji: string } => {
  const {
    remainingYears,
    remainingDays,
    remainingWeeks,
    currentAge,
    progressPercent,
  } = values;

  // 派生値を計算
  const remainingWeekends = Math.floor(remainingWeeks); // 週末は週数と同じ
  const remainingSprings = Math.floor(remainingYears);
  const remainingSummers = Math.floor(remainingYears);
  const remainingAutumns = Math.floor(remainingYears);
  const remainingWinters = Math.floor(remainingYears);
  const remainingMonths = Math.floor(remainingYears * 12); // 残り月数
  const remainingTravels = Math.floor(remainingYears * 2); // 年2回旅行
  const remainingSeasons = Math.floor(remainingYears * 4); // 年4回の季節

  // プレースホルダーを置換
  let mainText = message.template
    .replace(/{remainingYears}/g, String(Math.floor(remainingYears)))
    .replace(/{remainingDays}/g, String(Math.floor(remainingDays)).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
    .replace(/{remainingWeeks}/g, String(Math.floor(remainingWeeks)).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
    .replace(/{remainingWeekends}/g, String(remainingWeekends).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
    .replace(/{remainingSprings}/g, String(remainingSprings))
    .replace(/{remainingSummers}/g, String(remainingSummers))
    .replace(/{remainingAutumns}/g, String(remainingAutumns))
    .replace(/{remainingWinters}/g, String(remainingWinters))
    .replace(/{remainingMonths}/g, String(remainingMonths).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
    .replace(/{remainingTravels}/g, String(remainingTravels).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
    .replace(/{remainingSeasons}/g, String(remainingSeasons).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
    .replace(/{currentAge}/g, String(Math.floor(currentAge)))
    .replace(/{progressPercent}/g, progressPercent.toFixed(1));

  return {
    mainText,
    subtext: message.subtext,
    emoji: message.emoji,
  };
};

/**
 * デバッグ用: 特定の日付のメッセージを取得
 * @param date 対象の日付
 * @param birthdayMonth ユーザーの誕生日月（1-12）
 */
export const getPerspectiveMessageForDate = (date: Date, birthdayMonth?: number): PerspectiveMessage => {
  const currentMonth = date.getMonth() + 1;
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

  const displayableMessages = getDisplayableMessages(currentMonth, birthdayMonth);

  if (displayableMessages.length === 0) {
    const index = Math.floor(seededRandom(seed) * PERSPECTIVE_MESSAGES.length);
    return PERSPECTIVE_MESSAGES[index];
  }

  const index = Math.floor(seededRandom(seed) * displayableMessages.length);
  return displayableMessages[index];
};
