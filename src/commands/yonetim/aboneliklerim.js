'use strict';

const { SlashCommandBuilder } = require('discord.js');
const subscriptionService = require('../../services/subscriptionService');
const sourceRepo = require('../../database/repositories/sourceRepo');

const data = new SlashCommandBuilder().setName('aboneliklerim').setDescription('Aboneliklerinizi görüntüler');

async function execute(interaction) {
  try {
    const sub = await subscriptionService.listForUser(interaction.guildId, interaction.user.id);
    if (!sub.sources || sub.sources.length === 0) {
      return interaction.reply({ content: 'Henüz bir aboneliğiniz yok. `/abone ol` ile başlayabilirsiniz.', ephemeral: true });
    }

    const lines = [];
    for (const sourceId of sub.sources) {
      // eslint-disable-next-line no-await-in-loop
      const source = await sourceRepo.findById(sourceId).catch(() => null);
      if (source) lines.push(`• **${source.platform}** — ${source.sourceName || source.sourceId}`);
    }

    return interaction.reply({
      content: `📋 **Aboneliklerin:**\n${lines.join('\n')}\nDM bildirimleri: **${sub.dmEnabled ? 'Açık' : 'Kapalı'}**`,
      ephemeral: true
    });
  } catch (err) {
    return interaction.reply({ content: `⚠️ Abonelikler görüntülenemedi: ${err.message}`, ephemeral: true });
  }
}

module.exports = { data, execute };
