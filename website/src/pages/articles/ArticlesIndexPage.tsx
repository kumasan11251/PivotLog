import { ARTICLES } from '../../data/articles';
import { articlePath } from '../../lib/site';
import { PageShell } from '../PageShell';

// 記事一覧。ARTICLES が空でも壊れない最小実装（Week 4 で記事投入時に有効化）。
export function ArticlesIndexPage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-gutter pb-16 pt-2">
        <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">記事一覧</h1>
        <p className="mt-4 text-[15px] leading-8 text-ink">
          人生の残り時間の考え方や、日々の振り返りを続けるためのヒントを紹介します。
        </p>

        {ARTICLES.length > 0 ? (
          <ul className="mt-8 space-y-5">
            {ARTICLES.map((article) => (
              <li
                key={article.slug}
                className="rounded-card border border-line bg-surface p-6 shadow-soft"
              >
                <a
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
                  href={articlePath(article.slug)}
                >
                  {article.eyecatch ? (
                    <img
                      className="aspect-[1200/630] w-full shrink-0 rounded-lg border border-line object-cover sm:w-48"
                      src={article.eyecatch.src}
                      alt=""
                      width={article.eyecatch.width}
                      height={article.eyecatch.height}
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold text-ink transition hover:text-brand-700">
                      {article.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-ink">{article.description}</p>
                    <p className="mt-3 text-xs text-muted">{article.datePublished}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-[12px] bg-brand-50/50 px-4 py-4 text-sm leading-7 text-ink">
            現在準備中です。もうしばらくお待ちください。
          </p>
        )}
      </article>
    </PageShell>
  );
}
