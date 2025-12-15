// linkGuard.ts
export function setupLinkGuard(options: {
  enabled: boolean
  allowExternal?: boolean
  allowedDomains?: string[]
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

    // ignore hashes, javascript:, mailto, tel, etc
    if (
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      return
    }

    const url = new URL(href, window.location.href)

    const isExternal = url.origin !== window.location.origin

    if (isExternal) {
      if (
        options.allowedDomains &&
        options.allowedDomains.includes(url.hostname)
      ) {
        return
      }

      // 🚫 BLOCK
      e.preventDefault()
      e.stopPropagation()

      // Optional: notify native layer
      window.postMessage?.(
        { type: 'LINK_BLOCKED', href: url.href },
        '*'
      )
    }
  }

  document.addEventListener('click', clickHandler, true) // 👈 capture phase (important!)

  // Return cleanup function to remove the listener
  return () => {
    document.removeEventListener('click', clickHandler, true)
  }
}
