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
 */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

/**
 * 今日の視点メッセージを取得
 * 日付ベースで決定されるため、同じ日は同じメッセージが表示される
 */
export const getTodayPerspectiveMessage = (): PerspectiveMessage => {
  const seed = getDailySeed();
  const index = Math.floor(seededRandom(seed) * PERSPECTIVE_MESSAGES.length);
  return PERSPECTIVE_MESSAGES[index];
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
  const remainingSprings = remainingYears;
  const remainingSummers = remainingYears;
  const remainingAutumns = remainingYears;
  const remainingWinters = remainingYears;

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
 */
export const getPerspectiveMessageForDate = (date: Date): PerspectiveMessage => {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const index = Math.floor(seededRandom(seed) * PERSPECTIVE_MESSAGES.length);
  return PERSPECTIVE_MESSAGES[index];
};
