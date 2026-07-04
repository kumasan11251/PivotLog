#!/usr/bin/env node

import { createPrivateKey, createSign, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const API_BASE_URL = 'https://api.appstoreconnect.apple.com/v1';
const DEFAULT_OUTPUT_DIR = 'plans/dl-growth/phase0-baseline/app-referrer-breakdown-2026-07-04';
const DETAILED_REPORTS = {
  downloads: 'App Downloads Detailed',
  engagement: 'App Store Discovery and Engagement Detailed',
};

function usage() {
  console.log(`
App Store Connect app referrer breakdown

Usage:
  node scripts/app-store-referrer-breakdown.mjs --start 2026-06-05 --end 2026-07-02
  node scripts/app-store-referrer-breakdown.mjs --from-raw --start 2026-06-05 --end 2026-07-02

Required environment variables:
  ASC_ISSUER_ID
  ASC_KEY_ID
  ASC_APP_ID
  ASC_PRIVATE_KEY_PATH or ASC_PRIVATE_KEY

Options:
  --start <YYYY-MM-DD>       Start date, inclusive.
  --end <YYYY-MM-DD>         End date, inclusive.
  --output <dir>             Output directory. Default: ${DEFAULT_OUTPUT_DIR}
  --request-id <id>          Existing analyticsReportRequest id. Defaults to latest active request.
  --granularity <value>      DAILY, WEEKLY, or MONTHLY. Default: DAILY.
  --limit <number>           Max instances to inspect. Default: 200.
  --from-raw                 Summarize previously downloaded raw detailed CSV files.
  --help                     Show this help.
`);
}

function parseArgs(argv) {
  const options = {
    start: null,
    end: null,
    output: DEFAULT_OUTPUT_DIR,
    requestId: null,
    granularity: 'DAILY',
    limit: 200,
    fromRaw: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--start':
        options.start = readOptionValue(argv, ++index, arg);
        break;
      case '--end':
        options.end = readOptionValue(argv, ++index, arg);
        break;
      case '--output':
        options.output = readOptionValue(argv, ++index, arg);
        break;
      case '--request-id':
        options.requestId = readOptionValue(argv, ++index, arg);
        break;
      case '--granularity':
        options.granularity = readOptionValue(argv, ++index, arg).toUpperCase();
        break;
      case '--limit':
        options.limit = Number(readOptionValue(argv, ++index, arg));
        break;
      case '--from-raw':
        options.fromRaw = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.start || !options.end) {
    throw new Error('--start and --end are required.');
  }
  if (!parseReportDate(options.start) || !parseReportDate(options.end)) {
    throw new Error('--start and --end must be YYYY-MM-DD dates.');
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

  const rows = options.fromRaw ? await readRawRows(options.output) : await downloadDetailedRows(options);
  const summary = buildSummary(rows, options.start, options.end);

  await writeJson(resolve(options.output, 'app-referrer-breakdown.json'), summary);
  await writeFile(resolve(options.output, 'app-referrer-breakdown.md'), renderMarkdown(summary), 'utf8');
  console.log(`Wrote app referrer breakdown to ${resolve(options.output, 'app-referrer-breakdown.md')}`);
}

async function downloadDetailedRows(options) {
  const config = await readConfig();
  const token = createJwt(config);
  const requestId = options.requestId ?? await findLatestReportRequestId(token, config.appId);
  if (!requestId) {
    throw new Error('No analytics report request found.');
  }

  const reports = await listAll(token, `/analyticsReportRequests/${requestId}/reports`, { limit: 200 });
  await writeJson(resolve(options.output, 'reports.json'), reports);

  const rows = {
    downloads: [],
    engagement: [],
  };
  const reportEntries = Object.entries(DETAILED_REPORTS);
  for (const [key, reportName] of reportEntries) {
    const report = reports.find((candidate) => candidate.attributes?.name === reportName);
    if (!report) {
      throw new Error(`${reportName} is not available for request ${requestId}.`);
    }

    const instances = await listAll(token, `/analyticsReports/${report.id}/instances`, {
      limit: options.limit,
      'filter[granularity]': options.granularity,
    });
    const sortedInstances = instances.sort((a, b) =>
      String(b.attributes?.processingDate ?? '').localeCompare(String(a.attributes?.processingDate ?? '')),
    );

    for (const instance of sortedInstances) {
      const segments = await listAll(token, `/analyticsReportInstances/${instance.id}/segments`, { limit: 200 });
      for (const segment of segments) {
        const url = segment.attributes?.url;
        if (!url) {
          continue;
        }
        const csvText = await downloadSegment(url);
        rows[key].push(...parseCsv(csvText));

        const rawPath = resolve(
          options.output,
          'raw',
          slugify(report.attributes.name),
          `${instance.attributes?.processingDate ?? instance.id}-${segment.id}.csv`,
        );
        await writeText(rawPath, csvText);
      }
    }
  }
  return rows;
}

async function readRawRows(output) {
  const rows = {};
  for (const [key, reportName] of Object.entries(DETAILED_REPORTS)) {
    const dir = resolve(output, 'raw', slugify(reportName));
    const entries = await readdir(dir, { withFileTypes: true });
    rows[key] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.csv')) {
        continue;
      }
      rows[key].push(...parseCsv(await readFile(resolve(dir, entry.name), 'utf8')));
    }
  }
  return rows;
}

