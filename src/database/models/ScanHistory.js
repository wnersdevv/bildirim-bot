'use strict';

const mongoose = require('mongoose');

const ScanHistorySchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, index: true },
    sourceId: { type: String, required: true },
    guildId: { type: String, required: true },
    result: {
      type: String,
      enum: ['NO_CHANGE', 'NEW_CONTENT', 'ANOMALOUS_RESPONSE', 'ERROR'],
      required: true
    },
    itemsFound: { type: Number, default: 0 },
    error: { type: String, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ScanHistorySchema.index({ createdAt: 1 });

module.exports = mongoose.models.ScanHistory || mongoose.model('ScanHistory', ScanHistorySchema);
