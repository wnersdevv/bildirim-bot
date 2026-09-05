'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const sourceRepo = require('../../database/repositories/sourceRepo');
const twitchService = require('../../services/twitchService');
const guildSettingsRepo = require('../../database/repositories/guildSettingsRepo');
const auditService = require('../../services/auditService');
const permissionManager = require('../../core/permissionManager');
const notificationScanner = require('../../jobs/notificationScanner');

const data = new SlashCommandBuilder()
  .setName('twitch')
  .setDescription('Twitch bildirim kaynağı yönetimi')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('ekle')
      .setDescription('Twitch kanalı ekler')
      .addStringOption((opt) => opt.setName('kullanici').setDescription('Twitch kullanıcı adı veya URL').setRequired(true))
      .addChannelOption((opt) => opt.setName('bildirim-kanali').setDescription('Bu kaynağa özel bildirim kanalı').addChannelTypes(ChannelType.GuildText))
  )
  .addSubcommand((sub) =>
    sub
      .setName('sil')
      .setDescription('Bir Twitch kaynağını siler')
      .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('liste').setDescription('Eklenmiş Twitch kaynaklarını listeler'))
  .addSubcommand((sub) =>
    sub
      .setName('duzenle')
      .setDescription('Bir kaynağın ayarlarını günceller')
      .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID').setRequired(true))
      .addChannelOption((opt) => opt.setName('bildirim-kanali').setDescription('Yeni bildirim kanalı').addChannelTypes(ChannelType.GuildText))
      .addBooleanOption((opt) => opt.setName('etkin').setDescription('Kaynağı etkinleştir/devre dışı bırak'))
  )
  .addSubcommand((sub) => sub.setName('tara').setDescription('Twitch kaynaklarını manuel tarar'))
  .addSubcommand((sub) =>
    sub.setName('test').setDescription('Bir Twitch kaynağı için test bildirimi gönderir')
      .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('durum').setDescription('Twitch entegrasyon durumunu gösterir'));

async function execute(interaction, context) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));

  if (!permissionManager.hasAtLeast(interaction, guildSettings, 'MODERATOR')) {
    return interaction.reply({ content: '⛔ Bu işlem için yetkiniz yok.', ephemeral: true });
  }

  if (!twitchService.isConfigured()) {
    return interaction.reply({
      content: '⚫ Twitch entegrasyonu yapılandırılmamış (UNCONFIGURED). ayarlar.json içinde clientId/clientSecret tanımlayın.',
      ephemeral: true
    });
  }

  try {
    switch (sub) {
      case 'ekle': {
        await interaction.deferReply({ ephemeral: true });
        const input = interaction.options.getString('kullanici');
        const channelOpt = interaction.options.getChannel('bildirim-kanali');
        const resolved = await twitchService.resolveUser(input);

        const existing = await sourceRepo.findSource(guildId, 'twitch', resolved.userId);
        if (existing) return interaction.editReply({ content: '⚠️ Bu kullanıcı zaten eklenmiş.' });

        const source = await sourceRepo.addSource({
          guildId,
          platform: 'twitch',
          sourceId: resolved.userId,
          sourceName: resolved.displayName,
          sourceUrl: `https://twitch.tv/${resolved.login}`,
          notificationSettings: { channelId: channelOpt?.id || '' },
          lastState: { isLive: false },
          syncStatus: 'MONITORING'
        });

        await auditService.log({ guildId, userId: interaction.user.id, action: 'twitch_ekle', target: resolved.userId });
        return interaction.editReply({ content: `✅ **${resolved.displayName}** eklendi. (ID: \`${source._id}\`)` });
      }
      case 'sil': {
        const id = interaction.options.getString('kanal-id');
        const source = await sourceRepo.findById(id).catch(() => null);
        if (!source || source.guildId !== guildId) return interaction.reply({ content: '⚠️ Kaynak bulunamadı.', ephemeral: true });
        await sourceRepo.removeSource(id);
        await auditService.log({ guildId, userId: interaction.user.id, action: 'twitch_sil', target: id });
        return interaction.reply({ content: '✅ Kaynak silindi.', ephemeral: true });
      }
      case 'liste': {
        const sources = await sourceRepo.listSources(guildId, 'twitch');
        if (sources.length === 0) return interaction.reply({ content: 'Henüz Twitch kaynağı eklenmemiş.', ephemeral: true });
        const lines = sources.map((s) => `• \`${s._id}\` — **${s.sourceName}** (${s.status})`);
        return interaction.reply({ content: lines.join('\n').slice(0, 1900), ephemeral: true });
      }
      case 'duzenle': {
        const id = interaction.options.getString('kanal-id');
        const patch = {};
        const newChannel = interaction.options.getChannel('bildirim-kanali');
        const enabled = interaction.options.getBoolean('etkin');
        if (newChannel) patch['notificationSettings.channelId'] = newChannel.id;
        if (enabled !== null) patch.enabled = enabled;
        const source = await sourceRepo.updateSource(id, patch);
        if (!source) return interaction.reply({ content: '⚠️ Kaynak bulunamadı.', ephemeral: true });
        await auditService.log({ guildId, userId: interaction.user.id, action: 'twitch_duzenle', target: id, after: patch });
        return interaction.reply({ content: '✅ Kaynak güncellendi.', ephemeral: true });
      }
      case 'tara': {
        await interaction.deferReply({ ephemeral: true });
        const result = await notificationScanner.runManual('twitch', interaction.client, context.queueManager);
        return interaction.editReply({ content: `✅ Tarama tamamlandı: ${JSON.stringify(result)}` });
      }
      case 'test': {
        const id = interaction.options.getString('kanal-id');
        const source = await sourceRepo.findById(id).catch(() => null);
        if (!source) return interaction.reply({ content: '⚠️ Kaynak bulunamadı.', ephemeral: true });
        const targetChannelId = source.notificationSettings?.channelId || guildSettings.defaultChannelId;
        if (!targetChannelId) return interaction.reply({ content: '⚠️ Bildirim kanalı tanımlı değil.', ephemeral: true });
        const channel = await interaction.client.channels.fetch(targetChannelId);
        await channel.send({ content: `🧪 **${source.sourceName}** için test bildirimi.` });
        return interaction.reply({ content: '✅ Test bildirimi gönderildi.', ephemeral: true });
      }
      case 'durum': {
        const health = await twitchService.healthCheck();
        return interaction.reply({ content: `📡 Twitch durumu: **${health.status}**${health.error ? ` — ${health.error}` : ''}`, ephemeral: true });
      }
      default:
        return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
    }
  } catch (err) {
    return interaction.reply({ content: `❌ Hata: ${err.message}`, ephemeral: true }).catch(() => {});
  }
}

module.exports = { data, execute };
