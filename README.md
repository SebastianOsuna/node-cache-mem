# cache-mem

Redis client with inmemory fallback.

If connection to Redis is not found or fails, storage fallbacks to inmemory KV store.

### CacheMem(port, host='localhost')

Creates a new client. Connection timeout is `1000ms`.

### CacheMem#get(key, defaultValue=undefined) -> Promise

Gets the value for `key`. If no value is found, `defaultValue` is returned instead.

### CacheMem#set(key, value) -> Promise

Set a new `value` for `key`. The setted value is returned.

### CacheMem#increment(key) -> Promise

Increments the value at `key` by 1.