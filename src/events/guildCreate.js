'use strict';

const { makeLogger } = require('../core/logger');
const guildSettingsRepo = require('../database/repositories/guildSettingsRepo');
const { buildWelcomePanel } = require('../components/panels/setupPanel');

const logger = makeLogger('GuildCreateEvent');

const name = 'guildCreate';
const once = false;

async function execute(guild) {
  logger.info(`Yeni sunucuya eklendi: ${guild.name} (${guild.id})`);
  await guildSettingsRepo.getOrCreate(guild.id).catch((err) => {
    logger.debug('GuildSettings olusturulamadi (DB UNCONFIGURED olabilir).', { error: err.message });
  });

  try {
    const systemChannel = guild.systemChannel;
    if (systemChannel?.permissionsFor(guild.members.me)?.has('SendMessages')) {
      const panel = buildWelcomePanel();
      await systemChannel.send(panel);
    }
  } catch (err) {
    logger.debug('Karsilama paneli gonderilemedi.', { error: err.message });
  }
}

module.exports = { name, once, execute };
