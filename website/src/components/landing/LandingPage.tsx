import { Apple, CalendarDays, Clock3, Leaf, Play, Sparkles, Smartphone } from 'lucide-react';
import { Logo, Reveal, StoreBadge } from '../common';
import { AppScreenshotPhone, HeroPhoneScreenshot } from './PhoneMockups';
import { howSteps, pricingCards } from '../../data/landing';
import { STORE_LABELS, STORE_QR_IMAGES, STORE_URLS, type StorePlatform } from '../../lib/store';
import { ANSWER_CAPSULE, LEGAL_URLS, faqItems } from '../../lib/site';

const storePlatforms: StorePlatform[] = ['ios', 'android'];
const iconByPlatform = {
  ios: Apple,
  android: Play,
} satisfies Record<StorePlatform, typeof Apple>;

function StoreBadges() {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
      <StoreBadge platform="ios" className="!min-h-11 w-full justify-center rounded-[11px] px-3 py-1.5 sm:w-auto [&_svg]:h-5 [&_svg]:w-5 [&_span_span:first-child]:text-[8px] [&_span_span:last-child]:text-[15px]" />
      <StoreBadge platform="android" className="!min-h-11 w-full justify-center rounded-[11px] px-3 py-1.5 sm:w-auto [&_svg]:h-5 [&_svg]:w-5 [&_span_span:first-child]:text-[8px] [&_span_span:last-child]:text-[15px]" />
    </div>
  );
}

