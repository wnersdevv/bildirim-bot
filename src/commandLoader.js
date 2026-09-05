'use strict';

const fs = require('fs');
const path = require('path');
const { makeLogger } = require('./core/logger');

const logger = makeLogger('CommandLoader');

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const collection = new Map();

  const groups = fs.readdirSync(commandsPath).filter((f) => fs.statSync(path.join(commandsPath, f)).isDirectory());

  for (const group of groups) {
    const groupPath = path.join(commandsPath, group);
    const files = fs.readdirSync(groupPath).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const command = require(path.join(groupPath, file));
      if (!command.data || !command.execute) {
        logger.warn(`Gecersiz komut dosyasi atlandi: ${group}/${file}`);
        continue;
      }
      collection.set(command.data.name, command);
    }
  }

  logger.info(`${collection.size} komut yuklendi.`);
  return collection;
}

module.exports = { loadCommands };
