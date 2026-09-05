'use strict';

/**
 * Basit token-bucket rate limiter. Platform API'leri ve komut kullanimi
 * icin ayri anahtarlarla (key) kullanilabilir.
 */
class RateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  /**
   * @param {string} key - orn. "youtube:quota", "command:bildirim:<userId>"
   * @param {number} limit - pencere basina izin verilen istek sayisi
   * @param {number} windowMs - pencere suresi (ms)
   * @returns {boolean} - istek izinli mi
   */
  allow(key, limit, windowMs) {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { windowStart: now, count: 0 };
      this.buckets.set(key, bucket);
    }

    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
  }

  remaining(key, limit, windowMs) {
    const bucket = this.buckets.get(key);
    if (!bucket || Date.now() - bucket.windowStart >= windowMs) return limit;
    return Math.max(0, limit - bucket.count);
  }

  reset(key) {
    this.buckets.delete(key);
  }
}

module.exports = { RateLimiter, sharedRateLimiter: new RateLimiter() };
