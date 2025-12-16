// navigationInterceptor.ts - Pure JavaScript singleton library for intercepting navigation

export interface BlockedNavigationInfo {
  href: string
  source?: string
}

export type OnBlockedCallback = (info: BlockedNavigationInfo) => void

interface NavigationInterceptorOptions {
  enabled: boolean
  allowExternal?: boolean
  allowedDomains?: string[]
  allowInternal?: boolean
  allowSubLocation?: string
  onBlocked?: OnBlockedCallback
}

interface NavigationInterceptorState {
  enabled: boolean
  allowExternal?: boolean
  allowedDomains?: string[]
  allowInternal?: boolean
  allowSubLocation?: string
  onBlocked?: OnBlockedCallback
}

// Singleton state
const state: NavigationInterceptorState = {
  enabled: false,
}

// Store original functions (captured at module load time)
const originals = {
  windowOpen: window.open.bind(window),
  pushState: history.pushState.bind(history),
  replaceState: history.replaceState.bind(history),
}

// Helper function to check if a URL should be blocked
const shouldBlockUrl = (urlString: string): { blocked: boolean; url?: URL; reason?: string } => {
  // If interceptor is disabled, don't block anything
  if (!state.enabled) {
    return { blocked: false }
  }

  // Handle hash-only URLs (pattern: #/<subLocation>/...)
  if (urlString.startsWith('#')) {
    // Hash-only link is always internal
    const hashPath = urlString.slice(1) // Remove leading #
    const url = new URL(window.location.href)
    url.hash = urlString
    
    // Check sublocation filter FIRST (takes precedence over internal blocking)
    if (state.allowSubLocation && hashPath) {
      const expectedPrefix = `/${state.allowSubLocation}`
      const startsWithSubLocation = 
        hashPath.startsWith(expectedPrefix + '/') || 
        hashPath === expectedPrefix ||
        hashPath.startsWith(expectedPrefix + '?')
      
      if (startsWithSubLocation) {
        // Matches allowed sublocation, allow it even if internal links are blocked
        return { blocked: false }
      } else {
        // Doesn't match allowed sublocation, block it
        return { blocked: true, url, reason: 'sublocation_mismatch' }
      }
    }

    // If no sublocation filter is set, check internal links blocking
    if (state.allowInternal === false) {
      return { blocked: true, url, reason: 'internal_blocked' }
    }

    return { blocked: false }
  }

  try {
    const url = new URL(urlString, window.location.href)
    const isExternal = url.origin !== window.location.origin
    const hashPath = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash

    // Check external links
    if (isExternal) {
      // If allowedDomains is set (even if empty array), check whitelist
      if (state.allowedDomains !== undefined) {
        if (state.allowedDomains.length > 0 && state.allowedDomains.includes(url.hostname)) {
          return { blocked: false }
        }
        // If whitelist exists but domain not in it (or whitelist is empty), block
        return { blocked: true, url, reason: 'external_link' }
      }
      // If allowedDomains is undefined, don't block external links (default: allow all external)
      return { blocked: false }
    }

    // Check sublocation filter FIRST for hash-based routing (takes precedence over internal blocking)
    if (state.allowSubLocation && hashPath) {
      const expectedPrefix = `/${state.allowSubLocation}`
      const startsWithSubLocation = 
        hashPath.startsWith(expectedPrefix + '/') || 
        hashPath === expectedPrefix ||
        hashPath.startsWith(expectedPrefix + '?')
      
      if (startsWithSubLocation) {
        // Matches allowed sublocation, allow it even if internal links are blocked
        return { blocked: false }
      } else {
        // Doesn't match allowed sublocation, block it
        return { blocked: true, url, reason: 'sublocation_mismatch' }
      }
    }

    // If no sublocation filter is set, check internal links blocking
    if (state.allowInternal === false) {
      return { blocked: true, url, reason: 'internal_blocked' }
    }

    return { blocked: false }
  } catch {
    // If URL parsing fails, treat as internal relative path
    if (state.allowInternal === false) {
      try {
        const url = new URL(window.location.href)
        url.pathname = urlString
        return { blocked: true, url, reason: 'internal_blocked' }
      } catch {
        return { blocked: false }
      }
    }
    return { blocked: false }
  }
}

// Helper function to convert URL to relative path if it's internal
const getRelativeHref = (url: URL): string => {
  const currentOrigin = window.location.origin
  if (url.origin === currentOrigin) {
    // Internal URL - return relative path
    const path = url.pathname + url.search + url.hash
    return path || '/'
  }
  // External URL - return full href
  return url.href
}

// Helper function to notify about blocked navigation
const notifyBlocked = (url: URL, source?: string) => {
  const info: BlockedNavigationInfo = {
    href: getRelativeHref(url),
    source,
  }

  // Use custom callback if provided, otherwise use default console.log
  if (state.onBlocked) {
    state.onBlocked(info)
  } else {
    // Default behavior: console.log
    console.log('[NavigationInterceptor] Blocked navigation:', info)
  }
}

