'use strict';

const mongoose = require('mongoose');

/**
 * Global (guild-bagimsiz) platform durumu: quota kullanimi, son hata,
 * scanner calisma durumu. Restart sonrasi buradan yuklenir.
 */
const PlatformStateSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: true,
      unique: true,
      enum: ['youtube', 'twitch', 'tiktok', 'instagram', 'x']
    },
    status: {
      type: String,
      enum: ['ENABLED', 'DISABLED', 'UNCONFIGURED', 'RATE_LIMITED', 'API_ERROR', 'MAINTENANCE'],
      default: 'DISABLED'
    },
    lastScanAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastErrorAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    consecutiveErrors: { type: Number, default: 0 },
    quota: {
      dailyUsed: { type: Number, default: 0 },
      dailyEstimatedLimit: { type: Number, default: 0 },
      resetAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.PlatformState || mongoose.model('PlatformState', PlatformStateSchema);
