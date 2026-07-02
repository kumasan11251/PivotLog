#!/usr/bin/env node

import { createPrivateKey, createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEARCH_CONSOLE_API_BASE_URL = 'https://www.googleapis.com/webmasters/v3';
const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const DEFAULT_SITE_URL = process.env.SEARCH_CONSOLE_SITE_URL || 'sc-domain:pivotlog.app';

let accessTokenCache = null;
let stdinBuffer = '';

const tools = [
  {
    name: 'search_console_sites_list',
    description: 'List Search Console sites visible to the configured Google service account.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: 'search_console_sitemaps_list',
    description: 'List submitted sitemaps for a Search Console property.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        siteUrl: {
          type: 'string',
          description: 'Search Console property URL. Defaults to SEARCH_CONSOLE_SITE_URL.',
        },
      },
    },
  },
  {
    name: 'search_console_search_analytics',
    description: 'Query Google Search Console performance data such as clicks, impressions, CTR, and position.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        siteUrl: {
          type: 'string',
          description: 'Search Console property URL. Defaults to SEARCH_CONSOLE_SITE_URL.',
        },
        startDate: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format.',
        },
        endDate: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format.',
        },
        dimensions: {
          type: 'array',
          description: 'Dimensions such as date, query, page, country, device, or searchAppearance.',
          items: { type: 'string' },
          default: ['date'],
        },
        rowLimit: {
          type: 'number',
          description: 'Maximum rows to return. Default 100, max 25000.',
          default: 100,
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
];

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  stdinBuffer += chunk;
  processBuffer().catch((error) => {
    writeLog(`Unhandled MCP error: ${error.stack || error.message}`);
  });
});

async function processBuffer() {
  let newlineIndex = stdinBuffer.indexOf('\n');
  while (newlineIndex !== -1) {
    const line = stdinBuffer.slice(0, newlineIndex).trim();
    stdinBuffer = stdinBuffer.slice(newlineIndex + 1);

    if (line.length > 0) {
      await handleMessage(line);
    }

    newlineIndex = stdinBuffer.indexOf('\n');
  }
}

async function handleMessage(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch (error) {
    writeLog(`Invalid JSON-RPC message: ${error.message}`);
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(message, 'id')) {
    return;
  }

  try {
    const result = await dispatch(message.method, message.params || {});
    writeJson({
      jsonrpc: '2.0',
      id: message.id,
      result,
    });
  } catch (error) {
    writeJson({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32000,
        message: error.message,
      },
    });
  }
}

async function dispatch(method, params) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: params.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'pivotlog-search-console',
          version: '1.0.0',
        },
        instructions:
          'Use this server to inspect PivotLog Google Search Console data. Default property is sc-domain:pivotlog.app. Prefer search_console_search_analytics for clicks, impressions, CTR, position, query, page, country, and device checks. If credentials are missing, ask the user to set GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON and add the service account as a Search Console user.',
      };
    case 'tools/list':
      return { tools };
    case 'tools/call':
      return callTool(params.name, params.arguments || {});
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

async function callTool(name, args) {
  switch (name) {
    case 'search_console_sites_list':
      return asText(await searchConsoleGet('/sites'));
    case 'search_console_sitemaps_list':
      return asText(await searchConsoleGet(`/sites/${encodeURIComponent(args.siteUrl || DEFAULT_SITE_URL)}/sitemaps`));
    case 'search_console_search_analytics':
      return asText(await querySearchAnalytics(args));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function querySearchAnalytics(args) {
  if (!args.startDate || !args.endDate) {
    throw new Error('startDate and endDate are required.');
  }

  const rowLimit = clamp(Number(args.rowLimit || 100), 1, 25000);
  const body = {
    startDate: args.startDate,
    endDate: args.endDate,
    dimensions: Array.isArray(args.dimensions) && args.dimensions.length > 0 ? args.dimensions : ['date'],
    rowLimit,
  };

  return searchConsolePost(
    `/sites/${encodeURIComponent(args.siteUrl || DEFAULT_SITE_URL)}/searchAnalytics/query`,
    body,
  );
}

async function searchConsoleGet(pathname) {
  return googleFetch(`${SEARCH_CONSOLE_API_BASE_URL}${pathname}`);
}

async function searchConsolePost(pathname, body) {
  return googleFetch(`${SEARCH_CONSOLE_API_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function googleFetch(url, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Google Search Console API ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (accessTokenCache && accessTokenCache.expiresAt - 60 > now) {
    return accessTokenCache.token;
  }

  const serviceAccount = await readServiceAccount();
  const assertion = createJwtAssertion(serviceAccount, now);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Google OAuth token request failed: ${JSON.stringify(data)}`);
  }

  accessTokenCache = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in || 3600),
  };
  return accessTokenCache.token;
}

async function readServiceAccount() {
  const rawJson = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_KEY;
  const keyPath =
    process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  if (!keyPath) {
    throw new Error(
      'Set GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON to a Google service account JSON key path, then add that service account email as a Search Console user.',
    );
  }

  const content = await readFile(resolve(keyPath), 'utf8');
  return JSON.parse(content);
}

function createJwtAssertion(serviceAccount, now) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const claim = {
    iss: serviceAccount.client_email,
    scope: SEARCH_CONSOLE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const input = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(input);
  signer.end();
  const key = createPrivateKey(serviceAccount.private_key);
  const signature = signer.sign(key);
  return `${input}.${base64Url(signature)}`;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function asText(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function writeJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function writeLog(message) {
  process.stderr.write(`${message}\n`);
}
