'use strict';

const { makeLogger } = require('./logger');

const logger = makeLogger('RetryManager');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff ile fn() calistirir. Kalici hatalarda (shouldRetry false
 * donerse) hemen durur; maxRetries asilinca son hatayi firlatir.
 */
async function withRetry(fn, {
  maxRetries = 5,
  baseDelayMs = 1000,
  maxDelayMs = 30000,
  scope = 'RetryManager',
  shouldRetry = () => true
} = {}) {
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      attempt += 1;

      if (attempt > maxRetries || !shouldRetry(err)) {
        logger.error(`Deneme basarisiz, tekrar denenmeyecek.`, {
          scope,
          attempt,
          error: err.message
        });
        throw err;
      }

      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      logger.warn(`Deneme ${attempt}/${maxRetries} basarisiz, ${delay + jitter}ms sonra tekrar denenecek.`, {
        scope,
        error: err.message
      });
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

module.exports = { withRetry, sleep };
