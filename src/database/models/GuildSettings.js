'use strict';

const mongoose = require('mongoose');

const QuietHoursSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '23:00' },
    end: { type: String, default: '08:00' }
  },
  { _id: false }
);

const PermissionsSchema = new mongoose.Schema(
  {
    moderatorRoleIds: { type: [String], default: [] },
    adminRoleIds: { type: [String], default: [] }
  },
  { _id: false }
);

const GuildSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    defaultChannelId: { type: String, default: '' },
    defaultRoleId: { type: String, default: '' },
    channelNotifications: { type: Boolean, default: true },
    dmNotifications: { type: Boolean, default: false },
    mentionEnabled: { type: Boolean, default: true },
    embedEnabled: { type: Boolean, default: true },
    componentsEnabled: { type: Boolean, default: true },
    cooldown: { type: Number, default: 60 },
    quietHours: { type: QuietHoursSchema, default: () => ({}) },
    timezone: { type: String, default: 'Europe/Istanbul' },
    filters: {
      keywordBlocklist: { type: [String], default: [] },
      keywordAllowlist: { type: [String], default: [] }
    },
    platforms: { type: mongoose.Schema.Types.Mixed, default: {} },
    permissions: { type: PermissionsSchema, default: () => ({}) },
    notificationFormat: { type: String, default: 'embed' },
    killSwitches: {
      autoScan: { type: Boolean, default: true },
      channelNotifications: { type: Boolean, default: true },
      dm: { type: Boolean, default: true },
      mention: { type: Boolean, default: true },
      scheduler: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.GuildSettings || mongoose.model('GuildSettings', GuildSettingsSchema);
