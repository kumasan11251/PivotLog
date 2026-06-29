import { CalendarDays, Clock3, Crown, Gift, Leaf, Pencil, Sprout, SunMedium } from 'lucide-react';

export const questionCards = [
  { question: '今日、良かった時間は？', icon: SunMedium },
  { question: '少し後悔している時間は？', icon: Sprout },
  { question: '明日、大切にしたいことは？', icon: Leaf },
];

export const howSteps = [
  { title: '初期設定', body: '目標寿命と生年月日を設定', icon: Clock3 },
  { title: '今日を見る', body: '残り時間と人生の進捗を確認', icon: CalendarDays },
  { title: '3つの問いを書く', body: 'たった3つの問いで1日を振り返る', icon: Pencil },
  { title: '気づきを明日へ', body: 'ふりかえりで気づきを次の行動へ', icon: Leaf },
];

export const pricingCards = [
  {
    title: '無料で始められます',
    price: '¥0',
    features: ['毎日の3つの問いを記録', '残り時間・人生の進捗の表示', 'ウィジェットの追加'],
    icon: Gift,
    featured: false,
  },
  {
    title: 'Premiumでもっと深く',
    price: 'Premium',
    features: ['AIから日々の気づきを受け取る', 'AIによる週間・月間のレポート', 'AI機能を無制限に利用可能'],
    icon: Crown,
    featured: true,
  },
];
