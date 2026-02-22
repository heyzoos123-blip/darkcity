/**
 * Default Event Engine Configuration
 */

import { EventEngineConfig } from '../src/EventEngine';

export const defaultConfig: EventEngineConfig = {
  generator: {
    tickInterval: 100, // 100ms = 10 ticks per second
    enableScheduled: true,
    enableRandom: true,
    enableTriggered: true,
    globalEventRate: 1.0 // 1.0 = normal rate
  },

  router: {
    enableBroadcast: true,
    enableZoneRouting: true,
    enablePriority: true,
    maxRetries: 3
  },

  processor: {
    enableEffects: true,
    enableMemoryWrite: true,
    enableStateUpdate: true
  },

  store: {
    enablePersistence: true,
    enableIndexing: true,
    retentionDays: 90
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'darkcity:'
  }
};

export default defaultConfig;
