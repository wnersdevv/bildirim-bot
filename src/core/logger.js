'use strict';

const { maskSecrets } = require('../utils/security');

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY', 'AUDIT'];

let debugEnabled = false;

function setDebug(enabled) {
  debugEnabled = Boolean(enabled);
}

function timestamp() {
  return new Date().toISOString();
}

function write(level, scope, message, meta) {
  if (level === 'DEBUG' && !debugEnabled) return;

  const safeMeta = meta ? maskSecrets(meta) : undefined;
  const line = `[${timestamp()}] [${level}] [${scope}] ${message}`;

  const payload = safeMeta ? `${line} ${JSON.stringify(safeMeta)}` : line;

  if (level === 'ERROR' || level === 'SECURITY') {
    console.error(payload);
  } else if (level === 'WARN') {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

function makeLogger(scope) {
  return {
    debug: (message, meta) => write('DEBUG', scope, message, meta),
    info: (message, meta) => write('INFO', scope, message, meta),
    warn: (message, meta) => write('WARN', scope, message, meta),
    error: (message, meta) => write('ERROR', scope, message, meta),
    security: (message, meta) => write('SECURITY', scope, message, meta),
    audit: (message, meta) => write('AUDIT', scope, message, meta)
  };
}

module.exports = { makeLogger, setDebug, LEVELS };
