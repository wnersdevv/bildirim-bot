'use strict';

const AuditLog = require('../models/AuditLog');
const connection = require('../connection');

async function record(entry) {
  if (!connection.isHealthy()) return null; // DB yoksa audit sessizce atlanir
  return AuditLog.create(entry);
}

async function listRecent(guildId, limit = 20) {
  if (!connection.isHealthy()) return [];
  return AuditLog.find({ guildId }).sort({ createdAt: -1 }).limit(limit);
}

module.exports = { record, listRecent };
