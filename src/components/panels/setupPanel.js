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

/**
 * Bot sunucuya ilk eklendiginde gosterilen Components V2 kurulum paneli.
 * MessageFlags.IsComponentsV2 ile gonderilmelidir.
 */
function buildWelcomePanel() {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# 👋 WNERSDEV Bildirim Botuna Hoş Geldiniz\n' +
        'Bu bot; YouTube, Twitch, TikTok, Instagram ve X için bildirim, duyuru ve abonelik sistemi sunar.\n' +
        'Aşağıdaki butonlarla kuruluma başlayabilir veya bölüm bazlı ayarlara gidebilirsiniz.'
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('setup:start').setLabel('🚀 Kuruluma Başla').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('setup:youtube').setLabel('▶️ YouTube').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('setup:twitch').setLabel('🎮 Twitch').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('setup:announcement').setLabel('📢 Duyuru Ayarları').setStyle(ButtonStyle.Secondary)
      )
    );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildWelcomePanel };
