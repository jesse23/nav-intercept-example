# Navigation Interceptor Example

A demonstration of a pure JavaScript navigation interceptor library that can block or allow navigation attempts based on configurable rules. This is useful for embedded web applications where you need to control navigation behavior.

## Navigation Interceptor

The `navigationInterceptor` is a singleton library that intercepts and controls navigation attempts in the browser.

### How It Works

The interceptor works by:

1. **Intercepting at module load time**: The library immediately replaces native browser APIs (`window.open`, `history.pushState`, `history.replaceState`) and sets up event listeners when the module loads, before other libraries can cache the original methods.

2. **Event-based interception**: 
   - Click events on `<a>` tags are intercepted in the capture phase
   - Hash change events are monitored via `hashchange` listener
   - Location API calls are intercepted via `beforeunload` event

3. **URL validation**: Each navigation attempt is checked against configured rules before being allowed or blocked.

### What It Can Block

✅ **Directly intercepted (with URL access)**:
- Click events on anchor tags (`<a href="...">`)
- `window.open()` calls
- `history.pushState()` calls
- `history.replaceState()` calls
- Hash-based navigation (`#/path`)

✅ **Intercepted via beforeunload (URL not accessible)**:
- `location.href` assignments
- `location.assign()` calls
- `location.replace()` calls

### What It Cannot Block

❌ **Limitations**:
- **Location API**: Can only show a generic browser confirmation dialog (cannot access destination URL or customize message)
- **Programmatic navigation**: Some frameworks may cache navigation methods before the interceptor loads
- **Form submissions**: Not intercepted (would require form-specific handling)
- **Meta refresh tags**: Not intercepted

### Configuration Options

- `enabled`: Enable/disable the interceptor
- `allowedDomains`: Whitelist of external domains to allow
- `allowInternal`: Control whether internal links are blocked
- `allowSubLocation`: Only allow hash routes matching a specific sublocation pattern (e.g., `#/admin/...`)
- `blockLocationAPI`: Block all Location API navigation (shows browser confirmation)
- `onBlocked`: Callback function when navigation is blocked

### Usage

```typescript
import { navigationInterceptor } from '@/lib/navigationInterceptor'

// Configure the interceptor
navigationInterceptor.configure({
  enabled: true,
  allowedDomains: ['example.com'],
  allowInternal: false,
  allowSubLocation: 'admin',
  onBlocked: (info) => {
    console.log('Blocked:', info.href, 'from', info.source)
  }
})
```

## Development

This project uses React + TypeScript + Vite. Run the development server to see the interceptor in action with various navigation examples.

```bash
npm install
npm run dev
```
