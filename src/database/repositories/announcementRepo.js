'use strict';

const Announcement = require('../models/Announcement');
const ScheduledAnnouncement = require('../models/ScheduledAnnouncement');
const connection = require('../connection');

function requireDb() {
  if (!connection.isHealthy()) {
    const err = new Error('MongoDB baglantisi yok: duyuru ozelligi UNCONFIGURED durumda.');
    err.code = 'DB_UNCONFIGURED';
    throw err;
  }
}

async function createAnnouncement(data) {
  requireDb();
  return Announcement.create(data);
}

async function listAnnouncements(guildId, limit = 20) {
  requireDb();
  return Announcement.find({ guildId }).sort({ createdAt: -1 }).limit(limit);
}

async function scheduleAnnouncement(data) {
  requireDb();
  return ScheduledAnnouncement.create(data);
}

async function listScheduled(guildId) {
  requireDb();
  return ScheduledAnnouncement.find({ guildId, status: 'PENDING' }).sort({ scheduledAt: 1 });
}

async function listDuePending(before = new Date()) {
  requireDb();
  return ScheduledAnnouncement.find({ status: 'PENDING', scheduledAt: { $lte: before } });
}

async function cancelScheduled(id) {
  requireDb();
  return ScheduledAnnouncement.findByIdAndUpdate(id, { $set: { status: 'CANCELLED' } }, { new: true });
}

async function markScheduledResult(id, status, error = '') {
  requireDb();
  return ScheduledAnnouncement.findByIdAndUpdate(
    id,
    { $set: { status, error, lastRunAt: new Date() } },
    { new: true }
  );
}

module.exports = {
  createAnnouncement,
  listAnnouncements,
  scheduleAnnouncement,
  listScheduled,
  listDuePending,
  cancelScheduled,
  markScheduledResult
};
