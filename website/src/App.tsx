import { LandingPage } from './components/landing/LandingPage';
import { PrivacyPage, TermsPage, TokushohoPage, AccountDeletionPage } from './pages/legal';
import { SITE_PATHS } from './lib/site';

type AppProps = {
  // 正規化済みパス（末尾スラッシュなし、`/` のみ例外）。
  path: string;
};

export default function App({ path }: AppProps) {
  switch (path) {
    case SITE_PATHS.privacy:
      return <PrivacyPage />;
    case SITE_PATHS.terms:
      return <TermsPage />;
    case SITE_PATHS.tokushoho:
      return <TokushohoPage />;
    case SITE_PATHS.accountDeletion:
      return <AccountDeletionPage />;
    default:
      return <LandingPage />;
  }
}
