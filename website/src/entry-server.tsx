import { renderToString } from 'react-dom/server';
import App from './App';
import { renderStructuredData } from './lib/structured-data';

export function render() {
  return renderToString(<App />);
}

// prerender.mjs から SSRバンドル経由で利用し、JSON-LD を head へ注入する。
export { renderStructuredData };
