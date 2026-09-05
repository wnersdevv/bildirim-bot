'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { STEPS } = require('../../core/wizardSession');

const STEP_TITLES = {
  bildirim: '1️⃣ Bildirim Sistemi',
  kanal: '2️⃣ Kanal Seçimi',
  rol: '3️⃣ Mention Rolü',
  platform: '4️⃣ Platform Seçimi',
  kaynak: '5️⃣ Kaynak Ekleme',
  dm: '6️⃣ DM Bildirimleri',
  mention: '7️⃣ Mention Ayarı',
  test: '8️⃣ Test Bildirimi'
};

const STEP_DESCRIPTIONS = {
  bildirim: 'Bildirim sistemini bu sunucu için etkinleştirmek ister misiniz?',
  kanal: 'Bildirimlerin gönderileceği varsayılan kanalı seçin.',
  rol: 'Bildirimlerde etiketlenecek rolü seçin (isteğe bağlı, atlanabilir).',
  platform: 'İzlemek istediğiniz platformları seçin.',
  kaynak: 'Kaynak ekleme işlemini ilgili platform komutlarıyla (örn. /youtube ekle) tamamlayabilirsiniz.',
  dm: 'Kullanıcılara DM bildirimleri gönderilsin mi?',
  mention: 'Varsayılan mention davranışını seçin.',
  test: 'Kurulumu tamamlamak için bir test bildirimi gönderebilirsiniz.'
};

function buildNavRow(stepIndex) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wizard:back')
      .setLabel('◀️ Geri')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(stepIndex === 0),
    new ButtonBuilder().setCustomId('wizard:cancel').setLabel('✖️ İptal').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('wizard:next')
      .setLabel(stepIndex === STEPS.length - 1 ? '✅ Bitir' : 'İleri ▶️')
      .setStyle(ButtonStyle.Success)
  );
}

function buildWizardPanel(step, stepIndex) {
  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${STEP_TITLES[step]}\n${STEP_DESCRIPTIONS[step]}`)
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  if (step === 'bildirim') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wizard:bildirim:on').setLabel('Etkinleştir').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('wizard:bildirim:off').setLabel('Devre Dışı').setStyle(ButtonStyle.Secondary)
      )
    );
  } else if (step === 'kanal') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('wizard:kanal:select')
          .setPlaceholder('Bir metin kanalı seçin')
          .addChannelTypes(ChannelType.GuildText)
      )
    );
  } else if (step === 'rol') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('wizard:rol:select').setPlaceholder('Bir rol seçin (isteğe bağlı)')
      )
    );
  } else if (step === 'platform') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('wizard:platform:select')
          .setPlaceholder('Platformları seçin')
          .setMinValues(0)
          .setMaxValues(5)
          .addOptions(
            { label: 'YouTube', value: 'youtube', emoji: '▶️' },
            { label: 'Twitch', value: 'twitch', emoji: '🎮' },
            { label: 'TikTok', value: 'tiktok', emoji: '🎵' },
            { label: 'Instagram', value: 'instagram', emoji: '📷' },
            { label: 'X', value: 'x', emoji: '✖️' }
          )
      )
    );
  } else if (step === 'dm') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wizard:dm:on').setLabel('DM Açık').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('wizard:dm:off').setLabel('DM Kapalı').setStyle(ButtonStyle.Secondary)
      )
    );
  } else if (step === 'mention') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wizard:mention:role').setLabel('Sadece Rol').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('wizard:mention:none').setLabel('Mention Yok').setStyle(ButtonStyle.Secondary)
      )
    );
  } else if (step === 'test') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wizard:test:send').setLabel('🧪 Test Bildirimi Gönder').setStyle(ButtonStyle.Primary)
      )
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addActionRowComponents(buildNavRow(stepIndex));

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { buildWizardPanel };
