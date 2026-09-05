'use strict';

/**
 * Basit TTL destekli bellek ici cache. Gereksiz API cagrilarini azaltmak icindir.
 * Stale veriyle duplicate bildirim uretmemek icin get() suresi gecmis kayitlari
 * otomatik gecersiz sayar.
 */
class CacheManager {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlMs) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  /** Suresi gecmis tum kayitlari temizler (memory leak onlemi). */
  sweep() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) this.store.delete(key);
    }
  }

  size() {
    return this.store.size;
  }
}

module.exports = { CacheManager };
