'use strict';

const { makeLogger } = require('../core/logger');
const subscriptionRepo = require('../database/repositories/subscriptionRepo');

const logger = makeLogger('DmService');
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Kullaniciya DM gonderir. Basarisiz DM'leri loglar, ustuste basarisiz
 * olan kullanicilar icin tekrar tekrar deneme yapmaz (otomatik DM kapatma).
 */
async function sendDm(client, { guildId, userId, payload }) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(payload);

    try {
      await subscriptionRepo.update(guildId, userId, { consecutiveDmFailures: 0 });
    } catch {
      /* DB yoksa sessizce gec */
    }

    return { success: true };
  } catch (err) {
    logger.warn('DM gonderilemedi.', { userId, error: err.message });

    try {
      const sub = await subscriptionRepo.getOrCreate(guildId, userId);
      const failures = (sub.consecutiveDmFailures || 0) + 1;
      const patch = { consecutiveDmFailures: failures };
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        patch.dmEnabled = false;
        logger.warn('Kullanicinin DM bildirimleri otomatik kapatildi (tekrarli basarisizlik).', { userId });
      }
      await subscriptionRepo.update(guildId, userId, patch);
    } catch {
      /* DB yoksa sessizce gec */
    }

    return { success: false, error: err.message };
  }
}

module.exports = { sendDm };
