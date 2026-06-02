/**
 * Query Client - Centralized network access with caching, deduplication, and abort support
 * 
 * All network requests must go through this client to ensure:
 * - In-flight request deduplication
 * - TTL-based caching with LRU eviction
 * - Stale-while-revalidate behavior
 * - AbortController cancellation
 * - Visibility-based pausing
 * - Error cooldowns
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number // When the cache entry expires (TTL)
  staleAt: number   // When the cache becomes stale (staleMs)
  createdAt: number
  lastAccessed: number // For LRU eviction
}

interface ErrorCooldown {
  key: string
  retryAfter: number // Timestamp when retry is allowed
}

interface QueryOptions {
  ttlMs?: number      // Time to live - how long data is cached
  staleMs?: number    // Stale time - when to trigger background refresh
  enabled?: boolean   // Whether the query should run
  signal?: AbortSignal // Optional external abort signal
}

/**
 * Cache profile presets
 */
export const CacheProfiles = {
  /** Default: staleMs=30s, ttlMs=5min */
  default: { staleMs: 30_000, ttlMs: 300_000 },
  /** Reference data: staleMs=10min, ttlMs=6h */
  reference: { staleMs: 600_000, ttlMs: 21_600_000 },
  /** List/search: staleMs=20-30s, ttlMs=2-5min */
  list: { staleMs: 30_000, ttlMs: 300_000 },
  listShort: { staleMs: 20_000, ttlMs: 120_000 },
  /** Detail: staleMs=1min, ttlMs=10min */
  detail: { staleMs: 60_000, ttlMs: 600_000 },
} as const

/**
 * Query client singleton
 */
class QueryClient {
  private cache = new Map<string, CacheEntry<any>>()
  private inflight = new Map<string, Promise<any>>()
  private aborters = new Map<string, AbortController>()
  private requestCounts = new Map<string, number>() // Dev mode instrumentation
  private errorCooldowns = new Map<string, ErrorCooldown>() // Error cooldown tracking
  private readonly maxEntries = 300

