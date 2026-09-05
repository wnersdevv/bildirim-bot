'use strict';

/**
 * WNERSDEV Bildirim Botu - Bootstrap
 * Bu dosya SADECE baslatma/bagliama (bootstrap) sorumludur.
 * Is mantigi src/services, src/core ve src/database icindedir.
 */

const { Client, GatewayIntentBits, Partials } = require('discord.js');

const configManager = require('./src/core/configManager');
const { makeLogger, setDebug } = require('./src/core/logger');
const { attachGlobalHandlers, registerAdminAlert } = require('./src/core/errorHandler');
const connection = require('./src/database/connection');
const { loadCommands } = require('./src/commandLoader');
const { QueueManager } = require('./src/core/queueManager');
const stateManager = require('./src/core/stateManager');

const logger = makeLogger('Bootstrap');

async function main() {
  attachGlobalHandlers();

  const config = configManager.load();
  setDebug(config.bot?.debug);

  if (!config.token) {
    logger.error('token tanimli degil (ayarlar.json). Bot Discord\'a baglanamayacak, cikiliyor.');
    process.exit(1);
  }

  await connection.connect(config.mongoUri);

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel]
  });

  const commands = loadCommands();
  const queueManager = new QueueManager({ concurrency: 1, intervalMs: 300 });
  const context = { commands, queueManager, config };

  registerAdminAlert(async (scope, message) => {
    const cfg = configManager.get();
    const ownerIds = cfg.ownerIds || [];
    for (const ownerId of ownerIds) {
      try {
        const user = await client.users.fetch(ownerId);
        await user.send(`🚨 **Sistem Uyarısı** [${scope}]\n${message}`);
      } catch {
        /* DM basarisizsa sessizce gec, admin alert spam yaratmasin */
      }
    }
  });

  // Events klasorunu yukle
  const fs = require('fs');
  const path = require('path');
  const eventsPath = path.join(__dirname, 'src', 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  for (const file of eventFiles) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, context));
    } else {
      client.on(event.name, (...args) => event.execute(...args, context));
    }
  }

  await client.login(config.token);

  // Graceful shutdown (item 74)
  const shutdown = async (signal) => {
    logger.info(`${signal} alindi, guvenli kapatma basliyor...`);
    try {
      const notificationScanner = require('./src/jobs/notificationScanner');
      notificationScanner.stop();
      queueManager.stop();
      await connection.disconnect();
      client.destroy();
      logger.info('Guvenli kapatma tamamlandi.');
      process.exit(0);
    } catch (err) {
      logger.error('Kapatma sirasinda hata.', { error: err.message });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Bootstrap sirasinda kritik hata.', { error: err.message, stack: err.stack });
  process.exit(1);
});
