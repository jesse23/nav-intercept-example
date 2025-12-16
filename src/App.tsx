import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { linkGuard } from "@/lib/linkGuard"

interface Message {
  id: number
  type: string
  data: any
  timestamp: Date
}

function App() {
  const [blockExternal, setBlockExternal] = useState(false)
  const [blockInternal, setBlockInternal] = useState(false)
  const [allowedExternalUrl, setAllowedExternalUrl] = useState("")
  const [allowSubLocation, setAllowSubLocation] = useState("")
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    // Configure link guard with current options
    // Guard is always enabled (interceptors are always active), but blocking depends on settings
    let allowedDomains: string[] | undefined = undefined
    
    if (blockExternal) {
      // If blocking external, set up whitelist
      if (allowedExternalUrl.trim()) {
        try {
          const url = new URL(allowedExternalUrl)
          allowedDomains = [url.hostname]
        } catch {
          // Invalid URL, block all external
          allowedDomains = []
        }
      } else {
        // Block all external (empty whitelist)
        allowedDomains = []
      }
    }
    // If not blocking external, allowedDomains stays undefined (allow all)
    
    linkGuard.configure({
      enabled: true, // Interceptors are always active
      allowedDomains,
      allowInternal: blockInternal ? false : undefined,
      allowSubLocation: allowSubLocation.trim() || undefined,
    })
  }, [blockExternal, blockInternal, allowedExternalUrl, allowSubLocation])

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
      <div className="hidden md:flex md:w-[60%] border-r bg-muted/30 flex-col h-full">
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
        {/* Instructions */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-sm font-semibold mb-2">Instructions:</p>
          <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
            <li>Check "Block External Links" - external links should be blocked</li>
            <li>Check "Block Internal Links" - internal links should be blocked</li>
            <li>Enter an allowed external URL - that domain should work even if external blocking is enabled</li>
            <li>Set "Allowed SubLocation" to "admin" - only #/admin/* links will work, others blocked</li>
            <li>Test JavaScript APIs (window.open, location.href, history.pushState, etc.) - they should also be blocked</li>
            <li>Uncheck all blocking options - all navigation should work normally</li>
          </ol>
        </div>
      </div>

      {/* Right Side - Guest Panel */}
      <div className="flex md:w-[40%] w-full h-full overflow-y-auto">
        <div className="flex flex-col items-center gap-8 p-8">
          <div className="flex flex-col gap-4 max-w-2xl w-full">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Link Guard Test</h1>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Guest Panel
              </span>
            </div>
            
            {/* Control Settings */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">Guard Settings</h2>
              <p className="text-xs text-muted-foreground">
                Link guard interceptors are always active. Configure blocking rules below.
              </p>
              
              {/* Block External Links Group */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockExternal}
                    onChange={(e) => setBlockExternal(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Block External Links</span>
                </label>
                {blockExternal && (
                  <div className="ml-6 flex flex-col gap-2">
                    <label className="text-sm font-medium">Allowed External URL:</label>
                    <input
                      type="text"
                      value={allowedExternalUrl}
                      onChange={(e) => setAllowedExternalUrl(e.target.value)}
                      placeholder="e.g., https://example.com"
                      className="px-3 py-2 border rounded-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Single external URL that will be allowed even if "Block External Links" is enabled
                    </p>
                  </div>
                )}
              </div>
              
              {/* Block Internal Links Group */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockInternal}
                    onChange={(e) => setBlockInternal(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Block Internal Links</span>
                </label>
                {blockInternal && (
                  <div className="ml-6 flex flex-col gap-2">
                    <label className="text-sm font-medium">Allowed SubLocation (hash routing):</label>
                    <input
                      type="text"
                      value={allowSubLocation}
                      onChange={(e) => setAllowSubLocation(e.target.value)}
                      placeholder="e.g., admin, public"
                      className="px-3 py-2 border rounded-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Only allow links matching #/&lt;sublocation&gt;/... pattern
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Native &lt;a&gt; Element Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">HTML &lt;a&gt; tag</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">External</p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href="https://github.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      github.com
                    </a>
                    <a 
                      href="https://stackoverflow.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      stackoverflow.com
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Internal</p>
                  <div className="flex flex-wrap gap-2">
                    <a href="/another-page" className="text-primary underline hover:no-underline">
                      /another-page
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Hash</p>
                  <div className="flex flex-wrap gap-2">
                    <a href="#/admin/users" className="text-primary underline hover:no-underline">
                      #/admin/users
                    </a>
                    <a href="#/public/about" className="text-primary underline hover:no-underline">
                      #/public/about
                    </a>
                    <a href="#/settings" className="text-primary underline hover:no-underline">
                      #/settings
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* shadcn Button as Link Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">React Button (shadcn)</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">External</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="default">
                      <a href="https://example.com" target="_blank" rel="noopener noreferrer">
                        example.com
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="https://google.com" target="_blank" rel="noopener noreferrer">
                        google.com
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Internal</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="default">
                      <a href="/internal-page">/internal-page</a>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Hash</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="default">
                      <a href="#/admin/dashboard">#/admin/dashboard</a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="#/public/home">#/public/home</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* JavaScript API Navigation Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">JavaScript API Navigation</h2>
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-muted-foreground">Test JavaScript navigation methods:</p>
                
                {/* Directly intercepted APIs */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    <code>window.open()</code>, <code>history.pushState()</code>, <code>history.replaceState()</code>, and click events are directly intercepted.
                  </p>
                  
                  <div className="space-y-4">
                    {/* window.open() */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">window.open()</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => window.open('https://google.com', '_blank')}
                          variant="outline"
                          size="sm"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => window.open('/test-page', '_self')}
                          variant="outline"
                          size="sm"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => window.open('#/admin/test', '_self')}
                          variant="outline"
                          size="sm"
                        >
                          Hash
                        </Button>
                      </div>
                    </div>

                    {/* history.pushState() */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">history.pushState()</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => history.pushState({}, '', 'https://google.com')}
                          variant="outline"
                          size="sm"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => history.pushState({}, '', '/test-push')}
                          variant="outline"
                          size="sm"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => history.pushState({}, '', '#/admin/push')}
                          variant="outline"
                          size="sm"
                        >
                          Hash
                        </Button>
                      </div>
                    </div>

                    {/* history.replaceState() */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">history.replaceState()</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => history.replaceState({}, '', 'https://github.com')}
                          variant="outline"
                          size="sm"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => history.replaceState({}, '', '/test-replace')}
                          variant="outline"
                          size="sm"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => history.replaceState({}, '', '#/public/replace')}
                          variant="outline"
                          size="sm"
                        >
                          Hash
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location methods intercepted via beforeunload */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    <code>window.location</code> methods are intercepted via <code>beforeunload</code> event, which shows a browser confirmation dialog to block navigation.
                  </p>
                  
                  <div className="space-y-4">
                    {/* location.href */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">location.href</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            (window.location as any).href = 'https://github.com'
                          }}
                          variant="outline"
                          size="sm"
                          title="Intercepted via beforeunload event"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => {
                            (window.location as any).href = '/test-page'
                          }}
                          variant="outline"
                          size="sm"
                          title="Intercepted via beforeunload event"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => {
                            (window.location as any).href = '#/public/test'
                          }}
                          variant="outline"
                          size="sm"
                          title="Intercepted via hashchange event"
                        >
                          Hash
                        </Button>
                      </div>
                    </div>

                    {/* location.replace() */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">location.replace()</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => window.location.replace('https://stackoverflow.com')}
                          variant="outline"
                          size="sm"
                          title="Intercepted via beforeunload event"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => window.location.replace('/another-internal')}
                          variant="outline"
                          size="sm"
                          title="Intercepted via beforeunload event"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => window.location.replace('#/public/test')}
                          variant="outline"
                          size="sm"
                          title="Intercepted via hashchange event"
                        >
                          Hash
                        </Button>
                      </div>
                    </div>

                    {/* location.assign() */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">location.assign()</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => window.location.assign('https://example.com')}
                          variant="outline"
                          size="sm"
                          title="Intercepted via beforeunload event"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => window.location.assign('/another-internal')}
                          variant="outline"
                          size="sm"
                          title="Intercepted via beforeunload event"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => window.location.assign('#/admin/assign')}
                          variant="outline"
                          size="sm"
                          title="Intercepted via hashchange event"
                        >
                          Hash
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App