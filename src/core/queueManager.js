'use strict';

const { makeLogger } = require('./logger');

const logger = makeLogger('QueueManager');

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

/**
 * Basit bellek ici oncelikli kuyruk. Ayni anda tek isci (worker) calisir,
 * boylece Discord rate limitine karsi kontrollu, sirali gonderim saglanir.
 */
class QueueManager {
  constructor({ concurrency = 1, intervalMs = 250 } = {}) {
    this.queues = { CRITICAL: [], HIGH: [], NORMAL: [], LOW: [] };
    this.concurrency = concurrency;
    this.intervalMs = intervalMs;
    this.activeWorkers = 0;
    this.running = false;
    this._timer = null;
  }

  enqueue(task, priority = 'NORMAL') {
    if (!PRIORITY_ORDER.includes(priority)) priority = 'NORMAL';
    this.queues[priority].push(task);
  }

  size() {
    return PRIORITY_ORDER.reduce((sum, p) => sum + this.queues[p].length, 0);
  }

  _nextTask() {
    for (const p of PRIORITY_ORDER) {
      if (this.queues[p].length > 0) return this.queues[p].shift();
    }
    return null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._timer = setInterval(() => this._tick(), this.intervalMs);
    logger.info('Kuyruk isleyici baslatildi.');
  }

  stop() {
    this.running = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    logger.info('Kuyruk isleyici durduruldu.');
  }

  async _tick() {
    if (this.activeWorkers >= this.concurrency) return;
    const task = this._nextTask();
    if (!task) return;

    this.activeWorkers += 1;
    try {
      await task();
    } catch (err) {
      logger.error('Kuyruk gorevi hata verdi.', { error: err.message });
    } finally {
      this.activeWorkers -= 1;
    }
  }
}

module.exports = { QueueManager, PRIORITY_ORDER };
