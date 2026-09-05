'use strict';

const { makeLogger } = require('../core/logger');
const notificationScanner = require('../jobs/notificationScanner');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const platformManager = require('../services/platformManager');

const logger = makeLogger('ReadyEvent');
const PLATFORMS = ['youtube', 'twitch', 'tiktok', 'instagram', 'x'];

const name = 'ready';
const once = true;

async function execute(client, context) {
  logger.info(`Bot giris yapti: ${client.user.tag} (${client.guilds.cache.size} sunucu).`);

  // Restart sonrasi gercek platform durumlarini yukle/guncelle (Fail-safe / Restart State).
  for (const platform of PLATFORMS) {
    // eslint-disable-next-line no-await-in-loop
    const health = await platformManager.healthCheck(platform).catch((err) => ({ status: 'API_ERROR', error: err.message }));
    // eslint-disable-next-line no-await-in-loop
    await platformStateRepo.update(platform, { status: health.status, lastError: health.error || '' });
  }

  context.queueManager.start();
  notificationScanner.start(client, context.queueManager);

  logger.info('Bildirim sistemi aktif.');
}

module.exports = { name, once, execute };
