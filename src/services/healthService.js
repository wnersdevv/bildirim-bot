'use strict';

const connection = require('../database/connection');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const stateManager = require('../core/stateManager');

/**
 * /sistem durum ve Sistem Paneli icin birlesik saglik raporu uretir.
 */
async function getStatus(client, queueManager) {
  const platforms = await platformStateRepo.listAll();

  return {
    bot: {
      ready: client?.isReady?.() ?? false,
      ping: client?.ws?.ping ?? null,
      guildCount: client?.guilds?.cache?.size ?? 0
    },
    mongo: {
      configured: connection.isConfigured(),
      healthy: connection.isHealthy()
    },
    queue: {
      size: queueManager?.size?.() ?? 0
    },
    killSwitches: { ...stateManager.killSwitches },
    dailyStats: stateManager.getDailyStats(),
    platforms: platforms.map((p) => ({
      platform: p.platform,
      status: p.status,
      lastScanAt: p.lastScanAt,
      lastError: p.lastError,
      quota: p.quota
    }))
  };
}

module.exports = { getStatus };
