'use strict';

const mongoose = require('mongoose');

const UserSubscriptionSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    sources: { type: [String], default: [] }, // NotificationSource _id listesi
    eventTypes: { type: [String], default: [] },
    dmEnabled: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    consecutiveDmFailures: { type: Number, default: 0 }
  },
  { timestamps: true }
);

UserSubscriptionSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.models.UserSubscription || mongoose.model('UserSubscription', UserSubscriptionSchema);
