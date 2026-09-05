'use strict';

const announcementRepo = require('../database/repositories/announcementRepo');
const announcementService = require('./announcementService');
const stateManager = require('../core/stateManager');
const { makeLogger } = require('../core/logger');

const logger = makeLogger('ScheduleService');

function computeNextRun(current, recurrence) {
  const next = new Date(current);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  else return null;
  return next;
}

/**
 * scheduledAnnouncements job'i tarafindan periyodik cagrilir.
 * Job lock ile ayni anda birden fazla calismasi engellenir (fail-safe).
 */
async function processDue(client) {
  if (!stateManager.isEnabled('scheduler')) return { processed: 0 };
  if (!stateManager.acquireLock('scheduledAnnouncements')) return { processed: 0, skipped: 'LOCKED' };

  let processed = 0;
  try {
    const due = await announcementRepo.listDuePending();
    for (const item of due) {
      // eslint-disable-next-line no-await-in-loop
      const result = await announcementService.sendNow({
        client,
        guildId: item.guildId,
        authorId: item.authorId,
        channelId: item.channelId,
        content: item.content,
        mentionType: item.mention,
        roleId: item.roleId,
        urgent: false
      });

      if (item.recurrence && item.recurrence !== 'none') {
        const nextRun = computeNextRun(item.scheduledAt, item.recurrence);
        // eslint-disable-next-line no-await-in-loop
        await announcementRepo.markScheduledResult(item._id, 'PENDING', result.error || '');
        if (nextRun) {
          item.scheduledAt = nextRun;
          // eslint-disable-next-line no-await-in-loop
          await item.save();
        }
      } else {
        // eslint-disable-next-line no-await-in-loop
        await announcementRepo.markScheduledResult(item._id, result.success ? 'SENT' : 'FAILED', result.error || '');
      }
      processed += 1;
    }
  } catch (err) {
    logger.debug('Planli duyuru islenirken hata (DB UNCONFIGURED olabilir).', { error: err.message });
  } finally {
    stateManager.releaseLock('scheduledAnnouncements');
  }

  return { processed };
}

module.exports = { processDue };
