#!/usr/bin/env node

import { createPrivateKey, createSign } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const DEFAULT_OUTPUT_DIR = 'tmp/google-play-baseline';
const DEFAULT_PACKAGE_NAME = 'com.kumasan11251.pivotlog';
const DEFAULT_PREFIX = 'stats/store_performance';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GCS_API_BASE_URL = 'https://storage.googleapis.com/storage/v1';
const STORAGE_READ_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';

function usage() {
  console.log(`
Google Play Store Performance baseline collector

Usage:
  npm run googleplay:baseline -- --help
  npm run googleplay:baseline -- --bucket pubsite_prod_rev_01234567890123456789
  npm run googleplay:baseline -- --bucket gs://pubsite_prod_rev_01234567890123456789/stats/store_performance
  npm run googleplay:baseline -- --list-prefix stats/
  npm run googleplay:baseline -- --input-dir ~/Downloads
  npm run googleplay:baseline -- --download-object stats/installs/installs_com.example.app_202605_country.csv

Required environment variables:
  GOOGLE_APPLICATION_CREDENTIALS
      Path to a Google service account JSON key.
    or
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH
      Path to a Google service account JSON key.
    or
  GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
      Raw service account JSON content.

  GOOGLE_PLAY_REPORTS_BUCKET
      Play Console reports bucket, e.g. pubsite_prod_rev_01234567890123456789.
      Can also be passed as --bucket.

Optional environment variables:
  GOOGLE_PLAY_PACKAGE_NAME
      Android package name. Default: ${DEFAULT_PACKAGE_NAME}

  GOOGLE_PLAY_REPORTS_INPUT_DIR
      Directory containing CSV files manually downloaded from Play Console.

Options:
  --bucket <bucket|gs://bucket/path>
      Play Console reports bucket. A gs:// URL may include the store_performance prefix.

  --package <packageName>
      Android package name. Default: ${DEFAULT_PACKAGE_NAME}

  --days <number>
      Summary lookback window in days. Default: 90.

  --output <dir>
      Output directory. Default: ${DEFAULT_OUTPUT_DIR}

  --prefix <path>
      Object prefix inside the reports bucket. Default: ${DEFAULT_PREFIX}

  --months <number>
      Number of calendar months to attempt. Default: enough months to cover --days.

  --list-prefix <path>
      List GCS objects under the prefix and exit.

  --input-dir <dir>
      Fall back to CSV files manually downloaded from Play Console.

  --download-object <path>
      Download a single GCS object to the raw/debug output directory and exit.

  --help
      Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    bucket: null,
    packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME || DEFAULT_PACKAGE_NAME,
    days: 90,
    output: DEFAULT_OUTPUT_DIR,
    prefix: DEFAULT_PREFIX,
    listPrefix: null,
    inputDir: process.env.GOOGLE_PLAY_REPORTS_INPUT_DIR || null,
    downloadObject: null,
    months: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--bucket':
        options.bucket = readOptionValue(argv, ++index, arg);
        break;
      case '--package':
        options.packageName = readOptionValue(argv, ++index, arg);
        break;
      case '--days':
        options.days = Number(readOptionValue(argv, ++index, arg));
        break;
      case '--output':
        options.output = readOptionValue(argv, ++index, arg);
        break;
      case '--prefix':
        options.prefix = normalizePrefix(readOptionValue(argv, ++index, arg));
        break;
      case '--months':
        options.months = Number(readOptionValue(argv, ++index, arg));
        break;
      case '--list-prefix':
        options.listPrefix = normalizePrefix(readOptionValue(argv, ++index, arg));
        break;
      case '--input-dir':
        options.inputDir = readOptionValue(argv, ++index, arg);
        break;
      case '--download-object':
        options.downloadObject = normalizePrefix(readOptionValue(argv, ++index, arg));
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.days) || options.days < 1) {
    throw new Error('--days must be a positive integer.');
  }
  if (options.months !== null && (!Number.isInteger(options.months) || options.months < 1)) {
    throw new Error('--months must be a positive integer.');
  }
  if (!options.packageName) {
    throw new Error('--package or GOOGLE_PLAY_PACKAGE_NAME is required.');
  }

  return options;
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }
  return value;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const bucketConfig = parseBucket(options.bucket ?? process.env.GOOGLE_PLAY_REPORTS_BUCKET, options.prefix);
  const serviceAccount = await readServiceAccount();
  const token = await createAccessToken(serviceAccount);

  if (options.listPrefix) {
    const objects = await listGcsObjects(token, bucketConfig.bucket, options.listPrefix);
    if (objects.length === 0) {
      console.log(`No objects found under ${options.listPrefix}`);
      return;
    }
    for (const object of objects) {
      console.log(object);
    }
    return;
  }

  if (options.downloadObject) {
    const csvText = await downloadGcsObject(token, bucketConfig.bucket, options.downloadObject);
    const outputPath = resolve(options.output, 'raw', 'debug', options.downloadObject.split('/').pop());
    await writeText(outputPath, csvText);
    const rows = parseCsv(csvText);
    console.log(`Downloaded ${options.downloadObject}`);
    console.log(`Rows: ${rows.length}`);
    console.log(`Output: ${outputPath}`);
    return;
  }

  const months = getReportMonths(options.days, options.months);
  const targetObjects = buildTargetObjects(bucketConfig.prefix, options.packageName, months);

  const rowsByBreakdown = { traffic_source: [], country: [] };
  const downloadedObjects = [];
  const missingObjects = [];

  for (const targetObject of targetObjects) {
    try {
      console.log(`Downloading ${targetObject.name}...`);
      const csvText = await downloadGcsObject(token, bucketConfig.bucket, targetObject.name);
      const csvPath = resolve(options.output, 'raw', targetObject.breakdown, targetObject.fileName);
      await writeText(csvPath, csvText);
      rowsByBreakdown[targetObject.breakdown].push(...parseCsv(csvText));
      downloadedObjects.push(targetObject.name);
    } catch (error) {
      const localCsv = options.inputDir ? await readLocalReportCsv(options.inputDir, targetObject) : null;
      if (localCsv) {
        const csvPath = resolve(options.output, 'raw', targetObject.breakdown, targetObject.fileName);
        await writeText(csvPath, localCsv.text);
        rowsByBreakdown[targetObject.breakdown].push(...parseCsv(localCsv.text));
        downloadedObjects.push(`local:${localCsv.path}`);
        continue;
      }

      if (error.status === 403 || error.status === 404) {
        missingObjects.push(targetObject.name);
        continue;
      }
      throw error;
    }
  }

  const summary = buildSummary(rowsByBreakdown, options.days, {
    packageName: options.packageName,
    bucket: bucketConfig.bucket,
    prefix: bucketConfig.prefix,
    downloadedObjects,
    missingObjects,
  });

  await writeJson(resolve(options.output, 'baseline-summary.json'), summary);
  await writeText(resolve(options.output, 'baseline-summary.md'), renderMarkdown(summary));

  console.log(`Wrote baseline summary to ${resolve(options.output, 'baseline-summary.md')}`);
}

function parseBucket(value, defaultPrefix) {
  if (!value) {
    throw new Error('Missing GOOGLE_PLAY_REPORTS_BUCKET or --bucket.');
  }

  if (!value.startsWith('gs://')) {
    return { bucket: value.replace(/^\/+|\/+$/g, ''), prefix: defaultPrefix };
  }

  const withoutScheme = value.slice('gs://'.length);
  const [bucket, ...prefixParts] = withoutScheme.split('/').filter(Boolean);
  if (!bucket) {
    throw new Error('Invalid gs:// bucket URL.');
  }

  return {
    bucket,
    prefix: prefixParts.length > 0 ? normalizePrefix(prefixParts.join('/')) : defaultPrefix,
  };
}

function normalizePrefix(value) {
  return String(value).replace(/^\/+|\/+$/g, '');
}

async function readServiceAccount() {
  const rawKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    return JSON.parse(rawKey);
  }

  const keyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH, or GOOGLE_PLAY_SERVICE_ACCOUNT_KEY.');
  }

  return JSON.parse(await readFile(resolve(keyPath), 'utf8'));
}

async function createAccessToken(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };
  const payload = {
    iss: requiredServiceAccountField(serviceAccount, 'client_email'),
    scope: STORAGE_READ_SCOPE,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 60 * 60,
  };

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const privateKey = createPrivateKey(requiredServiceAccountField(serviceAccount, 'private_key'));
  const signature = createSign('RSA-SHA256').update(signingInput).end().sign(privateKey);
  const assertion = `${signingInput}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google OAuth token request failed: ${response.status} ${response.statusText}\n${details}`);
  }

  const body = await response.json();
  return body.access_token;
}

function requiredServiceAccountField(serviceAccount, fieldName) {
  const value = serviceAccount[fieldName];
  if (!value) {
    throw new Error(`Service account JSON is missing ${fieldName}.`);
  }
  return value;
}

function base64UrlJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getReportMonths(days, requestedMonths) {
  const today = startOfUtcDay(new Date());
  if (requestedMonths) {
    return Array.from({ length: requestedMonths }, (_, index) => formatMonth(addMonths(today, -index)));
  }

  const startDate = addDays(today, -days + 1);
  const monthCount = monthDiff(startDate, today) + 1;
  return Array.from({ length: monthCount }, (_, index) => formatMonth(addMonths(today, -index)));
}

function buildTargetObjects(prefix, packageName, months) {
  const breakdowns = ['traffic_source', 'country'];
  return months.flatMap((month) => breakdowns.map((breakdown) => {
    const fileName = `store_performance_${packageName}_${month}_${breakdown}.csv`;
    return {
      breakdown,
      fileName,
      name: `${prefix}/${fileName}`,
    };
  }));
}

async function downloadGcsObject(token, bucket, objectName) {
  const response = await fetch(`${GCS_API_BASE_URL}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`GCS object download failed: ${response.status} ${response.statusText}\n${details}`);
    error.status = response.status;
    throw error;
  }

  const body = Buffer.from(await response.arrayBuffer());
  return decodeCsvBuffer(objectName.endsWith('.gz') ? gunzipSync(body) : body);
}

