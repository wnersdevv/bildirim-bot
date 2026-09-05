'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const healthService = require('../../services/healthService');
const { buildSystemPanel } = require('../../components/panels/systemPanel');
const configManager = require('../../core/configManager');
const stateManager = require('../../core/stateManager');
const permissionManager = require('../../core/permissionManager');
const auditService = require('../../services/auditService');
const guildSettingsRepo = require('../../database/repositories/guildSettingsRepo');

const data = new SlashCommandBuilder()
  .setName('sistem')
  .setDescription('Sistem yönetimi (OWNER)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName('durum').setDescription('Sistem panelini gösterir'))
  .addSubcommand((sub) => sub.setName('istatistik').setDescription('Günlük istatistikleri gösterir'))
  .addSubcommand((sub) => sub.setName('config-yenile').setDescription('ayarlar.json dosyasını yeniden yükler'))
  .addSubcommand((sub) =>
    sub
      .setName('bakim')
      .setDescription('Bakım modunu açar/kapatır')
      .addStringOption((opt) =>
        opt.setName('durum').setDescription('aç/kapat').setRequired(true).addChoices(
          { name: 'aç', value: 'ac' },
          { name: 'kapat', value: 'kapat' }
        )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('kill-switch')
      .setDescription('Belirli bir alt sistemi kapatır/açar')
      .addStringOption((opt) =>
        opt
          .setName('sistem')
          .setDescription('Kapatılacak/açılacak alt sistem')
          .setRequired(true)
          .addChoices(
            { name: 'otomatik-tarama', value: 'autoScan' },
            { name: 'kanal-bildirimi', value: 'channelNotifications' },
            { name: 'dm', value: 'dm' },
            { name: 'mention', value: 'mention' },
            { name: 'scheduler', value: 'scheduler' }
          )
      )
      .addBooleanOption((opt) => opt.setName('etkin').setDescription('true=aç, false=kapat').setRequired(true))
  );

async function execute(interaction, context) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));

  const requiredLevel = ['config-yenile', 'kill-switch', 'bakim'].includes(sub) ? 'OWNER' : 'ADMIN';
  if (!permissionManager.hasAtLeast(interaction, guildSettings, requiredLevel)) {
    return interaction.reply({ content: `⛔ Bu işlem için en az ${requiredLevel} yetkisi gerekir.`, ephemeral: true });
  }

  switch (sub) {
    case 'durum': {
      const status = await healthService.getStatus(interaction.client, context.queueManager);
      const panel = buildSystemPanel(status);
      return interaction.reply({ ...panel, ephemeral: true });
    }
    case 'istatistik': {
      const stats = stateManager.getDailyStats();
      return interaction.reply({
        content: `📊 Bugün gönderilen: **${stats.notificationsSent}**\nHata: **${stats.errors}**`,
        ephemeral: true
      });
    }
    case 'config-yenile': {
      const result = configManager.reload();
      await auditService.log({ guildId, userId: interaction.user.id, action: 'config_yenile', result: result.success ? 'SUCCESS' : 'FAILED' });
      return interaction.reply({
        content: result.success ? '✅ Config yeniden yüklendi.' : `❌ Config yenileme başarısız, eski config korunuyor: ${result.error}`,
        ephemeral: true
      });
    }
    case 'bakim': {
      const enabled = interaction.options.getString('durum') === 'ac';
      stateManager.setKillSwitch('autoScan', !enabled);
      await auditService.log({ guildId, userId: interaction.user.id, action: 'bakim_modu', after: enabled });
      return interaction.reply({ content: `✅ Bakım modu ${enabled ? 'açıldı (tarama durdu)' : 'kapatıldı'}.`, ephemeral: true });
    }
    case 'kill-switch': {
      const name = interaction.options.getString('sistem');
      const enabled = interaction.options.getBoolean('etkin');
      stateManager.setKillSwitch(name, enabled);
      await auditService.log({ guildId, userId: interaction.user.id, action: 'kill_switch', target: name, after: enabled });
      return interaction.reply({ content: `✅ **${name}** ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`, ephemeral: true });
    }
    default:
      return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
  }
}

module.exports = { data, execute };