function buildSummary(rows, start, end) {
  const startDate = parseReportDate(start);
  const endDate = parseReportDate(end);
  const downloadRows = rows.downloads ?? [];
  const engagementRows = rows.engagement ?? [];
  const firstTimeRows = downloadRows.filter((row) => {
    const date = parseReportDate(value(row, 'Date'));
    return (
      date &&
      date >= startDate &&
      date <= endDate &&
      normalizedValue(row, 'Download Type') === 'first-time download'
    );
  });
  const appReferrerRows = firstTimeRows.filter((row) => normalizedValue(row, 'Source Type') === 'app referrer');
  const appReferrerEngagementRows = engagementRows.filter((row) => {
    const date = parseReportDate(value(row, 'Date'));
    return date && date >= startDate && date <= endDate && normalizedValue(row, 'Source Type') === 'app referrer';
  });

  return {
    generatedAt: new Date().toISOString(),
    startDate: start,
    endDate: end,
    reports: DETAILED_REPORTS,
    rowCounts: {
      downloadRows: downloadRows.length,
      engagementRows: engagementRows.length,
      firstTimeDownloadsRowsInWindow: firstTimeRows.length,
      appReferrerRowsInWindow: appReferrerRows.length,
      appReferrerEngagementRowsInWindow: appReferrerEngagementRows.length,
    },
    disclosedTotals: {
      firstTimeDownloads: sumCounts(firstTimeRows),
      appReferrerFirstTimeDownloads: sumCounts(appReferrerRows),
      appReferrerEngagementCounts: sumCounts(appReferrerEngagementRows),
    },
    columns: {
      downloads: Object.keys(downloadRows[0] ?? {}),
      engagement: Object.keys(engagementRows[0] ?? {}),
    },
    appReferrerBySourceInfo: groupCounts(appReferrerRows, 'Source Info'),
    appReferrerByReferringApp: groupCounts(appReferrerRows, 'Referring App'),
    appReferrerByCampaign: groupCounts(appReferrerRows, 'Campaign'),
    appReferrerByDate: groupCounts(appReferrerRows, 'Date'),
    appReferrerByTerritory: groupCounts(appReferrerRows, 'Territory'),
    appReferrerEngagementBySourceInfo: groupCounts(appReferrerEngagementRows, 'Source Info'),
    appReferrerEngagementByEvent: groupCounts(appReferrerEngagementRows, 'Event'),
    appReferrerEngagementByEngagementType: groupCounts(appReferrerEngagementRows, 'Engagement Type'),
    appReferrerEngagementByPageType: groupCounts(appReferrerEngagementRows, 'Page Type'),
    appReferrerRows: appReferrerRows.map((row) => ({
      date: value(row, 'Date'),
      sourceType: value(row, 'Source Type'),
      sourceInfo: value(row, 'Source Info'),
      referringApp: value(row, 'Referring App'),
      campaign: value(row, 'Campaign'),
      territory: value(row, 'Territory'),
      device: value(row, 'Device'),
      platformVersion: value(row, 'Platform Version'),
      counts: Number(value(row, 'Counts') || 0),
    })),
    appReferrerEngagementRows: appReferrerEngagementRows.map((row) => ({
      date: value(row, 'Date'),
      event: value(row, 'Event'),
      engagementType: value(row, 'Engagement Type'),
      sourceType: value(row, 'Source Type'),
      sourceInfo: value(row, 'Source Info'),
      pageType: value(row, 'Page Type'),
      pageTitle: value(row, 'Page Title'),
      territory: value(row, 'Territory'),
      counts: Number(value(row, 'Counts') || 0),
    })),
  };
}

