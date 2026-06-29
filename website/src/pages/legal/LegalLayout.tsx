import type { ReactNode } from 'react';
import { Logo } from '../../components/common';
import { LEGAL_URLS } from '../../lib/site';

type LegalLayoutProps = {
  title: string;
  // 「最終更新日: ...」相当。docs/*.md の冒頭表記を移植する。
  updated?: string;
  children: ReactNode;
};

// 法務ページ共通レイアウト。JS なし（hydration 不要）で表示できるよう、
// IntersectionObserver を使う Reveal は使わずプレーンな要素のみで組む。
export function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <header className="mx-auto flex max-w-container items-center justify-between px-gutter py-6">
        <Logo />
      </header>

      <article className="mx-auto max-w-3xl px-gutter pb-16 pt-2">
        <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">{title}</h1>
        {updated ? <p className="mt-3 text-sm text-muted">{updated}</p> : null}
        <div className="mt-8 space-y-6 text-[15px] leading-8 text-ink">{children}</div>
      </article>

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

// 法務本文で繰り返し使う見出し・段落・リスト・表のスタイル付き要素。
// prose プラグインは追加せず、個別の Tailwind クラスで統一する。

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-base font-semibold text-ink">{children}</h3>;
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p className="leading-8 text-ink">{children}</p>;
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 leading-8 text-ink">{children}</ul>;
}

export function LegalOrderedList({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-6 leading-8 text-ink">{children}</ol>;
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="text-brand-700 underline underline-offset-2 transition hover:text-brand-500" href={href}>
      {children}
    </a>
  );
}

// 表全体を横スクロール可能なコンテナで包む（狭幅端末でレイアウト崩れを防ぐ）。
export function LegalTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function LegalTh({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-line bg-surface px-4 py-3 text-left align-top font-semibold text-ink">
      {children}
    </th>
  );
}

export function LegalTd({ children }: { children: ReactNode }) {
  return <td className="border-b border-line px-4 py-3 align-top leading-7 text-ink">{children}</td>;
}
