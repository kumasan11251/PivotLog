import { SITE_PATHS, SITE_URL, SITE_METADATA, articlePath } from './site';
import { ARTICLES, type Article } from '../data/articles';

// SSG が出力する全ルートの単一ソース。
// URL は site.ts の SITE_URL/SITE_PATHS を参照し、ここでハードコードしない。
// prerender.mjs はこの定義をループして dist/<outDir>/index.html を生成する。

export type StructuredDataKind = 'home' | 'legal' | 'tool' | 'article' | 'none';

export type RouteMeta = {
  // 正規パス（末尾スラッシュなし、`/` のみ例外）。SITE_PATHS と一致させる。
  path: string;
  // dist 配下の出力ディレクトリ。'' はルート（dist/index.html）。
  outDir: string;
  title: string;
  description: string;
  indexable: boolean;
  structuredData: StructuredDataKind;
  // true のとき prerender が JS を除去し純静的化する（hydration 不要のページ）。
  staticPage?: boolean;
  // OGP 画像を差し替える場合の絶対URL（未指定はテンプレートの既定画像を維持）。
  ogImage?: string;
  // article ルートのみ。構造化データ生成で getArticleBySlug に渡す。
  articleSlug?: string;
};

const baseRoutes: RouteMeta[] = [
  {
    path: SITE_PATHS.home,
    outDir: '',
    title: SITE_METADATA.title,
    description: SITE_METADATA.description,
    indexable: true,
    structuredData: 'home',
  },
  {
    path: SITE_PATHS.privacy,
    outDir: 'privacy',
    title: 'プライバシーポリシー | PivotLog',
    description:
      'PivotLog（ピボットログ）のプライバシーポリシー。収集する情報、AI機能でのデータの取り扱い、保存・保護、ユーザーの権利について説明します。',
    indexable: true,
    structuredData: 'legal',
    staticPage: true,
  },
  {
    path: SITE_PATHS.terms,
    outDir: 'terms',
    title: '利用規約 | PivotLog',
    description:
      'PivotLog（ピボットログ）の利用規約。アカウント、サブスクリプション、AI機能、禁止事項、免責事項、準拠法について定めています。',
    indexable: true,
    structuredData: 'legal',
    staticPage: true,
  },
  {
    path: SITE_PATHS.tokushoho,
    outDir: 'tokushoho',
    title: '特定商取引法に基づく表記 | PivotLog',
    description:
      'PivotLog（ピボットログ）の特定商取引法に基づく表記。販売業者、販売価格、支払方法、提供時期、動作環境を記載しています。',
    indexable: true,
    structuredData: 'legal',
    staticPage: true,
  },
  {
    path: SITE_PATHS.accountDeletion,
    outDir: 'account-deletion',
    title: 'アカウント削除 | PivotLog',
    description:
      'PivotLog（ピボットログ）のアカウント削除の手順と、削除されるデータ・保持されるデータについて説明します。',
    indexable: true,
    structuredData: 'legal',
    staticPage: true,
  },
];

// 体験型ツールページ。staticPage を指定しない＝hydration 維持（インタラクティブ）。
const toolRoute: RouteMeta = {
  path: SITE_PATHS.lifeCountdownTool,
  outDir: 'tools/life-countdown',
  title: '人生の残り時間を計算する｜目標寿命までのカウントダウン - PivotLog',
  description:
    '生年月日と目標寿命を入力すると、目標の年齢までの残り時間を年・月・日・時・分・秒で表示。人生の進捗も可視化する、PivotLogの無料体験ツールです。',
  indexable: true,
  structuredData: 'tool',
};

// 記事ルートは ARTICLES から動的生成。空なら index も含め何も足さない
// （記事0本の間は /articles を prerender/sitemap に出さず、インデックスさせない）。
const articlesIndexRoute: RouteMeta = {
  path: SITE_PATHS.articles,
  outDir: 'articles',
  title: '記事一覧 | PivotLog',
  description: 'PivotLogの記事一覧。人生の残り時間の考え方や、日々の振り返りを続けるためのヒントを紹介します。',
  indexable: true,
  structuredData: 'none',
  staticPage: true,
};

const articleToRoute = (article: Article): RouteMeta => ({
  path: articlePath(article.slug),
  outDir: `articles/${article.slug}`,
  title: `${article.title} | PivotLog`,
  description: article.description,
  indexable: true,
  structuredData: 'article',
  staticPage: true,
  articleSlug: article.slug,
});

const articleRoutes: RouteMeta[] =
  ARTICLES.length > 0 ? [articlesIndexRoute, ...ARTICLES.map(articleToRoute)] : [];

export const ROUTES: RouteMeta[] = [...baseRoutes, toolRoute, ...articleRoutes];

// 正規URL。home は末尾スラッシュ付き（既存の canonical / og:url と一致）。
export const canonicalFor = (path: string): string =>
  path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
