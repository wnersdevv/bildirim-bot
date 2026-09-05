'use strict';

const subscriptionRepo = require('../database/repositories/subscriptionRepo');

async function subscribe(guildId, userId, sourceId, eventTypes = []) {
  const sub = await subscriptionRepo.getOrCreate(guildId, userId);
  const sources = new Set(sub.sources || []);
  sources.add(sourceId);
  const events = new Set(sub.eventTypes || []);
  eventTypes.forEach((e) => events.add(e));
  return subscriptionRepo.update(guildId, userId, {
    sources: [...sources],
    eventTypes: [...events],
    enabled: true
  });
}

async function unsubscribe(guildId, userId, sourceId) {
  const sub = await subscriptionRepo.getOrCreate(guildId, userId);
  const sources = (sub.sources || []).filter((s) => s !== sourceId);
  return subscriptionRepo.update(guildId, userId, { sources });
}

async function listForUser(guildId, userId) {
  return subscriptionRepo.getOrCreate(guildId, userId);
}

async function subscribersFor(guildId, sourceId) {
  return subscriptionRepo.listBySource(guildId, sourceId);
}

module.exports = { subscribe, unsubscribe, listForUser, subscribersFor };
