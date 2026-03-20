/**
 * 日替わり視点メッセージ
 * 「穏やかな覚醒」をコンセプトに、人生の有限性と今の豊かさの両面から
 * 毎日異なる視点で気づきをもたらす
 */

/**
 * 表示条件の型定義
 * 複数条件が設定された場合はすべてAND条件
 */
export interface DisplayCondition {
  /** 表示する月（1=1月, 12=12月）。未指定なら通年表示 */
  displayMonths?: number[];
  /** 誕生日月に表示するか */
  requiresBirthday?: boolean;
  /** 表示する曜日（0=日, 1=月, ..., 6=土） */
  dayOfWeek?: number[];
  /** 表示するストリーク日数の範囲 */
  streakRange?: { min?: number; max?: number };
  /** 今日の日記記入状態（true=記入済み, false=未記入） */
  hasTodayEntry?: boolean;
}

export interface PerspectiveMessage {
  /** メッセージID（重複防止用） */
  id: string;
  /** 視点のカテゴリ */
  category: 'countdown' | 'reframe' | 'reflection' | 'wisdom' | 'awareness' | 'gratitude' | 'action';
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
 * 視点メッセージの定義（120個・7カテゴリ）
 *
 * プレースホルダー:
 * - {remainingYears}: 残り年数
 * - {remainingDays}: 残り日数
 * - {remainingWeeks}: 残り週数
 * - {remainingWeekends}: 残り週末数
 * - {remainingMonths}: 残り月数（remainingYears × 12）
 * - {remainingTravels}: 残り旅行回数（remainingYears × 2）
 * - {remainingSeasons}: 残り季節回数（remainingYears × 4）
 * - {remainingSprings}: 残りの春の回数
 * - {remainingSummers}: 残りの夏の回数
 * - {remainingAutumns}: 残りの秋の回数
 * - {remainingWinters}: 残りの冬の回数
 * - {currentAge}: 現在の年齢
 * - {progressPercent}: 人生の進捗%
 * - {streakDays}: 連続記録日数
 */
export const PERSPECTIVE_MESSAGES: PerspectiveMessage[] = [
  // ============================================================
  // countdown: 残り時間を様々な単位で表現（18個）
  // 「限りあるからこそ尊い」というトーン
  // ============================================================

  // --- 通年 (10) ---
  {
    id: 'weekends',
    category: 'countdown',
    template: 'あと約{remainingWeekends}回の週末がある',
    subtext: '予定のない土曜日の朝も、かけがえのない一回',
    emoji: '☀️',
  },
  {
    id: 'mornings',
    category: 'countdown',
    template: 'あと{remainingDays}回の朝を迎えられる',
    subtext: '今朝の光の色を、覚えていますか',
    emoji: '🌤️',
  },
  {
    id: 'countdown-tea',
    category: 'countdown',
    template: 'あと約{remainingDays}回、温かいお茶を淹れられる',
    subtext: '湯気の向こうに、今日がある',
    emoji: '☕',
  },
  {
    id: 'countdown-sunrise',
    category: 'countdown',
    template: 'あと{remainingDays}回の日の出を迎えられる',
    subtext: '毎朝、世界は最初からやり直す',
    emoji: '🌅',
  },
  {
    id: 'countdown-cooking',
    category: 'countdown',
    template: 'あと約{remainingDays}回の食卓を囲める',
    subtext: '「いただきます」の温度を、覚えていたい',
    emoji: '🍚',
  },
  {
    id: 'countdown-deep-talks',
    category: 'countdown',
    template: '心から笑い合える会話は、あと何回だろう',
    subtext: '明日、誰かに声をかけてみようか',
    emoji: '💬',
  },
  {
    id: 'countdown-songs',
    category: 'countdown',
    template: '残りの人生で、あと何曲の音楽に心を動かされるだろう',
    subtext: '今日のBGMが、明日の思い出になるかもしれない',
    emoji: '🎵',
  },
  {
    id: 'sleeps',
    category: 'countdown',
    template: 'あと{remainingDays}回、目を閉じて眠りにつく',
    subtext: '今日という日を抱きしめて、おやすみなさい',
    emoji: '🌙',
  },
  {
    id: 'days-value',
    category: 'countdown',
    template: '残り{remainingDays}日。今日はそのうちの、たった一日',
    subtext: 'でも、その一日が全てを変えることもある',
    emoji: '💎',
  },
  {
    id: 'weeks',
    category: 'countdown',
    template: '人生は約4,000週間。残り{remainingWeeks}週間',
    subtext: '今週のページには、何を書こう',
    emoji: '📅',
  },

  // --- 季節限定 (8) ---
  {
    id: 'springs',
    category: 'countdown',
    template: 'あと{remainingSprings}回の桜を見届けられる',
    subtext: '今年の桜は、今年だけのもの',
    emoji: '🌸',
    displayCondition: { displayMonths: [3, 4, 5] },
  },
  {
    id: 'summers',
    category: 'countdown',
    template: '残り{remainingSummers}回の夏',
    subtext: '入道雲の下で過ごす午後も、あと何度だろう',
    emoji: '🍉',
    displayCondition: { displayMonths: [6, 7, 8] },
  },
  {
    id: 'autumns',
    category: 'countdown',
    template: 'あと{remainingAutumns}回の紅葉の秋',
    subtext: '色づく季節は、何度でも心を動かす',
    emoji: '🍂',
    displayCondition: { displayMonths: [9, 10, 11] },
  },
  {
    id: 'winters',
    category: 'countdown',
    template: '残り{remainingWinters}回の冬を迎える',
    subtext: '寒い季節も、温かい思い出になる',
    emoji: '❄️',
    displayCondition: { displayMonths: [12, 1, 2] },
  },
  {
    id: 'newyears',
    category: 'countdown',
    template: 'あと{remainingYears}回のお正月',
    subtext: '新しい年の空気を、胸いっぱいに吸い込もう',
    emoji: '🎍',
    displayCondition: { displayMonths: [12, 1] },
  },
  {
    id: 'birthdays',
    category: 'countdown',
    template: '残り{remainingYears}回の誕生日',
    subtext: '歳を重ねることは、祝福すべきこと',
    emoji: '🎂',
    displayCondition: { requiresBirthday: true },
  },
  {
    id: 'christmases',
    category: 'countdown',
    template: 'あと約{remainingYears}回のクリスマス',
    subtext: '街が少しだけ優しくなる季節を、味わおう',
    emoji: '🎄',
    displayCondition: { displayMonths: [12] },
  },
  {
    id: 'countdown-rain',
    category: 'countdown',
    template: 'あと{remainingYears}回の梅雨を過ごせる',
    subtext: '雨の日にしか聞こえない音がある',
    emoji: '☔',
    displayCondition: { displayMonths: [6, 7] },
  },

  // ============================================================
  // reframe: 視点の転換。時間を別の単位で捉え直す（16個）
  // 発見と好奇心のトーン
  // ============================================================

  // --- 通年 (12) ---
  {
    id: 'sunsets',
    category: 'reframe',
    template: 'あと{remainingDays}回の夕焼けを見られる',
    subtext: '今日の空は、今日だけの色',
    emoji: '🌇',
  },
  {
    id: 'books',
    category: 'reframe',
    template: '月1冊読むなら、あと{remainingMonths}冊の本と出会える',
    subtext: '次の1冊が、人生を変えるかもしれない',
    emoji: '📚',
  },
  {
    id: 'full-moons',
    category: 'reframe',
    template: 'あと約{remainingMonths}回の満月',
    subtext: '今夜、窓から空を見上げてみて',
    emoji: '🌕',
  },
  {
    id: 'meals',
    category: 'reframe',
    template: 'あと約{remainingDays}日、食事をできる',
    subtext: '一口ごとに、今日を味わっている',
    emoji: '🍽️',
  },
  {
    id: 'heartbeats',
    category: 'reframe',
    template: '心臓は1日約10万回鼓動する。今日もまた',
    subtext: 'この音が、あなたの人生のリズム',
    emoji: '💓',
  },
  {
    id: 'walks',
    category: 'reframe',
    template: '毎日30分歩くなら、あと{remainingDays}回の散歩',
    subtext: 'いつもの道でも、昨日とは違う風が吹いている',
    emoji: '🚶',
  },
  {
    id: 'laughs',
    category: 'reframe',
    template: '人は1日平均15回笑うという。今日はもう何回笑えた？',
    subtext: '数えなくていい。ただ、笑えた自分に気づくだけで',
    emoji: '😊',
  },
  {
    id: 'one-day-percent',
    category: 'reframe',
    template: '今日1日は、残りの人生のほんの一滴',
    subtext: 'でも、一滴がなければ海にはならない',
    emoji: '⏳',
  },
  {
    id: 'reframe-breaths',
    category: 'reframe',
    template: '今日一日で約2万回呼吸する。そのうち意識するのは、ほんの数回',
    subtext: '今、ひとつ深く吸ってみる',
    emoji: '🌬️',
  },
  {
    id: 'travels',
    category: 'reframe',
    template: '年2回旅行するなら、あと{remainingTravels}回の旅',
    subtext: '行きたい場所は、待っていてくれない',
    emoji: '✈️',
  },
  {
    id: 'reframe-photos',
    category: 'reframe',
    template: '毎日1枚写真を撮るなら、あと{remainingDays}枚のアルバム',
    subtext: 'シャッターを切りたくなる瞬間に、今日も出会えますように',
    emoji: '📷',
  },
  {
    id: 'seasons-total',
    category: 'reframe',
    template: 'あと{remainingSeasons}回の季節の移ろい',
    subtext: '風の匂いが変わる瞬間を、見逃さないで',
    emoji: '🍃',
  },

  // --- 季節限定 (4) ---
  {
    id: 'reframe-spring-growth',
    category: 'reframe',
    template: '春に咲く花は、冬の間ずっと準備していた',
    subtext: '見えない時間が、見える成果を作る',
    emoji: '🌱',
    displayCondition: { displayMonths: [3, 4, 5] },
  },
  {
    id: 'reframe-fireflies',
    category: 'reframe',
    template: 'ホタルの光は、ほんの2週間だけ。その短さが、光を美しくする',
    subtext: '限りある時間こそ、輝ける理由',
    emoji: '✨',
    displayCondition: { displayMonths: [6, 7] },
  },
  {
    id: 'reframe-autumn-colors',
    category: 'reframe',
    template: '同じ紅葉は二度と見られない。今年の赤は、今年だけの赤',
    subtext: '窓の外の景色も、日々少しずつ変わっている',
    emoji: '🍁',
    displayCondition: { displayMonths: [9, 10, 11] },
  },
  {
    id: 'reframe-snow',
    category: 'reframe',
    template: '雪の結晶は一つとして同じ形がない。今日という日もまた',
    subtext: '繰り返しのように見えて、毎日が一度きり',
    emoji: '🌨️',
    displayCondition: { displayMonths: [12, 1, 2] },
  },

  // ============================================================
  // reflection: 内省を促す問いかけ（16個）
  // 日記機能と連携した静かな問い
  // ============================================================

  // --- 通年 (10) ---
  {
    id: 'reflection-mirror',
    category: 'reflection',
    template: '10年前の自分に、今日の自分を見せたら何と言うだろう',
    subtext: '思った以上に、遠くまで来ている',
    emoji: '🪞',
  },
  {
    id: 'reflection-letter',
    category: 'reflection',
    template: '未来の自分に手紙を書くとしたら、今日何を伝える？',
    subtext: '今夜の日記が、その手紙になるかもしれない',
    emoji: '✉️',
  },
  {
    id: 'reflection-important',
    category: 'reflection',
    template: '残りの日々で、いちばん大切にしたいことは何だろう',
    subtext: '答えは、静かな時間の中にある',
    emoji: '🤔',
  },
  {
    id: 'reflection-regret',
    category: 'reflection',
    template: '明日の自分が「やっておけばよかった」と思うこと、ひとつだけ',
    subtext: '大きなことでなくていい。今日のうちに',
    emoji: '💭',
  },
  {
    id: 'reflection-legacy',
    category: 'reflection',
    template: 'あなたが残したいものは何ですか',
    subtext: '受け取ったものを、次の誰かに手渡せたら',
    emoji: '🌳',
  },
  {
    id: 'reflection-now',
    category: 'reflection',
    template: '今この瞬間、自分はどこに向かっている？',
    subtext: '立ち止まることも、大切な方向転換',
    emoji: '🧭',
  },
  {
    id: 'reflection-forgive',
    category: 'reflection',
    template: '許したい人、許されたい人はいますか',
    subtext: 'その重さを降ろせる日は、自分で選べる',
    emoji: '🤝',
  },
  {
    id: 'reflection-child',
    category: 'reflection',
    template: '子どもの頃の自分が今の自分を見たら、何と思うだろう',
    subtext: 'あの頃の夢を、まだ覚えていますか',
    emoji: '🧒',
  },
  {
    id: 'reflection-today',
    category: 'reflection',
    template: '1年後、今日のことを思い出すだろうか',
    subtext: '忘れてしまう日にも、確かに自分はいた',
    emoji: '🔮',
  },
  {
    id: 'reflection-hands',
    category: 'reflection',
    template: '自分の手を眺めてみる。この手は今日、何を作っただろう',
    subtext: '触れたもの、握ったもの、手放したもの',
    emoji: '✋',
  },

  // --- 季節限定 (2) ---
  {
    id: 'reflection-spring',
    category: 'reflection',
    template: '冬を越えて、あなたの中で芽吹いたものは何ですか',
    subtext: '季節が変わるように、人も変わっていく',
    emoji: '🌿',
    displayCondition: { displayMonths: [3, 4, 5] },
  },
  {
    id: 'reflection-autumn',
    category: 'reflection',
    template: 'この秋、手放してもいいと思えるものはありますか',
    subtext: '木が葉を落とすように、軽くなることも成長',
    emoji: '🌾',
    displayCondition: { displayMonths: [9, 10, 11] },
  },

  // --- 曜日連動 (4) ---
  {
    id: 'reflection-monday',
    category: 'reflection',
    template: '新しい週が始まった。今週、どんな自分でいたい？',
    subtext: '月曜日は、小さなリセットボタン',
    emoji: '🌱',
    displayCondition: { dayOfWeek: [1] },
  },
  {
    id: 'reflection-wednesday',
    category: 'reflection',
    template: '週の真ん中。ここまでの自分に、一言声をかけるなら？',
    subtext: '折り返し地点は、自分を確かめる場所',
    emoji: '🔄',
    displayCondition: { dayOfWeek: [3] },
  },
  {
    id: 'reflection-friday',
    category: 'reflection',
    template: '今週の自分を振り返って、一番心に残っていることは？',
    subtext: '金曜の夜は、一週間の読み返し',
    emoji: '🌆',
    displayCondition: { dayOfWeek: [5] },
  },
  {
    id: 'reflection-weekend',
    category: 'reflection',
    template: '残り{remainingWeekends}回の週末。今日は自分のために何をしよう',
    subtext: '「何もしない」も、立派な選択',
    emoji: '🛋️',
    displayCondition: { dayOfWeek: [0, 6] },
  },

  // ============================================================
  // wisdom: 叡智と洞察（18個）
  // 和歌・東洋思想・既視感の少ない引用
  // ============================================================

  // --- 通年 (16) ---
  {
    id: 'wisdom-seneca',
    category: 'wisdom',
    template: '「人生は十分に長い。ただし、よく使えば」',
    subtext: 'セネカ（古代ローマの哲学者）',
    emoji: '📜',
  },
  {
    id: 'wisdom-aurelius',
    category: 'wisdom',
    template: '「あなたがすることを思って悩むな。今やっていることを思え」',
    subtext: 'マルクス・アウレリウス『自省録』',
    emoji: '🏛️',
  },
  {
    id: 'wisdom-buddha',
    category: 'wisdom',
    template: '「過去を追うな。未来を願うな。今、この瞬間を生きよ」',
    subtext: '仏教の教え',
    emoji: '🪷',
  },
  {
    id: 'wisdom-ichigo',
    category: 'wisdom',
    template: '「一期一会」— この出会いは、一生に一度きり',
    subtext: '千利休の茶道の心得',
    emoji: '🍵',
  },
  {
    id: 'wisdom-dogen',
    category: 'wisdom',
    template: '「今日なすべきことを明日に延ばすな」',
    subtext: '道元禅師',
    emoji: '⛩️',
  },
  {
    id: 'wisdom-kenko',
    category: 'wisdom',
    template: '「命あるものを見るに、人ばかり久しきはなし」',
    subtext: '吉田兼好『徒然草』。だからこそ、人は深く生きられる',
    emoji: '📝',
  },
  {
    id: 'wisdom-socrates',
    category: 'wisdom',
    template: '「大切なのは、ただ生きることではなく、善く生きること」',
    subtext: 'ソクラテス。2400年前の問いは、今も色褪せない',
    emoji: '🏺',
  },
  {
    id: 'wisdom-basho',
    category: 'wisdom',
    template: '「旅に病んで夢は枯野をかけめぐる」',
    subtext: '松尾芭蕉。最期の句にも、まだ旅への憧れがある',
    emoji: '🎋',
  },
  {
    id: 'wisdom-ryokan',
    category: 'wisdom',
    template: '「うらを見せおもてを見せて散るもみぢ」',
    subtext: '良寛。ありのままに生きることの、清々しさ',
    emoji: '🧘',
  },
  {
    id: 'wisdom-oliver',
    category: 'wisdom',
    template: '「あなたのたった一度きりの、荒々しくも貴い命で、何をするつもり？」',
    subtext: 'Mary Oliver "The Summer Day"',
    emoji: '🦢',
  },
  {
    id: 'wisdom-thich',
    category: 'wisdom',
    template: '「今この瞬間は、喜びと幸せに満ちている。注意深くあれば、それが見えるだろう」',
    subtext: 'ティク・ナット・ハン "Peace Is Every Step"',
    emoji: '🕊️',
  },
  {
    id: 'wisdom-okakura',
    category: 'wisdom',
    template: '「茶の湯は日常の中に美を見出す術である」',
    subtext: '岡倉天心『茶の本』。平凡な日常にこそ、美は宿る',
    emoji: '🫖',
  },
  {
    id: 'wisdom-miyazawa',
    category: 'wisdom',
    template: '「世界がぜんたい幸福にならないうちは個人の幸福はあり得ない」',
    subtext: '宮沢賢治『農民芸術概論綱要』',
    emoji: '📖',
  },
  {
    id: 'wisdom-thoreau',
    category: 'wisdom',
    template: '「死ぬときになって、自分が生きていなかったと気づくことのないように」',
    subtext: 'ソロー『ウォールデン 森の生活』',
    emoji: '🌲',
  },
  {
    id: 'wisdom-proust',
    category: 'wisdom',
    template: '「真の発見の旅とは、新しい景色を探すことではなく、新しい目を持つことだ」',
    subtext: 'プルースト『失われた時を求めて』',
    emoji: '🔭',
  },
  {
    id: 'wisdom-manyoshu',
    category: 'wisdom',
    template: '「世の中を何にたとへん朝びらき漕ぎ行く船の跡なきがごとし」',
    subtext: '沙弥満誓（万葉集）。人生は波間に消える航跡のよう',
    emoji: '⛵',
  },
  {
    id: 'wisdom-rikyu',
    category: 'wisdom',
    template: '「月も雲間のなきは嫌にて候」',
    subtext: '千利休。完全ではないからこそ、美しい',
    emoji: '🌒',
  },

  // --- 季節限定 (2) ---
  {
    id: 'wisdom-shiki',
    category: 'wisdom',
    template: '「柿くへば鐘が鳴るなり法隆寺」',
    subtext: '正岡子規。ただ目の前のことを、味わい尽くす',
    emoji: '🔔',
    displayCondition: { displayMonths: [9, 10, 11] },
  },
  {
    id: 'wisdom-tanizaki',
    category: 'wisdom',
    template: '「我々東洋人は何でもない所に陰翳を生ぜしめて、美を創造する」',
    subtext: '谷崎潤一郎『陰翳礼讃』。光と影があるからこそ',
    emoji: '🕯️',
    displayCondition: { displayMonths: [11, 12, 1, 2] },
  },

  // ============================================================
  // awareness: 今ここへの気づき（14個）
  // マインドフルネス的な「現在」への注意
  // ============================================================

  // --- 通年 (10) ---
  {
    id: 'awareness-now',
    category: 'awareness',
    template: 'この文字を読んでいる今、あなたは生きている',
    subtext: '当たり前すぎて忘れてしまうこと',
    emoji: '👁️',
  },
  {
    id: 'awareness-body',
    category: 'awareness',
    template: '今、体のどこに力が入っていますか。少しだけ、緩めてみて',
    subtext: '体は、心の声をずっと聴いている',
    emoji: '🤲',
  },
  {
    id: 'awareness-sound',
    category: 'awareness',
    template: '今、何の音が聞こえていますか',
    subtext: '耳を澄ませると、世界は思ったより優しい',
    emoji: '👂',
  },
  {
    id: 'awareness-breath',
    category: 'awareness',
    template: '今、息をしている。それだけで、今日はもう始まっている',
    subtext: '吸って、吐いて。その繰り返しが、一日を紡ぐ',
    emoji: '🫧',
  },
  {
    id: 'awareness-sky',
    category: 'awareness',
    template: 'ふと空を見上げる。この空は、今この瞬間だけのもの',
    subtext: '同じ空は、二度と広がらない',
    emoji: '☁️',
  },
  {
    id: 'awareness-age',
    category: 'awareness',
    template: '{currentAge}歳のあなたは、今この瞬間が一番若い',
    subtext: '始めるのに遅すぎることは、何もない',
    emoji: '🌱',
  },
  {
    id: 'awareness-everyday',
    category: 'awareness',
    template: '今日という日は、人生で一度きり',
    subtext: '特別な日を待たなくていい。今日がすでに特別',
    emoji: '🌟',
  },
  {
    id: 'awareness-halfway',
    category: 'awareness',
    template: '人生の{progressPercent}%を歩いてきた',
    subtext: 'ここまでの道のりを、少し振り返ってみませんか',
    emoji: '📊',
  },
  {
    id: 'awareness-choices',
    category: 'awareness',
    template: '今日も無数の選択をする。その一つ一つが人生を形作る',
    subtext: 'コーヒーか紅茶か、という選択にも、自分らしさが宿る',
    emoji: '🔀',
  },
  {
    id: 'awareness-morning',
    category: 'awareness',
    template: '目が覚めた。今日というページが開いた',
    subtext: '白紙の一日に、何を描こう',
    emoji: '📃',
  },

  // --- 季節限定 (4) ---
  {
    id: 'awareness-season-change',
    category: 'awareness',
    template: '季節の変わり目。空気の温度が、ほんの少し変わったことに気づいた？',
    subtext: 'あなたの体は、もうとっくに知っている',
    emoji: '🌷',
    displayCondition: { displayMonths: [3] },
  },
  {
    id: 'awareness-summer-night',
    category: 'awareness',
    template: '夏の夜は、少しだけ世界が近くなる',
    subtext: '虫の声、風の匂い。五感が冴える季節',
    emoji: '🌃',
    displayCondition: { displayMonths: [7, 8] },
  },
  {
    id: 'awareness-autumn-light',
    category: 'awareness',
    template: '秋の光は、柔らかい。影が長くなることに気づいていましたか',
    subtext: '光の角度が変わると、見慣れた景色も変わる',
    emoji: '🌄',
    displayCondition: { displayMonths: [10, 11] },
  },
  {
    id: 'awareness-winter-warmth',
    category: 'awareness',
    template: '寒い日に飲む一杯の温かさ。体が「ありがとう」と言っている',
    subtext: '冬が教えてくれるのは、温もりのありがたさ',
    emoji: '🧣',
    displayCondition: { displayMonths: [12, 1, 2] },
  },

  // ============================================================
  // gratitude: 今あるものへの感謝（16個）
  // ポジティブ心理学に基づく温かいトーン
  // ============================================================

  // --- 通年 (12) ---
  {
    id: 'gratitude-morning',
    category: 'gratitude',
    template: '今朝、目が覚めた。それだけで、今日はもう始まっている',
    subtext: '布団の温かさを感じられるのも、生きている証',
    emoji: '🛌',
  },
  {
    id: 'gratitude-people',
    category: 'gratitude',
    template: '今日、顔を思い浮かべられる人が何人いますか',
    subtext: 'その人数だけ、あなたの人生は豊かです',
    emoji: '👥',
  },
  {
    id: 'gratitude-ordinary',
    category: 'gratitude',
    template: '何事もない一日こそ、いちばん幸せな一日かもしれない',
    subtext: '「普通の日」が贅沢だったと、後で気づくことがある',
    emoji: '🌼',
  },
  {
    id: 'gratitude-body',
    category: 'gratitude',
    template: '歩ける。見える。聞こえる。話せる。一つでもあれば、十分すぎる',
    subtext: '体は文句も言わず、今日も動いてくれている',
    emoji: '🙏',
  },
  {
    id: 'gratitude-meal',
    category: 'gratitude',
    template: '今日のごはんを、いつもより少しだけ味わってみる',
    subtext: '「おいしい」と思える感覚そのものが、贈り物',
    emoji: '🍙',
  },
  {
    id: 'gratitude-thanks',
    category: 'gratitude',
    template: '伝えたい「ありがとう」が、まだ言葉になっていない',
    subtext: '届けられるうちに、声にしてみよう',
    emoji: '💐',
  },
  {
    id: 'gratitude-home',
    category: 'gratitude',
    template: '帰る場所がある。それだけで、今日は安心できる',
    subtext: '鍵を開ける音は、一日の終わりの合図',
    emoji: '🏠',
  },
  {
    id: 'gratitude-connection',
    category: 'gratitude',
    template: 'あなたが出会えた人の一人ひとりに、物語がある',
    subtext: '偶然の出会いが、人生を変えることもある',
    emoji: '🔗',
  },
  {
    id: 'gratitude-learn',
    category: 'gratitude',
    template: '昨日知らなかったことを、今日知っている。それだけで一歩前にいる',
    subtext: '小さな発見が積み重なって、世界は広がっていく',
    emoji: '💡',
  },
  {
    id: 'gratitude-water',
    category: 'gratitude',
    template: '蛇口をひねれば水が出る。コップ一杯の奇跡',
    subtext: '当たり前の裏側には、無数の人の手がある',
    emoji: '💧',
  },
  {
    id: 'gratitude-health',
    category: 'gratitude',
    template: '今日、体が動くこと。痛いところがなければ、なおのこと',
    subtext: '健康は、失ってから気づく宝物',
    emoji: '💪',
  },
  {
    id: 'gratitude-quiet',
    category: 'gratitude',
    template: '静かな時間がある。それは、豊かさの証',
    subtext: '騒がしい日々の中の、小さな贅沢',
    emoji: '🤫',
  },

  // --- 季節限定 (4) ---
  {
    id: 'gratitude-spring-warmth',
    category: 'gratitude',
    template: '暖かくなってきた空気を感じる。冬を越えた自分に、拍手を',
    subtext: '春は、耐えた人へのご褒美',
    emoji: '🌺',
    displayCondition: { displayMonths: [3, 4] },
  },
  {
    id: 'gratitude-summer-life',
    category: 'gratitude',
    template: '夏の太陽の下、全てのものが生き生きしている。あなたも',
    subtext: '暑い日も、命が溢れている証',
    emoji: '🌞',
    displayCondition: { displayMonths: [6, 7, 8] },
  },
  {
    id: 'gratitude-autumn-harvest',
    category: 'gratitude',
    template: '実りの秋。あなたが今年育ててきたものは、何ですか',
    subtext: '目に見えない実りも、ちゃんと実っている',
    emoji: '🍇',
    displayCondition: { displayMonths: [9, 10, 11] },
  },
  {
    id: 'gratitude-winter-lights',
    category: 'gratitude',
    template: '冬のイルミネーション。暗い季節にこそ、光は美しく見える',
    subtext: 'あなたの存在もまた、誰かの光かもしれない',
    emoji: '💫',
    displayCondition: { displayMonths: [11, 12, 1] },
  },

  // ============================================================
  // action: 具体的な行動への橋渡し（22個）
  // 日記記録や小さなアクションへの柔らかな提案
  // ============================================================

  // --- 通年 (10) ---
  {
    id: 'action-diary-invite',
    category: 'action',
    template: '今日を3行で振り返ってみませんか',
    subtext: '書くことで、見えなかったものが見えてくる',
    emoji: '📝',
    displayCondition: { hasTodayEntry: false },
  },
  {
    id: 'action-diary-one-word',
    category: 'action',
    template: '今日を一言で表すなら、どんな言葉？',
    subtext: 'たった一言でも、大切な記録になる',
    emoji: '✍️',
    displayCondition: { hasTodayEntry: false },
  },
  {
    id: 'action-contact',
    category: 'action',
    template: '会いたい人に「元気？」と一通だけ送ってみる',
    subtext: 'たった3文字が、誰かの今日を変えるかもしれない',
    emoji: '📱',
  },
  {
    id: 'action-pause',
    category: 'action',
    template: '今日5分だけ、何もしない時間を作ってみる',
    subtext: '静けさの中に、ふと浮かぶものがある',
    emoji: '⏸️',
  },
  {
    id: 'action-walk',
    category: 'action',
    template: 'スマホを置いて、10分だけ外を歩いてみる',
    subtext: '風の温度、空の色。五感が教えてくれること',
    emoji: '👟',
  },
  {
    id: 'action-thanks-today',
    category: 'action',
    template: '今日、ひとつだけ「ありがとう」を声に出してみる',
    subtext: '声にすると、自分の心も温まる',
    emoji: '💌',
  },
  {
    id: 'action-tidy',
    category: 'action',
    template: '身の回りをひとつだけ整えてみる',
    subtext: '小さな整理が、心の余白を作ることがある',
    emoji: '🧹',
  },
  {
    id: 'action-listen',
    category: 'action',
    template: '今日、誰かの話を最後まで聴いてみる',
    subtext: '「聞く」ではなく「聴く」。その違いが、関係を変える',
    emoji: '🎧',
  },
  {
    id: 'action-diary-done',
    category: 'action',
    template: '今日の振り返り、お疲れさまでした',
    subtext: '書いた言葉は、未来の自分への贈り物',
    emoji: '✅',
    displayCondition: { hasTodayEntry: true },
  },
  {
    id: 'action-photo',
    category: 'action',
    template: '今日、心が動いた瞬間を写真に残してみる',
    subtext: '何年後かに見返したとき、今日を思い出せるように',
    emoji: '📸',
  },

  // --- 曜日連動 (4) ---
  {
    id: 'action-monday',
    category: 'action',
    template: '週の始まり。今週やりたいことを、ひとつだけ決めてみる',
    subtext: 'ひとつだけなら、きっとできる',
    emoji: '🎯',
    displayCondition: { dayOfWeek: [1] },
  },
  {
    id: 'action-friday',
    category: 'action',
    template: '今週の自分に「お疲れさま」と言ってあげませんか',
    subtext: '頑張った一週間。今夜は自分にご褒美を',
    emoji: '🍰',
    displayCondition: { dayOfWeek: [5] },
  },
  {
    id: 'action-saturday',
    category: 'action',
    template: '週末は、自分のための時間。ずっと気になっていたこと、やってみよう',
    subtext: '「いつか」の代わりに、「今日」',
    emoji: '🎨',
    displayCondition: { dayOfWeek: [6] },
  },
  {
    id: 'action-sunday',
    category: 'action',
    template: '日曜日。来週の自分に、ちょっとだけ優しい準備をしておく',
    subtext: '月曜の朝が、少しだけ楽になるように',
    emoji: '🗓️',
    displayCondition: { dayOfWeek: [0] },
  },

  // --- ストリーク連動 (8) ---
  {
    id: 'action-streak-start',
    category: 'action',
    template: '書くことに正解はない。今日から、また一日',
    subtext: '完璧でなくていい。始めることが、いちばん大切',
    emoji: '🌱',
    displayCondition: { streakRange: { min: 0, max: 0 } },
  },
  {
    id: 'action-streak-restart',
    category: 'action',
    template: 'また戻ってきた。それだけで、十分すぎるほどの一歩',
    subtext: '休んでもいい。大切なのは、また始められること',
    emoji: '🌅',
    displayCondition: { streakRange: { min: 0, max: 0 } },
  },
  {
    id: 'action-streak-early',
    category: 'action',
    template: '昨日も書いた。今日も書こうとしている。それだけですごい',
    subtext: '続けようとする気持ちが、何より大切',
    emoji: '🔥',
    displayCondition: { streakRange: { min: 1, max: 2 } },
  },
  {
    id: 'action-streak-3',
    category: 'action',
    template: '{streakDays}日連続。習慣の種が芽を出し始めている',
    subtext: 'ここを越えれば、書かないと気持ち悪くなる',
    emoji: '🌿',
    displayCondition: { streakRange: { min: 3, max: 6 } },
  },
  {
    id: 'action-streak-week',
    category: 'action',
    template: '{streakDays}日の積み重ね。過去の日記を読み返してみませんか',
    subtext: '自分の変化に気づくことも、振り返りの醍醐味',
    emoji: '📗',
    displayCondition: { streakRange: { min: 7, max: 13 } },
  },
  {
    id: 'action-streak-2week',
    category: 'action',
    template: '{streakDays}日間の記録。もう立派な習慣になっている',
    subtext: '続けられている自分を、認めてあげてください',
    emoji: '🏅',
    displayCondition: { streakRange: { min: 14, max: 29 } },
  },
  {
    id: 'action-streak-month',
    category: 'action',
    template: '{streakDays}日の軌跡。あなたの言葉が、日記帳を豊かにしている',
    subtext: '30日分のあなたが、そこにいる',
    emoji: '📓',
    displayCondition: { streakRange: { min: 30, max: 99 } },
  },
  {
    id: 'action-streak-100',
    category: 'action',
    template: '{streakDays}日。あなたの記録は、もう一冊の本になっている',
    subtext: '続けることでしか見えない景色がある',
    emoji: '📕',
    displayCondition: { streakRange: { min: 100 } },
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
