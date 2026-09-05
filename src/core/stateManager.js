'use strict';

/**
 * Calisma zamani durumu: kill-switch bayraklari, scanner kilitleri (job lock),
 * son tarama zamanlari. Restart sonrasi gercek durum PlatformState modelinden
 * yuklenir (bkz. healthService / jobs).
 */
class StateManager {
  constructor() {
    this.killSwitches = {
      autoScan: true,
      channelNotifications: true,
      dm: true,
      mention: true,
      scheduler: true
    };
    this.jobLocks = new Map();
    this.lastScanAt = new Map();
    this.dailyStats = { notificationsSent: 0, errors: 0, resetAt: Date.now() };
  }

  setKillSwitch(name, value) {
    if (!(name in this.killSwitches)) {
      throw new Error(`Bilinmeyen kill-switch: ${name}`);
    }
    this.killSwitches[name] = Boolean(value);
  }

  isEnabled(name) {
    return Boolean(this.killSwitches[name]);
  }

  /** Ayni job'in ustuste calismasini engeller (fail-safe / duplicate scheduler). */
  acquireLock(jobKey) {
    if (this.jobLocks.get(jobKey)) return false;
    this.jobLocks.set(jobKey, true);
    return true;
  }

  releaseLock(jobKey) {
    this.jobLocks.set(jobKey, false);
  }

  markScan(sourceKey) {
    this.lastScanAt.set(sourceKey, Date.now());
  }

  getLastScan(sourceKey) {
    return this.lastScanAt.get(sourceKey) || null;
  }

  incrementSent() {
    this._maybeResetDaily();
    this.dailyStats.notificationsSent += 1;
  }

  incrementError() {
    this._maybeResetDaily();
    this.dailyStats.errors += 1;
  }

  _maybeResetDaily() {
    const dayMs = 24 * 60 * 60 * 1000;
    if (Date.now() - this.dailyStats.resetAt > dayMs) {
      this.dailyStats = { notificationsSent: 0, errors: 0, resetAt: Date.now() };
    }
  }

  getDailyStats() {
    this._maybeResetDaily();
    return { ...this.dailyStats };
  }
}

module.exports = new StateManager();
