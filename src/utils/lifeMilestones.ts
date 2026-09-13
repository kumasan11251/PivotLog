/**
 * 人生の節目（ライフマイルストーン）の判定
 *
 * 毎日同じ形で1ずつ減っていくカウントダウンは、数日で「見慣れた数字」になる。
 * 年に数回だけ訪れる「きりのいい日」を検出し、その日だけホームの視点メッセージ枠を
 * 節目カードに差し替えることで、数字にもう一度目を向けてもらうための仕組み。
 *
 * 判定は「基準日の0時」ベースで行い、1日を通して結果が変わらないようにする。
 * 誕生日そのものは既存の視点メッセージ（birthdays）が扱うため、ここでは対象外。
 */

import { parseBirthday, calculateTargetDate } from './timeCalculations';

const DAY_MS = 1000 * 60 * 60 * 24;

/** 生後日数・残り日数のキリ番の刻み */
const DAY_STEP = 1000;
/** 残り週数のキリ番の刻み（週） */
const WEEK_STEP = 100;
/** 人生進捗の節目（%）。50は「折り返し」として特別扱い */
const PROGRESS_THRESHOLDS = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90] as const;

export type LifeMilestoneKind =
  | 'progress_percent'
  | 'remaining_days'
  | 'lived_days'
  | 'remaining_weeks';

export interface LifeMilestone {
  /** 節目の種類 */
  kind: LifeMilestoneKind;
  /** 節目の値（日数・週数・%） */
  value: number;
  /** 表示履歴用の一意キー（例: remaining_days:10000） */
  key: string;
  /** 次の節目までの日数（見つからない場合は null） */
  daysUntilNext: number | null;
}

/** 基準日文字列（YYYY-MM-DD）をローカル0時の Date に変換する */
const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/** 2つのローカル0時 Date の差を日数で返す（DSTの影響を吸収するため丸める） */
const diffInDays = (later: Date, earlier: Date): number =>
  Math.round((later.getTime() - earlier.getTime()) / DAY_MS);

/**
 * 基準日に該当する節目を1つ返す。該当しない日は null。
 * 同日に複数該当した場合の優先順位: 進捗% > 残り日数 > 生後日数 > 残り週数
 */
export const getLifeMilestoneForDate = (
  birthday: string,
  targetLifespan: number,
  dateString: string,
): LifeMilestone | null => {
  if (!birthday || targetLifespan <= 0) return null;

  const birthDate = parseBirthday(birthday);
  const targetDate = calculateTargetDate(birthday, targetLifespan);
  const today = parseDateString(dateString);

  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(today.getTime())) return null;

  const livedDays = diffInDays(today, birthDate);
  const remainingDays = diffInDays(targetDate, today);
  const totalDays = diffInDays(targetDate, birthDate);

  // 生まれる前・目標日を過ぎた後は節目を出さない
  if (livedDays <= 0 || remainingDays <= 0 || totalDays <= 0) return null;

  const build = (kind: LifeMilestoneKind, value: number): LifeMilestone => ({
    kind,
    value,
    key: `${kind}:${value}`,
    daysUntilNext: getDaysUntilNextMilestone(livedDays, remainingDays, totalDays),
  });

  // 進捗%：前日から今日にかけて閾値を越えた日
  const progressToday = (livedDays / totalDays) * 100;
  const progressYesterday = ((livedDays - 1) / totalDays) * 100;
  const crossed = PROGRESS_THRESHOLDS.find(
    threshold => progressYesterday < threshold && progressToday >= threshold,
  );
  if (crossed !== undefined) return build('progress_percent', crossed);

  if (remainingDays % DAY_STEP === 0) return build('remaining_days', remainingDays);
  if (livedDays % DAY_STEP === 0) return build('lived_days', livedDays);
  if (remainingDays % (WEEK_STEP * 7) === 0) {
    return build('remaining_weeks', remainingDays / 7);
  }

  return null;
};