async function readLocalReportCsv(inputDir, targetObject) {
  const candidates = [
    targetObject.name.replace(/\//g, '_'),
    targetObject.fileName,
  ];

  for (const candidate of candidates) {
    const path = resolve(inputDir, candidate);
    try {
      const buffer = await readFile(path);
      return { path, text: decodeCsvBuffer(buffer) };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return null;
}

async function listGcsObjects(token, bucket, prefix) {
  const objects = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      prefix,
      maxResults: '100',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(`${GCS_API_BASE_URL}/b/${encodeURIComponent(bucket)}/o?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`GCS object list failed: ${response.status} ${response.statusText}\n${details}`);
    }

    const body = await response.json();
    objects.push(...(body.items ?? []).map((item) => item.name));
    pageToken = body.nextPageToken ?? null;
  } while (pageToken);

  return objects;
}

function decodeCsvBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return swapUtf16Bytes(buffer.subarray(2)).toString('utf16le');
  }

  if (buffer.includes(0)) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }

  return buffer.toString('utf8');
}

function swapUtf16Bytes(buffer) {
  const swapped = Buffer.from(buffer);
  for (let index = 0; index < swapped.length - 1; index += 2) {
    const first = swapped[index];
    swapped[index] = swapped[index + 1];
    swapped[index + 1] = first;
  }
  return swapped;
}

function buildSummary(rowsByBreakdown, days, metadata) {
  const generatedAt = new Date();
  const windows = [28, days].filter((value, index, values) => values.indexOf(value) === index);

  return {
    generatedAt: generatedAt.toISOString(),
    packageName: metadata.packageName,
    bucket: metadata.bucket,
    prefix: metadata.prefix,
    note: 'Counts are derived from Google Play Console Store Performance CSV exports. CVR fields are calculated locally from visitors and acquisitions.',
    downloadedObjects: metadata.downloadedObjects,
    missingObjects: metadata.missingObjects,
    reportRowCounts: Object.fromEntries(Object.entries(rowsByBreakdown).map(([key, rows]) => [key, rows.length])),
    windows: Object.fromEntries(
      windows.map((windowDays) => [String(windowDays), summarizeWindow(rowsByBreakdown, generatedAt, windowDays)]),
    ),
  };
}

function summarizeWindow(rowsByBreakdown, generatedAt, days) {
  const startDate = addDays(startOfUtcDay(generatedAt), -days + 1);
  const endDate = startOfUtcDay(generatedAt);
  const trafficRows = filterRowsByDate(rowsByBreakdown.traffic_source ?? [], startDate, endDate);
  const countryRows = filterRowsByDate(rowsByBreakdown.country ?? [], startDate, endDate);
  const visitors = sumMetric(trafficRows, 'storeListingVisitors');
  const acquisitions = sumMetric(trafficRows, 'storeListingAcquisitions');

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    storeListingVisitors: visitors,
    storeListingAcquisitions: acquisitions,
    storeListingConversionRate: divide(acquisitions, visitors),
    trafficSources: groupMetrics(trafficRows, 'trafficSource'),
    searchTerms: groupMetrics(trafficRows.filter((row) => normalizedValue(row, 'searchTerm')), 'searchTerm'),
    countries: groupMetrics(countryRows, 'country'),
  };
}

function filterRowsByDate(rows, startDate, endDate) {
  return rows.filter((row) => {
    const date = parseReportDate(normalizedValue(row, 'date'));
    return date && date >= startDate && date <= endDate;
  });
}

function sumMetric(rows, metricName) {
  return rows.reduce((sum, row) => sum + numberValue(row, metricName), 0);
}

function groupMetrics(rows, fieldName) {
  const groups = new Map();
  for (const row of rows) {
    const key = normalizedValue(row, fieldName) || 'Unknown';
    const existing = groups.get(key) ?? { visitors: 0, acquisitions: 0 };
    existing.visitors += numberValue(row, 'storeListingVisitors');
    existing.acquisitions += numberValue(row, 'storeListingAcquisitions');
    groups.set(key, existing);
  }

  return Object.fromEntries([...groups.entries()]
    .map(([key, values]) => [key, {
      ...values,
      conversionRate: divide(values.acquisitions, values.visitors),
    }])
    .sort((a, b) => b[1].acquisitions - a[1].acquisitions || b[1].visitors - a[1].visitors));
}

function normalizedValue(row, normalizedName) {
  const aliases = {
    date: ['Date'],
    country: ['Country', 'Country / region', 'Country/region', 'Country or region'],
    trafficSource: ['Traffic source', 'Traffic Source'],
    searchTerm: ['Search term', 'Search Term'],
    storeListingVisitors: ['Store listing visitors', 'Store Listing Visitors'],
    storeListingAcquisitions: ['Store listing acquisitions', 'Store Listing Acquisitions'],
  };

  for (const alias of aliases[normalizedName] ?? [normalizedName]) {
    if (row[alias] !== undefined) {
      return String(row[alias]).trim();
    }
  }
  return '';
}

function numberValue(row, normalizedName) {
  const value = normalizedValue(row, normalizedName)
    .replace(/,/g, '')
    .replace(/%$/, '');
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function divide(numerator, denominator) {
  if (!denominator) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
}

function parseReportDate(value) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function addMonths(value, months) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function monthDiff(startDate, endDate) {
  return (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
    + (endDate.getUTCMonth() - startDate.getUTCMonth());
}

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

function formatMonth(value) {
  return `${value.getUTCFullYear()}${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

function renderMarkdown(summary) {
  const lines = [
    '# Google Play ベースライン',
    '',
    `生成日時: ${summary.generatedAt}`,
    '',
    summary.note,
    '',
    `Package: \`${summary.packageName}\``,
    `Bucket: \`${summary.bucket}\``,
    '',
  ];

  lines.push('## 取得状況');
  lines.push('');
  lines.push('| レポート | 行数 |');
  lines.push('| --- | ---: |');
  lines.push(`| Store performance / traffic_source | ${summary.reportRowCounts?.traffic_source ?? 0} |`);
  lines.push(`| Store performance / country | ${summary.reportRowCounts?.country ?? 0} |`);
  lines.push('');

  if ((summary.downloadedObjects ?? []).length === 0) {
    lines.push('注意: 取得できたCSVが0件です。Play ConsoleのレポートURI、サービスアカウント権限、または月次レポート生成状況を確認してください。');
    lines.push('');
  }

  if ((summary.missingObjects ?? []).length > 0) {
    lines.push('### 未生成または未検出のCSV');
    lines.push('');
    for (const objectName of summary.missingObjects) {
      lines.push(`- \`${objectName}\``);
    }
    lines.push('');
  }

  for (const [days, windowSummary] of Object.entries(summary.windows)) {
    lines.push(`## 過去${days}日`);
    lines.push('');
    lines.push('| 指標 | 値 |');
    lines.push('| --- | ---: |');
    lines.push(`| ストア掲載情報閲覧 | ${windowSummary.storeListingVisitors} |`);
    lines.push(`| 獲得 | ${windowSummary.storeListingAcquisitions} |`);
    lines.push(`| CVR | ${formatRate(windowSummary.storeListingConversionRate)} |`);
    lines.push('');

    lines.push('### 流入元');
    lines.push('');
    appendGroupTable(lines, '| 流入元 | 閲覧 | 獲得 | CVR |', windowSummary.trafficSources);
    lines.push('');

    lines.push('### 検索語');
    lines.push('');
    appendGroupTable(lines, '| 検索語 | 閲覧 | 獲得 | CVR |', windowSummary.searchTerms);
    lines.push('');

    lines.push('### 国/地域');
    lines.push('');
    appendGroupTable(lines, '| 国/地域 | 閲覧 | 獲得 | CVR |', windowSummary.countries);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function appendGroupTable(lines, header, groups) {
  lines.push(header);
  lines.push('| --- | ---: | ---: | ---: |');
  const entries = Object.entries(groups);
  if (entries.length === 0) {
    lines.push('| なし | 0 | 0 | N/A |');
    return;
  }

  for (const [label, values] of entries.slice(0, 20)) {
    lines.push(`| ${escapeMarkdownTableCell(label)} | ${values.visitors} | ${values.acquisitions} | ${formatRate(values.conversionRate)} |`);
  }
}

function formatRate(value) {
  return value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;
}

function escapeMarkdownTableCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).filter((values) => values.some(Boolean)).map((values) => {
    const record = {};
    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = values[index] ?? '';
    }
    return record;
  });
}

async function writeJson(path, data) {
  await writeText(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeText(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data, 'utf8');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
