'use strict';

const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    platform: { type: String, required: true, index: true },
    sourceId: { type: String, required: true },
    contentId: { type: String, required: true },
    eventType: { type: String, required: true },
    deliveryType: { type: String, enum: ['channel', 'dm', 'mention'], required: true },
    channelId: { type: String, default: '' },
    userId: { type: String, default: '' },
    messageId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED', 'DUPLICATE', 'RATE_LIMITED'],
      default: 'QUEUED',
      index: true
    },
    error: { type: String, default: '' },
    notificationKey: { type: String, required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationLogSchema.index({ guildId: 1, platform: 1, sourceId: 1, contentId: 1, eventType: 1 });
NotificationLogSchema.index({ createdAt: 1 }); // retention cleanup icin

module.exports = mongoose.models.NotificationLog || mongoose.model('NotificationLog', NotificationLogSchema);
