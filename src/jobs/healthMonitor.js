'use strict';

const platformManager = require('../services/platformManager');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const notificationLogRepo = require('../database/repositories/notificationLogRepo');
const { alertAdmin } = require('../core/errorHandler');
const { makeLogger } = require('../core/logger');

const logger = makeLogger('HealthMonitor');
const PLATFORMS = ['youtube', 'twitch', 'tiktok', 'instagram', 'x'];
const CONSECUTIVE_ERROR_ALERT_THRESHOLD = 3;

/**
 * Periyodik olarak tum platformlarin saglik durumunu kontrol eder,
 * ardarda hata sayisi esigi asarsa admin uyarisi tetikler ve
 * NotificationLog icin retention temizligini calistirir.
 */
async function runTick({ retentionDays } = {}) {
  for (const platform of PLATFORMS) {
    // eslint-disable-next-line no-await-in-loop
    const health = await platformManager.healthCheck(platform).catch((err) => ({ status: 'API_ERROR', error: err.message }));
    // eslint-disable-next-line no-await-in-loop
    const state = await platformStateRepo.getOrCreate(platform);

    const wasError = ['API_ERROR', 'RATE_LIMITED'].includes(state.status);
    const isError = ['API_ERROR', 'RATE_LIMITED'].includes(health.status);
    const consecutiveErrors = isError ? (state.consecutiveErrors || 0) + (wasError ? 1 : 1) : 0;

    // eslint-disable-next-line no-await-in-loop
    await platformStateRepo.update(platform, {
      status: health.status,
      lastError: health.error || '',
      consecutiveErrors
    });

    if (isError && consecutiveErrors >= CONSECUTIVE_ERROR_ALERT_THRESHOLD) {
      logger.warn(`${platform} platformu ardarda hata veriyor.`, { consecutiveErrors });
      // eslint-disable-next-line no-await-in-loop
      await alertAdmin(platform, `${platform} platformu ${consecutiveErrors} kez ustuste hata verdi: ${health.error || ''}`);
    }
  }

  if (retentionDays) {
    const result = await notificationLogRepo.cleanupOlderThan(retentionDays).catch(() => ({ deletedCount: 0 }));
    if (result.deletedCount) logger.info(`${result.deletedCount} eski bildirim kaydi temizlendi.`);
  }
}

module.exports = { runTick };
