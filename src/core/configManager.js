'use strict';

const fs = require('fs');
const path = require('path');
const { DEFAULTS, deepMerge } = require('../config/defaults');
const { makeLogger } = require('./logger');

const logger = makeLogger('ConfigManager');
const CONFIG_PATH = path.join(process.cwd(), 'ayarlar.json');

let currentConfig = null;

function readRawConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `ayarlar.json bulunamadi (${CONFIG_PATH}). ayarlar.example.json dosyasini kopyalayip ayarlar.json olarak duzenleyin.`
    );
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`ayarlar.json gecersiz JSON icermektedir: ${err.message}`);
  }
}

/**
 * Config uzerinde temel semantik dogrulama yapar.
 * Kritik alanlar (token/clientId/mongoUri) eksikse bot COKMEZ,
 * ilgili ozellikler UNCONFIGURED olarak isaretlenir; sadece uyari loglanir.
 */
function validate(config) {
  const warnings = [];

  if (!config.token) warnings.push('token bos: bot Discord\'a baglanamayacak.');
  if (!config.clientId) warnings.push('clientId bos: slash command kaydi yapilamayacak.');
  if (!config.mongoUri) warnings.push('mongoUri bos: veritabani ozellikleri devre disi kalacak.');

  const yt = config.notifications?.platforms?.youtube;
  if (yt?.enabled && !yt?.apiKey) {
    warnings.push('YouTube etkin ancak apiKey bos: YouTube UNCONFIGURED olacak.');
  }

  const tw = config.notifications?.platforms?.twitch;
  if (tw?.enabled && (!tw?.clientId || !tw?.clientSecret)) {
    warnings.push('Twitch etkin ancak clientId/clientSecret eksik: Twitch UNCONFIGURED olacak.');
  }

  for (const w of warnings) logger.warn(w);
  return warnings;
}

function load() {
  const raw = readRawConfig();
  const merged = deepMerge(DEFAULTS, raw);
  validate(merged);
  currentConfig = merged;
  logger.info('Config yuklendi.');
  return currentConfig;
}

/**
 * /sistem config-yenile icin: gecersiz config yuklenirse
 * calisan (eski) config korunur, hata firlatilir.
 */
function reload() {
  try {
    const raw = readRawConfig();
    const merged = deepMerge(DEFAULTS, raw);
    validate(merged);
    currentConfig = merged;
    logger.info('Config yeniden yuklendi.');
    return { success: true, config: currentConfig };
  } catch (err) {
    logger.error('Config yenileme basarisiz, eski config korunuyor.', { error: err.message });
    return { success: false, error: err.message };
  }
}

function get() {
  if (!currentConfig) {
    return load();
  }
  return currentConfig;
}

module.exports = { load, reload, get, CONFIG_PATH };
