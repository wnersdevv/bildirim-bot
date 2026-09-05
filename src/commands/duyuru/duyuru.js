'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const announcementService = require('../../services/announcementService');
const guildSettingsRepo = require('../../database/repositories/guildSettingsRepo');
const permissionManager = require('../../core/permissionManager');
const auditService = require('../../services/auditService');
const { sanitizeText } = require('../../utils/security');
const { isValidIsoDate } = require('../../utils/validators');

const data = new SlashCommandBuilder()
  .setName('duyuru')
  .setDescription('Duyuru yönetimi')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('gonder')
      .setDescription('Duyuruyu hemen gönderir')
      .addStringOption((opt) => opt.setName('icerik').setDescription('Duyuru metni').setRequired(true))
      .addChannelOption((opt) => opt.setName('kanal').setDescription('Hedef kanal').addChannelTypes(ChannelType.GuildText))
      .addStringOption((opt) =>
        opt.setName('mention').setDescription('Mention türü').addChoices(
          { name: 'yok', value: 'none' },
          { name: 'here', value: 'here' },
          { name: 'everyone', value: 'everyone' },
          { name: 'rol', value: 'role' }
        )
      )
      .addRoleOption((opt) => opt.setName('rol').setDescription('Mention rolü (mention=rol seçiliyse)'))
  )
  .addSubcommand((sub) =>
    sub
      .setName('planla')
      .setDescription('Duyuruyu ileri bir tarihte gönderir')
      .addStringOption((opt) => opt.setName('icerik').setDescription('Duyuru metni').setRequired(true))
      .addStringOption((opt) => opt.setName('tarih').setDescription('ISO 8601 tarih (örn. 2026-09-10T18:00:00)').setRequired(true))
      .addChannelOption((opt) => opt.setName('kanal').setDescription('Hedef kanal').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((opt) =>
        opt.setName('tekrar').setDescription('Tekrarlama sıklığı').addChoices(
          { name: 'yok', value: 'none' },
          { name: 'günlük', value: 'daily' },
          { name: 'haftalık', value: 'weekly' },
          { name: 'aylık', value: 'monthly' }
        )
      )
  )
  .addSubcommand((sub) => sub.setName('liste').setDescription('Planlı duyuruları listeler'))
  .addSubcommand((sub) =>
    sub
      .setName('iptal')
      .setDescription('Planlı bir duyuruyu iptal eder')
      .addStringOption((opt) => opt.setName('id').setDescription('Duyuru ID').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('test')
      .setDescription('Test amaçlı örnek duyuru gönderir')
      .addChannelOption((opt) => opt.setName('kanal').setDescription('Hedef kanal').addChannelTypes(ChannelType.GuildText))
  )
  .addSubcommand((sub) =>
    sub
      .setName('acil')
      .setDescription('Acil duyuru gönderir (sadece OWNER)')
      .addStringOption((opt) => opt.setName('icerik').setDescription('Duyuru metni').setRequired(true))
      .addChannelOption((opt) => opt.setName('kanal').setDescription('Hedef kanal').addChannelTypes(ChannelType.GuildText).setRequired(true))
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));

  const requiredLevel = sub === 'acil' ? 'OWNER' : 'ADMIN';
  if (!permissionManager.hasAtLeast(interaction, guildSettings, requiredLevel)) {
    return interaction.reply({ content: `⛔ Bu işlem için en az ${requiredLevel} yetkisi gerekir.`, ephemeral: true });
  }

  try {
    if (sub === 'gonder' || sub === 'test' || sub === 'acil') {
      const content = sub === 'test'
        ? '🧪 Bu bir test duyurusudur. WNERSDEV Bildirim Botu düzgün çalışıyor.'
        : sanitizeText(interaction.options.getString('icerik'));
      const channelOpt = interaction.options.getChannel('kanal');
      const channelId = channelOpt?.id || guildSettings.defaultChannelId;
      if (!channelId) return interaction.reply({ content: '⚠️ Hedef kanal belirtilmedi ve varsayılan kanal ayarlı değil.', ephemeral: true });

      let mentionType = sub === 'acil' ? 'here' : interaction.options.getString('mention') || 'none';
      const role = interaction.options.getRole('rol');

      if ((mentionType === 'everyone') && !permissionManager.hasAtLeast(interaction, guildSettings, 'OWNER')) {
        return interaction.reply({ content: '⛔ @everyone mention sadece OWNER tarafından kullanılabilir.', ephemeral: true });
      }

      const result = await announcementService.sendNow({
        client: interaction.client,
        guildId,
        authorId: interaction.user.id,
        channelId,
        content,
        mentionType,
        roleId: role?.id,
        urgent: sub === 'acil'
      });

      await auditService.log({ guildId, userId: interaction.user.id, action: `duyuru_${sub}`, target: channelId, result: result.success ? 'SUCCESS' : 'FAILED' });

      return interaction.reply({
        content: result.success ? '✅ Duyuru gönderildi.' : `❌ Duyuru gönderilemedi: ${result.error}`,
        ephemeral: true
      });
    }

    if (sub === 'planla') {
      const content = sanitizeText(interaction.options.getString('icerik'));
      const tarih = interaction.options.getString('tarih');
      const channel = interaction.options.getChannel('kanal');
      const tekrar = interaction.options.getString('tekrar') || 'none';

      if (!isValidIsoDate(tarih)) return interaction.reply({ content: '⚠️ Geçersiz tarih formatı. ISO 8601 kullanın (örn. 2026-09-10T18:00:00).', ephemeral: true });

      const scheduled = await announcementService.schedule({
        guildId,
        authorId: interaction.user.id,
        channelId: channel.id,
        content,
        scheduledAt: new Date(tarih),
        timezone: guildSettings.timezone || 'Europe/Istanbul',
        recurrence: tekrar,
        mentionType: 'none'
      });

      return interaction.reply({ content: `✅ Duyuru planlandı. (ID: \`${scheduled._id}\`)`, ephemeral: true });
    }

    if (sub === 'liste') {
      const scheduled = await announcementService.listScheduled(guildId);
      if (scheduled.length === 0) return interaction.reply({ content: 'Planlı duyuru bulunmuyor.', ephemeral: true });
      const lines = scheduled.map(
        (s) => `• \`${s._id}\` — <t:${Math.floor(new Date(s.scheduledAt).getTime() / 1000)}:F> (${s.recurrence})`
      );
      return interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }

    if (sub === 'iptal') {
      const id = interaction.options.getString('id');
      await announcementService.cancelScheduled(id);
      return interaction.reply({ content: '✅ Planlı duyuru iptal edildi.', ephemeral: true });
    }

    return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
  } catch (err) {
    return interaction.reply({ content: `❌ Hata: ${err.message}`, ephemeral: true }).catch(() => {});
  }
}

module.exports = { data, execute };
