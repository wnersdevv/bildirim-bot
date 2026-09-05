'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const tiktokService = require('../../services/tiktokService');

const data = new SlashCommandBuilder()
  .setName('tiktok')
  .setDescription('tiktok entegrasyon durumu')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName('durum').setDescription('tiktok entegrasyon durumunu gösterir'));

async function execute(interaction) {
  const health = await tiktokService.healthCheck();
  return interaction.reply({
    content: `📡 tiktok durumu: **${health.status}**${health.error ? ` — ${health.error}` : ''}`,
    ephemeral: true
  });
}

module.exports = { data, execute };
