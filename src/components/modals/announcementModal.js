'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function buildAnnouncementModal() {
  const modal = new ModalBuilder().setCustomId('modal:duyuru').setTitle('Duyuru Oluştur');

  const contentInput = new TextInputBuilder()
    .setCustomId('duyuru_icerik')
    .setLabel('Duyuru İçeriği')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(3500)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
  return modal;
}

module.exports = { buildAnnouncementModal };
