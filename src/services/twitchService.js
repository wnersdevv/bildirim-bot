'use strict';

const configManager = require('../core/configManager');
const { withRetry } = require('../core/retryManager');
const { sharedRateLimiter } = require('../core/rateLimiter');
const { makeLogger } = require('../core/logger');

const logger = makeLogger('TwitchService');
const HELIX_BASE = 'https://api.twitch.tv/helix';
const OAUTH_URL = 'https://id.twitch.tv/oauth2/token';

let appToken = null;
let tokenExpiresAt = 0;

function getConfig() {
  return configManager.get().notifications.platforms.twitch;
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg?.enabled && cfg?.clientId && cfg?.clientSecret);
}

async function ensureAppToken() {
  const cfg = getConfig();
  if (!cfg?.clientId || !cfg?.clientSecret) {
    const err = new Error('Twitch clientId/clientSecret tanimli degil (UNCONFIGURED).');
    err.code = 'UNCONFIGURED';
    throw err;
  }

  if (appToken && Date.now() < tokenExpiresAt - 60_000) return appToken;

  const url = new URL(OAUTH_URL);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('client_secret', cfg.clientSecret);
  url.searchParams.set('grant_type', 'client_credentials');

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Twitch OAuth token alinamadi: ${res.status} ${body.slice(0, 200)}`);
    err.code = 'API_ERROR';
    throw err;
  }
  const data = await res.json();
  appToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return appToken;
}

async function helixGet(endpoint, params) {
  const cfg = getConfig();
  const token = await ensureAppToken();

  if (!sharedRateLimiter.allow('twitch:api', 100, 60 * 1000)) {
    const err = new Error('Twitch API yerel rate limit asildi.');
    err.code = 'RATE_LIMITED';
    throw err;
  }

  const url = new URL(`${HELIX_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
    else url.searchParams.set(k, v);
  }

  return withRetry(
    async () => {
      const res = await fetch(url.toString(), {
        headers: { 'Client-Id': cfg.clientId, Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        appToken = null; // token gecersiz olmus olabilir, bir sonraki denemede yenile
        const err = new Error('Twitch API 401: token gecersiz, yenilenecek.');
        err.code = 'API_ERROR';
        throw err;
      }
      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`Twitch API hatasi ${res.status}: ${body.slice(0, 200)}`);
        err.code = res.status === 429 ? 'RATE_LIMITED' : 'API_ERROR';
        throw err;
      }
      return res.json();
    },
    { scope: 'twitch', maxRetries: 3, shouldRetry: (err) => err.code === 'API_ERROR' }
  );
}

async function resolveUser(loginOrUrl) {
  let login = loginOrUrl.trim();
  const match = login.match(/twitch\.tv\/([\w]+)/);
  if (match) login = match[1];
  login = login.replace(/^@/, '').toLowerCase();

  const data = await helixGet('users', { login });
  const user = data.data?.[0];
  if (!user) throw new Error('Twitch kullanicisi bulunamadi.');
  return { userId: user.id, login: user.login, displayName: user.display_name, avatar: user.profile_image_url };
}

/** Bir veya birden fazla kullanicinin canli yayin durumunu getirir. */
async function fetchLiveStreams(userIds) {
  const data = await helixGet('streams', { user_id: userIds });
  return (data.data || []).map((s) => normalizeStream(s));
}

function normalizeStream(s) {
  return {
    contentId: s.id,
    userId: s.user_id,
    eventType: 'live_started',
    channelName: s.user_name,
    title: s.title,
    description: '',
    url: `https://twitch.tv/${s.user_login}`,
    thumbnail: (s.thumbnail_url || '').replace('{width}', '640').replace('{height}', '360'),
    publishedAt: s.started_at,
    category: s.game_name,
    viewCount: s.viewer_count,
    buttonLabel: '🔴 Yayını İzle'
  };
}

async function healthCheck() {
  if (!isConfigured()) return { status: 'UNCONFIGURED' };
  try {
    await ensureAppToken();
    return { status: 'ENABLED' };
  } catch (err) {
    if (err.code === 'RATE_LIMITED') return { status: 'RATE_LIMITED', error: err.message };
    return { status: 'API_ERROR', error: err.message };
  }
}

module.exports = { isConfigured, resolveUser, fetchLiveStreams, healthCheck };
