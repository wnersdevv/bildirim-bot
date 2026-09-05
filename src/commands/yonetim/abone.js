'use strict';

const { SlashCommandBuilder } = require('discord.js');
const subscriptionService = require('../../services/subscriptionService');
const sourceRepo = require('../../database/repositories/sourceRepo');

const data = new SlashCommandBuilder()
  .setName('abone')
  .setDescription('Bir kaynağa abone olun')
  .addSubcommand((sub) =>
    sub
      .setName('ol')
      .setDescription('Bir kaynağa abone olur')
      .addStringOption((opt) => opt.setName('kaynak-id').setDescription('Kaynak ID (/bildirim liste ile görebilirsiniz)').setRequired(true))
      .addBooleanOption((opt) => opt.setName('dm').setDescription('DM ile de bildirim almak ister misiniz?'))
  );

async function execute(interaction) {
  const sourceId = interaction.options.getString('kaynak-id');
  const dm = interaction.options.getBoolean('dm') || false;

  const source = await sourceRepo.findById(sourceId).catch(() => null);
  if (!source || source.guildId !== interaction.guildId) {
    return interaction.reply({ content: '⚠️ Kaynak bulunamadı.', ephemeral: true });
  }

  await subscriptionService.subscribe(interaction.guildId, interaction.user.id, sourceId, []);
  if (dm) {
    const subscriptionRepo = require('../../database/repositories/subscriptionRepo');
    await subscriptionRepo.update(interaction.guildId, interaction.user.id, { dmEnabled: true });
  }

  return interaction.reply({ content: `✅ **${source.sourceName}** kaynağına abone oldunuz.`, ephemeral: true });
}

module.exports = { data, execute };
