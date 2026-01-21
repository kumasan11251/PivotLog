/**
 * 人生の有限性について考えさせる「日替わり視点メッセージ」
 * 毎日異なる視点で残り時間を表現し、新鮮さを保つ
 */

/**
 * 表示条件の型定義
 * - displayMonths: 表示する月（1-12）の配列。指定がなければ通年表示
 * - requiresBirthday: trueの場合、ユーザーの誕生日月に表示
 */
export interface DisplayCondition {
  /** 表示する月（1=1月, 12=12月）。未指定なら通年表示 */
  displayMonths?: number[];
  /** 誕生日月に表示するか */
  requiresBirthday?: boolean;
}

export interface PerspectiveMessage {
  /** メッセージID（重複防止用） */
  id: string;
  /** 視点のカテゴリ */
  category: 'countdown' | 'comparison' | 'quote' | 'question' | 'milestone';
  /** メッセージテンプレート（{remainingYears}等のプレースホルダーを含む） */
  template: string;
  /** 小さめの補足テキスト */
  subtext?: string;
  /** アイコン絵文字 */
  emoji: string;
  /** 表示条件（未指定なら通年表示） */
  displayCondition?: DisplayCondition;
}

/**
 * 視点メッセージの定義
 * プレースホルダー:
 * - {remainingYears}: 残り年数
 * - {remainingDays}: 残り日数
 * - {remainingWeeks}: 残り週数
 * - {remainingWeekends}: 残り週末数
 * - {remainingSprings}: 残りの春の回数
 * - {remainingSummers}: 残りの夏の回数
 * - {remainingAutumns}: 残りの秋の回数
 * - {remainingWinters}: 残りの冬の回数
 * - {currentAge}: 現在の年齢
 * - {progressPercent}: 人生の進捗%
 */