  /**
   * Fetch data with caching and deduplication
   */
  async fetch<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      ttlMs = CacheProfiles.default.ttlMs,
      staleMs = CacheProfiles.default.staleMs,
      enabled = true,
      signal: externalSignal,
    } = options

    // If disabled, return cached data if available, otherwise throw
    if (!enabled) {
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        this.updateLastAccessed(key, cached)
        return cached.data
      }
      throw new Error(`Query disabled for key: ${key}`)
    }

    // Check error cooldown
    const cooldown = this.errorCooldowns.get(key)
    if (cooldown && cooldown.retryAfter > Date.now()) {
      // Return cached data if available during cooldown
      const cached = this.cache.get(key)
      if (cached && cached.expiresAt > Date.now()) {
        this.updateLastAccessed(key, cached)
        return cached.data
      }
      // Otherwise wait for cooldown to expire
      const waitTime = cooldown.retryAfter - Date.now()
      throw new Error(`Request in cooldown, retry after ${Math.ceil(waitTime / 1000)}s`)
    }

    // Check if there's an in-flight request for this key
    if (this.inflight.has(key)) {
      if (import.meta.env.DEV) {
        this.incrementRequestCount(key, 'deduplicated')
      }
      return this.inflight.get(key)!
    }

    // Prune expired entries before checking cache
    this.pruneExpired()

    // Check cache
    const cached = this.cache.get(key)
    const now = Date.now()

    // If cache is fresh, return immediately
    if (cached && cached.expiresAt > now) {
      if (import.meta.env.DEV) {
        this.incrementRequestCount(key, 'cache_hit')
      }
      
      this.updateLastAccessed(key, cached)
      
      // If stale but not expired, trigger background refresh (stale-while-revalidate)
      if (cached.staleAt <= now && !document.hidden) {
        // Don't await - let it refresh in background
        this.fetchInternal(key, fetcher, ttlMs, staleMs, externalSignal).catch(() => {
          // Silently fail background refresh
        })
      }
      
      return cached.data
    }

    // Fetch new data
    return this.fetchInternal(key, fetcher, ttlMs, staleMs, externalSignal)
  }

  /**
   * Internal fetch implementation
   */
  private async fetchInternal<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    ttlMs: number,
    staleMs: number,
    externalSignal?: AbortSignal
  ): Promise<T> {
    // Abort previous request for this key if it exists
    const existingAborter = this.aborters.get(key)
    if (existingAborter) {
      existingAborter.abort()
    }

    // Create new abort controller
    const aborter = new AbortController()
    this.aborters.set(key, aborter)

    // Combine abort signals if external signal provided
    let combinedSignal: AbortSignal = aborter.signal
    if (externalSignal) {
      // Create a combined signal that aborts if either signal aborts
      const combinedController = new AbortController()
      const abortHandler = () => combinedController.abort()
      aborter.signal.addEventListener('abort', abortHandler)
      externalSignal.addEventListener('abort', abortHandler)
      combinedSignal = combinedController.signal
    }

    // Create the fetch promise
    const fetchPromise = (async () => {
      try {
        // Don't fetch if document is hidden
        if (document.hidden) {
          // Return cached data if available, otherwise throw
          const cached = this.cache.get(key)
          if (cached) {
            this.updateLastAccessed(key, cached)
            return cached.data
          }
          throw new Error('Document is hidden and no cache available')
        }

        if (import.meta.env.DEV) {
          this.incrementRequestCount(key, 'fetch')
        }

        const data = await fetcher(combinedSignal)

        // Only cache successful responses
        const now = Date.now()
        this.setCacheEntry(key, {
          data,
          expiresAt: now + ttlMs,
          staleAt: now + staleMs,
          createdAt: now,
          lastAccessed: now,
        })

        // Clear error cooldown on success
        this.errorCooldowns.delete(key)

        return data
      } catch (error: any) {
        // Handle error cooldowns
        this.handleErrorCooldown(key, error)

        // If aborted, check if we have cached data to return
        if (error.name === 'AbortError' || combinedSignal.aborted) {
          const cached = this.cache.get(key)
          if (cached) {
            this.updateLastAccessed(key, cached)
            return cached.data
          }
        }
        throw error
      } finally {
        // Cleanup
        this.inflight.delete(key)
        this.aborters.delete(key)
      }
    })()

    // Store in-flight request
    this.inflight.set(key, fetchPromise)

    return fetchPromise
  }

  /**
   * Handle error cooldowns based on error type
   */
  private handleErrorCooldown(key: string, error: any): void {
    // Don't set cooldown for aborted requests
    if (error.name === 'AbortError') {
      return
    }

    let cooldownMs = 0
    let status: number | null = null

    // Try to extract status from error object
    if (error.status) {
      status = error.status
    } else if (error.response?.status) {
      status = error.response.status
    } else if (error.message) {
      // Parse status from error message (format: "API Error (429): ..." or "API request failed: 404 ...")
      const statusMatch = error.message.match(/\((\d{3})\)|failed:\s*(\d{3})|status[:\s]+(\d{3})/i)
      if (statusMatch) {
        status = parseInt(statusMatch[1] || statusMatch[2] || statusMatch[3], 10)
      }
    }

    // Determine cooldown based on status or error type
    if (status) {
      if (status === 429) {
        // Rate limited - try to get Retry-After header
        const retryAfter = error.response?.headers?.get?.('Retry-After') || 
                          error.headers?.get?.('Retry-After')
        if (retryAfter) {
          cooldownMs = parseInt(retryAfter, 10) * 1000
        } else {
          cooldownMs = 15_000 // 15 seconds default for 429
        }
      } else if (status >= 500) {
        cooldownMs = 3_000 // 3 seconds for 5xx errors
      } else if (status === 404) {
        cooldownMs = 60_000 // 60 seconds for 404 errors
      }
    } else {
      // Network errors (TypeError from fetch, or NetworkError in message)
      if (error instanceof TypeError || 
          error.message?.includes('NetworkError') || 
          error.message?.includes('network') ||
          error.message?.includes('fetch')) {
        cooldownMs = 3_000 // 3 seconds for network errors
      }
    }

    if (cooldownMs > 0) {
      this.errorCooldowns.set(key, {
        key,
        retryAfter: Date.now() + cooldownMs,
      })
      
      if (import.meta.env.DEV) {
        console.warn(`[QueryClient] Error cooldown set for ${key}: ${cooldownMs}ms (status: ${status || 'network'})`)
      }
    }
  }

  /**
   * Set cache entry with LRU eviction if needed
   */
  private setCacheEntry<T>(key: string, entry: CacheEntry<T>): void {
    // Prune expired entries first
    this.pruneExpired()

    // If at capacity, evict least recently used
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU()
    }

    this.cache.set(key, entry)
  }

  /**
   * Update last accessed time for LRU
   */
  private updateLastAccessed(key: string, entry: CacheEntry<any>): void {
    entry.lastAccessed = Date.now()
  }

  /**
   * Prune expired cache entries
   */
  private pruneExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Get cached data synchronously if available (without fetching)
   * Returns undefined if no cache exists or cache is expired
   */
  getCached<T>(key: string): T | undefined {
    // Prune expired entries first
    this.pruneExpired()
    
    const cached = this.cache.get(key)
    const now = Date.now()
    
    // Return cached data if it's still valid (not expired)
    if (cached && cached.expiresAt > now) {
      this.updateLastAccessed(key, cached)
      return cached.data as T
    }
    
    return undefined
  }

  /**
   * Manually invalidate a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key)
    this.errorCooldowns.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.errorCooldowns.clear()
    // Abort all in-flight requests
    for (const aborter of this.aborters.values()) {
      aborter.abort()
    }
    this.inflight.clear()
    this.aborters.clear()
  }

  /**
   * Get cache statistics (dev mode only)
   */
  getStats(): Record<string, { total: number; cacheHits: number; deduplicated: number; fetches: number }> {
    if (!import.meta.env.DEV) {
      return {}
    }

    const stats: Record<string, { total: number; cacheHits: number; deduplicated: number; fetches: number }> = {}
    
    for (const [key, count] of this.requestCounts.entries()) {
      const parts = key.split(':')
      const queryKey = parts[0]
      const type = parts[1] || 'unknown'
      
      if (!stats[queryKey]) {
        stats[queryKey] = { total: 0, cacheHits: 0, deduplicated: 0, fetches: 0 }
      }
      
      stats[queryKey].total += count
      if (type === 'cache_hit') stats[queryKey].cacheHits += count
      if (type === 'deduplicated') stats[queryKey].deduplicated += count
      if (type === 'fetch') stats[queryKey].fetches += count
    }
    
    return stats
  }

  /**
   * Log request counts in dev mode
   */
  private incrementRequestCount(key: string, type: string): void {
    const countKey = `${key}:${type}`
    this.requestCounts.set(countKey, (this.requestCounts.get(countKey) || 0) + 1)
    
    // Log periodically (every 10 requests)
    const count = this.requestCounts.get(countKey) || 0
    if (count % 10 === 0) {
      console.log(`[QueryClient] ${key}: ${type} (${count} total)`)
    }
  }
}

// Export singleton instance
export const queryClient = new QueryClient()

// Export types
export type { QueryOptions, CacheEntry }
