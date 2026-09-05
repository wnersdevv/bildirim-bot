'use strict';

const crypto = require('crypto');

/**
 * Bildirimler icin benzersiz anahtar uretir. Ayni icerik/olay tekrar
 * geldiginde ayni anahtar uretilir -> duplicateService bunu kullanir.
 */
function buildNotificationKey({ guildId, platform, sourceId, contentId, eventType }) {
  return `${guildId}:${platform}:${sourceId}:${contentId}:${eventType}`;
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function shortId() {
  return crypto.randomBytes(6).toString('hex');
}

module.exports = { buildNotificationKey, hash, shortId };
