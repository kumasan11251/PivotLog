import { Logo } from './Logo';
import { SITE_PATHS } from '../../lib/site';

// 全ページ共通のヘッダー。Logo（トップへ）＋ グローバルナビ。
// リンクは同一サイト内の相対パス（SITE_PATHS）を使い、法務ページの絶対URL（LEGAL_URLS）とは混ぜない。
// ナビ項目は今回「記事一覧」のみ。将来ツール等を足せるよう <nav> 構造にしておく。
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-container items-center justify-between px-gutter py-6">
      <Logo />
      <nav aria-label="サイト内ナビゲーション" className="flex items-center gap-x-6 text-sm">
        <a className="transition hover:text-brand-700" href={SITE_PATHS.articles}>
          記事一覧
        </a>
      </nav>
    </header>
  );
}
