// linkGuard.ts
export function setupLinkGuard(options: {
  enabled: boolean
  allowExternal?: boolean
  allowedDomains?: string[]
}) {
  if (!options.enabled) return

  document.addEventListener(
    'click',
    (e) => {
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
    },
    true // 👈 capture phase (important!)
  )
}
