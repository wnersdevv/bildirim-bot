'use strict';

const { makeLogger } = require('./logger');

const logger = makeLogger('ErrorHandler');

let adminAlertFn = null;
const lastAlertAt = new Map();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

function registerAdminAlert(fn) {
  adminAlertFn = fn;
}

/**
 * Ayni hata icin spam yapmadan admin uyarisi gonderir (cooldown'lu).
 */
async function alertAdmin(scope, message) {
  const key = `${scope}:${message}`;
  const now = Date.now();
  const last = lastAlertAt.get(key) || 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(key, now);

  if (adminAlertFn) {
    try {
      await adminAlertFn(scope, message);
    } catch (err) {
      logger.error('Admin alert gonderilemedi.', { error: err.message });
    }
  }
}

function attachGlobalHandlers() {
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error('Yakalanmamis Promise reddi (unhandledRejection).', { error: message });
    alertAdmin('unhandledRejection', message);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Yakalanmamis istisna (uncaughtException). Bot calismaya devam ediyor.', {
      error: err.message,
      stack: err.stack
    });
    alertAdmin('uncaughtException', err.message);
  });
}

module.exports = { attachGlobalHandlers, registerAdminAlert, alertAdmin };
