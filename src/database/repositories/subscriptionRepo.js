'use strict';

const UserSubscription = require('../models/UserSubscription');
const connection = require('../connection');

function requireDb() {
  if (!connection.isHealthy()) {
    const err = new Error('MongoDB baglantisi yok: abonelik ozelligi UNCONFIGURED durumda.');
    err.code = 'DB_UNCONFIGURED';
    throw err;
  }
}

async function getOrCreate(guildId, userId) {
  requireDb();
  let doc = await UserSubscription.findOne({ guildId, userId });
  if (!doc) doc = await UserSubscription.create({ guildId, userId });
  return doc;
}

async function update(guildId, userId, patch) {
  requireDb();
  return UserSubscription.findOneAndUpdate(
    { guildId, userId },
    { $set: patch },
    { new: true, upsert: true }
  );
}

async function listBySource(guildId, sourceId) {
  requireDb();
  return UserSubscription.find({ guildId, sources: sourceId, enabled: true });
}

module.exports = { getOrCreate, update, listBySource };
