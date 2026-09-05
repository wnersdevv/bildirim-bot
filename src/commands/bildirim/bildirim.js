'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const guildSettingsRepo = require('../../database/repositories/guildSettingsRepo');
const notificationLogRepo = require('../../database/repositories/notificationLogRepo');
const auditService = require('../../services/auditService');
const permissionManager = require('../../core/permissionManager');
const notificationScanner = require('../../jobs/notificationScanner');
const { buildWelcomePanel } = require('../../components/panels/setupPanel');
const { isValidDiscordId } = require('../../utils/validators');

const data = new SlashCommandBuilder()
  .setName('bildirim')
  .setDescription('Bildirim sistemi yönetimi')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName('kur').setDescription('Kurulum panelini gösterir'))
  .addSubcommand((sub) => sub.setName('ac').setDescription('Bildirim sistemini bu sunucuda etkinleştirir'))
  .addSubcommand((sub) => sub.setName('kapat').setDescription('Bildirim sistemini bu sunucuda devre dışı bırakır'))
  .addSubcommand((sub) =>
    sub
      .setName('kanal')
      .setDescription('Varsayılan bildirim kanalını ayarlar')
      .addChannelOption((opt) =>
        opt.setName('kanal').setDescription('Hedef kanal').addChannelTypes(ChannelType.GuildText).setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('dm')
      .setDescription('DM bildirimlerini açar/kapatır')
      .addStringOption((opt) =>
        opt
          .setName('durum')
          .setDescription('aç veya kapat')
          .setRequired(true)
          .addChoices({ name: 'aç', value: 'ac' }, { name: 'kapat', value: 'kapat' })
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('rol')
      .setDescription('Varsayılan mention rolünü ayarlar')
      .addRoleOption((opt) => opt.setName('rol').setDescription('Mention rolü').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('test').setDescription('Test bildirimi gönderir'))
  .addSubcommand((sub) =>
    sub
      .setName('tara')
      .setDescription('Manuel tarama başlatır')
      .addStringOption((opt) =>
        opt
          .setName('platform')
          .setDescription('Taranacak platform')
          .setRequired(true)
          .addChoices(
            { name: 'youtube', value: 'youtube' },
            { name: 'twitch', value: 'twitch' },
            { name: 'tiktok', value: 'tiktok' },
            { name: 'instagram', value: 'instagram' },
            { name: 'x', value: 'x' }
          )
      )
  )
  .addSubcommand((sub) => sub.setName('liste').setDescription('Sunucudaki kaynakları listeler'))
  .addSubcommand((sub) => sub.setName('gecmis').setDescription('Son bildirim geçmişini gösterir'))
  .addSubcommand((sub) => sub.setName('istatistik').setDescription('Bildirim istatistiklerini gösterir'));

async function execute(interaction, context) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));

  if (!permissionManager.hasAtLeast(interaction, guildSettings, 'MODERATOR') && sub !== 'test') {
    return interaction.reply({ content: '⛔ Bu işlem için yetkiniz yok.', ephemeral: true });
  }

  switch (sub) {
    case 'kur': {
      const panel = buildWelcomePanel();
      return interaction.reply({ ...panel, ephemeral: false });
    }
    case 'ac': {
      await guildSettingsRepo.update(guildId, { enabled: true });
      await auditService.log({ guildId, userId: interaction.user.id, action: 'bildirim_ac', result: 'SUCCESS' });
      return interaction.reply({ content: '✅ Bildirim sistemi etkinleştirildi.', ephemeral: true });
    }
    case 'kapat': {
      await guildSettingsRepo.update(guildId, { enabled: false });
      await auditService.log({ guildId, userId: interaction.user.id, action: 'bildirim_kapat', result: 'SUCCESS' });
      return interaction.reply({ content: '✅ Bildirim sistemi devre dışı bırakıldı.', ephemeral: true });
    }
    case 'kanal': {
      const channel = interaction.options.getChannel('kanal');
      await guildSettingsRepo.update(guildId, { defaultChannelId: channel.id });
      await auditService.log({
        guildId, userId: interaction.user.id, action: 'kanal_ayarla', target: channel.id, result: 'SUCCESS'
      });
      return interaction.reply({ content: `✅ Varsayılan bildirim kanalı ${channel} olarak ayarlandı.`, ephemeral: true });
    }
    case 'dm': {
      const enabled = interaction.options.getString('durum') === 'ac';
      await guildSettingsRepo.update(guildId, { dmNotifications: enabled });
      await auditService.log({ guildId, userId: interaction.user.id, action: 'dm_ayarla', after: enabled });
      return interaction.reply({ content: `✅ DM bildirimleri ${enabled ? 'açıldı' : 'kapatıldı'}.`, ephemeral: true });
    }
    case 'rol': {
      const role = interaction.options.getRole('rol');
      await guildSettingsRepo.update(guildId, { defaultRoleId: role.id });
      await auditService.log({ guildId, userId: interaction.user.id, action: 'rol_ayarla', target: role.id });
      return interaction.reply({ content: `✅ Varsayılan mention rolü ${role} olarak ayarlandı.`, ephemeral: true });
    }
    case 'test': {
      if (!guildSettings.defaultChannelId) {
        return interaction.reply({ content: '⚠️ Önce bir bildirim kanalı ayarlamalısınız (/bildirim kanal).', ephemeral: true });
      }
      try {
        const channel = await interaction.client.channels.fetch(guildSettings.defaultChannelId);
        await channel.send({ content: `🧪 Test bildirimi — WNERSDEV Bildirim Botu çalışıyor. (Tetikleyen: ${interaction.user.tag})` });
        return interaction.reply({ content: '✅ Test bildirimi gönderildi.', ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: `❌ Test bildirimi gönderilemedi: ${err.message}`, ephemeral: true });
      }
    }
    case 'tara': {
      const platform = interaction.options.getString('platform');
      await interaction.deferReply({ ephemeral: true });
      try {
        const result = await notificationScanner.runManual(platform, interaction.client, context.queueManager);
        return interaction.editReply({
          content: `✅ ${platform} taraması tamamlandı: ${JSON.stringify(result)}`
        });
      } catch (err) {
        return interaction.editReply({ content: `❌ Tarama başarısız: ${err.message}` });
      }
    }
    case 'liste': {
      const sourceRepo = require('../../database/repositories/sourceRepo');
      try {
        const sources = await sourceRepo.listSources(guildId);
        if (sources.length === 0) return interaction.reply({ content: 'Henüz kaynak eklenmemiş.', ephemeral: true });
        const lines = sources.map((s) => `• **${s.platform}** — ${s.sourceName || s.sourceId} (${s.status})`);
        return interaction.reply({ content: lines.join('\n').slice(0, 1900), ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: `⚠️ Kaynaklar listelenemedi: ${err.message}`, ephemeral: true });
      }
    }
    case 'gecmis': {
      const logs = await notificationLogRepo.listRecent(guildId, 10);
      if (logs.length === 0) return interaction.reply({ content: 'Bildirim geçmişi bulunamadı.', ephemeral: true });
      const lines = logs.map(
        (l) => `• [${l.status}] ${l.platform}/${l.eventType} — <t:${Math.floor(new Date(l.createdAt).getTime() / 1000)}:R>`
      );
      return interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }
    case 'istatistik': {
      const stateManager = require('../../core/stateManager');
      const stats = stateManager.getDailyStats();
      return interaction.reply({
        content: `📊 Bugün gönderilen bildirim: **${stats.notificationsSent}**\nHata sayısı: **${stats.errors}**`,
        ephemeral: true
      });
    }
    default:
      return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
  }
}

module.exports = { data, execute };
