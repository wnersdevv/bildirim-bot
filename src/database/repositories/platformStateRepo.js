'use strict';

const PlatformState = require('../models/PlatformState');
const connection = require('../connection');

const memoryStore = new Map();

async function getOrCreate(platform) {
  if (!connection.isHealthy()) {
    if (!memoryStore.has(platform)) memoryStore.set(platform, { platform, status: 'DISABLED' });
    return memoryStore.get(platform);
  }
  let doc = await PlatformState.findOne({ platform });
  if (!doc) doc = await PlatformState.create({ platform });
  return doc;
}

async function update(platform, patch) {
  if (!connection.isHealthy()) {
    const current = memoryStore.get(platform) || { platform };
    const merged = { ...current, ...patch };
    memoryStore.set(platform, merged);
    return merged;
  }
  return PlatformState.findOneAndUpdate({ platform }, { $set: patch }, { new: true, upsert: true });
}

async function listAll() {
  if (!connection.isHealthy()) return [...memoryStore.values()];
  return PlatformState.find({});
}

module.exports = { getOrCreate, update, listAll };
