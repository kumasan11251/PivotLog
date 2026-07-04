// 記事コンテンツの単一ソース。
// 今回（Phase 2 Week 3）は空配列。Week 4 で ARTICLES に記事を追加するだけで、
// 一覧・詳細・JSON-LD・prerender・sitemap が自動で有効になる。
// MDX やリッチブロックは今回入れず、見出し＋段落配列の最小構造にとどめる。

export type ArticleSection = {
  heading: string;
  paragraphs: string[];
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // YYYY-MM-DD
  dateModified?: string;
  sections: ArticleSection[];
};

// Week 4 で記事を投入する。sections が空の記事は公開しない運用。
export const ARTICLES: Article[] = [];

export const getArticleBySlug = (slug: string): Article | undefined =>
  ARTICLES.find((article) => article.slug === slug);
