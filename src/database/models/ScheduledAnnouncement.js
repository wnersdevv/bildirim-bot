'use strict';

const mongoose = require('mongoose');

const ScheduledAnnouncementSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    channelId: { type: String, required: true },
    mention: { type: String, enum: ['none', 'here', 'everyone', 'role'], default: 'none' },
    roleId: { type: String, default: '' },
    scheduledAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Europe/Istanbul' },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none'
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    lastRunAt: { type: Date, default: null },
    error: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ScheduledAnnouncement || mongoose.model('ScheduledAnnouncement', ScheduledAnnouncementSchema);
