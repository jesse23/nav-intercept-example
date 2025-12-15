import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { setupLinkGuard } from "@/lib/linkGuard"

interface Message {
  id: number
  type: string
  data: any
  timestamp: Date
}

function App() {
  const [guardEnabled, setGuardEnabled] = useState(false)
  const [allowExampleCom, setAllowExampleCom] = useState(false)
  const [blockInternal, setBlockInternal] = useState(false)
  const [allowSubLocation, setAllowSubLocation] = useState("")
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // Setup link guard with current options and get cleanup function
    const cleanup = setupLinkGuard({
      enabled: guardEnabled,
      allowedDomains: allowExampleCom ? ["example.com"] : undefined,
      allowInternal: blockInternal ? false : undefined,
      allowSubLocation: allowSubLocation || undefined,
    })
    
    // Return cleanup function to remove event listener when disabled or component unmounts
    return cleanup
  }, [guardEnabled, allowExampleCom, blockInternal, allowSubLocation])

  useEffect(() => {
    // Listen for postMessage events (mimicking native app)
    const handleMessage = (event: MessageEvent) => {
      // Only show messages from linkGuard (type: 'LINK_BLOCKED')
      if (
        event.data && 
        typeof event.data === 'object' && 
        event.data.type === 'LINK_BLOCKED'
      ) {
        setMessages((prev) => {
          const newMessage: Message = {
            id: Date.now() + Math.random(), // Generate unique ID
            type: event.data.type,
            data: event.data,
            timestamp: new Date(),
          }
          // Keep only last 50 messages
          return [newMessage, ...prev].slice(0, 50)
        })
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return (
    <div className="flex h-svh w-full overflow-hidden">
      {/* Left Side - Native App Message Bar */}
      <div className="w-80 border-r bg-muted/30 flex flex-col h-full">
        <div className="p-4 border-b bg-muted">
          <h2 className="text-lg font-semibold">Native App</h2>
          <p className="text-xs text-muted-foreground">Message Listener</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No messages received yet.
              <br />
              <span className="text-xs">Try blocking a link to see messages.</span>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="p-3 bg-background border rounded-lg text-sm space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">{msg.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  <pre className="whitespace-pre-wrap font-mono text-[10px]">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
        {messages.length > 0 && (
          <div className="p-2 border-t bg-muted/50">
            <button
              onClick={() => setMessages([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear Messages
            </button>
          </div>
        )}
      </div>

      {/* Right Side - Guest Panel */}
      <div className="flex-1 h-full overflow-y-auto">
        <div className="flex flex-col items-center gap-8 p-8">
          <div className="flex flex-col gap-4 max-w-2xl w-full">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Link Guard Test</h1>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Guest Panel
              </span>
            </div>
            
            {/* Control Checkboxes */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">Guard Settings</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardEnabled}
                  onChange={(e) => setGuardEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Enable Link Guard</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowExampleCom}
                  onChange={(e) => setAllowExampleCom(e.target.checked)}
                  className="w-4 h-4"
                  disabled={!guardEnabled}
                />
                <span>Allow example.com (whitelist domain)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockInternal}
                  onChange={(e) => setBlockInternal(e.target.checked)}
                  className="w-4 h-4"
                  disabled={!guardEnabled}
                />
                <span>Block Internal Links</span>
              </label>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Allow SubLocation (hash routing):</label>
                <input
                  type="text"
                  value={allowSubLocation}
                  onChange={(e) => setAllowSubLocation(e.target.value)}
                  placeholder="e.g., admin, public"
                  disabled={!guardEnabled}
                  className="px-3 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Only allow links matching #/&lt;sublocation&gt;/... pattern
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                Guard Status: <strong>{guardEnabled ? "Enabled" : "Disabled"}</strong>
              </p>
              {guardEnabled && (
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>External links will be blocked {allowExampleCom && "(except example.com)"}</p>
                  {blockInternal && <p>Internal links will be blocked</p>}
                  {allowSubLocation && (
                    <p>Only hash routes starting with #/{allowSubLocation}/ will be allowed</p>
                  )}
                </div>
              )}
            </div>

            {/* shadcn Button as Link Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">shadcn Button (asChild with &lt;a&gt;)</h2>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Internal Links:</p>
                <Button asChild variant="link">
                  <a href="/internal-page">Internal Link - /internal-page (Button variant="link")</a>
                </Button>
                <Button asChild variant="default">
                  <a href="#/admin/dashboard">Hash Route - #/admin/dashboard (Button variant="default")</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="#/public/home">Hash Route - #/public/home (Button variant="outline")</a>
                </Button>
                <p className="text-sm font-medium text-muted-foreground mt-2">External Links:</p>
                <Button asChild variant="default">
                  <a href="https://example.com" target="_blank" rel="noopener noreferrer">
                    External Link - example.com (Button variant="default")
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="https://google.com" target="_blank" rel="noopener noreferrer">
                    External Link - google.com (Button variant="outline")
                  </a>
                </Button>
              </div>
            </div>

            {/* Native &lt;a&gt; Element Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">Native &lt;a&gt; Elements</h2>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Internal Links:</p>
                <a href="/another-page" className="text-primary underline hover:no-underline">
                  Internal Link - /another-page (Native &lt;a&gt;)
                </a>
                <a href="#/admin/users" className="text-primary underline hover:no-underline">
                  Hash Route - #/admin/users (Native &lt;a&gt;)
                </a>
                <a href="#/public/about" className="text-primary underline hover:no-underline">
                  Hash Route - #/public/about (Native &lt;a&gt;)
                </a>
                <a href="#/settings" className="text-primary underline hover:no-underline">
                  Hash Route - #/settings (Native &lt;a&gt;)
                </a>
                <p className="text-sm font-medium text-muted-foreground mt-2">External Links:</p>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  External Link - github.com (Native &lt;a&gt;)
                </a>
                <a 
                  href="https://stackoverflow.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  External Link - stackoverflow.com (Native &lt;a&gt;)
                </a>
              </div>
            </div>

            {/* JavaScript API Navigation Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">JavaScript API Navigation</h2>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">Test JavaScript navigation methods:</p>
                <p className="text-xs text-muted-foreground">
                  Note: <code>window.location</code> methods (<code>href</code>, <code>replace()</code>, <code>assign()</code>) cannot be intercepted due to browser security restrictions (read-only properties). 
                  Only <code>window.open()</code>, <code>history.pushState()</code>, <code>history.replaceState()</code>, and click events can be intercepted.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => window.open('https://google.com', '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    window.open() - External
                  </Button>
                  <Button
                    onClick={() => window.open('#/admin/test', '_self')}
                    variant="outline"
                    size="sm"
                  >
                    window.open() - Hash Route
                  </Button>
                  <Button
                    onClick={() => {
                      (window.location as any).href = 'https://github.com'
                    }}
                    variant="outline"
                    size="sm"
                    disabled
                    title="Cannot be intercepted (browser security restriction)"
                  >
                    location.href - External (not intercepted)
                  </Button>
                  <Button
                    onClick={() => {
                      (window.location as any).href = '/test-page'
                    }}
                    variant="outline"
                    size="sm"
                    disabled
                    title="Cannot be intercepted (browser security restriction)"
                  >
                    location.href - Internal (not intercepted)
                  </Button>
                  <Button
                    onClick={() => window.location.replace('https://stackoverflow.com')}
                    variant="outline"
                    size="sm"
                    disabled
                    title="Cannot be intercepted (browser security restriction)"
                  >
                    location.replace() - External (not intercepted)
                  </Button>
                  <Button
                    onClick={() => window.location.replace('#/public/test')}
                    variant="outline"
                    size="sm"
                    disabled
                    title="Cannot be intercepted (browser security restriction)"
                  >
                    location.replace() - Hash (not intercepted)
                  </Button>
                  <Button
                    onClick={() => window.location.assign('https://example.com')}
                    variant="outline"
                    size="sm"
                    disabled
                    title="Cannot be intercepted (browser security restriction)"
                  >
                    location.assign() - External (not intercepted)
                  </Button>
                  <Button
                    onClick={() => window.location.assign('/another-internal')}
                    variant="outline"
                    size="sm"
                    disabled
                    title="Cannot be intercepted (browser security restriction)"
                  >
                    location.assign() - Internal (not intercepted)
                  </Button>
                  <Button
                    onClick={() => history.pushState({}, '', 'https://google.com')}
                    variant="outline"
                    size="sm"
                  >
                    history.pushState() - External
                  </Button>
                  <Button
                    onClick={() => history.pushState({}, '', '#/admin/push')}
                    variant="outline"
                    size="sm"
                  >
                    history.pushState() - Hash
                  </Button>
                  <Button
                    onClick={() => history.replaceState({}, '', 'https://github.com')}
                    variant="outline"
                    size="sm"
                  >
                    history.replaceState() - External
                  </Button>
                  <Button
                    onClick={() => history.replaceState({}, '', '#/public/replace')}
                    variant="outline"
                    size="sm"
                  >
                    history.replaceState() - Hash
                  </Button>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-semibold mb-2">How to test:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Enable the Link Guard checkbox</li>
                <li>Try clicking the external links - they should be blocked</li>
                <li>Try clicking the internal links - they should work normally</li>
                <li>Enable "Allow example.com" checkbox - example.com link should work, others still blocked</li>
                <li>Enable "Block Internal Links" - all internal links should be blocked</li>
                <li>Set "Allow SubLocation" to "admin" - only #/admin/* links will work, others blocked</li>
                <li>Test JavaScript APIs (window.open, location.href, history.pushState, etc.) - they should also be blocked</li>
                <li>Disable the guard and all links should work normally</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App