const RateLimit = require("../models/rateLimit.model");

// Lua script for atomic sliding/fixed window rate limit counter in Redis
const REDIS_RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
`;

class MongoRateLimitStore {
  async increment(key, windowSeconds) {
    const now = new Date();
    const newResetAt = new Date(now.getTime() + windowSeconds * 1000);

    // 1. Try to increment existing active window
    let record = await RateLimit.findOneAndUpdate(
      { _id: key, resetAt: { $gt: now } },
      { $inc: { hits: 1 } },
      { returnDocument: "after" }
    );

    // 2. If no active window exists (new key or expired window), reset counter
    if (!record) {
      record = await RateLimit.findOneAndUpdate(
        { _id: key },
        { $set: { hits: 1, resetAt: newResetAt } },
        { upsert: true, returnDocument: "after" }
      );
    }

    const remainingSeconds = Math.max(
      1,
      Math.ceil((record.resetAt.getTime() - Date.now()) / 1000)
    );

    return {
      totalHits: record.hits,
      remainingSeconds,
      resetTime: record.resetAt,
    };
  }

  async reset(key) {
    await RateLimit.deleteOne({ _id: key });
  }
}

class RedisRateLimitStore {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async increment(key, windowSeconds) {
    const result = await this.redis.eval(
      REDIS_RATE_LIMIT_LUA,
      1,
      key,
      windowSeconds
    );

    const totalHits = Number(result[0]);
    let ttlSeconds = Number(result[1]);

    if (ttlSeconds <= 0) {
      ttlSeconds = windowSeconds;
      await this.redis.expire(key, windowSeconds);
    }

    const resetTime = new Date(Date.now() + ttlSeconds * 1000);

    return {
      totalHits,
      remainingSeconds: ttlSeconds,
      resetTime,
    };
  }

  async reset(key) {
    await this.redis.del(key);
  }
}

let redisClientInstance = null;
let defaultStoreInstance = null;

function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClientInstance) {
    const Redis = require("ioredis");
    redisClientInstance = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClientInstance.on("error", (err) => {
      console.warn("Redis rate limit connection error:", err.message);
    });
  }

  return redisClientInstance;
}

function getDefaultStore() {
  if (defaultStoreInstance) {
    return defaultStoreInstance;
  }

  const redis = getRedisClient();
  if (redis) {
    defaultStoreInstance = new RedisRateLimitStore(redis);
  } else {
    defaultStoreInstance = new MongoRateLimitStore();
  }

  return defaultStoreInstance;
}

function setDefaultStore(store) {
  defaultStoreInstance = store;
}

module.exports = {
  MongoRateLimitStore,
  RedisRateLimitStore,
  getDefaultStore,
  setDefaultStore,
  getRedisClient,
};
