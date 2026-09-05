'use strict';

const NotificationLog = require('../models/NotificationLog');
const connection = require('../connection');

async function create(entry) {
  if (!connection.isHealthy()) return null; // DB yoksa loglama sessizce atlanir, bot cokmez
  return NotificationLog.create(entry);
}

async function existsForKey(notificationKey) {
  if (!connection.isHealthy()) return false;
  const found = await NotificationLog.findOne({
    notificationKey,
    status: { $in: ['SENT', 'QUEUED', 'PROCESSING'] }
  });
  return Boolean(found);
}

async function listRecent(guildId, limit = 20) {
  if (!connection.isHealthy()) return [];
  return NotificationLog.find({ guildId }).sort({ createdAt: -1 }).limit(limit);
}

async function cleanupOlderThan(days) {
  if (!connection.isHealthy() || !days) return { deletedCount: 0 };
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return NotificationLog.deleteMany({ createdAt: { $lt: cutoff } });
}

module.exports = { create, existsForKey, listRecent, cleanupOlderThan };
