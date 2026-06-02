import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { queryClient, type QueryOptions, CacheProfiles } from '@/data/queryClient'

export interface UseQueryResult<T> {
  data: Ref<T | undefined>
  error: Ref<Error | null>
  loading: Ref<boolean>
  refresh: () => Promise<void>
}

/**
 * useQuery composable for fetching data with caching and deduplication
 * 
 * @param key - Query key (can be a string, computed, or ref)
 * @param fetcher - Function that returns a promise with the data
 * @param options - Query options (ttlMs, staleMs, enabled)
 * @returns Object with data, error, loading, and refresh function
 * 
 * @example
 * const customerId = ref(123)
 * const page = ref(1)
 * const queryKey = computed(() => ['orders', customerId.value, page.value].join('|'))
 * 
 * const { data, error, loading, refresh } = useQuery(
 *   queryKey,
 *   (signal) => api.getOrders({ customerId: customerId.value, page: page.value }, signal),
 *   { ttlMs: 300000, staleMs: 60000 }
 * )
 */
export function useQuery<T>(
  key: string | Ref<string> | ComputedRef<string>,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: QueryOptions = {}
): UseQueryResult<T> {
  const data = ref<T | undefined>(undefined)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  const abortController = ref<AbortController | null>(null)

  // Convert key to a computed ref if it's not already
  const keyRef = typeof key === 'string' 
    ? computed(() => key)
    : key

  // Internal fetch function
  const fetchData = async () => {
    const queryKey = keyRef.value

    // Check if query is enabled
    if (options.enabled === false) {
      return
    }

    // Check for cached data first - if available, use it immediately without loading state
    const cachedData = queryClient.getCached<T>(queryKey)
    if (cachedData !== undefined) {
      // Set cached data immediately - no loading state
      data.value = cachedData
      
      // Still call fetch() for stale-while-revalidate behavior
      // fetch() will return cached data immediately if fresh, or trigger background refresh if stale
      // We don't await it or show loading since we already have cached data displayed
      queryClient.fetch(
        queryKey,
        fetcher,
        {
          ...options,
          // Don't pass signal - let it run independently for background refresh
        }
      ).then((result) => {
        // Update if data changed (background refresh completed)
        // Only update if component is still mounted and not aborted
        if (result !== cachedData && !abortController.value?.signal.aborted) {
          data.value = result
        }
      }).catch(() => {
        // Silently fail background refresh - we already have cached data displayed
      })
      
      return
    }

    // No cached data - proceed with normal fetch
    // Abort previous request if it exists
    if (abortController.value) {
      abortController.value.abort()
    }

    // Create new abort controller
    const controller = new AbortController()
    abortController.value = controller

    loading.value = true
    error.value = null

    try {
      const result = await queryClient.fetch(
        queryKey,
        fetcher,
        {
          ...options,
          signal: controller.signal,
        }
      )
      
      // Only update if not aborted
      if (!controller.signal.aborted) {
        data.value = result
      }
    } catch (err: any) {
      // Don't set error if request was aborted
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        error.value = err instanceof Error ? err : new Error(String(err))
      }
    } finally {
      // Always clear loading so aborted requests don't leave spinner stuck
      if (abortController.value === controller) {
        loading.value = false
        abortController.value = null
      }
    }
  }

  // Watch key changes and refetch
  watch(
    keyRef,
    (newKey, oldKey) => {
      // Only refetch if key actually changed
      if (newKey !== oldKey) {
        fetchData()
      }
    },
    { immediate: true }
  )

  // Refresh function
  const refresh = async () => {
    // Invalidate cache for this key
    queryClient.invalidate(keyRef.value)
    await fetchData()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (abortController.value) {
      abortController.value.abort()
    }
  })

  return {
    data,
    error,
    loading,
    refresh,
  }
}
