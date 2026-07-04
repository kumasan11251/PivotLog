import { renderToString } from 'react-dom/server';
import App from './App';
import {
  renderStructuredData,
  renderLegalStructuredData,
  renderToolStructuredData,
  renderArticleStructuredData,
} from './lib/structured-data';
import { ROUTES, canonicalFor } from './lib/routes';
import { ARTICLES, getArticleBySlug } from './data/articles';

export function render(path: string) {
  return renderToString(<App path={path} />);
}

// prerender.mjs は SSRバンドル経由でしか TS を import できないため、
// ルート定義・正規URL・構造化データ生成・記事データをここから再エクスポートする。
export {
  ROUTES,
  canonicalFor,
  renderStructuredData,
  renderLegalStructuredData,
  renderToolStructuredData,
  renderArticleStructuredData,
  ARTICLES,
  getArticleBySlug,
};
