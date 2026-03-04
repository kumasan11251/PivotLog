// 日記入力画面の定数

export const MAX_CHARS = 200;

// ランダムプレースホルダー（コンセプト：生の有限性による価値の再定義、行動変容）
export const PLACEHOLDERS = {
  goodTime: [
    '家族との夕食で「今日あったこと」を話せた',
    '久しぶりに友人と連絡が取れた',
    '子どもの話を最後まで聞けた',
    '「ありがとう」と伝えられた',
    '散歩して季節の変化に気づけた',
    '読みたかった本を少し読み進めた',
    '誰かの役に立てたと感じられた',
    'ふと空を見上げる余裕があった',
    '美味しいご飯をゆっくり味わえた',
    '早起きして朝の静けさを楽しめた',
    '好きな音楽を聴く時間があった',
    '笑顔で挨拶できた',
    '新しいことに挑戦できた',
    '自分を褒めてあげられた',
    '困っている人を手伝えた',
    '丁寧に掃除ができた',
    '深呼吸する時間が取れた',
    '懐かしい写真を見返せた',
    '友人と笑い合えた',
    '自然の中で過ごす時間があった',
  ],
  wastedTime: [
    '言わなくていい一言を言ってしまった',
    '「あとで」と言って結局やらなかった',
    '誰かと比べて落ち込んでしまった',
    '大切な人との時間を後回しにした',
    '感謝を伝えそびれた',
    '目の前のことに集中できなかった',
    '小さなことでイライラしてしまった',
    '今日やりたかったことができなかった',
    'SNSを見すぎてしまった',
    '体調管理を怠ってしまった',
    '愚痴を言いすぎてしまった',
    '返事を後回しにしてしまった',
    '夜更かしをしてしまった',
    '食べすぎてしまった',
    '約束を守れなかった',
    '相手の気持ちを考えられなかった',
    '言い訳をしてしまった',
    '素直になれなかった',
    'ダラダラ過ごしてしまった',
    '心配しすぎてしまった',
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
    '笑顔を意識して過ごす',
    '早めに寝る',
    '体を動かす時間を作る',
    'ゆっくり食事を楽しむ',
    '新しいことに挑戦する',
    '誰かを褒める',
    '整理整頓をする',
    '深呼吸をして落ち着く',
    '好きなことに時間を使う',
    '感情的にならない',
    '「ごめんね」を素直に言う',
    '丁寧に生活する',
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
  { emoji: '🌸', title: '今日もお疲れさまでした', subtitle: '頑張った自分を褒めましょう' },
  { emoji: '🌙', title: '一日の終わりに', subtitle: '静かに今日を振り返りましょう' },
  { emoji: '☕', title: 'ちょっと一息', subtitle: '今日の出来事を整理しましょう' },
  { emoji: '🌈', title: '今日も一歩前へ', subtitle: '小さな変化を大切に' },
  { emoji: '💫', title: '自分を見つめる時間', subtitle: '気づきが明日を変えます' },
  { emoji: '🕊️', title: '心を落ち着けて', subtitle: '今日の自分と対話しましょう' },
  { emoji: '🌻', title: '今日の学びは？', subtitle: '経験は全て糧になります' },
  { emoji: '🍀', title: '感謝の時間', subtitle: '良かったことを探してみましょう' },
  { emoji: '📚', title: '日記の時間です', subtitle: '書くことで気持ちが整います' },
  { emoji: '🔮', title: '明日への準備', subtitle: '今日を糧に明日を迎えましょう' },
  { emoji: '🎵', title: 'リフレクションタイム', subtitle: '心の声に耳を傾けて' },
  { emoji: '🌟', title: '今日の輝きは？', subtitle: '小さな光を見つけましょう' },
  { emoji: '🧘', title: '内省の時間', subtitle: '自分自身と静かに向き合って' },
  { emoji: '💝', title: '自分へのご褒美', subtitle: '今日も生きた自分を労って' },
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

// 日付ベースでシード値を生成（同じ日付なら同じ値を返す）
const getDateSeed = (date: Date): number => {
  const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// 日付ベースで要素を取得するユーティリティ（同じ日なら同じ要素を返す）
export const getDailyElement = <T>(array: readonly T[], date: Date, offset: number = 0): T => {
  const seed = getDateSeed(date) + offset;
  return array[seed % array.length];
};

// 日付フォーマット
export const formatDateWithWeekday = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
};
