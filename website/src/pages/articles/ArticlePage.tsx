import type { Article } from '../../data/articles';
import { PageShell } from '../PageShell';

type ArticlePageProps = {
  article: Article;
};

// 記事詳細。Article.sections の見出し＋段落を表示する最小実装。
export function ArticlePage({ article }: ArticlePageProps) {
  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-gutter pb-16 pt-2">
        <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-muted">{article.datePublished}</p>

        <div className="mt-8 space-y-8">
          {article.sections.map((section, index) => (
            <section key={index} className="space-y-3">
              <h2 className="font-display text-xl font-semibold text-ink">{section.heading}</h2>
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} className="text-[15px] leading-8 text-ink">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </PageShell>
  );
}
