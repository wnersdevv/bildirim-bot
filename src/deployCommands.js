'use strict';

const { REST, Routes } = require('discord.js');
const configManager = require('./core/configManager');
const { loadCommands } = require('./commandLoader');
const { makeLogger } = require('./core/logger');

const logger = makeLogger('DeployCommands');

async function main() {
  const config = configManager.load();

  if (!config.token || !config.clientId) {
    logger.error('token ve clientId ayarlar.json icinde tanimli olmadan komutlar kaydedilemez.');
    process.exit(1);
  }

  const commands = loadCommands();
  const body = [...commands.values()].map((c) => c.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    logger.info(`${body.length} slash command kaydediliyor...`);
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info('Slash command kaydi tamamlandi.');
  } catch (err) {
    logger.error('Slash command kaydi basarisiz.', { error: err.message });
    process.exit(1);
  }
}

main();
