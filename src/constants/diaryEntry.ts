// 日記入力画面の定数

export const MAX_CHARS = 100;

// ランダムプレースホルダー（コンセプト：生の有限性による価値の再定義、行動変容）
export const PLACEHOLDERS = {
  goodTime: [
    '家族との夕食で「今日あったこと」を話せた',
    '久しぶりに友人と連絡が取れた',
    '子どもの話を最後まで聞けた',
    '「ありがとう」と言えた瞬間があった',
    '散歩して季節の変化に気づけた',
    '読みたかった本を少し読み進めた',
    '誰かの役に立てたと感じられた',
    'ふと空を見上げる余裕があった',
  ],
  wastedTime: [
    '言わなくていい一言を言ってしまった',
    '「あとで」と言って結局やらなかった',
    '誰かと比べて落ち込んでしまった',
    '大切な人との時間を後回しにした',
    '感謝を伝えそびれた',
    '目の前のことに集中できなかった',
    '小さなことでイライラしてしまった',
    '本当はやりたかったことを諦めた',
  ],
  tomorrow: [
    '大切な人に「ありがとう」を伝える',
    '誰かの話をちゃんと聞く',
    '自分のための時間を少しだけ作る',
    '「今」に集中する瞬間を増やす',
    '会いたい人に連絡してみる',
    '小さな親切を一つする',
    '自分を責めすぎない',
    '当たり前のことに感謝する',
  ],
} as const;

// 励ましメッセージ
export const ENCOURAGEMENT_MESSAGES = [
  { emoji: '📝', title: '振り返りの時間です', subtitle: '今日はどんな一日でしたか？' },
  { emoji: '✨', title: '記録を残しましょう', subtitle: '小さな気づきも大切に' },
  { emoji: '🌱', title: '自分と向き合う時間', subtitle: '一歩ずつ成長していきましょう' },
  { emoji: '💭', title: 'ふと立ち止まって', subtitle: '今日を振り返ってみませんか' },
  { emoji: '📖', title: '今日の一ページ', subtitle: 'あなたの物語を記録しましょう' },
  { emoji: '🎯', title: '振り返りタイム', subtitle: '明日へのヒントが見つかるかも' },
] as const;

// 進捗メッセージ
export const getProgressMessage = (progress: number): string => {
  if (progress === 0) return '書きたいことだけでOK ✨';
  if (progress === 3) return '素敵な記録ですね ✨';
  return '1つでも記録できれば十分です 👍';
};

// ランダム要素を取得するユーティリティ
export const getRandomElement = <T>(array: readonly T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// 日付フォーマット
export const formatDateWithWeekday = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
};
