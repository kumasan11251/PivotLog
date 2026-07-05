import type { ReactNode } from 'react';
import { Logo, SiteHeader } from '../components/common';
import { LEGAL_URLS } from '../lib/site';

type PageShellProps = {
  children: ReactNode;
};

// ツールページ・記事ページ共通の header/footer レイアウト。
// LandingPage / LegalLayout の footer マークアップを踏襲する（既存2箇所のリファクタはしない）。
export function PageShell({ children }: PageShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <SiteHeader />

      {children}

      <footer className="mx-auto flex max-w-container flex-col items-center gap-4 px-gutter pb-10 pt-1 text-sm text-muted">
        <Logo />
        <nav aria-label="法務・サポート" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a className="transition hover:text-brand-700" href="/">ホーム</a>
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