function StoreDownloadCards() {
  return (
    <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-2 md:grid-cols-[238px_238px] md:max-w-[500px]">
      {storePlatforms.map((platform) => {
        const Icon = iconByPlatform[platform];
        const label = STORE_LABELS[platform];

        return (
          <a
            key={platform}
            aria-label={label.aria}
            className="group flex min-h-11 w-full items-center justify-center rounded-[11px] bg-ink px-3 py-1.5 text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto md:min-h-0 md:w-[238px] md:flex-col md:items-stretch md:justify-start md:gap-3 md:rounded-card md:border md:border-line md:bg-surface/90 md:p-2.5 md:text-ink md:shadow-soft md:hover:bg-surface"
            href={STORE_URLS[platform]}
            rel="noreferrer"
            target="_blank"
          >
            <span className="flex items-center justify-center gap-3 md:min-h-11 md:rounded-[11px] md:bg-ink md:px-3 md:py-1.5 md:text-white md:transition md:group-hover:bg-brand-700">
              <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              <span className="flex flex-col text-left leading-none">
                <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-white/75">{label.eyebrow}</span>
                <span className="mt-1 text-[15px] font-semibold tracking-normal text-white">{label.name}</span>
              </span>
            </span>
            <span className="hidden grid-cols-[112px_1fr] items-center gap-3 md:grid">
              <img className="h-[112px] w-[112px]" src={STORE_QR_IMAGES[platform]} alt={label.qrAlt} loading="lazy" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold leading-5 text-ink">スマホで開く</span>
                <span className="mt-0.5 block text-sm font-semibold leading-5 text-ink">{label.name}</span>
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function StoreDownloadLinks({ showQr = false }: { showQr?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {showQr ? <StoreDownloadCards /> : <StoreBadges />}
    </div>
  );
}

function FeatureDeviceMock({ type }: { type: 'widget' | 'ai' }) {
  const screen = {
    widget: {
      src: '/images/app/widget-home-screen.png',
      alt: 'PivotLogのホーム画面ウィジェット。残り時間、人生の進捗、連続記録、今日の視点を表示しています。',
    },
    ai: {
      src: '/images/app/ai-review-screen.png',
      alt: 'PivotLogの月間ふりかえり画面。日記をもとに成長した点と次の月の課題を整理しています。',
    },
  }[type];

  return (
    <div className="phone-frame relative mx-auto w-[min(210px,64vw)] shrink-0 rounded-[30px] bg-[#101211] p-1.5 shadow-phone sm:w-[220px] sm:p-2 md:w-[190px] lg:w-[210px]">
      <div className="overflow-hidden rounded-[24px] bg-[#f8f7f2] sm:rounded-[26px]">
        <img
          className="block aspect-[1170/2532] w-full object-cover"
          src={screen.src}
          alt={screen.alt}
          loading="lazy"
        />
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="overflow-x-hidden bg-canvas text-ink">
      <header className="mx-auto flex max-w-container items-center justify-between px-gutter py-6">
        <Logo />
      </header>

      <section className="mx-auto grid max-w-container gap-8 px-gutter pb-9 pt-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:pb-14">
        <Reveal className="mx-auto max-w-[600px] text-center lg:mx-0 lg:text-left">
          <h1 className="flex flex-col items-center text-center font-display text-[clamp(2.35rem,9.8vw,4.45rem)] font-semibold leading-[1.04] tracking-normal text-ink md:text-[3.45rem] lg:text-[3.65rem]">
            <span className="whitespace-nowrap text-[0.82em]">寿命カウントダウン</span>
            <span className="py-1 text-[0.48em] leading-none">×</span>
            <span className="whitespace-nowrap text-[0.82em]">日記</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[500px] text-base leading-8 text-ink lg:mx-0">
            人生の有限性を意識して、1日を振り返る。PivotLogは、限りある毎日を自分らしく積み重ねるためのライフログアプリです。
          </p>
          <div className="mt-7 flex justify-center lg:justify-start">
            <StoreDownloadLinks showQr />
          </div>
        </Reveal>
        <Reveal className="relative min-h-[500px] lg:min-h-[570px]" delayMs={120}>
          <div className="hero-phone-float relative z-10 lg:-ml-12 lg:pl-8 xl:-ml-16">
            <HeroPhoneScreenshot />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-container px-gutter pb-4 pt-2 md:pb-6">
        <Reveal className="mx-auto max-w-3xl rounded-card border border-line bg-surface/80 px-6 py-6 shadow-soft md:px-9 md:py-8">
          <p className="text-sm leading-8 text-ink md:text-base md:leading-9">
            <b className="font-semibold">PivotLog（ピボットログ）とは</b>、{ANSWER_CAPSULE.replace('PivotLog（ピボットログ）とは、', '')}
          </p>
        </Reveal>
      </section>

      <section className="bg-brand-50/35">
        <div className="mx-auto max-w-container px-gutter py-14 md:py-16">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-4xl font-semibold text-ink md:text-[2.7rem]">主な機能</h2>
            <p className="mt-4 text-sm leading-7 text-ink md:text-base">時間を見つめ、1日を振り返るための2つの柱。</p>
          </Reveal>

          <section className="mt-12 grid gap-8 md:grid-cols-2 md:items-center">
            <Reveal className="relative">
              <span className="mb-4 inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-surface/80 px-3 py-1 text-xs font-semibold text-[#78946f]">
                <Clock3 className="h-4 w-4" />
                機能 1
              </span>
              <h3 className="font-display text-4xl font-semibold leading-[1.25] text-ink md:text-[2.7rem]">寿命カウントダウン</h3>
              <p className="mt-6 max-w-sm text-sm leading-7 text-ink">目標寿命から残り時間を計算し、人生の進み具合を穏やかに可視化。長い時間軸の中で、今の1日を大切にできます。</p>
              <img alt="PivotLogの寿命カウントダウンを想起させる時計と植物の静物イメージ" className="float-still-life mt-8 w-[300px]" src="/images/generated/hero-still-life.png" />
            </Reveal>
            <Reveal className="grid grid-cols-2 items-start gap-3 sm:gap-5 md:justify-items-center" delayMs={100}>
              <AppScreenshotPhone
                src="/images/app/life-countdown-01.png"
                alt="PivotLogの寿命カウントダウン画面。年、月、日、時、分、秒で残り時間を表示しています。"
              />
              <AppScreenshotPhone
                src="/images/app/life-countdown-02.png"
                alt="PivotLogの寿命カウントダウン画面。週単位の残り時間と人生の進捗バーを表示しています。"
              />
            </Reveal>
          </section>

          <section className="grid gap-8 pt-14 md:grid-cols-2 md:items-center md:pt-16">
            <Reveal className="relative">
              <span className="mb-4 inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-surface/80 px-3 py-1 text-xs font-semibold text-[#78946f]">
                <CalendarDays className="h-4 w-4" />
                機能 2
              </span>
              <h3 className="font-display text-4xl font-semibold leading-[1.25] text-ink md:text-[2.7rem]">日記</h3>
              <p className="mt-6 max-w-sm text-sm leading-7 text-ink">3つの問いに答えるだけで、その日の良かったこと、少し後悔したこと、明日大切にしたいことが残ります。日記の内容をもとにAIから優しい気づきを受け取れます。</p>
              <img alt="PivotLogの日記習慣を想起させるノートと植物の静物イメージ" className="float-still-life mt-8 w-[300px]" src="/images/generated/questions-still-life.png" />
            </Reveal>
            <Reveal className="grid grid-cols-2 items-start gap-3 sm:gap-5 md:justify-items-center" delayMs={100}>
              <AppScreenshotPhone
                src="/images/app/diary-01.png"
                alt="PivotLogの日記入力画面。良かったこと、少し後悔していること、明日大切にしたいことを記録しています。"
              />
              <AppScreenshotPhone
                src="/images/app/diary-02.png"
                alt="PivotLogの日記の気づき画面。日記をもとにした今日の気づきが表示されています。"
              />
            </Reveal>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-container px-gutter py-14 md:py-16">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-semibold text-ink md:text-[2.7rem]">習慣を支える機能</h2>
          <p className="mt-4 text-sm leading-7 text-ink md:text-base">開かなくても思い出せる。書いたあとに気づける。続けるための小さな工夫を用意しています。</p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Reveal className="grid gap-6 rounded-card border border-line bg-surface p-6 shadow-soft md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-[#78946f]">
                <Smartphone className="h-6 w-6" />
              </span>
              <h3 className="font-display text-2xl font-semibold text-ink">ウィジェット</h3>
              <p className="mt-4 text-sm leading-7 text-ink">ホーム画面やロック画面から残り時間を確認。表示するテキストは自由にカスタマイズ可能です。</p>
            </div>
            <FeatureDeviceMock type="widget" />
          </Reveal>
          <Reveal className="grid gap-6 rounded-card border border-line bg-surface p-6 shadow-soft md:grid-cols-[1fr_auto] md:items-center md:p-8" delayMs={90}>
            <div>
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-[#78946f]">
                <Sparkles className="h-6 w-6" />
              </span>
              <h3 className="font-display text-2xl font-semibold text-ink">AIによる振り返り</h3>
              <p className="mt-4 text-sm leading-7 text-ink">書いた日記をもとに、価値観や行動のパターンをやさしく整理。明日の小さな一歩を見つけやすくします。</p>
            </div>
            <FeatureDeviceMock type="ai" />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-container px-gutter py-12 text-center">
        <h2 className="font-display text-4xl font-semibold text-ink">使い方は、とてもシンプル</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {howSteps.map(({ title, body, icon: Icon }, index) => (
            <Reveal key={title} className="relative" delayMs={index * 70}>
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-[#78946f]">
                <Icon className="h-8 w-8" />
              </span>
              <span className="absolute left-1/2 top-0 flex h-7 w-7 -translate-x-12 items-center justify-center rounded-full bg-[#78946f] text-xs font-bold text-white">{index + 1}</span>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-container gap-6 px-gutter py-8 md:grid-cols-2">
        {pricingCards.map(({ title, price, features, icon: Icon, featured }) => (
          <Reveal key={title} className={`relative overflow-hidden rounded-card border bg-surface p-8 shadow-soft ${featured ? 'border-accent-gold' : 'border-[#9ab08f]'}`}>
            <div className="flex items-center gap-6">
              <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full ${featured ? 'bg-accent-gold/20 text-[#bd8a29]' : 'bg-brand-50 text-[#78946f]'}`}>
                {price === '¥0' ? <span className="text-4xl font-semibold">{price}</span> : <Icon className="h-11 w-11" />}
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
                <ul className="mt-3 space-y-1 text-sm leading-6 text-ink">
                  {features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                </ul>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto max-w-container px-gutter py-12">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-ink md:text-[2.5rem]">よくある質問</h2>
          <p className="mt-4 text-sm leading-7 text-ink md:text-base">PivotLogの機能、料金、AIの扱いについて。</p>
        </Reveal>
        <dl className="mx-auto mt-9 grid max-w-4xl gap-5 md:grid-cols-2">
          {faqItems.map(({ question, answer }, index) => (
            <Reveal
              key={question}
              className="rounded-card border border-line bg-surface p-6 shadow-soft"
              delayMs={index * 55}
            >
              <dt className="font-display text-lg font-semibold text-ink">{question}</dt>
              <dd className="mt-3 text-sm leading-7 text-ink">{answer}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-container px-gutter py-10">
        <div className="grid gap-7 rounded-panel border border-line bg-surface px-6 py-8 text-center shadow-soft md:grid-cols-[120px_1fr_auto] md:items-center md:gap-8 md:px-10 md:py-9 md:text-left">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-[#78946f] md:mx-0">
            <Leaf className="h-12 w-12" />
          </div>
          <div className="mx-auto max-w-xl md:mx-0">
            <h2 className="font-display text-3xl font-semibold leading-[1.35] text-ink md:text-[2.2rem]">今日という一日を、少しだけ大切に。</h2>
            <p className="mt-4 text-sm leading-7 text-ink md:text-base">PivotLogで、自分の時間に静かに戻る習慣をはじめましょう。</p>
          </div>
          <div className="shrink-0">
            <StoreDownloadLinks />
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-container flex-col items-center gap-4 px-gutter pb-10 pt-1 text-sm text-muted">
        <Logo />
        <nav aria-label="法務・サポート" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a className="transition hover:text-brand-700" href={LEGAL_URLS.privacy}>プライバシーポリシー</a>
          <a className="transition hover:text-brand-700" href={LEGAL_URLS.terms}>利用規約</a>
          <a className="transition hover:text-brand-700" href={LEGAL_URLS.tokushoho}>特定商取引法に基づく表記</a>
          <a className="transition hover:text-brand-700" href={LEGAL_URLS.accountDeletion}>アカウント削除</a>
        </nav>
        <p>© 2026 PivotLog</p>
      </footer>
    </main>
  );
}
