import { SITE_METADATA, SITE_URL, faqItems } from './site';
import type { Article } from '../data/articles';

// JSON-LD(@graph) の単一生成ロジック。
// SSRバンドルに含め、scripts/prerender.mjs から呼び出して dist/index.html の
// <script id="structured-data"> へ注入する。可視FAQ(faqItems)と構造化データを
// 同一ソースから生成することで二重管理（ドリフト）を防ぐ。

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;
const FAQ_ID = `${SITE_URL}/#faq`;

// 構造化データ専用のスクリーンショット一覧（LP上の主要画面）。
const APP_SCREENSHOTS = [
  `${SITE_URL}/images/app/hero-home-screen.png`,
  `${SITE_URL}/images/app/life-countdown-01.png`,
  `${SITE_URL}/images/app/diary-01.png`,
  `${SITE_URL}/images/app/ai-review-screen.png`,
];

export type StructuredDataOptions = {
  // 鮮度シグナル。ビルド時に prerender.mjs から YYYY-MM-DD を渡す。
  dateModified?: string;
};

// --- 再利用ノード（外部 export しない） ---
// home / tool / article の各 @graph はこれらを合成して作る。
// これらの出力を変えると全ページの JSON-LD に波及するため、
// home の出力が現状と等価であることをビルド後の dist/index.html で確認する。

function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_METADATA.name,
    url: SITE_METADATA.url,
    inLanguage: SITE_METADATA.inLanguage,
    description: SITE_METADATA.description,
    publisher: { '@id': PERSON_ID },
  };
}

function personNode() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE_METADATA.authorName,
    email: `mailto:${SITE_METADATA.contactEmail}`,
    url: SITE_METADATA.url,
  };
}

function appNode(dateModified?: string) {
  const softwareApplication: Record<string, unknown> = {
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: SITE_METADATA.name,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: SITE_METADATA.operatingSystem,
    description:
      'PivotLogは、寿命カウントダウン、3つの問いの日記、ウィジェット、AIによる日次・週次・月次の振り返りを備えたライフログアプリです。',
    url: SITE_METADATA.url,
    inLanguage: SITE_METADATA.inLanguage,
    image: SITE_METADATA.image,
    screenshot: APP_SCREENSHOTS,
    featureList: [...SITE_METADATA.featureList],
    author: { '@id': PERSON_ID },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    sameAs: [SITE_METADATA.storeUrls.ios, SITE_METADATA.storeUrls.android],
  };

  if (dateModified) {
    softwareApplication.dateModified = dateModified;
  }

  return softwareApplication;
}

function faqNode() {
  return {
    '@type': 'FAQPage',
    '@id': FAQ_ID,
    mainEntity: faqItems.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

export function getStructuredData(options: StructuredDataOptions = {}) {
  const { dateModified } = options;

  return {
    '@context': 'https://schema.org',
    '@graph': [websiteNode(), personNode(), appNode(dateModified), faqNode()],
  };
}

// prerender.mjs が <script> 中身として埋め込むための JSON 文字列を返す。
export function renderStructuredData(options: StructuredDataOptions = {}): string {
  return JSON.stringify(getStructuredData(options));
}

// --- ツールページ用（体験型ページ /tools/life-countdown 等） ---
export type ToolStructuredDataOptions = {
  title: string;
  description: string;
  url: string;
  dateModified?: string;
};

// @graph: [WebSite, Person, WebPage, SoftwareApplication]。
// WebPage はツールページ自身を表し、about で SoftwareApplication を参照する。
export function getToolStructuredData(options: ToolStructuredDataOptions) {
  const { title, description, url, dateModified } = options;

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: SITE_METADATA.inLanguage,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': APP_ID },
  };

  if (dateModified) {
    webPage.dateModified = dateModified;
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [websiteNode(), personNode(), webPage, appNode(dateModified)],
  };
}

export function renderToolStructuredData(options: ToolStructuredDataOptions): string {
  return JSON.stringify(getToolStructuredData(options));
}

// --- 記事ページ用（Week 4 で使用） ---
export type ArticleStructuredDataOptions = {
  url: string;
  dateModified?: string;
};

// @graph: [WebSite, Person, BlogPosting, WebPage]。
export function getArticleStructuredData(article: Article, options: ArticleStructuredDataOptions) {
  const { url, dateModified } = options;
  const effectiveModified = dateModified ?? article.dateModified ?? article.datePublished;

  const blogPosting: Record<string, unknown> = {
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.datePublished,
    dateModified: effectiveModified,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    inLanguage: SITE_METADATA.inLanguage,
    mainEntityOfPage: url,
    url,
  };
  if (article.eyecatch) {
    blogPosting.image = {
      '@type': 'ImageObject',
      url: `${SITE_URL}${article.eyecatch.src}`,
      width: article.eyecatch.width,
      height: article.eyecatch.height,
    };
  }

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    name: article.title,
    description: article.description,
    url,
    inLanguage: SITE_METADATA.inLanguage,
    isPartOf: { '@id': WEBSITE_ID },
    dateModified: effectiveModified,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [websiteNode(), personNode(), blogPosting, webPage],
  };
}

export function renderArticleStructuredData(
  article: Article,
  options: ArticleStructuredDataOptions,
): string {
  return JSON.stringify(getArticleStructuredData(article, options));
}

export type LegalStructuredDataOptions = {
  title: string;
  url: string;
  dateModified?: string;
};

// 法務ページ用の最小 WebPage 構造化データ。
// FAQPage / SoftwareApplication は出さず、WebSite に属する1ページとして表現する。
export function getLegalStructuredData(options: LegalStructuredDataOptions) {
  const { title, url, dateModified } = options;

  const webPage: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url,
    inLanguage: SITE_METADATA.inLanguage,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': PERSON_ID },
  };

  if (dateModified) {
    webPage.dateModified = dateModified;
  }

  return webPage;
}

export function renderLegalStructuredData(options: LegalStructuredDataOptions): string {
  return JSON.stringify(getLegalStructuredData(options));
}
