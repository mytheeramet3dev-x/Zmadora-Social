type CacheEntry<T> = {
  value: T;
  expiresAt: number | null;
};

class MemoryCacheDriver {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries = 1000;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest 100 entries when capacity reached
      const keys = Array.from(this.store.keys()).slice(0, 100);
      for (const k of keys) this.store.delete(k);
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deletePattern(prefix: string): Promise<void> {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

class UpstashRedisDriver {
  private url: string;
  private token: string;
  private fallback = new MemoryCacheDriver();

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
  }

  private async execute(command: string[]): Promise<unknown> {
    try {
      const response = await fetch(`${this.url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Upstash error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.warn("Upstash Redis command failed, falling back to memory:", error);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const res = await this.execute(["GET", key]);
    if (res === null || res === undefined) {
      return this.fallback.get<T>(key);
    }
    try {
      return typeof res === "string" ? JSON.parse(res) : (res as T);
    } catch {
      return res as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.execute(["SET", key, str, "EX", ttlSeconds.toString()]);
    } else {
      await this.execute(["SET", key, str]);
    }
    await this.fallback.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.execute(["DEL", key]);
    await this.fallback.delete(key);
  }

  async deletePattern(prefix: string): Promise<void> {
    try {
      const pattern = prefix.endsWith("*") ? prefix : `${prefix}*`;
      const keys = (await this.execute(["KEYS", pattern])) as string[] | null;
      if (Array.isArray(keys) && keys.length > 0) {
        // Delete in batches of 100 keys to avoid Redis argument overflow
        for (let i = 0; i < keys.length; i += 100) {
          const batch = keys.slice(i, i + 100);
          await this.execute(["DEL", ...batch]);
        }
      }
    } catch (error) {
      console.warn("Upstash Redis deletePattern failed:", error);
    }
    await this.fallback.deletePattern(prefix);
  }
}

function createCacheDriver() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    return new UpstashRedisDriver(upstashUrl, upstashToken);
  }

  return new MemoryCacheDriver();
}

export const AppCache = createCacheDriver();