export const PERSPECTIVE_MESSAGES: PerspectiveMessage[] = [
  // === カウントダウン系: 残り時間を様々な単位で表現 ===
  {
    id: 'weekends',
    category: 'countdown',
    template: 'あなたには、あと約{remainingWeekends}回の週末がある',
    subtext: 'どの週末も、二度と戻ってこない',
    emoji: '🌅',
  },
  {
    id: 'springs',
    category: 'countdown',
    template: 'あと{remainingSprings}回の桜を見届けられる',
    subtext: '今年の桜は、今年だけのもの',
    emoji: '🌸',
    displayCondition: { displayMonths: [3, 4, 5] }, // 春（3〜5月）
  },
  {
    id: 'summers',
    category: 'countdown',
    template: '残り{remainingSummers}回の夏',
    subtext: '花火、海、かき氷…夏の思い出を大切に',
    emoji: '🍉',
    displayCondition: { displayMonths: [6, 7, 8] }, // 夏（6〜8月）
  },
  {
    id: 'autumns',
    category: 'countdown',
    template: 'あと{remainingAutumns}回の紅葉の秋',
    subtext: '色づく季節は、何度でも心を動かす',
    emoji: '🍂',
    displayCondition: { displayMonths: [9, 10, 11] }, // 秋（9〜11月）
  },
  {
    id: 'winters',
    category: 'countdown',
    template: '残り{remainingWinters}回の冬を迎える',
    subtext: '寒い季節も、温かい思い出になる',
    emoji: '❄️',
    displayCondition: { displayMonths: [12, 1, 2] }, // 冬（12〜2月）
  },
  {
    id: 'newyears',
    category: 'countdown',
    template: 'あと{remainingYears}回のお正月',
    subtext: '新しい年を迎えられることは、当たり前ではない',
    emoji: '🎍',
    displayCondition: { displayMonths: [12, 1] }, // 年末年始
  },
  {
    id: 'birthdays',
    category: 'countdown',
    template: '残り{remainingYears}回の誕生日',
    subtext: '歳を重ねることは、祝福すべきこと',
    emoji: '🎂',
    displayCondition: { requiresBirthday: true }, // 誕生日月
  },
  {
    id: 'christmases',
    category: 'countdown',
    template: 'あと約{remainingYears}回のクリスマス',
    subtext: '大切な人と過ごす時間を大切に',
    emoji: '🎄',
    displayCondition: { displayMonths: [12] }, // 12月
  },
  {
    id: 'days-value',
    category: 'countdown',
    template: '残り{remainingDays}日。今日は1/{remainingDays}の価値がある',
    subtext: '今日という日は、もう二度と来ない',
    emoji: '💎',
  },
  {
    id: 'weeks',
    category: 'countdown',
    template: 'あなたの人生は、あと約{remainingWeeks}週間',
    subtext: '1週間1週間を、丁寧に過ごそう',
    emoji: '📅',
  },
  {
    id: 'mornings',
    category: 'countdown',
    template: 'あと{remainingDays}回の「おはよう」を言える',
    subtext: '今日の朝も、当たり前ではない',
    emoji: '🌤️',
  },
  {
    id: 'conversations',
    category: 'countdown',
    template: '大切な人と話せる時間は、あと何時間だろう',
    subtext: '今日、誰かと心を通わせよう',
    emoji: '💬',
  },
  {
    id: 'sleeps',
    category: 'countdown',
    template: 'あと{remainingDays}回、目を閉じて眠りにつく',
    subtext: '明日また目覚められることに感謝を',
    emoji: '🌙',
  },

  // === 比較・視点変換系: 別の角度から時間を見る ===
  {
    id: 'one-day-percent',
    category: 'comparison',
    template: '今日1日は、残りの人生の約0.01%',
    subtext: 'たった0.01%でも、かけがえのない1日',
    emoji: '⏳',
  },
  {
    id: 'meals',
    category: 'comparison',
    template: 'あと約{remainingDays}回の朝食、昼食、夕食',
    subtext: '食事の時間も、大切な人生の一部',
    emoji: '🍽️',
  },
  {
    id: 'sunsets',
    category: 'comparison',
    template: 'あと{remainingDays}回の夕焼けを見られる',
    subtext: '今日の空は、今日だけの色',
    emoji: '🌇',
  },
  {
    id: 'books',
    category: 'comparison',
    template: '月1冊読むなら、あと{remainingYears}冊の本と出会える',
    subtext: 'どの本を選ぶか、それも人生の選択',
    emoji: '📚',
  },
  {
    id: 'movies',
    category: 'comparison',
    template: '週1本映画を見るなら、あと約{remainingWeeks}本',
    subtext: '限られた時間で、何を見るか',
    emoji: '🎬',
  },
  {
    id: 'travels',
    category: 'comparison',
    template: '年2回旅行するなら、あと{remainingYears}回×2の旅',
    subtext: '行きたい場所、先延ばしにしていませんか',
    emoji: '✈️',
  },
  {
    id: 'full-moons',
    category: 'comparison',
    template: 'あと約{remainingYears}回×12の満月',
    subtext: '月を見上げる時間を持とう',
    emoji: '🌕',
  },
  {
    id: 'heartbeats',
    category: 'comparison',
    template: '心臓は1日約10万回鼓動する。残り約{remainingDays}日分',
    subtext: 'この鼓動が続く限り、人生は続く',
    emoji: '💓',
  },
  {
    id: 'walks',
    category: 'comparison',
    template: '毎日30分歩くなら、あと{remainingDays}回の散歩',
    subtext: '歩くたびに、世界は少し広がる',
    emoji: '🚶',
  },
  {
    id: 'laughs',
    category: 'comparison',
    template: '人は1日平均15回笑う。残り{remainingDays}日で何回笑える？',
    subtext: '笑顔は、人生を豊かにする',
    emoji: '😊',
  },
  {
    id: 'seasons-total',
    category: 'comparison',
    template: 'あと{remainingYears}回×4の季節の移ろい',
    subtext: '同じ季節は二度とない',
    emoji: '🍃',
  },

  // === 問いかけ系: 内省を促す ===
  {
    id: 'question-important',
    category: 'question',
    template: '残り{remainingDays}日で、何を大切にしたい？',
    subtext: '今日の選択が、明日を作る',
    emoji: '🤔',
  },
  {
    id: 'question-regret',
    category: 'question',
    template: '今日やらなかったら、後悔すること何？',
    subtext: '小さな一歩でも、踏み出してみよう',
    emoji: '💭',
  },
  {
    id: 'question-thanks',
    category: 'question',
    template: '残りの人生で、誰に「ありがとう」を伝えたい？',
    subtext: '感謝は、伝えられるうちに',
    emoji: '🙏',
  },
  {
    id: 'question-today',
    category: 'question',
    template: '今日が人生最後の日だとしたら、何をする？',
    subtext: 'その答えが、本当に大切なこと',
    emoji: '✨',
  },
  {
    id: 'question-priority',
    category: 'question',
    template: '限られた{remainingDays}日、何に時間を使いたい？',
    subtext: '時間は、最も貴重な資源',
    emoji: '⏰',
  },
  {
    id: 'question-courage',
    category: 'question',
    template: '「いつか」を「今日」に変える勇気はある？',
    subtext: '先延ばしの代償は、時間そのもの',
    emoji: '🦁',
  },
  {
    id: 'question-legacy',
    category: 'question',
    template: 'あなたが残したいものは何ですか？',
    subtext: '人は去っても、想いは残る',
    emoji: '🌳',
  },
  {
    id: 'question-now',
    category: 'question',
    template: '今この瞬間、本当にやりたいことをしている？',
    subtext: '「今」は、唯一コントロールできる時間',
    emoji: '🎯',
  },
  {
    id: 'question-forgive',
    category: 'question',
    template: '許したい人、許されたい人はいますか？',
    subtext: '心の荷物を降ろす時間も、有限',
    emoji: '🤝',
  },

  // === 名言・格言系 ===
  {
    id: 'quote-seneca',
    category: 'quote',
    template: '「人生は十分に長い。ただし、よく使えば」',
    subtext: '— セネカ（古代ローマの哲学者）',
    emoji: '📜',
  },
  {
    id: 'quote-jobs',
    category: 'quote',
    template: '「今日が人生最後の日だとしたら、今日やろうとしていることをやりたいか」',
    subtext: '— スティーブ・ジョブズ',
    emoji: '🍎',
  },
  {
    id: 'quote-gandhi',
    category: 'quote',
    template: '「明日死ぬかのように生きよ。永遠に生きるかのように学べ」',
    subtext: '— マハトマ・ガンジー',
    emoji: '🕊️',
  },
  {
    id: 'quote-aurelius',
    category: 'quote',
    template: '「あなたがすることを思って悩むな。今やっていることを思え」',
    subtext: '— マルクス・アウレリウス',
    emoji: '🏛️',
  },
  {
    id: 'quote-buddha',
    category: 'quote',
    template: '「過去を追うな。未来を願うな。今、この瞬間を生きよ」',
    subtext: '— 仏教の教え',
    emoji: '🪷',
  },
  {
    id: 'quote-einstein',
    category: 'quote',
    template: '「人生とは自転車のようなもの。倒れないためには走り続けなければならない」',
    subtext: '— アルバート・アインシュタイン',
    emoji: '🚲',
  },
  {
    id: 'quote-twain',
    category: 'quote',
    template: '「二十年後、あなたはやったことよりやらなかったことを悔やむ」',
    subtext: '— マーク・トウェイン',
    emoji: '⛵',
  },
  {
    id: 'quote-thoreau',
    category: 'quote',
    template: '「大切なのは、ただ生きることではなく、善く生きること」',
    subtext: '— ソクラテス',
    emoji: '🏺',
  },
  {
    id: 'quote-ichigo',
    category: 'quote',
    template: '「一期一会」— この出会いは、一生に一度きり',
    subtext: '— 千利休の茶道の心得',
    emoji: '🍵',
  },
  {
    id: 'quote-dogen',
    category: 'quote',
    template: '「今日なすべきことを明日に延ばすな」',
    subtext: '— 道元禅師',
    emoji: '⛩️',
  },
  {
    id: 'quote-kenko',
    category: 'quote',
    template: '「命あるものを見るに、人ばかり久しきはなし」',
    subtext: '— 吉田兼好『徒然草』',
    emoji: '📝',
  },

  // === マイルストーン・気づき系 ===
  {
    id: 'halfway',
    category: 'milestone',
    template: '人生の{progressPercent}%が過ぎた',
    subtext: '残りの時間で、何を成し遂げたい？',
    emoji: '📊',
  },
  {
    id: 'age-context',
    category: 'milestone',
    template: '{currentAge}歳のあなたは、今この瞬間が一番若い',
    subtext: '始めるなら、今日がベスト',
    emoji: '🌱',
  },
  {
    id: 'thousand-weeks',
    category: 'milestone',
    template: '人生は約4000週間。残り{remainingWeeks}週間',
    subtext: '一週間一週間が、かけがえのない時間',
    emoji: '📖',
  },
  {
    id: 'irreversible',
    category: 'milestone',
    template: '昨日という日は、永遠に戻ってこない',
    subtext: '今日を、精一杯生きよう',
    emoji: '🔙',
  },
  {
    id: 'every-day-new',
    category: 'milestone',
    template: '今日という日は、人生で一度きり',
    subtext: '特別な日を待たなくていい。今日が特別',
    emoji: '🌟',
  },
  {
    id: 'breath',
    category: 'milestone',
    template: '今、息ができている。それだけで奇跡',
    subtext: '生きているから、何でもできる',
    emoji: '🌬️',
  },
  {
    id: 'choices',
    category: 'milestone',
    template: '今日も無数の選択をする。その一つ一つが人生を形作る',
    subtext: '小さな選択の積み重ねが、大きな違いを生む',
    emoji: '🔀',
  },
  {
    id: 'connections',
    category: 'milestone',
    template: 'あなたが出会える人の数には限りがある',
    subtext: '一つ一つの縁を大切に',
    emoji: '🔗',
  },
  {
    id: 'morning-gift',
    category: 'milestone',
    template: '目が覚めた。今日という贈り物を受け取った',
    subtext: '新しい一日は、新しいチャンス',
    emoji: '🎁',
  },
];

/**
 * カテゴリ別のメッセージ数を取得（デバッグ・バランス確認用）
 */
export const getMessageCountByCategory = (): Record<string, number> => {
  const counts: Record<string, number> = {};
  PERSPECTIVE_MESSAGES.forEach(msg => {
    counts[msg.category] = (counts[msg.category] || 0) + 1;
  });
  return counts;
};
