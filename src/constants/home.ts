/**
 * ホーム画面で使用する定数
 */

// 曜日の日本語表記
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

// 小さい画面の閾値（iPhone SE等）
export const SMALL_SCREEN_HEIGHT = 700;

// 日替わりメッセージ（日付ベースで同じ日は同じメッセージ）
export const DAILY_MESSAGES = [
  // 温かみ・ほっこり系
  '今日もあなたらしく',
  '今日の小さな幸せを見つけよう',
  '自分を褒めてあげよう',
  'あなたは十分頑張っている',
  '深呼吸して、今日も一歩',
  'ゆっくりでも大丈夫',
  '無理せず、自分のペースで',
  '今日もお疲れさま',
  'あなたの毎日に拍手',
  '笑顔になれる瞬間がありますように',
  '今日の自分にありがとう',
  'そのままのあなたで大丈夫',
  // 前向き・応援系
  '今日もいい一日になる',
  '新しい一日の始まり',
  '今日という日を楽しもう',
  'きっとうまくいく',
  '今日も素敵な一日を',
  '今日はどんな発見があるかな',
  'いいことが起きる予感',
  '今日のあなたを応援してる',
  'ワクワクする一日に',
  '今日もチャンスがいっぱい',
  // 気づき・内省系（優しめ）
  '今この瞬間を大切に',
  '一日一日を丁寧に',
  '今日の自分を大切に',
  '今日という贈り物',
  '小さな一歩が大きな変化に',
  '今日も成長の一日',
  '心穏やかに過ごそう',
  '今日できることを楽しもう',
  '感謝の気持ちを忘れずに',
] as const;

// 記録完了時の祝福メッセージ（バリエーション）
export const CELEBRATION_MESSAGES = [
  { emoji: '🎉', text: '今日も記録できました！', subtext: '素晴らしいですね' },
  { emoji: '✨', text: '記録完了！', subtext: 'よく頑張りました' },
  { emoji: '🌟', text: 'お疲れさまでした！', subtext: '今日も一日お疲れさま' },
  { emoji: '👏', text: 'やりましたね！', subtext: '自分を褒めてあげて' },
  { emoji: '🌼', text: '今日も記録できた！', subtext: '素敵な一日でしたね' },
  { emoji: '😊', text: '記録ありがとう！', subtext: '継続は力なり' },
  { emoji: '🌱', text: '今日も一歩前進！', subtext: '小さな積み重ねが大切' },
  { emoji: '🌈', text: '記録完了です！', subtext: '明日も良い日になりますように' },
  { emoji: '📝', text: '今日の記録完了！', subtext: '振り返りは大切ですね' },
  { emoji: '🍀', text: 'お疲れさま！', subtext: '今日もよく頑張りました' },
] as const;

// 再開時の励ましメッセージ（連続記録が途切れた時）
export const RESTART_MESSAGES = [
  { emoji: '🌅', text: 'おかえりなさい！', subtext: 'また記録を始められたことが素晴らしい' },
  { emoji: '💪', text: 'また始められましたね！', subtext: '続けようとする気持ちが大切です' },
  { emoji: '🌱', text: '新しいスタート！', subtext: '何度でもやり直せます' },
  { emoji: '🤗', text: 'お帰りなさい！', subtext: '戻ってきてくれてありがとう' },
  { emoji: '✨', text: '今日から再スタート！', subtext: '休んでもまた始められる、それが強さです' },
] as const;

// 連続記録マイルストーン達成時のメッセージ
export const MILESTONE_MESSAGES: Record<number, { emoji: string; title: string; subtitle: string }> = {
  3: { emoji: '🔥', title: '3日連続達成！', subtitle: '良いスタートです！この調子で続けましょう' },
  7: { emoji: '🎉', title: '1週間達成！', subtitle: '素晴らしい！習慣になってきましたね' },
  14: { emoji: '✨', title: '2週間達成！', subtitle: 'すごい！もう立派な習慣です' },
  30: { emoji: '🌟', title: '1ヶ月達成！', subtitle: 'おめでとうございます！継続の力を証明しました' },
  100: { emoji: '💎', title: '100日達成！', subtitle: '圧巻です！あなたは本当に素晴らしい' },
  365: { emoji: '🏆', title: '1年達成！', subtitle: '偉業達成！あなたは真のチャンピオンです' },
};

// 総記録マイルストーン達成時のメッセージ
export const TOTAL_MILESTONE_MESSAGES: Record<number, { emoji: string; title: string; subtitle: string }> = {
  10: { emoji: '📚', title: '累計10日記録！', subtitle: '振り返りの習慣が始まりましたね' },
  50: { emoji: '🌿', title: '累計50日記録！', subtitle: 'たくさんの思い出が積み重なりました' },
  100: { emoji: '🎊', title: '累計100日記録！', subtitle: '100日分の大切な記録、素晴らしいです' },
  200: { emoji: '🌳', title: '累計200日記録！', subtitle: 'あなたの日記は立派な財産です' },
  365: { emoji: '📖', title: '累計365日記録！', subtitle: '1年分の人生が詰まった日記帳ですね' },
  500: { emoji: '💫', title: '累計500日記録！', subtitle: '圧倒的な記録量、尊敬します' },
  1000: { emoji: '👑', title: '累計1000日記録！', subtitle: '伝説の記録者です！' },
};
