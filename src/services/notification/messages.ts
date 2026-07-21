/**
 * リマインダー通知メッセージのバリエーション
 * 毎日異なるメッセージで飽きさせない
 *
 * 文言はすべて先輩トーン（指示系ワード「〜しましょう」は使わない）
 */

import type { NotificationMessage } from '../../types/reminder';

// 通常のリマインダーメッセージ（未記録時）
export const DAILY_REMINDER_MESSAGES: NotificationMessage[] = [
  { title: 'PivotLog', body: '今日の振り返り、まだ間に合いますよ' },
  { title: 'PivotLog', body: '1分あれば書けます。今日はどんな一日でしたか？' },
  { title: 'PivotLog', body: '今日を振り返る時間です' },
  { title: 'PivotLog', body: '小さな気づきを記録しませんか？' },
  { title: 'PivotLog', body: '今日の自分に、ひと言残しませんか？' },
  { title: 'PivotLog', body: '振り返りの時間です。今日はどうでしたか？' },
  { title: 'PivotLog', body: '今日も一日お疲れさまでした' },
  { title: 'PivotLog', body: '明日の自分のために、今日を記録しませんか？' },
  { title: 'PivotLog', body: '今日という日は、今日だけ' },
  { title: 'PivotLog', body: '書くことで、見えてくるものがあります' },
];

// ストリーク継続中のメッセージ（記録を促す）
export const STREAK_REMINDER_MESSAGES: NotificationMessage[] = [
  { title: 'PivotLog', body: '{streak}日連続中。今日も記録しませんか？' },
  { title: 'PivotLog', body: '{streak}日の積み重ねが続いています。今日はどんな一日でしたか？' },
  { title: 'PivotLog', body: '連続{streak}日目。今日の分も、そっと残しませんか？' },
  { title: 'PivotLog', body: '{streak}日連続で続いています。今日も振り返りの時間です' },
  { title: 'PivotLog', body: '習慣が育っています。{streak}日分のあなたがここに' },
];

// ストリークマイルストーン直前のメッセージ
export const MILESTONE_APPROACHING_MESSAGES: NotificationMessage[] = [
  { title: 'PivotLog', body: '今日書くと、{milestone}日連続になります' },
  { title: 'PivotLog', body: 'あと1日で{milestone}日連続です' },
  { title: 'PivotLog', body: '{milestone}日達成まであと1日です' },
];

// ストリークが途切れた後のメッセージ（復帰促進）
// バックアップ通知（2日目以降）が発火する＝その間記録が無い状態で届く前提の文言にする
export const COMEBACK_MESSAGES: NotificationMessage[] = [
  { title: 'PivotLog', body: '休んでも大丈夫。今日からまた始められます' },
  { title: 'PivotLog', body: '何度でもやり直せます。今日はどんな一日でしたか？' },
  { title: 'PivotLog', body: '数日の休みは習慣を壊しません' },
  { title: 'PivotLog', body: '空いた日々も、あなたの時間です。今日をひと言残しませんか？' },
  { title: 'PivotLog', body: 'いつでも続きが書けます。記録は消えていません' },
];

// 前日の「明日、大切にしたいこと」を引用するテンプレート
// {quote} を実際の言葉に置き換えて使う
export const QUOTE_REMINDER_TEMPLATES: string[] = [
  '昨日のあなたは『{quote}』を大切にしたいと書いていました。どんな1日でしたか？',
  '『{quote}』——昨日のあなたの言葉です。今日はどうでしたか？',
  '『{quote}』。昨日の自分と約束したこと、覚えていますか？',
];

// 引用が長文だった場合のフォールバック（内容をぼかす）
export const QUOTE_FALLBACK_MESSAGE: NotificationMessage = {
  title: 'PivotLog',
  body: '昨日の自分と約束したこと、覚えていますか？',
};

// ロック画面に載せる引用の最大文字数（これを超えたらフォールバックにぼかす）
const QUOTE_MAX_LENGTH = 20;

/**
 * ランダムにメッセージを選択
 */
