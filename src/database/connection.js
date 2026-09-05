'use strict';

const mongoose = require('mongoose');
const { makeLogger } = require('../core/logger');

const logger = makeLogger('Database');

let isConnecting = false;
let hasConfiguredUri = false;

async function connect(mongoUri) {
  hasConfiguredUri = Boolean(mongoUri);

  if (!mongoUri) {
    logger.warn('mongoUri tanimli degil. Veritabani gerektiren ozellikler UNCONFIGURED olacak.');
    return { connected: false, reason: 'UNCONFIGURED' };
  }

  if (isConnecting) return { connected: false, reason: 'ALREADY_CONNECTING' };
  isConnecting = true;

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB baglantisi koptu, yeniden baglanma denenecek.');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB baglantisi yeniden kuruldu.');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB baglanti hatasi.', { error: err.message });
  });

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true
    });
    logger.info('MongoDB baglantisi kuruldu.');
    isConnecting = false;
    return { connected: true };
  } catch (err) {
    isConnecting = false;
    logger.error('MongoDB baglantisi kurulamadi. Gercek durum: UNCONFIGURED/HATA olarak raporlanacak.', {
      error: err.message
    });
    return { connected: false, reason: 'CONNECTION_FAILED', error: err.message };
  }
}

function isHealthy() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

function isConfigured() {
  return hasConfiguredUri;
}

async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB baglantisi kapatildi.');
  }
}

module.exports = { connect, disconnect, isHealthy, isConfigured };
