/**
 * リマインダー通知メッセージのバリエーション
 * 毎日異なるメッセージで飽きさせない
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
  { title: 'PivotLog', body: '{streak}日連続中！今日も記録しませんか？' },
  { title: 'PivotLog', body: '{streak}日の積み重ね。今日も続けましょう' },
  { title: 'PivotLog', body: '連続{streak}日目！この調子で' },
  { title: 'PivotLog', body: '{streak}日連続達成中。今日も振り返りの時間です' },
  { title: 'PivotLog', body: '習慣が育っています。{streak}日目の記録を' },
];

// ストリークマイルストーン直前のメッセージ
export const MILESTONE_APPROACHING_MESSAGES: NotificationMessage[] = [
  { title: 'PivotLog', body: '明日で{milestone}日連続達成！今日も記録しましょう' },
  { title: 'PivotLog', body: 'あと1日で{milestone}日連続！' },
  { title: 'PivotLog', body: '{milestone}日達成まであと1日です' },
];

// ストリークが途切れた後のメッセージ（復帰促進）
export const COMEBACK_MESSAGES: NotificationMessage[] = [
  { title: 'PivotLog', body: 'おかえりなさい。また始められます' },
  { title: 'PivotLog', body: '休んでも大丈夫。今日からまた' },
  { title: 'PivotLog', body: '何度でもやり直せます。今日から再スタート' },
  { title: 'PivotLog', body: '1回の休みは習慣を壊しません' },
  { title: 'PivotLog', body: '戻ってきてくれて嬉しいです' },
];

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
 * ストリーク日数に応じたメッセージを取得
 */
export const getReminderMessage = (
  streakDays: number,
  hasTodayEntry: boolean,
  daysSinceLastEntry: number
): NotificationMessage => {
  // 既に今日記録済みの場合は通知しない（呼び出し側で制御）
  if (hasTodayEntry) {
    return getMessageByDate(DAILY_REMINDER_MESSAGES);
  }

  // 2日以上記録がない場合（ストリーク途切れ後の復帰促進）
  if (daysSinceLastEntry >= 2) {
    return getRandomMessage(COMEBACK_MESSAGES);
  }

  // ストリーク継続中でマイルストーン直前
  const milestones = [7, 14, 30, 100, 365];
  const nextMilestone = milestones.find((m) => m === streakDays + 1);
  if (nextMilestone && streakDays > 0) {
    const message = getRandomMessage(MILESTONE_APPROACHING_MESSAGES);
    return {
      title: message.title,
      body: message.body.replace('{milestone}', nextMilestone.toString()),
    };
  }

  // ストリーク継続中
  if (streakDays > 0) {
    const message = getRandomMessage(STREAK_REMINDER_MESSAGES);
    return {
      title: message.title,
      body: message.body.replace('{streak}', streakDays.toString()),
    };
  }

  // 通常のリマインダー
  return getMessageByDate(DAILY_REMINDER_MESSAGES);
};
