'use strict';

const youtubeService = require('../services/youtubeService');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const sourceRepo = require('../database/repositories/sourceRepo');
const guildSettingsRepo = require('../database/repositories/guildSettingsRepo');
const notificationService = require('../services/notificationService');
const stateManager = require('../core/stateManager');
const { makeLogger } = require('../core/logger');
const ScanHistory = require('../database/models/ScanHistory');
const connection = require('../database/connection');

const logger = makeLogger('YoutubeScanner');
const ANOMALY_THRESHOLD = 3; // beklenenden fazla "yeni" icerik donerse anomali say

async function recordScanHistory(entry) {
  if (!connection.isHealthy()) return;
  try {
    await ScanHistory.create(entry);
  } catch (err) {
    logger.debug('ScanHistory kaydi basarisiz.', { error: err.message });
  }
}

async function scanSource(client, queueManager, source) {
  const guildId = source.guildId;

  try {
    const resolved = await youtubeService.resolveChannel(source.sourceId);
    const videos = await youtubeService.fetchLatestVideos(resolved.uploadsPlaylistId, 5);

    const lastContentId = source.lastState?.lastContentId;
    const newItems = lastContentId
      ? videos.filter((v) => v.contentId !== lastContentId && !v.isUpcoming)
      : [];

    // Ilk ekleme: gecmisi bildirim yapmadan baseline olustur.
    if (source.syncStatus === 'INITIALIZING') {
      await sourceRepo.updateSource(source._id, {
        syncStatus: 'BASELINE_CREATED',
        lastState: { lastContentId: videos[0]?.contentId || null }
      });
      await recordScanHistory({
        platform: 'youtube', sourceId: source.sourceId, guildId, result: 'NO_CHANGE', itemsFound: 0
      });
      return;
    }

    if (newItems.length > ANOMALY_THRESHOLD) {
      logger.warn('YouTube tarama anomalisi: beklenenden fazla yeni icerik.', {
        sourceId: source.sourceId,
        count: newItems.length
      });
      await recordScanHistory({
        platform: 'youtube', sourceId: source.sourceId, guildId, result: 'ANOMALOUS_RESPONSE', itemsFound: newItems.length
      });
      // Toplu bildirim gondermek yerine sadece en yenisini bildir, state'i guncelle.
      await sourceRepo.updateSource(source._id, {
        lastState: { lastContentId: videos[0]?.contentId || lastContentId },
        status: 'ENABLED',
        lastCheckedAt: new Date()
      });
      return;
    }

    if (newItems.length > 0) {
      const guildSettings = await guildSettingsRepo.getOrCreate(guildId);
      for (const item of newItems.reverse()) {
        // eslint-disable-next-line no-await-in-loop
        await notificationService.dispatch({
          client,
          queueManager,
          source,
          guildSettings,
          item,
          priority: item.eventType === 'live_started' ? 'HIGH' : 'NORMAL'
        });
      }
      await recordScanHistory({
        platform: 'youtube', sourceId: source.sourceId, guildId, result: 'NEW_CONTENT', itemsFound: newItems.length
      });
    } else {
      await recordScanHistory({
        platform: 'youtube', sourceId: source.sourceId, guildId, result: 'NO_CHANGE', itemsFound: 0
      });
    }

    await sourceRepo.updateSource(source._id, {
      lastState: { lastContentId: videos[0]?.contentId || lastContentId },
      status: 'ENABLED',
      lastCheckedAt: new Date(),
      lastError: ''
    });
  } catch (err) {
    logger.error('YouTube kaynagi taranirken hata.', { sourceId: source.sourceId, error: err.message });
    const status = err.code === 'UNCONFIGURED' ? 'UNCONFIGURED' : err.code === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'API_ERROR';
    await sourceRepo.updateSource(source._id, {
      status,
      lastCheckedAt: new Date(),
      lastErrorAt: new Date(),
      lastError: err.message
    });
    await recordScanHistory({
      platform: 'youtube', sourceId: source.sourceId, guildId, result: 'ERROR', error: err.message
    });
  }
}

async function runScan(client, queueManager) {
  if (!stateManager.isEnabled('autoScan')) return { skipped: 'KILL_SWITCH' };
  if (!youtubeService.isConfigured()) {
    await platformStateRepo.update('youtube', { status: 'UNCONFIGURED' });
    return { skipped: 'UNCONFIGURED' };
  }
  if (!stateManager.acquireLock('youtubeScanner')) return { skipped: 'LOCKED' };

  let scanned = 0;
  try {
    const sources = await sourceRepo.listAllEnabledByPlatform('youtube');
    for (const source of sources) {
      // eslint-disable-next-line no-await-in-loop
      await scanSource(client, queueManager, source);
      stateManager.markScan(`youtube:${source.sourceId}`);
      scanned += 1;
    }
    await platformStateRepo.update('youtube', {
      status: 'ENABLED',
      lastScanAt: new Date(),
      lastSuccessAt: new Date(),
      consecutiveErrors: 0
    });
  } catch (err) {
    logger.error('YouTube tarama dongusu hata verdi.', { error: err.message });
    await platformStateRepo.update('youtube', { status: 'API_ERROR', lastErrorAt: new Date(), lastError: err.message });
  } finally {
    stateManager.releaseLock('youtubeScanner');
  }

  return { scanned };
}

module.exports = { runScan, scanSource };
