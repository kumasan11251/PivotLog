#!/usr/bin/env node

import { createPrivateKey, createSign, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const API_BASE_URL = 'https://api.appstoreconnect.apple.com/v1';
const DEFAULT_OUTPUT_DIR = 'tmp/app-store-connect-baseline';
const TARGET_REPORTS = [
  {
    key: 'discovery_engagement',
    category: 'APP_STORE_ENGAGEMENT',
    nameIncludes: ['discovery', 'engagement'],
  },
  {
    key: 'downloads',
    category: 'COMMERCE',
    nameIncludes: ['download'],
  },
];

function usage() {
  console.log(`
App Store Connect baseline collector

Usage:
  npm run appstore:baseline -- --help
  npm run appstore:baseline -- --create-request snapshot
  npm run appstore:baseline -- --request-id <analyticsReportRequestId> --download
  npm run appstore:baseline -- --from-raw

Required environment variables:
  ASC_ISSUER_ID                 App Store Connect Issuer ID
  ASC_KEY_ID                    App Store Connect API Key ID
  ASC_APP_ID                    App Store app Apple ID, e.g. 1476097583
  ASC_PRIVATE_KEY_PATH          Path to the .p8 key file
    or
  ASC_PRIVATE_KEY               Raw .p8 key content with \\n escapes allowed

Options:
  --create-request <snapshot|ongoing>
      Create an analytics report request.
      snapshot maps to ONE_TIME_SNAPSHOT; ongoing maps to ONGOING.

  --request-id <id>
      Use an existing analytics report request ID.

  --download
      Download available report segments and write 28/90 day summaries.

  --from-raw
      Rebuild 28/90 day summaries from previously downloaded raw report CSV files.

  --days <number>
      Summary lookback window in days. Default: 90.

  --output <dir>
      Output directory. Default: ${DEFAULT_OUTPUT_DIR}

  --granularity <DAILY|WEEKLY|MONTHLY>
      Analytics report instance granularity. Default: DAILY.

  --limit <number>
      Max report instances per report to inspect. Default: 200.

  --help
      Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    createRequest: null,
    requestId: null,
    download: false,
    days: 90,
    output: DEFAULT_OUTPUT_DIR,
    granularity: 'DAILY',
    limit: 200,
    fromRaw: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--create-request':
        options.createRequest = readOptionValue(argv, ++index, arg);
        break;
      case '--request-id':
        options.requestId = readOptionValue(argv, ++index, arg);
        break;
      case '--download':
        options.download = true;
        break;
      case '--from-raw':
        options.fromRaw = true;
        break;
      case '--days':
        options.days = Number(readOptionValue(argv, ++index, arg));
        break;
      case '--output':
        options.output = readOptionValue(argv, ++index, arg);
        break;
      case '--granularity':
        options.granularity = readOptionValue(argv, ++index, arg).toUpperCase();
        break;
      case '--limit':
        options.limit = Number(readOptionValue(argv, ++index, arg));
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
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 200) {
    throw new Error('--limit must be an integer from 1 to 200.');
  }
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(options.granularity)) {
    throw new Error('--granularity must be DAILY, WEEKLY, or MONTHLY.');
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

  if (options.fromRaw) {
    const downloadedRows = await readRawReportRows(options.output);
    const summary = buildSummary(downloadedRows, options.days);
    await writeJson(resolve(options.output, 'baseline-summary.json'), summary);
    await writeFile(resolve(options.output, 'baseline-summary.md'), renderMarkdown(summary), 'utf8');
    console.log(`Wrote baseline summary to ${resolve(options.output, 'baseline-summary.md')}`);
    return;
  }

  const config = await readConfig();
  const token = createJwt(config);

  if (options.createRequest) {
    const accessType = parseAccessType(options.createRequest);
    const reportRequest = await createReportRequest(token, config.appId, accessType);
    await writeJson(resolve(options.output, 'report-request.json'), reportRequest);
    console.log(`Created analytics report request: ${reportRequest.data.id}`);
    console.log('Apple can take 1-2 days to generate the first reports. Re-run later with:');
    console.log(`npm run appstore:baseline -- --request-id ${reportRequest.data.id} --download`);
    return;
  }

  const requestId = options.requestId ?? await findLatestReportRequestId(token, config.appId);
  if (!requestId) {
    throw new Error('No analytics report request found. Run with --create-request snapshot first.');
  }

  if (!options.download) {
    console.log(`Using analytics report request: ${requestId}`);
    console.log('Add --download to fetch available report data.');
    return;
  }

  const reports = await listAll(token, `/analyticsReportRequests/${requestId}/reports`, { limit: 200 });
  await writeJson(resolve(options.output, 'reports.json'), reports);

  const selectedReports = selectReports(reports);
  if (selectedReports.length === 0) {
    throw new Error('No matching App Store engagement or download reports are available yet.');
  }

  const downloadedRows = {};
  for (const selectedReport of selectedReports) {
    console.log(`Downloading ${selectedReport.attributes.name}...`);
    downloadedRows[selectedReport.key] = await downloadReportRows(token, selectedReport, options);
  }

  const summary = buildSummary(downloadedRows, options.days);
  await writeJson(resolve(options.output, 'baseline-summary.json'), summary);
  await writeFile(resolve(options.output, 'baseline-summary.md'), renderMarkdown(summary), 'utf8');

  console.log(`Wrote baseline summary to ${resolve(options.output, 'baseline-summary.md')}`);
}

async function readConfig() {
  const issuerId = requiredEnv('ASC_ISSUER_ID');
  const keyId = requiredEnv('ASC_KEY_ID');
  const appId = requiredEnv('ASC_APP_ID');
  const privateKey = await readPrivateKey();
  return { issuerId, keyId, appId, privateKey };
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function readPrivateKey() {
  if (process.env.ASC_PRIVATE_KEY) {
    return process.env.ASC_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  const keyPath = process.env.ASC_PRIVATE_KEY_PATH;
  if (!keyPath) {
    throw new Error('Missing ASC_PRIVATE_KEY_PATH or ASC_PRIVATE_KEY.');
  }
  return readFile(resolve(keyPath), 'utf8');
}

function createJwt(config) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'ES256',
    kid: config.keyId,
    typ: 'JWT',
  };
  const payload = {
    iss: config.issuerId,
    iat: issuedAt,
    exp: issuedAt + 20 * 60,
    aud: 'appstoreconnect-v1',
    jti: randomUUID(),
  };

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const key = createPrivateKey(config.privateKey);
  const signature = derToJose(createSign('SHA256').update(signingInput).end().sign(key), 32);

  return `${signingInput}.${base64Url(signature)}`;
}

function derToJose(signature, partLength) {
  let offset = 0;
  if (signature[offset++] !== 0x30) {
    throw new Error('Invalid ECDSA signature: expected DER sequence.');
  }
  offset = readDerLength(signature, offset).offset;

  const r = readDerInteger(signature, offset);
  const s = readDerInteger(signature, r.offset);

  return Buffer.concat([leftPad(stripLeadingZeros(r.value), partLength), leftPad(stripLeadingZeros(s.value), partLength)]);
}

function readDerLength(buffer, offset) {
  const first = buffer[offset++];
  if (first < 0x80) {
    return { length: first, offset };
  }

  const lengthBytes = first & 0x7f;
  let length = 0;
  for (let index = 0; index < lengthBytes; index += 1) {
    length = (length << 8) | buffer[offset++];
  }
  return { length, offset };
}

function readDerInteger(buffer, offset) {
  if (buffer[offset++] !== 0x02) {
    throw new Error('Invalid ECDSA signature: expected integer.');
  }

  const lengthInfo = readDerLength(buffer, offset);
  const start = lengthInfo.offset;
  const end = start + lengthInfo.length;
  return { value: buffer.subarray(start, end), offset: end };
}

function stripLeadingZeros(buffer) {
  let offset = 0;
  while (offset < buffer.length - 1 && buffer[offset] === 0) {
    offset += 1;
  }
  return buffer.subarray(offset);
}

function leftPad(buffer, length) {
  if (buffer.length > length) {
    return buffer.subarray(buffer.length - length);
  }
  if (buffer.length === length) {
    return buffer;
  }
  return Buffer.concat([Buffer.alloc(length - buffer.length), buffer]);
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

function parseAccessType(value) {
  const normalized = value.toLowerCase();
  if (normalized === 'snapshot' || normalized === 'one_time_snapshot') {
    return 'ONE_TIME_SNAPSHOT';
  }
  if (normalized === 'ongoing') {
    return 'ONGOING';
  }
  throw new Error('--create-request must be snapshot or ongoing.');
}

async function createReportRequest(token, appId, accessType) {
  return apiRequest(token, '/analyticsReportRequests', {
    method: 'POST',
    body: {
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType },
        relationships: {
          app: {
            data: {
              type: 'apps',
              id: appId,
            },
          },
        },
      },
    },
  });
}

async function findLatestReportRequestId(token, appId) {
  const requests = await listAll(token, `/apps/${appId}/analyticsReportRequests`, { limit: 200 });
  if (requests.length === 0) {
    return null;
  }

  const active = requests.filter((request) => !request.attributes?.stoppedDueToInactivity);
  return (active[0] ?? requests[0]).id;
}

function selectReports(reports) {
  return TARGET_REPORTS.flatMap((target) => {
    const report = reports.find((candidate) => {
      const attributes = candidate.attributes ?? {};
      const name = String(attributes.name ?? '').toLowerCase();
      const categoryMatches = attributes.category === target.category;
      const nameMatches = target.nameIncludes.every((word) => name.includes(word));
      const isStandard = name.includes('standard') || !name.includes('detailed');
      return categoryMatches && nameMatches && isStandard;
    });

    return report ? [{ ...report, key: target.key }] : [];
  });
}

async function downloadReportRows(token, report, options) {
  const instances = await listAll(token, `/analyticsReports/${report.id}/instances`, {
    limit: options.limit,
    'filter[granularity]': options.granularity,
  });
  const sortedInstances = instances.sort((a, b) =>
    String(b.attributes?.processingDate ?? '').localeCompare(String(a.attributes?.processingDate ?? '')),
  );

  const rows = [];
  for (const instance of sortedInstances) {
    const segments = await listAll(token, `/analyticsReportInstances/${instance.id}/segments`, {
      limit: 200,
    });

    for (const segment of segments) {
      const url = segment.attributes?.url;
      if (!url) {
        continue;
      }
      const csvText = await downloadSegment(url);
      const segmentRows = parseCsv(csvText);
      rows.push(...segmentRows);

      const rawPath = resolve(
        options.output,
        'raw',
        slugify(report.attributes.name),
        `${instance.attributes?.processingDate ?? instance.id}-${segment.id}.csv`,
      );
      await writeText(rawPath, csvText);
    }
  }

  return rows;
}

async function readRawReportRows(output) {
  const rawDir = resolve(output, 'raw');
  return {
    discovery_engagement: await readRowsFromRawDir(resolve(rawDir, 'app-store-discovery-and-engagement-standard')),
    downloads: await readRowsFromRawDir(resolve(rawDir, 'app-downloads-standard')),
  };
}

async function readRowsFromRawDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const rows = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.csv')) {
      continue;
    }
    const csvText = await readFile(resolve(dir, entry.name), 'utf8');
    rows.push(...parseCsv(csvText));
  }
  return rows;
}

async function downloadSegment(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Segment download failed: ${response.status} ${response.statusText}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  return gunzipSync(body).toString('utf8');
}

function buildSummary(rowsByReport, days) {
  const generatedAt = new Date();
  const windows = [28, days].filter((value, index, values) => values.indexOf(value) === index);

  return {
    generatedAt: generatedAt.toISOString(),
    note: 'Counts are derived from App Store Connect Analytics Reports. CVR fields are calculated locally.',
    reportRowCounts: Object.fromEntries(Object.entries(rowsByReport).map(([key, rows]) => [key, rows.length])),
    windows: Object.fromEntries(
      windows.map((windowDays) => [String(windowDays), summarizeWindow(rowsByReport, generatedAt, windowDays)]),
    ),
  };
}

function summarizeWindow(rowsByReport, generatedAt, days) {
  const startDate = addDays(startOfUtcDay(generatedAt), -days + 1);
  const endDate = startOfUtcDay(generatedAt);

  const engagementRows = filterRowsByDate(rowsByReport.discovery_engagement ?? [], startDate, endDate);
  const downloadRows = filterRowsByDate(rowsByReport.downloads ?? [], startDate, endDate);

  const impressions = sumCounts(engagementRows, (row) => value(row, 'Event') === 'Impression');
  const productPageViews = sumCounts(engagementRows, (row) =>
    value(row, 'Event') === 'Page view' && value(row, 'Page Type') === 'Product page',
  );
  const getTaps = sumCounts(engagementRows, (row) => value(row, 'Engagement Type') === 'Get');
  const firstTimeDownloads = sumCounts(downloadRows, (row) => normalizedValue(row, 'Download Type') === 'first-time download');
  const redownloads = sumCounts(downloadRows, (row) => value(row, 'Download Type') === 'Redownload');

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    impressions,
    productPageViews,
    getTaps,
    firstTimeDownloads,
    redownloads,
    conversionRates: {
      productPageViewToFirstTimeDownload: divide(firstTimeDownloads, productPageViews),
      impressionToFirstTimeDownload: divide(firstTimeDownloads, impressions),
      productPageViewToGetTap: divide(getTaps, productPageViews),
    },
    engagementBySourceType: groupCounts(engagementRows, 'Source Type'),
    firstTimeDownloadsBySourceType: groupCounts(
      downloadRows.filter((row) => normalizedValue(row, 'Download Type') === 'first-time download'),
      'Source Type',
    ),
  };
}

function filterRowsByDate(rows, startDate, endDate) {
  return rows.filter((row) => {
    const date = parseReportDate(value(row, 'Date'));
    return date && date >= startDate && date <= endDate;
  });
}

function sumCounts(rows, predicate) {
  return rows.reduce((sum, row) => {
    if (!predicate(row)) {
      return sum;
    }
    return sum + Number(value(row, 'Counts') || 0);
  }, 0);
}

function groupCounts(rows, fieldName) {
  const groups = new Map();
  for (const row of rows) {
    const key = value(row, fieldName) || 'Unknown';
    groups.set(key, (groups.get(key) ?? 0) + Number(value(row, 'Counts') || 0));
  }
  return Object.fromEntries([...groups.entries()].sort((a, b) => b[1] - a[1]));
}

function divide(numerator, denominator) {
  if (!denominator) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
}

function value(row, fieldName) {
  return row[fieldName] ?? row[fieldName.replace(/\s/g, '')] ?? '';
}

function normalizedValue(row, fieldName) {
  return String(value(row, fieldName)).trim().toLowerCase();
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

function formatDate(value) {
  return value.toISOString().slice(0, 10);
}

function renderMarkdown(summary) {
  const lines = [
    '# App Store Connect ベースライン',
    '',
    `生成日時: ${summary.generatedAt}`,
    '',
    summary.note,
    '',
  ];

  const totalRows = Object.values(summary.reportRowCounts ?? {}).reduce((sum, count) => sum + count, 0);
  if (totalRows === 0) {
    lines.push('注意: 取得できたレポート行がまだ0件です。Analytics Report Requestの作成直後は、Apple側の初回生成に1-2日かかることがあります。');
    lines.push('');
  }

  lines.push('## 取得状況');
  lines.push('');
  lines.push('| レポート | 行数 |');
  lines.push('| --- | ---: |');
  lines.push(`| App Store Discovery and Engagement | ${summary.reportRowCounts?.discovery_engagement ?? 0} |`);
  lines.push(`| App Downloads | ${summary.reportRowCounts?.downloads ?? 0} |`);
  lines.push('');

  for (const [days, windowSummary] of Object.entries(summary.windows)) {
    lines.push(`## 過去${days}日`);
    lines.push('');
    lines.push('| 指標 | 値 |');
    lines.push('| --- | ---: |');
    lines.push(`| インプレッション | ${windowSummary.impressions} |`);
    lines.push(`| 製品ページ表示 | ${windowSummary.productPageViews} |`);
    lines.push(`| Getタップ | ${windowSummary.getTaps} |`);
    lines.push(`| 初回DL | ${windowSummary.firstTimeDownloads} |`);
    lines.push(`| 再DL | ${windowSummary.redownloads} |`);
    lines.push(`| 製品ページ表示 -> 初回DL CVR | ${formatRate(windowSummary.conversionRates.productPageViewToFirstTimeDownload)} |`);
    lines.push(`| インプレッション -> 初回DL CVR | ${formatRate(windowSummary.conversionRates.impressionToFirstTimeDownload)} |`);
    lines.push(`| 製品ページ表示 -> Getタップ率 | ${formatRate(windowSummary.conversionRates.productPageViewToGetTap)} |`);
    lines.push('');
    lines.push('### 初回DLの流入元');
    lines.push('');
    appendGroupTable(lines, windowSummary.firstTimeDownloadsBySourceType);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function appendGroupTable(lines, groups) {
  lines.push('| 流入元 | 件数 |');
  lines.push('| --- | ---: |');
  const entries = Object.entries(groups);
  if (entries.length === 0) {
    lines.push('| なし | 0 |');
    return;
  }
  for (const [label, count] of entries) {
    lines.push(`| ${label} | ${count} |`);
  }
}

function formatRate(value) {
  return value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;
}

function parseCsv(input) {
  const delimiter = detectDelimiter(input);
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
    } else if (char === delimiter) {
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

function detectDelimiter(input) {
  const headerLine = input.split(/\r?\n/, 1)[0] ?? '';
  return headerLine.includes('\t') ? '\t' : ',';
}

async function listAll(token, path, query = {}) {
  const records = [];
  let nextPath = pathWithQuery(path, query);

  while (nextPath) {
    const response = await apiRequest(token, nextPath);
    records.push(...(response.data ?? []));
    nextPath = response.links?.next ? response.links.next.replace(API_BASE_URL, '') : null;
  }

  return records;
}

function pathWithQuery(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function apiRequest(token, path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`App Store Connect API failed: ${response.status} ${response.statusText}\n${details}`);
  }

  return response.json();
}

async function writeJson(path, data) {
  await writeText(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeText(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data, 'utf8');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
