'use strict';

const mongoose = require('mongoose');

const NotificationSourceSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    platform: {
      type: String,
      required: true,
      enum: ['youtube', 'twitch', 'tiktok', 'instagram', 'x'],
      index: true
    },
    sourceId: { type: String, required: true }, // platformdaki kanal/kullanici ID'si
    sourceName: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    notificationSettings: {
      channelId: { type: String, default: '' },
      dmEnabled: { type: Boolean, default: false },
      mentionRoleId: { type: String, default: '' },
      events: { type: mongoose.Schema.Types.Mixed, default: {} },
      cooldownSeconds: { type: Number, default: null }
    },
    filters: {
      keywordBlocklist: { type: [String], default: [] },
      keywordAllowlist: { type: [String], default: [] }
    },
    lastState: { type: mongoose.Schema.Types.Mixed, default: {} }, // lastContentId, etag, publishedAt, hash
    syncStatus: {
      type: String,
      enum: ['INITIALIZING', 'BASELINE_CREATED', 'MONITORING'],
      default: 'INITIALIZING'
    },
    status: {
      type: String,
      enum: ['ENABLED', 'DISABLED', 'UNCONFIGURED', 'RATE_LIMITED', 'API_ERROR', 'MAINTENANCE'],
      default: 'ENABLED'
    },
    lastCheckedAt: { type: Date, default: null },
    lastErrorAt: { type: Date, default: null },
    lastError: { type: String, default: '' }
  },
  { timestamps: true }
);

NotificationSourceSchema.index({ guildId: 1, platform: 1, sourceId: 1 }, { unique: true });

module.exports =
  mongoose.models.NotificationSource || mongoose.model('NotificationSource', NotificationSourceSchema);
