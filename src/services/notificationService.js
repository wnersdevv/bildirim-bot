'use strict';

const { makeLogger } = require('../core/logger');
const stateManager = require('../core/stateManager');
const { buildNotificationEmbed } = require('../components/builders/notificationEmbed');
const { buildMentionContent } = require('./roleMentionService');
const filterService = require('./filterService');
const cooldownService = require('./cooldownService');
const duplicateService = require('./duplicateService');
const dmService = require('./dmService');
const subscriptionService = require('./subscriptionService');
const notificationLogRepo = require('../database/repositories/notificationLogRepo');
const { isWithinQuietHours } = require('../utils/time');

const logger = makeLogger('NotificationService');

/**
 * Akis: Scanner -> normalize -> [buraya girer] -> validation -> change detection
 * (scanner tarafinda) -> duplicate -> filter -> cooldown -> queue -> builder ->
 * channel/DM/mention -> log -> audit.
 *
 * @param {object} params
 * @param {import('discord.js').Client} params.client
 * @param {object} params.queueManager
 * @param {object} params.source - NotificationSource dokumani
 * @param {object} params.guildSettings - GuildSettings dokumani
 * @param {object} params.item - normalize edilmis platform verisi
 * @param {'CRITICAL'|'HIGH'|'NORMAL'|'LOW'} [params.priority]
 */
async function dispatch({ client, queueManager, source, guildSettings, item, priority = 'NORMAL' }) {
  const guildId = source.guildId;
  const platform = source.platform;
  const eventType = item.eventType;
  const contentId = item.contentId;

  if (!stateManager.isEnabled('autoScan') && priority !== 'CRITICAL') {
    logger.debug('autoScan kill-switch kapali, bildirim atlandi.');
    return { status: 'SKIPPED', reason: 'KILL_SWITCH' };
  }

  const dupParams = { guildId, platform, sourceId: source.sourceId, contentId, eventType };
  if (await duplicateService.isDuplicate(dupParams)) {
    return { status: 'DUPLICATE' };
  }

  const filters = { ...guildSettings?.filters, ...source.filters };
  if (!filterService.passesFilters(`${item.title || ''} ${item.description || ''}`, filters)) {
    return { status: 'SKIPPED', reason: 'FILTER' };
  }

  const cooldownSeconds = source.notificationSettings?.cooldownSeconds ?? guildSettings?.cooldown ?? 60;
  const cooldownKey = `${guildId}:${platform}:${source.sourceId}:${eventType}`;
  if (!cooldownService.tryConsume(cooldownKey, cooldownSeconds)) {
    return { status: 'SKIPPED', reason: 'COOLDOWN' };
  }

  if (isWithinQuietHours(guildSettings?.quietHours, guildSettings?.timezone) && priority !== 'CRITICAL') {
    return { status: 'SKIPPED', reason: 'QUIET_HOURS' };
  }

  duplicateService.markSeen(dupParams);

  return new Promise((resolve) => {
    queueManager.enqueue(async () => {
      const result = await deliver({ client, source, guildSettings, item, dupParams });
      resolve(result);
    }, priority);
  });
}

async function deliver({ client, source, guildSettings, item, dupParams }) {
  const { embeds, components } = buildNotificationEmbed(item);
  const results = { channel: null, dm: null };

  const channelId = source.notificationSettings?.channelId || guildSettings?.defaultChannelId;
  const channelEnabled =
    stateManager.isEnabled('channelNotifications') &&
    guildSettings?.channelNotifications !== false &&
    source.notificationSettings?.events?.channel !== false &&
    channelId;

  if (channelEnabled) {
    try {
      const channel = await client.channels.fetch(channelId);
      let content = '';
      let allowedMentions = { parse: [] };

      const mentionRoleId = source.notificationSettings?.mentionRoleId || guildSettings?.defaultRoleId;
      if (stateManager.isEnabled('mention') && guildSettings?.mentionEnabled !== false && mentionRoleId) {
        const mention = buildMentionContent({ mentionType: 'role', roleId: mentionRoleId });
        content = mention.content;
        allowedMentions = mention.allowedMentions;
      }

      const message = await channel.send({ content, embeds, components, allowedMentions });
      stateManager.incrementSent();
      results.channel = { success: true, messageId: message.id };
      await notificationLogRepo.create({
        ...dupParams,
        deliveryType: 'channel',
        channelId,
        status: 'SENT',
        messageId: message.id,
        notificationKey: `${dupParams.guildId}:${dupParams.platform}:${dupParams.sourceId}:${dupParams.contentId}:${dupParams.eventType}`
      });
    } catch (err) {
      stateManager.incrementError();
      results.channel = { success: false, error: err.message };
      await notificationLogRepo.create({
        ...dupParams,
        deliveryType: 'channel',
        channelId,
        status: 'FAILED',
        error: err.message,
        notificationKey: `${dupParams.guildId}:${dupParams.platform}:${dupParams.sourceId}:${dupParams.contentId}:${dupParams.eventType}`
      });
    }
  }

  const dmEnabled =
    stateManager.isEnabled('dm') &&
    (guildSettings?.dmNotifications || source.notificationSettings?.dmEnabled);

  if (dmEnabled) {
    try {
      const subscribers = await subscriptionService.subscribersFor(dupParams.guildId, String(source._id));
      for (const sub of subscribers) {
        if (!sub.dmEnabled) continue;
        // eslint-disable-next-line no-await-in-loop
        const dmResult = await dmService.sendDm(client, {
          guildId: dupParams.guildId,
          userId: sub.userId,
          payload: { embeds, components }
        });
        // eslint-disable-next-line no-await-in-loop
        await notificationLogRepo.create({
          ...dupParams,
          deliveryType: 'dm',
          userId: sub.userId,
          status: dmResult.success ? 'SENT' : 'FAILED',
          error: dmResult.error || '',
          notificationKey: `${dupParams.guildId}:${dupParams.platform}:${dupParams.sourceId}:${dupParams.contentId}:${dupParams.eventType}:dm:${sub.userId}`
        });
      }
      results.dm = { attempted: subscribers.length };
    } catch (err) {
      logger.debug('DM abonesi listesi alinamadi (DB olabilir UNCONFIGURED).', { error: err.message });
    }
  }

  return { status: 'PROCESSED', results };
}

module.exports = { dispatch };
