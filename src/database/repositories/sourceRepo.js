'use strict';

const NotificationSource = require('../models/NotificationSource');
const connection = require('../connection');

function requireDb() {
  if (!connection.isHealthy()) {
    const err = new Error('MongoDB baglantisi yok: kaynak yonetimi UNCONFIGURED durumda.');
    err.code = 'DB_UNCONFIGURED';
    throw err;
  }
}

async function addSource(data) {
  requireDb();
  return NotificationSource.create(data);
}

async function listSources(guildId, platform) {
  requireDb();
  const query = { guildId };
  if (platform) query.platform = platform;
  return NotificationSource.find(query).sort({ createdAt: 1 });
}

async function findSource(guildId, platform, sourceId) {
  requireDb();
  return NotificationSource.findOne({ guildId, platform, sourceId });
}

async function findById(id) {
  requireDb();
  return NotificationSource.findById(id);
}

async function updateSource(id, patch) {
  requireDb();
  return NotificationSource.findByIdAndUpdate(id, { $set: patch }, { new: true });
}

async function removeSource(id) {
  requireDb();
  return NotificationSource.findByIdAndDelete(id);
}

async function listAllEnabledByPlatform(platform) {
  requireDb();
  return NotificationSource.find({ platform, enabled: true, status: { $ne: 'DISABLED' } });
}

module.exports = {
  addSource,
  listSources,
  findSource,
  findById,
  updateSource,
  removeSource,
  listAllEnabledByPlatform
};
