import { ref, watch, onUnmounted, type Ref } from 'vue'

/**
 * Debounce a reactive ref value
 * 
 * @param source - The reactive ref to debounce
 * @param delayMs - Debounce delay in milliseconds (default: 300ms)
 * @returns A ref containing the debounced value
 * 
 * @example
 * const search = ref('')
 * const searchDebounced = useDebounceRef(search, 350)
 * 
 * // searchDebounced.value will update 350ms after search.value stops changing
 */
export function useDebounceRef<T>(source: Ref<T>, delayMs: number = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const updateDebounced = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      debounced.value = source.value
      timeoutId = null
    }, delayMs)
  }

  // Watch source and update debounced value
  watch(source, updateDebounced, { immediate: false })

  // Cleanup on unmount
  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  return debounced
}
