import { SITE_PATHS, SITE_URL, SITE_METADATA } from './site';

// SSG が出力する全ルートの単一ソース。
// URL は site.ts の SITE_URL/SITE_PATHS を参照し、ここでハードコードしない。
// prerender.mjs はこの定義をループして dist/<outDir>/index.html を生成する。

export type StructuredDataKind = 'home' | 'legal' | 'none';

export type RouteMeta = {
  // 正規パス（末尾スラッシュなし、`/` のみ例外）。SITE_PATHS と一致させる。
  path: string;
  // dist 配下の出力ディレクトリ。'' はルート（dist/index.html）。
  outDir: string;
  title: string;
  description: string;
  indexable: boolean;
  structuredData: StructuredDataKind;
};

export const ROUTES: RouteMeta[] = [
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
  },
  {
    path: SITE_PATHS.terms,
    outDir: 'terms',
    title: '利用規約 | PivotLog',
    description:
      'PivotLog（ピボットログ）の利用規約。アカウント、サブスクリプション、AI機能、禁止事項、免責事項、準拠法について定めています。',
    indexable: true,
    structuredData: 'legal',
  },
  {
    path: SITE_PATHS.tokushoho,
    outDir: 'tokushoho',
    title: '特定商取引法に基づく表記 | PivotLog',
    description:
      'PivotLog（ピボットログ）の特定商取引法に基づく表記。販売業者、販売価格、支払方法、提供時期、動作環境を記載しています。',
    indexable: true,
    structuredData: 'legal',
  },
  {
    path: SITE_PATHS.accountDeletion,
    outDir: 'account-deletion',
    title: 'アカウント削除 | PivotLog',
    description:
      'PivotLog（ピボットログ）のアカウント削除の手順と、削除されるデータ・保持されるデータについて説明します。',
    indexable: true,
    structuredData: 'legal',
  },
];

// 正規URL。home は末尾スラッシュ付き（既存の canonical / og:url と一致）。
export const canonicalFor = (path: string): string =>
  path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