// Click handler - checks state before blocking
const clickHandler = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
  if (!anchor) return

  const href = anchor.getAttribute('href')
  if (!href) return

  // ignore javascript:, mailto, tel, etc (but not # for hash routing)
  if (
    href.startsWith('javascript:') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return
  }

  // Handle hash-only links (pattern: #/<subLocation>/...)
  const isHashOnly = href.startsWith('#')
  let urlString = href

  if (isHashOnly) {
    // For hash-only links, construct full URL
    urlString = window.location.href.split('#')[0] + href
  }

  const checkResult = shouldBlockUrl(urlString)
  if (checkResult.blocked && checkResult.url) {
    // 🚫 BLOCK
    e.preventDefault()
    e.stopPropagation()
    notifyBlocked(checkResult.url, 'click')
    return
  }
}

// Hash change handler - checks state before blocking
const hashChangeHandler = (_e: HashChangeEvent) => {
  if (!state.enabled) return

  const currentLocation = window.location.href
  const checkResult = shouldBlockUrl(currentLocation)
  
  if (checkResult.blocked && checkResult.url) {
    // Notify about the blocked navigation attempt
    notifyBlocked(checkResult.url, 'hashchange')
    
    // Try to prevent hash change by going back
    try {
      if (window.history.length > 1) {
        window.history.back()
      }
    } catch {
      // Ignore errors
    }
  }
}

// Before unload handler - checks state before blocking
const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (!state.enabled) return

  const currentLocation = window.location.href
  
  // Check if this navigation should be blocked
  const checkResult = shouldBlockUrl(currentLocation)
  
  if (checkResult.blocked && checkResult.url) {
    // Notify about the blocked navigation attempt
    notifyBlocked(checkResult.url, 'location.href')
    
    // Best practice: preventDefault() + set returnValue for legacy support
    // Note: The browser will show its own generic message - we cannot customize it
    // See: https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent/returnValue
    e.preventDefault()
    e.returnValue = '' // Any truthy value works, but message is ignored by browsers
  }
}

// Intercepted window.open - checks state before blocking
const interceptedWindowOpen = function(url?: string | URL, target?: string, features?: string): Window | null {
  if (url) {
    const urlString = typeof url === 'string' ? url : url.href
    const checkResult = shouldBlockUrl(urlString)
    if (checkResult.blocked && checkResult.url) {
      notifyBlocked(checkResult.url, 'window.open')
      return null
    }
  }
  return originals.windowOpen.call(window, url, target, features)
}

// Intercepted history.pushState - checks state before blocking
const interceptedPushState = function(state: any, title: string, url?: string | URL | null) {
  if (url) {
    const urlString = typeof url === 'string' ? url : url.href
    // For pushState, we need to construct the full URL if it's relative
    let fullUrl: string
    try {
      fullUrl = new URL(urlString, window.location.href).href
    } catch {
      fullUrl = window.location.href
    }
    const checkResult = shouldBlockUrl(fullUrl)
    if (checkResult.blocked && checkResult.url) {
      notifyBlocked(checkResult.url, 'history.pushState')
      return
    }
  }
  return originals.pushState(state, title, url)
}

// Intercepted history.replaceState - checks state before blocking
const interceptedReplaceState = function(state: any, title: string, url?: string | URL | null) {
  if (url) {
    const urlString = typeof url === 'string' ? url : url.href
    // For replaceState, we need to construct the full URL if it's relative
    let fullUrl: string
    try {
      fullUrl = new URL(urlString, window.location.href).href
    } catch {
      fullUrl = window.location.href
    }
    const checkResult = shouldBlockUrl(fullUrl)
    if (checkResult.blocked && checkResult.url) {
      notifyBlocked(checkResult.url, 'history.replaceState')
      return
    }
  }
  return originals.replaceState(state, title, url)
}

// Set up interceptors immediately when module loads (before other libraries can cache window methods)
window.open = interceptedWindowOpen
history.pushState = interceptedPushState
history.replaceState = interceptedReplaceState
document.addEventListener('click', clickHandler, true) // 👈 capture phase (important!)
window.addEventListener('hashchange', hashChangeHandler)
window.addEventListener('beforeunload', beforeUnloadHandler)

// Public API
export const navigationInterceptor = {
  /**
   * Configure and enable/disable the navigation interceptor
   */
  configure(options: NavigationInterceptorOptions): void {
    state.enabled = options.enabled
    state.allowExternal = options.allowExternal
    state.allowedDomains = options.allowedDomains
    state.allowInternal = options.allowInternal
    state.allowSubLocation = options.allowSubLocation
    state.onBlocked = options.onBlocked
  },

  /**
   * Enable the navigation interceptor with current configuration
   */
  enable(): void {
    state.enabled = true
  },

  /**
   * Disable the navigation interceptor (interceptors remain active but won't block)
   */
  disable(): void {
    state.enabled = false
  },

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<NavigationInterceptorState> {
    return { ...state }
  },

  /**
   * Reset to default state
   */
  reset(): void {
    state.enabled = false
    state.allowExternal = undefined
    state.allowedDomains = undefined
    state.allowInternal = undefined
    state.allowSubLocation = undefined
    state.onBlocked = undefined
  },
}

// Legacy API for backward compatibility
export function setupNavigationInterceptor(options: NavigationInterceptorOptions): () => void {
  navigationInterceptor.configure(options)
  
  // Return a cleanup function that disables the interceptor
  return () => {
    navigationInterceptor.disable()
  }
}

