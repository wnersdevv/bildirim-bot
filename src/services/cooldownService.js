'use strict';

const { CacheManager } = require('../core/cacheManager');

const cooldownCache = new CacheManager();

/**
 * Kaynak/olay bazinda cooldown kontrolu. true donerse gonderim yapilabilir
 * ve cooldown baslatilir; false donerse hala cooldown suresindeyiz demektir.
 */
function tryConsume(key, cooldownSeconds) {
  if (!cooldownSeconds || cooldownSeconds <= 0) return true;
  if (cooldownCache.has(key)) return false;
  cooldownCache.set(key, true, cooldownSeconds * 1000);
  return true;
}

function remainingMs(key) {
  return cooldownCache.has(key) ? 1 : 0;
}

module.exports = { tryConsume, remainingMs };
