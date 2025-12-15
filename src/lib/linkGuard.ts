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
    let hashPath = ''
    let isExternal = false
    let url: URL

    if (isHashOnly) {
      // Hash-only link is always internal
      hashPath = href.slice(1) // Remove leading #
      isExternal = false
      url = new URL(window.location.href)
      url.hash = href
    } else {
      // Try to parse as URL
      try {
        url = new URL(href, window.location.href)
        isExternal = url.origin !== window.location.origin
        hashPath = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
      } catch {
        // If URL parsing fails, treat as internal relative path
        isExternal = false
        url = new URL(window.location.href)
        url.pathname = href
      }
    }

    if (isExternal) {
      // Handle external links
      if (
        options.allowedDomains &&
        options.allowedDomains.includes(url.hostname)
      ) {
        return
      }

      // 🚫 BLOCK external link
      e.preventDefault()
      e.stopPropagation()

      // Optional: notify native layer
      window.postMessage?.(
        { type: 'LINK_BLOCKED', href: url.href },
        '*'
      )
      return
    }

    // Handle internal links
    if (options.allowInternal === false) {
      // 🚫 BLOCK internal link
      e.preventDefault()
      e.stopPropagation()

      // Optional: notify native layer
      window.postMessage?.(
        { type: 'LINK_BLOCKED', href: url.href },
        '*'
      )
      return
    }

    // Check sublocation filter for hash-based routing (pattern: #/<subLocation>/...)
    if (options.allowSubLocation && hashPath) {
      // Check if hash path starts with /<allowSubLocation>/ or equals /<allowSubLocation>
      const expectedPrefix = `/${options.allowSubLocation}`
      const startsWithSubLocation = 
        hashPath.startsWith(expectedPrefix + '/') || 
        hashPath === expectedPrefix ||
        hashPath.startsWith(expectedPrefix + '?') // Handle query params
      
      if (!startsWithSubLocation) {
        // 🚫 BLOCK - doesn't match allowed sublocation
        e.preventDefault()
        e.stopPropagation()

        // Optional: notify native layer
        window.postMessage?.(
          { type: 'LINK_BLOCKED', href: url.href, reason: 'sublocation_mismatch' },
          '*'
        )
        return
      }
    }
  }

  document.addEventListener('click', clickHandler, true) // 👈 capture phase (important!)

  // Return cleanup function to remove the listener
  return () => {
    document.removeEventListener('click', clickHandler, true)
  }
}
