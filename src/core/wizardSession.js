'use strict';

const STEPS = ['bildirim', 'kanal', 'rol', 'platform', 'kaynak', 'dm', 'mention', 'test'];
const TTL_MS = 15 * 60 * 1000;

const sessions = new Map();

function key(guildId, userId) {
  return `${guildId}:${userId}`;
}

function start(guildId, userId) {
  const session = { stepIndex: 0, data: {}, updatedAt: Date.now() };
  sessions.set(key(guildId, userId), session);
  return session;
}

function get(guildId, userId) {
  const session = sessions.get(key(guildId, userId));
  if (!session) return null;
  if (Date.now() - session.updatedAt > TTL_MS) {
    sessions.delete(key(guildId, userId));
    return null;
  }
  return session;
}

function update(guildId, userId, patch) {
  const session = get(guildId, userId) || start(guildId, userId);
  session.data = { ...session.data, ...patch };
  session.updatedAt = Date.now();
  sessions.set(key(guildId, userId), session);
  return session;
}

function next(guildId, userId) {
  const session = get(guildId, userId);
  if (!session) return null;
  session.stepIndex = Math.min(session.stepIndex + 1, STEPS.length - 1);
  session.updatedAt = Date.now();
  return session;
}

function back(guildId, userId) {
  const session = get(guildId, userId);
  if (!session) return null;
  session.stepIndex = Math.max(session.stepIndex - 1, 0);
  session.updatedAt = Date.now();
  return session;
}

function cancel(guildId, userId) {
  sessions.delete(key(guildId, userId));
}

function currentStep(guildId, userId) {
  const session = get(guildId, userId);
  if (!session) return null;
  return STEPS[session.stepIndex];
}

module.exports = { STEPS, start, get, update, next, back, cancel, currentStep };
