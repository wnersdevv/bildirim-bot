'use strict';

const notificationLogRepo = require('../database/repositories/notificationLogRepo');
const { buildNotificationKey } = require('../utils/ids');
const { CacheManager } = require('../core/cacheManager');

// DB'ye ek olarak kisa sureli bellek ici cache: ayni tick icinde cift kontrolu onler.
const recentCache = new CacheManager();

async function isDuplicate(params) {
  const key = buildNotificationKey(params);

  if (recentCache.has(key)) return true;

  const existsInDb = await notificationLogRepo.existsForKey(key);
  if (existsInDb) {
    recentCache.set(key, true, 10 * 60 * 1000);
    return true;
  }

  return false;
}

function markSeen(params) {
  const key = buildNotificationKey(params);
  recentCache.set(key, true, 10 * 60 * 1000);
  return key;
}

module.exports = { isDuplicate, markSeen };
