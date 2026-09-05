'use strict';

const twitchService = require('../services/twitchService');
const platformStateRepo = require('../database/repositories/platformStateRepo');
const sourceRepo = require('../database/repositories/sourceRepo');
const guildSettingsRepo = require('../database/repositories/guildSettingsRepo');
const notificationService = require('../services/notificationService');
const stateManager = require('../core/stateManager');
const { makeLogger } = require('../core/logger');
const ScanHistory = require('../database/models/ScanHistory');
const connection = require('../database/connection');

const logger = makeLogger('TwitchScanner');

async function recordScanHistory(entry) {
  if (!connection.isHealthy()) return;
  try {
    await ScanHistory.create(entry);
  } catch (err) {
    logger.debug('ScanHistory kaydi basarisiz.', { error: err.message });
  }
}

/**
 * source.sourceId Twitch numerik kullanici ID'sidir (resolveUser ile eklenir).
 * Her tarama turunda tum kaynaklar icin TEK bir /streams cagrisi yapilir
 * (Helix coklu user_id destekler), boylece API cagrisi minimize edilir.
 */
async function runScan(client, queueManager) {
  if (!stateManager.isEnabled('autoScan')) return { skipped: 'KILL_SWITCH' };
  if (!twitchService.isConfigured()) {
    await platformStateRepo.update('twitch', { status: 'UNCONFIGURED' });
    return { skipped: 'UNCONFIGURED' };
  }
  if (!stateManager.acquireLock('twitchScanner')) return { skipped: 'LOCKED' };

  let scanned = 0;
  try {
    const sources = await sourceRepo.listAllEnabledByPlatform('twitch');
    if (sources.length === 0) {
      return { scanned: 0 };
    }

    const userIds = sources.map((s) => s.sourceId);
    const liveStreams = await twitchService.fetchLiveStreams(userIds.slice(0, 100));
    const liveByUserId = new Map(liveStreams.map((s) => [s.userId, s]));

    for (const source of sources) {
      // eslint-disable-next-line no-await-in-loop
      await handleSourceState(client, queueManager, source, liveByUserId.get(source.sourceId));
      stateManager.markScan(`twitch:${source.sourceId}`);
      scanned += 1;
    }

    await platformStateRepo.update('twitch', {
      status: 'ENABLED',
      lastScanAt: new Date(),
      lastSuccessAt: new Date(),
      consecutiveErrors: 0
    });
  } catch (err) {
    logger.error('Twitch tarama dongusu hata verdi.', { error: err.message });
    const status = err.code === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'API_ERROR';
    await platformStateRepo.update('twitch', { status, lastErrorAt: new Date(), lastError: err.message });
  } finally {
    stateManager.releaseLock('twitchScanner');
  }

  return { scanned };
}

async function handleSourceState(client, queueManager, source, liveMatch) {
  const wasLive = Boolean(source.lastState?.isLive);
  const guildId = source.guildId;

  if (liveMatch && !wasLive) {
    const guildSettings = await guildSettingsRepo.getOrCreate(guildId);
    await notificationService.dispatch({
      client,
      queueManager,
      source,
      guildSettings,
      item: liveMatch,
      priority: 'HIGH'
    });
    await sourceRepo.updateSource(source._id, {
      lastState: { isLive: true, lastContentId: liveMatch.contentId },
      status: 'ENABLED',
      lastCheckedAt: new Date(),
      lastError: ''
    });
    await recordScanHistory({ platform: 'twitch', sourceId: source.sourceId, guildId, result: 'NEW_CONTENT', itemsFound: 1 });
  } else if (!liveMatch && wasLive) {
    await sourceRepo.updateSource(source._id, {
      lastState: { isLive: false },
      status: 'ENABLED',
      lastCheckedAt: new Date()
    });
    await recordScanHistory({ platform: 'twitch', sourceId: source.sourceId, guildId, result: 'NO_CHANGE', itemsFound: 0 });
  } else {
    await sourceRepo.updateSource(source._id, { lastCheckedAt: new Date() });
    await recordScanHistory({ platform: 'twitch', sourceId: source.sourceId, guildId, result: 'NO_CHANGE', itemsFound: 0 });
  }
}

module.exports = { runScan };
