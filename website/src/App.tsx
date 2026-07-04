import { LandingPage } from './components/landing/LandingPage';
import { PrivacyPage, TermsPage, TokushohoPage, AccountDeletionPage } from './pages/legal';
import { LifeCountdownToolPage } from './pages/tools/LifeCountdownToolPage';
import { ArticlesIndexPage } from './pages/articles/ArticlesIndexPage';
import { ArticlePage } from './pages/articles/ArticlePage';
import { ARTICLES, getArticleBySlug } from './data/articles';
import { SITE_PATHS } from './lib/site';

type AppProps = {
  // 正規化済みパス（末尾スラッシュなし、`/` のみ例外）。
  path: string;
};

export default function App({ path }: AppProps) {
  // 記事は case 式に条件を混ぜず、switch の前でガードする。
  // 記事0本の間は /articles / /articles/:slug を出さない（LandingPage フォールバック）。
  if (ARTICLES.length > 0) {
    if (path === SITE_PATHS.articles) {
      return <ArticlesIndexPage />;
    }
    if (path.startsWith(`${SITE_PATHS.articles}/`)) {
      const slug = path.slice(`${SITE_PATHS.articles}/`.length);
      const article = getArticleBySlug(slug);
      if (article) {
        return <ArticlePage article={article} />;
      }
    }
  }

  switch (path) {
    case SITE_PATHS.privacy:
      return <PrivacyPage />;
    case SITE_PATHS.terms:
      return <TermsPage />;
    case SITE_PATHS.tokushoho:
      return <TokushohoPage />;
    case SITE_PATHS.accountDeletion:
      return <AccountDeletionPage />;
    case SITE_PATHS.lifeCountdownTool:
      return <LifeCountdownToolPage />;
    default:
      return <LandingPage />;
  }
}
