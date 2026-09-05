'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const sourceRepo = require('../../database/repositories/sourceRepo');
const youtubeService = require('../../services/youtubeService');
const guildSettingsRepo = require('../../database/repositories/guildSettingsRepo');
const auditService = require('../../services/auditService');
const permissionManager = require('../../core/permissionManager');
const notificationScanner = require('../../jobs/notificationScanner');

const data = new SlashCommandBuilder()
  .setName('youtube')
  .setDescription('YouTube bildirim kaynağı yönetimi')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('ekle')
      .setDescription('YouTube kanalı ekler')
      .addStringOption((opt) =>
        opt.setName('kanal').setDescription('Kanal ID, @handle veya kanal URL').setRequired(true)
      )
      .addChannelOption((opt) =>
        opt.setName('bildirim-kanali').setDescription('Bu kaynağa özel bildirim kanalı').addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('sil')
      .setDescription('Bir YouTube kaynağını siler')
      .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID (liste komutuyla görebilirsiniz)').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('liste').setDescription('Eklenmiş YouTube kaynaklarını listeler'))
  .addSubcommand((sub) =>
    sub
      .setName('duzenle')
      .setDescription('Bir kaynağın ayarlarını günceller')
      .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID').setRequired(true))
      .addChannelOption((opt) => opt.setName('bildirim-kanali').setDescription('Yeni bildirim kanalı').addChannelTypes(ChannelType.GuildText))
      .addBooleanOption((opt) => opt.setName('etkin').setDescription('Kaynağı etkinleştir/devre dışı bırak'))
  )
  .addSubcommand((sub) => sub.setName('tara').setDescription('YouTube kaynaklarını manuel tarar'))
  .addSubcommand((sub) => sub.setName('test').setDescription('Bir YouTube kaynağı için test bildirimi gönderir')
    .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID').setRequired(true)))
  .addSubcommand((sub) => sub.setName('durum').setDescription('YouTube entegrasyon durumunu gösterir'))
  .addSubcommand((sub) =>
    sub
      .setName('kanal')
      .setDescription('Bir kaynağın bildirim kanalını değiştirir')
      .addStringOption((opt) => opt.setName('kanal-id').setDescription('Kaynak ID').setRequired(true))
      .addChannelOption((opt) => opt.setName('yeni-kanal').setDescription('Yeni bildirim kanalı').addChannelTypes(ChannelType.GuildText).setRequired(true))
  );

async function execute(interaction, context) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));

  if (!permissionManager.hasAtLeast(interaction, guildSettings, 'MODERATOR')) {
    return interaction.reply({ content: '⛔ Bu işlem için yetkiniz yok.', ephemeral: true });
  }

  if (!youtubeService.isConfigured()) {
    return interaction.reply({
      content: '⚫ YouTube entegrasyonu yapılandırılmamış (UNCONFIGURED). ayarlar.json içinde apiKey tanımlayın.',
      ephemeral: true
    });
  }

  try {
    switch (sub) {
      case 'ekle': {
        await interaction.deferReply({ ephemeral: true });
        const input = interaction.options.getString('kanal');
        const channelOpt = interaction.options.getChannel('bildirim-kanali');
        const resolved = await youtubeService.resolveChannel(input);

        const existing = await sourceRepo.findSource(guildId, 'youtube', resolved.channelId);
        if (existing) return interaction.editReply({ content: '⚠️ Bu kanal zaten eklenmiş.' });

        const source = await sourceRepo.addSource({
          guildId,
          platform: 'youtube',
          sourceId: resolved.channelId,
          sourceName: resolved.channelName,
          sourceUrl: `https://www.youtube.com/channel/${resolved.channelId}`,
          notificationSettings: { channelId: channelOpt?.id || '' },
          syncStatus: 'INITIALIZING'
        });

        await auditService.log({ guildId, userId: interaction.user.id, action: 'youtube_ekle', target: resolved.channelId });
        return interaction.editReply({
          content: `✅ **${resolved.channelName}** eklendi. İlk tarama geçmiş içerikleri bildirmeyecek, sadece temel durumu (baseline) oluşturacaktır. (ID: \`${source._id}\`)`
        });
      }
      case 'sil': {
        const id = interaction.options.getString('kanal-id');
        const source = await sourceRepo.findById(id).catch(() => null);
        if (!source || source.guildId !== guildId) return interaction.reply({ content: '⚠️ Kaynak bulunamadı.', ephemeral: true });
        await sourceRepo.removeSource(id);
        await auditService.log({ guildId, userId: interaction.user.id, action: 'youtube_sil', target: id });
        return interaction.reply({ content: '✅ Kaynak silindi.', ephemeral: true });
      }
      case 'liste': {
        const sources = await sourceRepo.listSources(guildId, 'youtube');
        if (sources.length === 0) return interaction.reply({ content: 'Henüz YouTube kaynağı eklenmemiş.', ephemeral: true });
        const lines = sources.map((s) => `• \`${s._id}\` — **${s.sourceName}** (${s.status}, ${s.syncStatus})`);
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
        await auditService.log({ guildId, userId: interaction.user.id, action: 'youtube_duzenle', target: id, after: patch });
        return interaction.reply({ content: '✅ Kaynak güncellendi.', ephemeral: true });
      }
      case 'kanal': {
        const id = interaction.options.getString('kanal-id');
        const newChannel = interaction.options.getChannel('yeni-kanal');
        const source = await sourceRepo.updateSource(id, { 'notificationSettings.channelId': newChannel.id });
        if (!source) return interaction.reply({ content: '⚠️ Kaynak bulunamadı.', ephemeral: true });
        return interaction.reply({ content: `✅ Bildirim kanalı ${newChannel} olarak güncellendi.`, ephemeral: true });
      }
      case 'tara': {
        await interaction.deferReply({ ephemeral: true });
        const result = await notificationScanner.runManual('youtube', interaction.client, context.queueManager);
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
        const health = await youtubeService.healthCheck();
        return interaction.reply({ content: `📡 YouTube durumu: **${health.status}**${health.error ? ` — ${health.error}` : ''}`, ephemeral: true });
      }
      default:
        return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
    }
  } catch (err) {
    return interaction.reply({ content: `❌ Hata: ${err.message}`, ephemeral: true }).catch(() => {});
  }
}

module.exports = { data, execute };
