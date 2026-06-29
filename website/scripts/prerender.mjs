import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(rootDir, 'dist');
const ssrDir = resolve(rootDir, '.prerender');
const htmlPath = resolve(distDir, 'index.html');
const entryPath = resolve(ssrDir, 'entry-server.js');

const template = await readFile(htmlPath, 'utf8');
const { render, renderStructuredData } = await import(pathToFileURL(entryPath).href);
const appHtml = render();

if (!appHtml.includes('寿命カウントダウン')) {
  throw new Error('Prerender output did not include the landing page content.');
}

// --- body（rootプレースホルダ）の注入 ---
let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

if (html === template) {
  throw new Error('Could not find the root placeholder in dist/index.html.');
}

// --- JSON-LD の生成と注入（site.ts を単一ソースに head へ反映） ---
const dateModified = new Date().toISOString().slice(0, 10);
const structuredData = renderStructuredData({ dateModified });

const structuredDataRegex =
  /(<script id="structured-data"[^>]*>)([\s\S]*?)(<\/script>)/;

if (!structuredDataRegex.test(html)) {
  throw new Error('Could not find the <script id="structured-data"> placeholder in dist/index.html.');
}

html = html.replace(structuredDataRegex, `$1${structuredData}$3`);

if (!html.includes(structuredData)) {
  throw new Error('Failed to inject the generated JSON-LD into dist/index.html.');
}

await writeFile(htmlPath, html);

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
