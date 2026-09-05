'use strict';

const youtubeService = require('./youtubeService');
const twitchService = require('./twitchService');
const tiktokService = require('./tiktokService');
const instagramService = require('./instagramService');
const xService = require('./xService');
const sourceRepo = require('../database/repositories/sourceRepo');
const configManager = require('../core/configManager');

/**
 * Ortak platform sozlesmesi: her platform servisi
 * { isConfigured, healthCheck } saglar. YouTube/Twitch ayrica
 * resolveChannel/resolveUser + fetchLatestVideos/fetchLiveStreams sunar;
 * TikTok/Instagram/X icin resolveSource/fetchLatest kullanilir (UNCONFIGURED).
 */
const REGISTRY = {
  youtube: youtubeService,
  twitch: twitchService,
  tiktok: tiktokService,
  instagram: instagramService,
  x: xService
};

function getService(platform) {
  const service = REGISTRY[platform];
  if (!service) throw new Error(`Bilinmeyen platform: ${platform}`);
  return service;
}

function isPlatformGloballyEnabled(platform) {
  const cfg = configManager.get().notifications.platforms[platform];
  return Boolean(cfg?.enabled);
}

async function getSources(platform, guildId) {
  return sourceRepo.listSources(guildId, platform);
}

async function healthCheck(platform) {
  return getService(platform).healthCheck();
}

module.exports = { getService, getSources, healthCheck, isPlatformGloballyEnabled, REGISTRY };
