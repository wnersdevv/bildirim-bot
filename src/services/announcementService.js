'use strict';

const { EmbedBuilder } = require('discord.js');
const announcementRepo = require('../database/repositories/announcementRepo');
const { buildMentionContent } = require('./roleMentionService');
const stateManager = require('../core/stateManager');
const { makeLogger } = require('../core/logger');
const { sanitizeText } = require('../utils/security');

const logger = makeLogger('AnnouncementService');

function buildAnnouncementEmbed(content, urgent) {
  return new EmbedBuilder()
    .setColor(urgent ? 0xed4245 : 0x5865f2)
    .setTitle(urgent ? '🚨 Acil Duyuru' : '📢 Duyuru')
    .setDescription(sanitizeText(content, 4000))
    .setTimestamp(new Date());
}

/**
 * Duyuruyu hemen gonderir. Mention sadece caller tarafindan yetkisi
 * dogrulanmis oldugunda (permissionManager) 'mentionType' ile iletilir.
 */
async function sendNow({ client, guildId, authorId, channelId, content, mentionType = 'none', roleId, urgent = false }) {
  if (!stateManager.isEnabled('channelNotifications')) {
    return { success: false, error: 'Kanal bildirimleri kill-switch ile kapali.' };
  }

  const embed = buildAnnouncementEmbed(content, urgent);
  let mentionContent = '';
  let allowedMentions = { parse: [] };

  if (mentionType !== 'none') {
    const mention = buildMentionContent({ mentionType, roleId });
    mentionContent = mention.content;
    allowedMentions = mention.allowedMentions;
  }

  let record;
  try {
    record = await announcementRepo.createAnnouncement({
      guildId,
      authorId,
      content,
      target: { channelId, mention: mentionType, roleId },
      urgent,
      status: 'DRAFT'
    });
  } catch (err) {
    logger.debug('Duyuru DB kaydi olusturulamadi (UNCONFIGURED olabilir).', { error: err.message });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    const message = await channel.send({ content: mentionContent, embeds: [embed], allowedMentions });
    if (record) {
      record.status = 'SENT';
      record.messageId = message.id;
      await record.save().catch(() => {});
    }
    return { success: true, messageId: message.id };
  } catch (err) {
    logger.error('Duyuru gonderilemedi.', { error: err.message });
    if (record) {
      record.status = 'FAILED';
      record.error = err.message;
      await record.save().catch(() => {});
    }
    return { success: false, error: err.message };
  }
}

async function schedule({ guildId, authorId, channelId, content, scheduledAt, timezone, recurrence, mentionType, roleId }) {
  return announcementRepo.scheduleAnnouncement({
    guildId,
    authorId,
    channelId,
    content,
    scheduledAt,
    timezone,
    recurrence,
    mention: mentionType,
    roleId
  });
}

async function listScheduled(guildId) {
  return announcementRepo.listScheduled(guildId);
}

async function cancelScheduled(id) {
  return announcementRepo.cancelScheduled(id);
}

async function listRecent(guildId) {
  return announcementRepo.listAnnouncements(guildId);
}

module.exports = { sendNow, schedule, listScheduled, cancelScheduled, listRecent };
