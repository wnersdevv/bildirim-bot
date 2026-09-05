'use strict';

const configManager = require('../core/configManager');
const stateManager = require('../core/stateManager');
const { makeLogger } = require('../core/logger');

const youtubeScanner = require('./youtubeScanner');
const twitchScanner = require('./twitchScanner');
const tiktokScanner = require('./tiktokScanner');
const instagramScanner = require('./instagramScanner');
const xScanner = require('./xScanner');
const scheduledAnnouncements = require('./scheduledAnnouncements');
const healthMonitor = require('./healthMonitor');

const logger = makeLogger('NotificationScanner');

const SCANNERS = {
  youtube: youtubeScanner,
  twitch: twitchScanner,
  tiktok: tiktokScanner,
  instagram: instagramScanner,
  x: xScanner
};

const timers = [];

/**
 * Her platform kendi scanIntervalSeconds degerini kullanir; tek bir ortak
 * scheduler'da tekrar eden interval olusmamasi icin her platform icin
 * ayri ve TEK bir setInterval kurulur (bkz. stateManager job lock ile de
 * ust uste calisma engellenir).
 */
function start(client, queueManager) {
  const config = configManager.get();
  const platformsCfg = config.notifications.platforms;

  for (const [platform, scanner] of Object.entries(SCANNERS)) {
    const intervalSeconds = platformsCfg[platform]?.scanIntervalSeconds || 120;
    const intervalMs = Math.max(15, intervalSeconds) * 1000;

    const timer = setInterval(() => {
      scanner.runScan(client, queueManager).catch((err) => {
        logger.error(`${platform} scanner beklenmeyen hata.`, { error: err.message });
      });
    }, intervalMs);

    timers.push(timer);
    logger.info(`${platform} scanner baslatildi (${intervalSeconds}s araliklarla).`);
  }

  // Planli duyurular: sabit 30 saniyede bir kontrol edilir.
  const scheduleTimer = setInterval(() => {
    scheduledAnnouncements.runTick(client).catch((err) => {
      logger.error('Planli duyuru tick hatasi.', { error: err.message });
    });
  }, 30 * 1000);
  timers.push(scheduleTimer);

  // Saglik izleme: 5 dakikada bir, gunluk temizlik 24 saatte bir tetiklenecek sekilde retention kontrol edilir.
  const healthTimer = setInterval(() => {
    healthMonitor.runTick({ retentionDays: config.notifications.dataRetentionDays || null }).catch((err) => {
      logger.error('Health monitor tick hatasi.', { error: err.message });
    });
  }, 5 * 60 * 1000);
  timers.push(healthTimer);

  logger.info('Bildirim tarama sistemi tamamen baslatildi.');
}

function stop() {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
  logger.info('Bildirim tarama sistemi durduruldu.');
}

/** /bildirim tara ve /youtube tara vb. manuel tarama komutlari icin. */
async function runManual(platform, client, queueManager) {
  const scanner = SCANNERS[platform];
  if (!scanner) throw new Error(`Bilinmeyen platform: ${platform}`);
  return scanner.runScan(client, queueManager);
}

module.exports = { start, stop, runManual };
