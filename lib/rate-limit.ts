type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

declare global {
  var __identityInterviewRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__identityInterviewRateLimitStore) {
    globalThis.__identityInterviewRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.__identityInterviewRateLimitStore;
}

export function consumeRateLimit(input: RateLimitInput): RateLimitResult {
  const store = getRateLimitStore();
  const now = Date.now();
  const storeKey = `${input.bucket}:${input.key}`;
  const current = store.get(storeKey);

  if (!current || current.resetAt <= now) {
    store.set(storeKey, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(input.limit - 1, 0),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  store.set(storeKey, current);

  return {
    allowed: true,
    remaining: Math.max(input.limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}
