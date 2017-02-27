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
    this.localTtlCache = {};
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
    return new Promise(resolve => {
      resolve(this.localCache[key] || defaultValue);
    });
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
    return new Promise(resolve => {
      resolve(( this.localCache[key] = (this.localCache[key] || 0) + 1 ));
    });
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
    return new Promise(resolve => {
      resolve((this.localCache[key] = value));
    });
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
    let time = expiration * 1000; //Convert to milliseconds
    this.localTtlCache[key] = Date.now() + time;
    setTimeout(() => {
      delete this.localCache[key];
      delete this.localTtlCache[key];
    }, time);
    return new Promise(resolve => {
      resolve(1);
    });
  }

  ttl(key) {
    if (this._localMode) return this.fallbackTll(key);

    return this._client.ttlAsync(key)
      .catch(err => {
        debug('RedisMiss', `CMD:${err.command}:${key}`, `Reason:${err.code}`);
        if (err.code === 'NR_CLOSED') this._localMode = true;
        return this.fallbackTll(key);
      });
  }

  fallbackTll(key) {
    let ttl = Math.max((this.localTtlCache[key] || 0) - Date.now(), 0);
    return new Promise(resolve => {
      resolve(ttl);
    });
  }

  keys(query) {
    if (this._localMode) return this.fallbackKeys(query);

    return this._client.keysAsync(query)
      .catch(err => {
        debug('RedisMiss', `CMD:${err.command}:${query}`, `Reason:${err.code}`);
        if (err.code === 'NR_CLOSED') this._localMode = true;
        return this.fallbackKeys(query);
      });
  }

  fallbackKeys(query) {
    let nQuery = new RegExp(query.replace(/\W/g, '').trim(), 'g');
    let results = [];
    Object.keys(this.localCache).forEach(key => {
      if (nQuery.test(key)) {
        return results.push(key);
      }
    });
    return new Promise(resolve => {
      resolve(results);
    });
  }
}

module.exports = CacheMem;
