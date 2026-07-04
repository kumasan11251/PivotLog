import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(rootDir, 'dist');
const ssrDir = resolve(rootDir, '.prerender');
const templatePath = resolve(distDir, 'index.html');
const entryPath = resolve(ssrDir, 'entry-server.js');

const template = await readFile(templatePath, 'utf8');
const {
  render,
  renderStructuredData,
  renderLegalStructuredData,
  renderToolStructuredData,
  renderArticleStructuredData,
  getArticleBySlug,
  ROUTES,
  canonicalFor,
} = await import(pathToFileURL(entryPath).href);

// ビルド日（鮮度シグナル）。本文DOMには出さず head の JSON-LD と sitemap のみで使う。
const dateModified = new Date().toISOString().slice(0, 10);

const STRUCTURED_DATA_REGEX =
  /(<script id="structured-data"[^>]*>)([\s\S]*?)(<\/script>)/;

if (!STRUCTURED_DATA_REGEX.test(template)) {
  throw new Error('Could not find the <script id="structured-data"> placeholder in dist/index.html.');
}
if (!template.includes('<div id="root"></div>')) {
  throw new Error('Could not find the root placeholder in dist/index.html.');
}

// HTML属性値に安全に埋め込むためのエスケープ。
function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// regex 置換し、置換が起きなかった（空振り）場合は例外を投げる。
function replaceOrThrow(html, regex, replacement, label) {
  const next = html.replace(regex, replacement);
  if (next === html) {
    throw new Error(`Head replacement did not match for "${label}".`);
  }
  return next;
}

function buildStructuredData(route) {
  const url = canonicalFor(route.path);
  switch (route.structuredData) {
    case 'home':
      return renderStructuredData({ dateModified });
    case 'legal':
      return renderLegalStructuredData({
        title: route.title,
        url,
        dateModified,
      });
    case 'tool':
      return renderToolStructuredData({
        title: route.title,
        description: route.description,
        url,
        dateModified,
      });
    case 'article': {
      const article = getArticleBySlug(route.articleSlug);
      if (!article) {
        throw new Error(`No article found for slug "${route.articleSlug}" (${route.path}).`);
      }
      return renderArticleStructuredData(article, { url, dateModified });
    }
    case 'none':
      return JSON.stringify({ '@context': 'https://schema.org', '@graph': [] });
    default:
      // 未対応の structuredData 値は握りつぶさず例外に。ルート追加時の JSON-LD 漏れをビルドで検知。
      throw new Error(
        `Unknown structuredData kind "${route.structuredData}" for ${route.path}.`,
      );
  }
}

