'use strict';

const instagramService = require('../services/instagramService');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const stateManager = require('../core/stateManager');

async function runScan() {
  if (!stateManager.isEnabled('autoScan')) return { skipped: 'KILL_SWITCH' };
  const health = await instagramService.healthCheck();
  await platformStateRepo.update('instagram', { status: health.status, lastError: health.error || '' });
  return { skipped: health.status };
}

module.exports = { runScan };
