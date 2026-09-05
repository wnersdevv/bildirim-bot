'use strict';

const configManager = require('../core/configManager');

/**
 * X (Twitter) icin ucretsiz katmanda guvenilir bir tarama API'si bu projede
 * yapilandirilmadi (resmi API ucretli plan + bearer token gerektirir).
 * Spec geregi sahte veri uretilmez; durum daima acikca UNCONFIGURED olarak
 * raporlanir. Resmi/ucretli API erisimi saglanirsa bu dosya
 * youtubeService.js / twitchService.js ile ayni sozlesmeye uyacak sekilde
 * doldurulmalidir.
 */
const UNCONFIGURED_REASON =
  'X icin resmi/genel kullanima acik bir tarama API\u2019i bu projede yapilandirilmadi.';

function getConfig() {
  return configManager.get().notifications.platforms.x;
}

function isConfigured() {
  return false;
}

async function resolveSource() {
  const err = new Error(UNCONFIGURED_REASON);
  err.code = 'UNCONFIGURED';
  throw err;
}

async function fetchLatest() {
  return [];
}

async function healthCheck() {
  const cfg = getConfig();
  return { status: cfg?.enabled ? 'UNCONFIGURED' : 'DISABLED', error: UNCONFIGURED_REASON };
}

module.exports = { isConfigured, resolveSource, fetchLatest, healthCheck };
