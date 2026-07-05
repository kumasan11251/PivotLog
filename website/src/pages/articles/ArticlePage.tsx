import type { Article, ArticleSection } from '../../data/articles';
import { StoreBadge } from '../../components/common';
import { AppScreenshotPhone } from '../../components/landing/PhoneMockups';
import { PageShell } from '../PageShell';

type ArticlePageProps = {
  article: Article;
};

// 本文文字数から読了目安（分）を出す。日本語の平均的な読速 500字/分で概算。
function estimateReadingMinutes(article: Article): number {
  const bodyChars = [
    ...(article.lead ?? []),
    ...article.sections.flatMap((section) => [
      ...section.paragraphs,
      ...(section.list ?? []),
      ...(section.cards ?? []).flatMap((card) => [card.title, card.example]),
    ]),
  ].join('').length;
  return Math.max(1, Math.round(bodyChars / 500));
}

// ヒーロー帯。カテゴリピル＋タイトル＋日付・読了目安。
function ArticleHero({ article }: { article: Article }) {
  return (
    <div className="border-b border-line/70 bg-surface">
      <div className="mx-auto max-w-[41rem] px-gutter pb-10 pt-6 md:pb-12 md:pt-8">
        {article.category ? (
          <p className="inline-flex items-center rounded-pill border border-brand-100 bg-brand-50/60 px-3 py-1 text-xs font-semibold text-brand-700">
            {article.category}
          </p>
        ) : null}
        <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.4] text-ink md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <time dateTime={article.datePublished}>{article.datePublished}</time>
          <span aria-hidden="true" className="h-3 w-px bg-line" />
          <span>読了目安 約{estimateReadingMinutes(article)}分</span>
        </p>
        {article.eyecatch ? (
          <img
            className="mt-8 aspect-[1200/630] w-full rounded-card border border-line object-cover shadow-soft"
            src={article.eyecatch.src}
            alt={article.eyecatch.alt}
            width={article.eyecatch.width}
            height={article.eyecatch.height}
            fetchPriority="high"
          />
        ) : null}
      </div>
    </div>
  );
}

// 目次。クリーム色のcanvasの上に、温白のsurface＋極細罫線で「紙のブロック」として見せる。
// brand-50（ミント系）はcanvasと色味が喧嘩してにごるため使わない。影・番号も付けない。
// JSなしで動くアンカーリンク（scroll-behavior: smooth はグローバルCSSで有効）。
function ArticleToc({ sections }: { sections: ArticleSection[] }) {
  return (
    <nav aria-label="目次" className="mt-10 rounded-card border border-line/70 bg-surface px-6 py-5">
      <p className="text-sm font-semibold text-muted">この記事の内容</p>
      <ol className="mt-3 space-y-2">
        {sections.map((section, index) => (
          <li key={index}>
            <a
              className="text-[15px] leading-7 text-ink underline decoration-line underline-offset-4 transition hover:text-brand-700"
              href={`#section-${index + 1}`}
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// 質問テンプレート。目次と同じ温白のブロックに太字の質問＋記入例1行。バッジ・影は付けない。
function QuestionCards({ cards }: { cards: NonNullable<ArticleSection['cards']> }) {
  return (
    <ol className="!mt-6 space-y-3">
      {cards.map((card, index) => (
        <li key={index} className="rounded-card border border-line/70 bg-surface px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-ink">{card.title}</h3>
          <p className="mt-1 text-base leading-8 text-muted">例：{card.example}</p>
        </li>
      ))}
    </ol>
  );
}

function ArticleInlineImage({ image }: { image: NonNullable<ArticleSection['image']> }) {
  return (
    <figure className="!mt-8 overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      <img className="aspect-[3/2] w-full object-cover" src={image.src} alt={image.alt} loading="lazy" />
      {image.caption ? (
        <figcaption className="border-t border-line bg-brand-50/40 px-5 py-3 text-sm leading-7 text-muted">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// 記事末尾の共通CTA。押し売りしない控えめなトーンで、紙のノートでも十分はじめられる旨に触れる。
// 日記入力画面のスマホモックを添えて「アプリだとこう見える」を伝える。
function ArticleStoreCta() {
  return (
    <aside className="mt-16 rounded-panel border border-line/70 bg-surface px-6 py-8 md:px-10 md:py-10">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-display text-xl font-semibold text-ink md:text-2xl">
            今夜の3問から、はじめてみませんか
          </p>
          <p className="mt-4 text-base leading-8 text-ink">
            日記は、紙のノートでも十分にはじめられます。もしアプリで試してみたい方がいれば、PivotLogが
            「今日、良かったこと」「今日、少し後悔していること」「明日、大切にしたいこと」の3つの問いを、毎日そっと用意します。
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <StoreBadge platform="ios" />
            <StoreBadge platform="android" />
          </div>
        </div>
        <AppScreenshotPhone
          src="/images/app/diary-01.png"
          alt="PivotLogの日記入力画面。良かったこと、少し後悔していること、明日大切にしたいことを記録しています。"
        />
      </div>
    </aside>
  );
}

// 記事詳細。ヒーロー→リード→目次→本文（見出し＋段落＋カード/箇条書き）→ストアCTAの順に描画する。
export function ArticlePage({ article }: ArticlePageProps) {
  return (
    <PageShell>
      <ArticleHero article={article} />

      <article className="mx-auto max-w-[41rem] px-gutter pb-16 pt-10">
        {article.lead ? (
          <div className="space-y-4">
            {article.lead.map((paragraph, index) => (
              <p key={index} className="text-base leading-8 text-ink">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}

        <ArticleToc sections={article.sections} />

        <div className="mt-12 space-y-16">
          {article.sections.map((section, index) => (
            <section key={index} className="space-y-4">
              <h2
                className="scroll-mt-6 font-display text-2xl font-semibold leading-snug text-ink md:text-[1.75rem]"
                id={`section-${index + 1}`}
              >
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} className="text-base leading-8 text-ink">
                  {paragraph}
                </p>
              ))}
              {section.image ? <ArticleInlineImage image={section.image} /> : null}
              {section.cards ? <QuestionCards cards={section.cards} /> : null}
              {section.list ? (
                <ul className="list-disc space-y-2 pl-6 leading-8 text-ink">
                  {section.list.map((item, lIndex) => (
                    <li key={lIndex}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <ArticleStoreCta />
      </article>
    </PageShell>
  );
}
