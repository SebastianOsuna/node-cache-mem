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

### CacheMem#expire(key, expiration) -> Promise

Expire `key` in the indicated `expiration` seconds. Promise resolves to `1`.

### CacheMem#ttl(key) -> Promise

Gets the remaining seconds for the `key` to expire. Promise might resolve to `-2`
if the key is not set or `-1` if no expiration has been set to the `key`.

### CacheMem#keys(query) -> Promise

Gets all keys that match the given `query` pattern.
