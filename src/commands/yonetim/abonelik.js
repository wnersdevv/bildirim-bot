'use strict';

const { SlashCommandBuilder } = require('discord.js');
const subscriptionService = require('../../services/subscriptionService');
const sourceRepo = require('../../database/repositories/sourceRepo');

const data = new SlashCommandBuilder()
  .setName('abonelik')
  .setDescription('Abonelik yönetimi')
  .addSubcommand((sub) =>
    sub
      .setName('iptal')
      .setDescription('Bir kaynaktaki aboneliği iptal eder')
      .addStringOption((opt) => opt.setName('kaynak-id').setDescription('Kaynak ID').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('liste').setDescription('Tüm aboneliklerinizi listeler'));

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'iptal') {
    const sourceId = interaction.options.getString('kaynak-id');
    await subscriptionService.unsubscribe(interaction.guildId, interaction.user.id, sourceId);
    return interaction.reply({ content: '✅ Abonelik iptal edildi.', ephemeral: true });
  }

  if (sub === 'liste') {
    const record = await subscriptionService.listForUser(interaction.guildId, interaction.user.id);
    if (!record.sources || record.sources.length === 0) {
      return interaction.reply({ content: 'Aktif aboneliğiniz bulunmuyor.', ephemeral: true });
    }
    const lines = [];
    for (const sourceId of record.sources) {
      // eslint-disable-next-line no-await-in-loop
      const source = await sourceRepo.findById(sourceId).catch(() => null);
      if (source) lines.push(`• \`${sourceId}\` — ${source.platform}/${source.sourceName}`);
    }
    return interaction.reply({ content: lines.join('\n') || 'Bulunamadı.', ephemeral: true });
  }

  return interaction.reply({ content: 'Bilinmeyen alt komut.', ephemeral: true });
}

module.exports = { data, execute };
