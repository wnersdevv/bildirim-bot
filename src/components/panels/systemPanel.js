'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const { formatNumber } = require('../../utils/formatters');

const STATUS_ICON = {
  ENABLED: '🟢',
  DISABLED: '⚪',
  UNCONFIGURED: '⚫',
  RATE_LIMITED: '🟠',
  API_ERROR: '🔴',
  MAINTENANCE: '🛠️'
};

/**
 * /sistem durum ve Sistem Paneli icin Components V2 goruntusu.
 * status: healthService.getStatus() ciktisi.
 */
function buildSystemPanel(status) {
  const lines = [
    '# ⚙️ Sistem Paneli',
    `**Bot:** ${status.bot.ready ? '🟢 Çevrimiçi' : '🔴 Bağlı değil'} | Ping: ${status.bot.ping ?? '-'}ms | Sunucu: ${status.bot.guildCount}`,
    `**MongoDB:** ${status.mongo.healthy ? '🟢 Bağlı' : status.mongo.configured ? '🔴 Bağlantı yok' : '⚫ Yapılandırılmamış'}`,
    `**Kuyruk:** ${status.queue.size} bekleyen görev`,
    `**Bugünkü bildirim:** ${formatNumber(status.dailyStats.notificationsSent)} | Hata: ${formatNumber(status.dailyStats.errors)}`
  ];

  const platformLines = status.platforms.map(
    (p) => `${STATUS_ICON[p.status] || '❔'} **${p.platform.toUpperCase()}**: ${p.status}${p.lastError ? ` — ${p.lastError.slice(0, 80)}` : ''}`
  );

  const killLines = Object.entries(status.killSwitches).map(
    ([name, enabled]) => `${enabled ? '✅' : '⛔'} ${name}`
  );

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(['## Platformlar', ...platformLines].join('\n'))
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(['## Kill Switch Durumu', ...killLines].join('\n'))
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('system:refresh').setLabel('🔄 Yenile').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('system:killswitch').setLabel('🛑 Kill Switch').setStyle(ButtonStyle.Danger)
      )
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildSystemPanel };
