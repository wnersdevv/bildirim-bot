'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const instagramService = require('../../services/instagramService');

const data = new SlashCommandBuilder()
  .setName('instagram')
  .setDescription('instagram entegrasyon durumu')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName('durum').setDescription('instagram entegrasyon durumunu gösterir'));

async function execute(interaction) {
  const health = await instagramService.healthCheck();
  return interaction.reply({
    content: `📡 instagram durumu: **${health.status}**${health.error ? ` — ${health.error}` : ''}`,
    ephemeral: true
  });
}

module.exports = { data, execute };
