// linkGuard.ts
export function setupLinkGuard(options: {
  enabled: boolean
  allowExternal?: boolean
  allowedDomains?: string[]
  allowInternal?: boolean
  allowSubLocation?: string
}): () => void {
  if (!options.enabled) {
    // Return a no-op cleanup function when disabled
    return () => {}
  }

  // Helper function to check if a URL should be blocked
  const shouldBlockUrl = (urlString: string): { blocked: boolean; url?: URL; reason?: string } => {
    // Handle hash-only URLs (pattern: #/<subLocation>/...)
    if (urlString.startsWith('#')) {
      // Hash-only link is always internal
      const hashPath = urlString.slice(1) // Remove leading #
      const url = new URL(window.location.href)
      url.hash = urlString
      
      // Check internal links
      if (options.allowInternal === false) {
        return { blocked: true, url, reason: 'internal_blocked' }
      }

      // Check sublocation filter
      if (options.allowSubLocation && hashPath) {
        const expectedPrefix = `/${options.allowSubLocation}`
        const startsWithSubLocation = 
          hashPath.startsWith(expectedPrefix + '/') || 
          hashPath === expectedPrefix ||
          hashPath.startsWith(expectedPrefix + '?')
        
        if (!startsWithSubLocation) {
          return { blocked: true, url, reason: 'sublocation_mismatch' }
        }
      }

      return { blocked: false }
    }

    try {
      const url = new URL(urlString, window.location.href)
      const isExternal = url.origin !== window.location.origin
      const hashPath = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash

      // Check external links
      if (isExternal) {
        if (
          options.allowedDomains &&
          options.allowedDomains.includes(url.hostname)
        ) {
          return { blocked: false }
        }
        return { blocked: true, url, reason: 'external_link' }
      }

      // Check internal links
      if (options.allowInternal === false) {
        return { blocked: true, url, reason: 'internal_blocked' }
      }

      // Check sublocation filter for hash-based routing
      if (options.allowSubLocation && hashPath) {
        const expectedPrefix = `/${options.allowSubLocation}`
        const startsWithSubLocation = 
          hashPath.startsWith(expectedPrefix + '/') || 
          hashPath === expectedPrefix ||
          hashPath.startsWith(expectedPrefix + '?')
        
        if (!startsWithSubLocation) {
          return { blocked: true, url, reason: 'sublocation_mismatch' }
        }
      }

      return { blocked: false }
    } catch {
      // If URL parsing fails, treat as internal relative path
      if (options.allowInternal === false) {
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

  // Helper function to notify about blocked navigation
  const notifyBlocked = (url: URL, reason?: string, method?: string) => {
    window.postMessage?.(
      { 
        type: 'LINK_BLOCKED', 
        href: url.href, 
        reason,
        method 
      },
      '*'
    )
  }

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
      notifyBlocked(checkResult.url, checkResult.reason, 'click')
      return
    }
  }

  document.addEventListener('click', clickHandler, true) // 👈 capture phase (important!)

  // Intercept window.open()
  const originalWindowOpen = window.open
  window.open = function(url?: string | URL, target?: string, features?: string): Window | null {
    if (url) {
      const urlString = typeof url === 'string' ? url : url.href
      const checkResult = shouldBlockUrl(urlString)
      if (checkResult.blocked && checkResult.url) {
        notifyBlocked(checkResult.url, checkResult.reason, 'window.open')
        return null
      }
    }
    return originalWindowOpen.call(window, url, target, features)
  }

  // Note: window.location methods (href, replace, assign) cannot be intercepted 
  // due to browser security restrictions - they are read-only properties.
  // We can only intercept: window.open(), history.pushState(), history.replaceState(), and click events

  // Test hashchange event - fires when hash changes (e.g., location.href = '#/newSublocation')
  const hashChangeHandler = (e: HashChangeEvent) => {
    alert(`🔔 hashchange event fired!\n\nOld URL: ${e.oldURL}\nNew URL: ${e.newURL}\nCurrent Location: ${window.location.href}`)
    console.log('hashchange event:', {
      oldURL: e.oldURL,
      newURL: e.newURL,
      currentLocation: window.location.href,
      timestamp: new Date().toISOString()
    })
  }

  window.addEventListener('hashchange', hashChangeHandler)

  // Test beforeunload event - fires when page is about to unload (e.g., location.href = '/newPage')
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    const currentLocation = window.location.href
    
    // Check if this navigation should be blocked
    const checkResult = shouldBlockUrl(currentLocation)
    
    if (checkResult.blocked && checkResult.url) {
      // Notify about the blocked navigation attempt
      notifyBlocked(checkResult.url, checkResult.reason, 'location.href')
      
      // Best practice: preventDefault() + set returnValue for legacy support
      // Note: The browser will show its own generic message - we cannot customize it
      // See: https://developer.mozilla.org/en-US/docs/Web/API/BeforeUnloadEvent/returnValue
      e.preventDefault()
      e.returnValue = '' // Any truthy value works, but message is ignored by browsers
    }
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)

  // Intercept history.pushState()
  const originalPushState = history.pushState.bind(history)
  history.pushState = function(state: any, title: string, url?: string | URL | null) {
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
        notifyBlocked(checkResult.url, checkResult.reason, 'history.pushState')
        return
      }
    }
    return originalPushState(state, title, url)
  }

  // Intercept history.replaceState()
  const originalReplaceState = history.replaceState.bind(history)
  history.replaceState = function(state: any, title: string, url?: string | URL | null) {
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
        notifyBlocked(checkResult.url, checkResult.reason, 'history.replaceState')
        return
      }
    }
    return originalReplaceState(state, title, url)
  }

  // Return cleanup function to restore original functions
  return () => {
    document.removeEventListener('click', clickHandler, true)
    window.removeEventListener('hashchange', hashChangeHandler)
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    window.open = originalWindowOpen
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
  }
}
