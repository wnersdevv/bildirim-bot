'use strict';

const configManager = require('../core/configManager');

/**
 * TikTok icin resmi/stabil, kimlik dogrulamasi gerektirmeyen genel bir kamuya
 * acik tarama API'si bu projede yapilandirilmadi (resmi erisim ozel basvuru/
 * onay gerektiriyor). Spec geregi ("mock/fake veri uretme") bu servis gercek
 * veri UYDURMAZ; durumu her zaman acikca UNCONFIGURED olarak raporlar.
 * Ileride resmi API erisimi saglanirsa, bu dosya youtubeService.js /
 * twitchService.js ile ayni sozlesmeye (resolveSource, fetchLatest,
 * healthCheck) uyacak sekilde doldurulmalidir.
 */
const UNCONFIGURED_REASON =
  'TikTok icin resmi/genel kullanima acik bir tarama API\u2019i bu projede yapilandirilmadi.';

function getConfig() {
  return configManager.get().notifications.platforms.tiktok;
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
