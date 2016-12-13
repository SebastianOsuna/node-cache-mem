'use strict';

const Redis = require('redis');
const Promise = require('bluebird');
const debug = require('debug')('CacheMem');

Promise.promisifyAll(Redis.RedisClient.prototype);

class CacheMem {

  constructor(redisPort, redisHost) {
    debug(`New instance ${redisHost}:${redisPort}`);
    this._client = new Redis.createClient({ port: redisPort, host: redisHost, connect_timeout: 1000 });
    this._localMode = false;
    this.localCache = {};
    this._defaultExpiration = 10;

    this._client.on('error', err => {
      if (err.code === 'ECONNREFUSED') {
        this._localMode = true;
        this._client.end(true);
        debug('No Redis found, falling back to local mode.', err);
      }
    });
  }

  get(key, defaultValue) {
    debug('get', key, defaultValue)
    if (this._localMode) return this.fallbackGet(key, defaultValue);

    return this._client.getAsync(key)
    .then(val => (val || defaultValue))
    .catch(err => {
      debug('RedisMiss', `CMD:${err.command}:${key}`, `Reason:${err.code}`);
      if (err.code === 'NR_CLOSED') this._localMode = true;
      return this.fallbackGet(key, defaultValue);
    });
  }

  fallbackGet(key, defaultValue) {
    return this.localCache[key] || defaultValue;
  }

  increment(key) {
    if (this._localMode) return this.fallbackIncrement(key);

    return this._client.incrAsync(key)
    .catch(err => {
      debug('RedisMiss', `CMD:${err.command}:${key}`, `Reason:${err.code}`);
      if (err.code === 'NR_CLOSED') this._localMode = true;
      return this.fallbackIncrement(key);
    });
  }

  fallbackIncrement(key) {
    return ( this.localCache[key] = (this.localCache[key] || 0) + 1 );
  }

  set(key, value) {
    if (this._localMode) return this.fallbackSet(key, value);

    return this._client.setAsync(key, value)
    .catch(err => {
      debug('RedisMiss', `CMD:${err.command}:${key}`, `Reason:${err.code}`);
      if (err.code === 'NR_CLOSED') this._localMode = true;
      return this.fallbackSet(key, value);
    });
  }

  fallbackSet(key, value) {
    return (this.localCache[key] = value);
  }

  expire(key, expiration) {
    if (this._localMode) return this.fallbackExpire(key, expiration || this._defaultExpiration);

    return this._client.expireAsync(key, expiration || this._defaultExpiration)
    .catch(err => {
      debug('RedisMiss', `CMD:${err.command}:${key}`, `Reason:${err.code}`);
      if (err.code === 'NR_CLOSED') this._localMode = true;
      return this.fallbackExpire(key, expiration || this._defaultExpiration);
    });
  }

  fallbackExpire(key, expiration) {
    setTimeout(() => delete this.localCache[key], expiration);
    return (1);
  }
}

module.exports = CacheMem;