function renderMarkdown(summary) {
  const lines = [
    '# App Store Connect App Referrer 内訳',
    '',
    `生成日時: ${summary.generatedAt}`,
    `対象期間: ${summary.startDate} - ${summary.endDate}`,
    `対象レポート: ${Object.values(summary.reports).join(' / ')}`,
    '',
    '## 結果',
    '',
    '| 指標 | 値 |',
    '| --- | ---: |',
    `| Downloads Detailed で開示された初回DL | ${summary.disclosedTotals.firstTimeDownloads} |`,
    `| Downloads Detailed で開示された App referrer 経由の初回DL | ${summary.disclosedTotals.appReferrerFirstTimeDownloads} |`,
    `| Engagement Detailed で開示された App referrer 経由のエンゲージメント | ${summary.disclosedTotals.appReferrerEngagementCounts} |`,
    '',
    'Downloads Detailed の 0 は、Standard レポートで確認済みの初回DL数が 0 という意味ではない。小さい組み合わせの行が Detailed 側で非開示になっているため、初回DLの参照元アプリ名はこのレポートからは確定できない。',
    '',
    '判定: 初回DLの App referrer 内訳アプリは非開示。補助指標として、App referrer の Product page view は `jp.naver.line` が 6 件開示されている。',
    '',
    '## App referrer の内訳',
    '',
  ];

  const hasSourceInfo = Object.keys(summary.appReferrerBySourceInfo).some((key) => key !== 'Unknown');
  const sourceInfoGroups = hasSourceInfo ? summary.appReferrerBySourceInfo : summary.appReferrerByReferringApp;
  appendGroupTable(lines, hasSourceInfo ? 'Source Info' : 'Referring App', sourceInfoGroups);
  lines.push('');
  lines.push('## 日別');
  lines.push('');
  appendGroupTable(lines, 'Date', summary.appReferrerByDate);
  lines.push('');
  lines.push('## 国・地域');
  lines.push('');
  appendGroupTable(lines, 'Territory', summary.appReferrerByTerritory);
  lines.push('');
  lines.push('## 補助: App referrer エンゲージメントの参照元');
  lines.push('');
  appendGroupTable(lines, 'Source Info', summary.appReferrerEngagementBySourceInfo);
  lines.push('');
  lines.push('## 補助: App referrer エンゲージメント種別');
  lines.push('');
  appendGroupTable(lines, 'Event', summary.appReferrerEngagementByEvent);
  lines.push('');
  appendGroupTable(lines, 'Engagement Type', summary.appReferrerEngagementByEngagementType);
  lines.push('');
  lines.push('## 取得列');
  lines.push('');
  lines.push(`Downloads: ${summary.columns.downloads.map((column) => `\`${column}\``).join(', ')}`);
  lines.push('');
  lines.push(`Engagement: ${summary.columns.engagement.map((column) => `\`${column}\``).join(', ')}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function appendGroupTable(lines, label, groups) {
  lines.push(`| ${label} | 件数 |`);
  lines.push('| --- | ---: |');
  const entries = Object.entries(groups);
  if (entries.length === 0) {
    lines.push('| なし | 0 |');
    return;
  }
  for (const [key, count] of entries) {
    lines.push(`| ${key || 'Unknown'} | ${count} |`);
  }
}

function sumCounts(rows) {
  return rows.reduce((sum, row) => sum + Number(value(row, 'Counts') || 0), 0);
}

function groupCounts(rows, fieldName) {
  const groups = new Map();
  for (const row of rows) {
    const key = value(row, fieldName) || 'Unknown';
    groups.set(key, (groups.get(key) ?? 0) + Number(value(row, 'Counts') || 0));
  }
  return Object.fromEntries([...groups.entries()].sort((a, b) => b[1] - a[1]));
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
  const signingInput = `${base64UrlJson({
    alg: 'ES256',
    kid: config.keyId,
    typ: 'JWT',
  })}.${base64UrlJson({
    iss: config.issuerId,
    iat: issuedAt,
    exp: issuedAt + 20 * 60,
    aud: 'appstoreconnect-v1',
    jti: randomUUID(),
  })}`;
  const key = createPrivateKey(config.privateKey);
  return `${signingInput}.${base64Url(derToJose(createSign('SHA256').update(signingInput).end().sign(key), 32))}`;
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

async function findLatestReportRequestId(token, appId) {
  const requests = await listAll(token, `/apps/${appId}/analyticsReportRequests`, { limit: 200 });
  if (requests.length === 0) {
    return null;
  }
  const active = requests.filter((request) => !request.attributes?.stoppedDueToInactivity);
  return (active[0] ?? requests[0]).id;
}

async function downloadSegment(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Segment download failed: ${response.status} ${response.statusText}`);
  }
  return gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8');
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
