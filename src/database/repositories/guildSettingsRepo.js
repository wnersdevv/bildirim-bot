'use strict';

const GuildSettings = require('../models/GuildSettings');
const connection = require('../connection');

const memoryStore = new Map(); // MongoDB yokken guvenli fallback (kalici degil, tek oturum)

function defaultSettings(guildId) {
  return { guildId, enabled: true, platforms: {} };
}

async function getOrCreate(guildId) {
  if (!connection.isHealthy()) {
    if (!memoryStore.has(guildId)) memoryStore.set(guildId, defaultSettings(guildId));
    return memoryStore.get(guildId);
  }

  let doc = await GuildSettings.findOne({ guildId });
  if (!doc) {
    doc = await GuildSettings.create(defaultSettings(guildId));
  }
  return doc;
}

async function update(guildId, patch) {
  if (!connection.isHealthy()) {
    const current = memoryStore.get(guildId) || defaultSettings(guildId);
    const merged = { ...current, ...patch };
    memoryStore.set(guildId, merged);
    return merged;
  }
  return GuildSettings.findOneAndUpdate(
    { guildId },
    { $set: patch },
    { new: true, upsert: true }
  );
}

async function remove(guildId) {
  if (!connection.isHealthy()) {
    memoryStore.delete(guildId);
    return;
  }
  await GuildSettings.deleteOne({ guildId });
}

module.exports = { getOrCreate, update, remove };