export const getRandomMessage = (messages: NotificationMessage[]): NotificationMessage => {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
};

/**
 * 日付ベースでメッセージを選択（同じ日は同じメッセージ）
 */
export const getMessageByDate = (messages: NotificationMessage[], date: Date = new Date()): NotificationMessage => {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % messages.length;
  return messages[index];
};

/**
 * 前日の「明日、大切にしたいこと」から引用メッセージを組み立てる
 * @returns 引用メッセージ。引用に使えない（空文字）場合は null
 */
export const buildQuoteMessage = (tomorrowText: string | undefined, targetDate: Date): NotificationMessage | null => {
  // 改行はスペースに畳んで1行の引用として扱う
  const quote = tomorrowText?.replace(/\s+/g, ' ').trim();
  if (!quote) return null;

  // 長文はロック画面での見え方・プライバシーの観点からぼかす
  if (quote.length > QUOTE_MAX_LENGTH) {
    return QUOTE_FALLBACK_MESSAGE;
  }

  const dayOfYear = Math.floor(
    (targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const template = QUOTE_REMINDER_TEMPLATES[dayOfYear % QUOTE_REMINDER_TEMPLATES.length];
  return { title: 'PivotLog', body: template.replace('{quote}', quote) };
};

// スケジュール時に文言が焼き込まれるリマインダーの日別出し分けオプション
export interface ScheduledReminderOptions {
  /** 前日（保存日）の「明日、大切にしたいこと」。quoteTomorrow OFF 時は渡さない */
  tomorrowText?: string;
  /** 保存時点の連続記録日数（保存した日を含む） */
  streakDays?: number;
}

/**
 * 日記保存時にスケジュールする通知の文言を日別に出し分ける
 *
 * 文言はスケジュール時に焼き込まれ配信時には更新されないため、
 * 「バックアップ通知が発火する＝その間ユーザーは記録していない」性質を踏まえて選ぶ:
 * - 1日目（翌日）: 引用 > 実streak値のメッセージ > 日替わり汎用
 *   （発火時点で未記録ならstreak値は正確。記録済みなら再スケジュールで通知ごと組み直される）
 * - 2〜7日目: 発火する時点でstreakは確実に途切れているため、
 *   streak数値入り文言は使わず復帰メッセージにする
 *
 * @param dayOffset 保存日から何日後の通知か（1〜7）
 * @param targetDate 通知が発火する日
 * @param options 引用・streak情報
 */
export const getScheduledReminderMessage = (
  dayOffset: number,
  targetDate: Date,
  options: ScheduledReminderOptions = {}
): { message: NotificationMessage; personalized: boolean } => {
  if (dayOffset <= 1) {
    // 引用があれば最優先（パーソナライズ扱い）
    const quoteMessage = buildQuoteMessage(options.tomorrowText, targetDate);
    if (quoteMessage) {
      return { message: quoteMessage, personalized: true };
    }

    const streakDays = options.streakDays ?? 0;

    // マイルストーン直前（翌日書くと達成）
    const milestones = [7, 14, 30, 100, 365];
    const nextMilestone = milestones.find((m) => m === streakDays + 1);
    if (nextMilestone && streakDays > 0) {
      const base = getMessageByDate(MILESTONE_APPROACHING_MESSAGES, targetDate);
      return {
        message: { title: base.title, body: base.body.replace('{milestone}', nextMilestone.toString()) },
        personalized: false,
      };
    }

    // ストリーク継続中
    if (streakDays > 0) {
      const base = getMessageByDate(STREAK_REMINDER_MESSAGES, targetDate);
      return {
        message: { title: base.title, body: base.body.replace('{streak}', streakDays.toString()) },
        personalized: false,
      };
    }

    return { message: getMessageByDate(DAILY_REMINDER_MESSAGES, targetDate), personalized: false };
  }

  // 2〜7日目: 復帰メッセージ（日替わり）。完全離脱ユーザーへの「おかえりなさい通知」を兼ねる
  return { message: getMessageByDate(COMEBACK_MESSAGES, targetDate), personalized: false };
};