/**
 * 今日を含まない、次に訪れる節目までの日数を返す。
 * すべての種類の中で最も近いものを選ぶ。
 */
const getDaysUntilNextMilestone = (
  livedDays: number,
  remainingDays: number,
  totalDays: number,
): number | null => {
  const candidates: number[] = [];

  // 生後日数の次のキリ番
  const nextLived = (Math.floor(livedDays / DAY_STEP) + 1) * DAY_STEP;
  if (nextLived - livedDays < remainingDays) candidates.push(nextLived - livedDays);

  // 残り日数の次のキリ番（今日より小さい最大の倍数）
  const nextRemaining = Math.floor((remainingDays - 1) / DAY_STEP) * DAY_STEP;
  if (nextRemaining > 0) candidates.push(remainingDays - nextRemaining);

  // 残り週数の次のキリ番
  const weekStepDays = WEEK_STEP * 7;
  const nextRemainingWeekDays = Math.floor((remainingDays - 1) / weekStepDays) * weekStepDays;
  if (nextRemainingWeekDays > 0) candidates.push(remainingDays - nextRemainingWeekDays);

  // 進捗%の次の閾値
  const progressToday = (livedDays / totalDays) * 100;
  const nextThreshold = PROGRESS_THRESHOLDS.find(threshold => threshold > progressToday);
  if (nextThreshold !== undefined) {
    const daysAtThreshold = Math.ceil((nextThreshold / 100) * totalDays);
    const days = daysAtThreshold - livedDays;
    if (days > 0 && days < remainingDays) candidates.push(days);
  }

  if (candidates.length === 0) return null;
  return Math.min(...candidates);
};

/** 3桁区切りの文字列にする */
export const formatMilestoneNumber = (n: number): string =>
  String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export interface LifeMilestoneCopy {
  emoji: string;
  /** 数字の前に置く言葉（例: 「今日で、残り」） */
  lead: string;
  /** 強調表示する数字（3桁区切り済み） */
  number: string;
  /** 数字の後ろに置く単位（例: 「日」） */
  unit: string;
  /** 補足の一文 */
  subtext: string;
}

/**
 * 節目カードの文言を組み立てる。
 * お祝い調ではなく、静かに立ち止まってもらう先輩トーンで書く。
 */
export const getLifeMilestoneCopy = (milestone: LifeMilestone): LifeMilestoneCopy => {
  switch (milestone.kind) {
    case 'progress_percent':
      if (milestone.value === 50) {
        return {
          emoji: '🌗',
          lead: '今日、人生の',
          number: '50',
          unit: '% を越えました',
          subtext: 'ここからが折り返しです。前半で大切にしてきたものを、後半にも連れていけますように',
        };
      }
      return {
        emoji: '🌗',
        lead: '今日、人生の',
        number: String(milestone.value),
        unit: '% を越えました',
        subtext: '目標までの道のりの、ちょうど区切りの地点です。見慣れた進捗バーを、今日はもう一度眺めてみてください',
      };
    case 'remaining_days':
      return {
        emoji: '⏳',
        lead: '今日で、残り',
        number: formatMilestoneNumber(milestone.value),
        unit: '日',
        subtext: 'ひとつずつ減っていく数が、今日はきりのいい形になりました。この日数を、何に使いたいですか',
      };
    case 'lived_days':
      return {
        emoji: '🌱',
        lead: '生まれてから、今日で',
        number: formatMilestoneNumber(milestone.value),
        unit: '日',
        subtext: 'その一日一日が、いまのあなたを形づくっています。今日もそのうちの1日です',
      };
    case 'remaining_weeks':
      return {
        emoji: '📅',
        lead: '今日で、残り',
        number: formatMilestoneNumber(milestone.value),
        unit: '週',
        subtext: '1週間という区切りを、あと何回過ごせるか。今日はその節目の日です',
      };
  }
};
