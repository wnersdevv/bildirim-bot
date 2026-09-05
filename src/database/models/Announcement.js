'use strict';

const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    target: {
      channelId: { type: String, default: '' },
      mention: { type: String, enum: ['none', 'here', 'everyone', 'role'], default: 'none' },
      roleId: { type: String, default: '' }
    },
    urgent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'FAILED', 'CANCELLED'],
      default: 'DRAFT'
    },
    messageId: { type: String, default: '' },
    error: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
