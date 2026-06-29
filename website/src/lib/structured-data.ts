import { SITE_METADATA, SITE_URL, faqItems } from './site';

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

export function getStructuredData(options: StructuredDataOptions = {}) {
  const { dateModified } = options;

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

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: SITE_METADATA.name,
        url: SITE_METADATA.url,
        inLanguage: SITE_METADATA.inLanguage,
        description: SITE_METADATA.description,
        publisher: { '@id': PERSON_ID },
      },
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: SITE_METADATA.authorName,
        email: `mailto:${SITE_METADATA.contactEmail}`,
        url: SITE_METADATA.url,
      },
      softwareApplication,
      {
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
      },
    ],
  };
}

// prerender.mjs が <script> 中身として埋め込むための JSON 文字列を返す。
export function renderStructuredData(options: StructuredDataOptions = {}): string {
  return JSON.stringify(getStructuredData(options));
}
