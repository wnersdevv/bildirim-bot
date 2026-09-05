'use strict';

const configManager = require('../core/configManager');
const { makeLogger } = require('../core/logger');
const { withRetry } = require('../core/retryManager');
const { sharedRateLimiter } = require('../core/rateLimiter');
const { CacheManager } = require('../core/cacheManager');

const logger = makeLogger('YoutubeService');
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const cache = new CacheManager();

function getConfig() {
  return configManager.get().notifications.platforms.youtube;
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg?.enabled && cfg?.apiKey);
}

async function apiGet(endpoint, params) {
  const cfg = getConfig();
  if (!cfg?.apiKey) {
    const err = new Error('YouTube apiKey tanimli degil (UNCONFIGURED).');
    err.code = 'UNCONFIGURED';
    throw err;
  }

  if (!sharedRateLimiter.allow('youtube:quota', 100, 100 * 1000)) {
    const err = new Error('YouTube API yerel rate limit asildi.');
    err.code = 'RATE_LIMITED';
    throw err;
  }

  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('key', cfg.apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  return withRetry(
    async () => {
      const res = await fetch(url.toString());
      if (res.status === 403) {
        const body = await res.text();
        const err = new Error(`YouTube API 403 (quota/izin sorunu olabilir): ${body.slice(0, 200)}`);
        err.code = 'API_ERROR';
        throw err;
      }
      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`YouTube API hatasi ${res.status}: ${body.slice(0, 200)}`);
        err.code = 'API_ERROR';
        throw err;
      }
      return res.json();
    },
    { scope: 'youtube', maxRetries: 3, shouldRetry: (err) => err.code === 'API_ERROR' }
  );
}

/**
 * Kanal ID, @handle, kanal URL'si veya kanal adindan gercek kanal ID'sini
 * ve uploads playlist ID'sini cozer.
 */
async function resolveChannel(input) {
  const cacheKey = `resolve:${input}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let params;
  const trimmed = input.trim();

  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    params = { part: 'snippet,contentDetails', id: trimmed };
  } else if (trimmed.startsWith('@')) {
    params = { part: 'snippet,contentDetails', forHandle: trimmed };
  } else if (trimmed.includes('youtube.com/')) {
    const match = trimmed.match(/youtube\.com\/(?:channel\/(UC[\w-]+)|@([\w.-]+))/);
    if (match?.[1]) params = { part: 'snippet,contentDetails', id: match[1] };
    else if (match?.[2]) params = { part: 'snippet,contentDetails', forHandle: `@${match[2]}` };
    else throw new Error('YouTube URL formati taninamadi.');
  } else {
    params = { part: 'snippet,contentDetails', forHandle: `@${trimmed}` };
  }

  const data = await apiGet('channels', params);
  const channel = data.items?.[0];
  if (!channel) {
    throw new Error('YouTube kanali bulunamadi. ID/handle/URL degerini kontrol edin.');
  }

  const result = {
    channelId: channel.id,
    channelName: channel.snippet.title,
    uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    thumbnail: channel.snippet.thumbnails?.default?.url || ''
  };

  cache.set(cacheKey, result, 60 * 60 * 1000);
  return result;
}

/**
 * Bir kanalin en son yuklenen videolarini getirir (playlistItems -> videos.list ile detay).
 */
async function fetchLatestVideos(uploadsPlaylistId, maxResults = 5) {
  const playlistData = await apiGet('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults)
  });

  const videoIds = (playlistData.items || []).map((i) => i.contentDetails.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  const videosData = await apiGet('videos', {
    part: 'snippet,liveStreamingDetails,statistics',
    id: videoIds.join(',')
  });

  return (videosData.items || []).map((v) => normalizeVideo(v));
}

function normalizeVideo(v) {
  const isLive = v.snippet.liveBroadcastContent === 'live';
  const isUpcoming = v.snippet.liveBroadcastContent === 'upcoming';
  const isShort = false; // YouTube API dogrudan Shorts bayragi vermez; sure/format ile tahmin edilebilir.

  let eventType = 'new_video';
  if (isLive) eventType = 'live_started';
  else if (isShort) eventType = 'shorts';

  return {
    contentId: v.id,
    eventType,
    isUpcoming,
    channelName: v.snippet.channelTitle,
    title: v.snippet.title,
    description: v.snippet.description,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url || '',
    publishedAt: v.snippet.publishedAt,
    viewCount: v.statistics?.viewCount ? Number(v.statistics.viewCount) : undefined,
    buttonLabel: isLive ? '🔴 Yayını İzle' : '▶️ Videoyu İzle'
  };
}

/** Platform abstraction: healthCheck() */
async function healthCheck() {
  if (!isConfigured()) return { status: 'UNCONFIGURED' };
  try {
    await apiGet('channels', { part: 'id', id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' }); // Google Developers kanali - hafif dogrulama
    return { status: 'ENABLED' };
  } catch (err) {
    if (err.code === 'RATE_LIMITED') return { status: 'RATE_LIMITED', error: err.message };
    return { status: 'API_ERROR', error: err.message };
  }
}

module.exports = { isConfigured, resolveChannel, fetchLatestVideos, healthCheck };
