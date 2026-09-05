'use strict';

const xService = require('../services/xService');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const stateManager = require('../core/stateManager');

async function runScan() {
  if (!stateManager.isEnabled('autoScan')) return { skipped: 'KILL_SWITCH' };
  const health = await xService.healthCheck();
  await platformStateRepo.update('x', { status: health.status, lastError: health.error || '' });
  return { skipped: health.status };
}

module.exports = { runScan };
