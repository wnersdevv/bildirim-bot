'use strict';

const tiktokService = require('../services/tiktokService');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const stateManager = require('../core/stateManager');

/**
 * TikTok icin resmi tarama API'si yapilandirilmadigindan (bkz. tiktokService.js),
 * bu job hicbir sahte veri uretmez; sadece durumu dogru raporlar ve gecer.
 */
async function runScan() {
  if (!stateManager.isEnabled('autoScan')) return { skipped: 'KILL_SWITCH' };
  const health = await tiktokService.healthCheck();
  await platformStateRepo.update('tiktok', { status: health.status, lastError: health.error || '' });
  return { skipped: health.status };
}

module.exports = { runScan };