// home 以外の全ルートの head メタを route 値で差し替える（home はテンプレの値を維持）。
function applyPageHead(html, route) {
  const title = escapeAttr(route.title);
  const description = escapeAttr(route.description);
  const canonical = escapeAttr(canonicalFor(route.path));

  html = replaceOrThrow(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, 'title');
  html = replaceOrThrow(
    html,
    /(<meta\s+name="description"\s+content=")[\s\S]*?("\s*\/>)/,
    `$1${description}$2`,
    'description',
  );
  html = replaceOrThrow(
    html,
    /(<link rel="canonical" href=")[^"]*("\s*\/>)/,
    `$1${canonical}$2`,
    'canonical',
  );
  html = replaceOrThrow(
    html,
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${title}$2`,
    'og:title',
  );
  html = replaceOrThrow(
    html,
    /(<meta\s+property="og:description"\s+content=")[\s\S]*?("\s*\/>)/,
    `$1${description}$2`,
    'og:description',
  );
  html = replaceOrThrow(
    html,
    /(<meta property="og:url" content=")[^"]*(")/,
    `$1${canonical}$2`,
    'og:url',
  );
  html = replaceOrThrow(
    html,
    /(<meta name="twitter:title" content=")[^"]*(")/,
    `$1${title}$2`,
    'twitter:title',
  );
  html = replaceOrThrow(
    html,
    /(<meta\s+name="twitter:description"\s+content=")[\s\S]*?("\s*\/>)/,
    `$1${description}$2`,
    'twitter:description',
  );

  // OGP 画像の差し替え（任意）。https の絶対URLだけを受け付け、未指定はテンプレの既定画像を維持。
  // 将来相対パスを許可する場合は SITE_URL を使う変換を同時に追加する。
  if (route.ogImage) {
    if (!/^https:\/\//.test(route.ogImage)) {
      throw new Error(`ogImage must be an absolute https URL for ${route.path}: ${route.ogImage}`);
    }
    const ogImage = escapeAttr(route.ogImage);
    html = replaceOrThrow(
      html,
      /(<meta property="og:image" content=")[^"]*(")/,
      `$1${ogImage}$2`,
      'og:image',
    );
    html = replaceOrThrow(
      html,
      /(<meta name="twitter:image" content=")[^"]*(")/,
      `$1${ogImage}$2`,
      'twitter:image',
    );
  }

  if (!route.indexable) {
    html = replaceOrThrow(
      html,
      /(<meta name="robots" content=")[^"]*(")/,
      `$1noindex,follow$2`,
      'robots',
    );
  }

  // 置換結果の検証（期待値を含むか）。
  for (const [needle, label] of [
    [`<title>${title}</title>`, 'title'],
    [`href="${canonical}"`, 'canonical'],
    [`content="${title}"`, 'og:title/twitter:title'],
  ]) {
    if (!html.includes(needle)) {
      throw new Error(`Head assertion failed for "${label}" on ${route.path}.`);
    }
  }

  return html;
}

// staticPage ルートは純静的化（hydration 不要）。Vite の module script と
// modulepreload を除去する。CSS の stylesheet link と JSON-LD は残す。
function stripClientScripts(html, route) {
  html = html
    .replace(/<script\s+type="module"[^>]*><\/script>/g, '')
    .replace(/<link\s+rel="modulepreload"[^>]*\/?>/g, '');
  if (/<script\s+type="module"/.test(html)) {
    throw new Error(`Module script still present on static page ${route.path}.`);
  }
  return html;
}

for (const route of ROUTES) {
  const appHtml = render(route.path);

  // ルート別バリデーション。
  if (route.path === '/') {
    if (!appHtml.includes('寿命カウントダウン')) {
      throw new Error('Prerender output for "/" did not include the landing page content.');
    }
  } else if (appHtml.trim().length === 0) {
    throw new Error(`Prerender output for "${route.path}" was empty.`);
  }

  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  // JSON-LD 差し替え。
  html = html.replace(STRUCTURED_DATA_REGEX, `$1${buildStructuredData(route)}$3`);

  // home 以外は head メタを route 値で差し替える（home はテンプレ維持＋hydration維持）。
  if (route.path !== '/') {
    html = applyPageHead(html, route);
  }
  // staticPage ルートのみ純静的化（tool は hydration 維持）。
  if (route.staticPage === true) {
    html = stripClientScripts(html, route);
  }

  const outPath = route.outDir
    ? resolve(distDir, route.outDir, 'index.html')
    : templatePath;
  if (route.outDir) {
    await mkdir(dirname(outPath), { recursive: true });
  }
  await writeFile(outPath, html);
}

// --- sitemap.xml の lastmod をビルド日に更新（鮮度シグナルの自動化） ---
const sitemapPath = resolve(distDir, 'sitemap.xml');
try {
  const sitemap = await readFile(sitemapPath, 'utf8');
  const updatedSitemap = sitemap.replace(
    /<lastmod>[\s\S]*?<\/lastmod>/g,
    `<lastmod>${dateModified}</lastmod>`,
  );
  if (updatedSitemap !== sitemap) {
    await writeFile(sitemapPath, updatedSitemap);
  }
} catch {
  // sitemap が存在しない場合はスキップ（ビルドは失敗させない）
}

await rm(ssrDir, { recursive: true, force: true });
