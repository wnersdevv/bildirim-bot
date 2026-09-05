'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { eventLabelTr, truncate } = require('../../utils/formatters');

const EVENT_COLORS = {
  new_video: 0xff0000,
  shorts: 0xff0000,
  live_started: 0x9146ff,
  live_ended: 0x808080,
  community_post: 0x00b0f4,
  new_post: 0xe1306c,
  story: 0xe1306c,
  announcement: 0x5865f2,
  scheduled_announcement: 0x5865f2,
  system_announcement: 0xfaa61a,
  urgent_announcement: 0xed4245,
  manual: 0x5865f2,
  test: 0x57f287
};

const EVENT_ICONS = {
  live_started: '🔴',
  live_ended: '⚪',
  new_video: '📹',
  shorts: '📱',
  community_post: '💬',
  new_post: '🖼️',
  story: '📸',
  announcement: '📢',
  scheduled_announcement: '🗓️',
  system_announcement: '⚙️',
  urgent_announcement: '🚨',
  manual: '📣',
  test: '🧪'
};

/**
 * Normalize edilmis platform verisinden profesyonel embed + link buton uretir.
 * item: { platform, eventType, channelName, title, description, url, thumbnail,
 *         publishedAt, category, viewCount, buttonLabel }
 */
function buildNotificationEmbed(item) {
  const icon = EVENT_ICONS[item.eventType] || '🔔';
  const color = EVENT_COLORS[item.eventType] || 0x5865f2;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${icon} ${eventLabelTr(item.eventType)}`)
    .setTimestamp(item.publishedAt ? new Date(item.publishedAt) : new Date());

  const descriptionLines = [];
  if (item.channelName) descriptionLines.push(`**Kanal:** ${item.channelName}`);
  if (item.title) descriptionLines.push(`**Başlık:** ${truncate(item.title, 256)}`);
  if (item.category) descriptionLines.push(`**Kategori:** ${item.category}`);
  if (typeof item.viewCount === 'number') descriptionLines.push(`**İzlenme:** ${item.viewCount}`);
  if (item.publishedAt) {
    descriptionLines.push(`**Zaman:** <t:${Math.floor(new Date(item.publishedAt).getTime() / 1000)}:R>`);
  }
  if (item.description) descriptionLines.push('', truncate(item.description, 300));

  embed.setDescription(descriptionLines.join('\n') || '\u200b');

  if (item.thumbnail) embed.setThumbnail(item.thumbnail);
  embed.setFooter({ text: `WNERSDEV Bildirim • ${item.platform?.toUpperCase() || ''}` });

  const components = [];
  if (item.url) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(item.buttonLabel || 'Bağlantıyı Aç')
        .setStyle(ButtonStyle.Link)
        .setURL(item.url)
    );
    components.push(row);
  }

  return { embeds: [embed], components };
}

module.exports = { buildNotificationEmbed };
