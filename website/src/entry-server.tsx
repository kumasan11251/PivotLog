import { renderToString } from 'react-dom/server';
import App from './App';
import { renderStructuredData, renderLegalStructuredData } from './lib/structured-data';
import { ROUTES, canonicalFor } from './lib/routes';

export function render(path: string) {
  return renderToString(<App path={path} />);
}

// prerender.mjs は SSRバンドル経由でしか TS を import できないため、
// ルート定義・正規URL・構造化データ生成をここから再エクスポートする。
export { ROUTES, canonicalFor, renderStructuredData, renderLegalStructuredData };
