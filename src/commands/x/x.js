'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const xService = require('../../services/xService');

const data = new SlashCommandBuilder()
  .setName('x')
  .setDescription('x entegrasyon durumu')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName('durum').setDescription('x entegrasyon durumunu gösterir'));

async function execute(interaction) {
  const health = await xService.healthCheck();
  return interaction.reply({
    content: `📡 x durumu: **${health.status}**${health.error ? ` — ${health.error}` : ''}`,
    ephemeral: true
  });
}

module.exports = { data, execute };
