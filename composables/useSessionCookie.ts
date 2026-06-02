/**
 * Composable for managing session cookies (cookies that expire when the browser tab is closed)
 * 
 * Session cookies are created without an expiration date, which means they are automatically
 * deleted when the browser session ends (when the tab/window is closed).
 */
export function useSessionCookie() {
  /**
   * Sets a session cookie (no expiration = session cookie)
   */
  const setCookie = (name: string, value: string) => {
    if (typeof document === 'undefined') return
    // Session cookie: no expires or max-age attribute
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`
  }

  /**
   * Sets a cookie with Max-Age in seconds (minimum 1).
   */
  const setCookieWithMaxAge = (name: string, value: string, maxAgeSeconds: number) => {
    if (typeof document === 'undefined') return
    const maxAge = Math.max(1, Math.floor(maxAgeSeconds))
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`
  }

  /**
   * Gets a cookie value by name
   */
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    
    const nameEQ = encodeURIComponent(name) + '='
    const cookies = document.cookie.split(';')
    
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i]
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1, cookie.length)
      }
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length))
      }
    }
    return null
  }

  /**
   * Deletes a cookie by setting it with an expired date
   */
  const deleteCookie = (name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
  }

  return {
    setCookie,
    setCookieWithMaxAge,
    getCookie,
    deleteCookie,
  }
}
