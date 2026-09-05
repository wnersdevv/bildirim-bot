'use strict';

const configManager = require('../core/configManager');

/**
 * Instagram icin genel/kamuya acik tarama amacli resmi bir API bu projede
 * yapilandirilmadi (Meta Graph API is hesabi + Facebook Sayfa baglantisi ve
 * onay gerektirir). Spec geregi sahte veri uretilmez; durum daima acikca
 * UNCONFIGURED olarak raporlanir. Resmi erisim saglanirsa bu dosya
 * youtubeService.js / twitchService.js ile ayni sozlesmeye uyacak sekilde
 * doldurulmalidir.
 */
const UNCONFIGURED_REASON =
  'Instagram icin resmi/genel kullanima acik bir tarama API\u2019i bu projede yapilandirilmadi.';

function getConfig() {
  return configManager.get().notifications.platforms.instagram;
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
