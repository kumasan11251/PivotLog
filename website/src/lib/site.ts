import { STORE_URLS } from './store';

export const SITE_URL = 'https://pivotlog.app';

// 法務ページは pivotlog.app 配下に内製化済み（website/src/pages/legal/）。
// リンクは同ドメイン内のページを参照する。
const LEGAL_BASE_URL = SITE_URL;

export const SITE_PATHS = {
  home: '/',
  privacy: '/privacy',
  terms: '/terms',
  tokushoho: '/tokushoho',
  accountDeletion: '/account-deletion',
} as const;

export const LEGAL_URLS = {
  privacy: `${LEGAL_BASE_URL}${SITE_PATHS.privacy}`,
  terms: `${LEGAL_BASE_URL}${SITE_PATHS.terms}`,
  tokushoho: `${LEGAL_BASE_URL}${SITE_PATHS.tokushoho}`,
  accountDeletion: `${LEGAL_BASE_URL}${SITE_PATHS.accountDeletion}`,
} as const;

export const SITE_METADATA = {
  name: 'PivotLog',
  title: 'PivotLog | 寿命カウントダウン × 日記',
  description: 'PivotLogは、残り時間を見える化し、3つの問いの日記とAIによる振り返りで毎日を自分らしく積み重ねるためのライフログアプリです。',
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/images/references/pivotlog-top-lp-jp-v3.png`,
  icon: `${SITE_URL}/images/app/icon.png`,
  authorName: '村田健伍',
  contactEmail: 'kumasan.11251@gmail.com',
  storeUrls: STORE_URLS,
  inLanguage: 'ja',
  operatingSystem: 'iOS, Android',
  // AIが機能を引用しやすいよう、主要機能を列挙（SoftwareApplication.featureList に流用）
  featureList: [
    '寿命カウントダウン（目標寿命までの残り時間を年・月・日・時・分・秒で表示）',
    '人生の進捗バー（経過した割合の可視化）',
    '3つの問いの振り返り日記（今日良かったこと・少し後悔していること・明日大切にしたいこと）',
    'ホーム画面・ロック画面ウィジェット（残り時間と任意のテキストを表示）',
    'AIによる振り返り（日次の気づき・週間レポート・月間レポート）',
    'リマインダー通知（日記を続けやすくする）',
  ],
} as const;

// AI検索が抜き出しやすい簡潔な定義文（answer capsule）。LP本文・llms.txt と同期させる単一ソース。
export const ANSWER_CAPSULE =
  'PivotLog（ピボットログ）とは、目標寿命までの残り時間を秒単位でカウントダウン表示し、1日3つの問い（今日良かったこと・少し後悔していること・明日大切にしたいこと）に答える振り返り日記と、AIの気づきで毎日を見つめ直すライフログ（人生時計）アプリです。iPhone / Android対応、基本無料。';

export const faqItems = [
  {
    question: 'PivotLogは誰向けのアプリですか？',
    answer: '人生の残り時間を意識しながら、日々の選択や気づきを短い日記で残したい人向けのライフログアプリです。',
  },
  {
    question: '残り時間（寿命カウントダウン）はどうやって計算しますか？',
    answer: '生年月日と、自分で設定した目標寿命をもとに、目標寿命に達するまでの残り時間を年・月・日・時・分・秒で計算して表示します。経過した割合は人生の進捗バーで確認できます。',
  },
  {
    question: '目標寿命と平均寿命（平均余命）はどう違いますか？',
    answer: 'PivotLogが使うのは、統計上の平均寿命や平均余命ではなく、あなた自身が決める「目標寿命」です。何歳まで生きたいかを自分で設定し、その地点までの残り時間を見つめることを大切にしています。',
  },
  {
    question: '3つの問いとは具体的に何ですか？',
    answer: '「今日、良かったこと」「今日、少し後悔していること」「明日、大切にしたいこと」の3つです。短く答えるだけで1日を振り返れます。',
  },
  {
    question: '他の寿命カウントダウンアプリと何が違いますか？',
    answer: '残り時間を表示するだけでなく、3つの問いの振り返り日記とAIの気づきを組み合わせている点が特徴です。時間の有限性を意識しながら、今日の行動を見つめ直す習慣づくりを支えます。',
  },
  {
    question: '無料で使える機能は何ですか？',
    answer: '3つの問いの日記、残り時間と人生の進捗の表示、ホーム画面やロック画面で使えるウィジェットを無料で利用できます。',
  },
  {
    question: 'Premiumでは何ができますか？',
    answer: '日記をもとにしたAIの気づき、週間レポート、月間レポートなど、振り返りを深める機能を利用できます。',
  },
  {
    question: 'データのバックアップや機種変更時の引き継ぎはできますか？',
    answer: 'メール・Google・Appleのいずれかのアカウントでログインすると、日記や設定がクラウドに同期され、機種変更時も同じアカウントでログインすれば引き継げます。',
  },
  {
    question: 'AI機能ではどんなデータが送信されますか？',
    answer: 'AI機能の利用時のみ、日記の内容と年齢・目標寿命がGoogle Gemini APIに送信され、気づきやレポート生成に使われます。',
  },
  {
    question: '対応している端末は何ですか？',
    answer: 'iPhoneとAndroidに対応しています。特定商取引法に基づく表記では、動作環境をiOS 15.1以上、Android 6.0以上としています。',
  },
] as const;
