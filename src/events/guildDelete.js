'use strict';

const { makeLogger } = require('../core/logger');

const logger = makeLogger('GuildDeleteEvent');

const name = 'guildDelete';
const once = false;

async function execute(guild) {
  logger.info(`Sunucudan çıkarıldı: ${guild.name} (${guild.id}). Veriler saklanıyor (guildId izolasyonu korunur).`);
  // Not: Spec geregi veriler otomatik silinmez; istenirse /sistem veya manuel
  // temizlik ile GuildSettings/NotificationSource kayitlari kaldirilabilir.
}

module.exports = { name, once, execute };
