'use strict';

const scheduleService = require('../services/scheduleService');
const { makeLogger } = require('../core/logger');

const logger = makeLogger('ScheduledAnnouncementsJob');

async function runTick(client) {
  try {
    const result = await scheduleService.processDue(client);
    if (result.processed) logger.info(`${result.processed} planli duyuru islendi.`);
    return result;
  } catch (err) {
    logger.error('Planli duyuru job hatasi.', { error: err.message });
    return { processed: 0, error: err.message };
  }
}

module.exports = { runTick };
