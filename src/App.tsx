import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { navigationInterceptor } from "@/lib/navigationInterceptor"

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
  const [splitPosition, setSplitPosition] = useState(60) // Percentage for native app panel
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Configure navigation interceptor with current options
    // Interceptor is always enabled (interceptors are always active), but blocking depends on settings
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
    
    navigationInterceptor.configure({
      enabled: true, // Interceptors are always active
      allowedDomains,
      allowInternal: blockInternal ? false : undefined,
      allowSubLocation: allowSubLocation.trim() || undefined,
      onBlocked: (info) => {
        // Update messages state
        setMessages((prev) => {
          const newMessage: Message = {
            id: Date.now() + Math.random(), // Generate unique ID
            type: 'LINK_BLOCKED',
            data: info,
            timestamp: new Date(),
          }
          // Keep only last 50 messages (latest at bottom)
          return [...prev, newMessage].slice(-50)
        })
        
        // Post message for cross-origin communication (mimicking native app)
        window.postMessage?.(
          {
            type: 'LINK_BLOCKED',
            ...info
          },
          '*'
        )
      },
    })
  }, [blockExternal, blockInternal, allowedExternalUrl, allowSubLocation])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const container = document.querySelector('.split-container')
      if (!container) return
      
      const containerWidth = container.clientWidth
      const newPosition = (e.clientX / containerWidth) * 100
      
      // Clamp between 20% and 80%
      const clampedPosition = Math.max(20, Math.min(80, newPosition))
      setSplitPosition(clampedPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  return (
    <div className="flex h-svh w-full overflow-hidden split-container">
      {/* Left Side - Host App Example Message Bar */}
      <div 
        className="hidden md:flex border-r bg-muted/30 flex-col h-full transition-none"
        style={{ width: `${splitPosition}%` }}
      >
        <div className="p-4 border-b bg-muted">
          <h2 className="text-lg font-semibold">Host App Example</h2>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              This is an app to mimic navigation interception for embedded panel.
            </p>
            <p className="text-xs font-semibold mb-2">How to use:</p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Check "Block External Links" to block external links</li>
              <li>Check "Block Internal Links" to block internal links</li>
              <li>Uncheck all options to allow all navigation</li>
            </ul>
          </div>
        </div>
        <div className="px-4 pt-4 pb-2 bg-muted/30">
          <h3 className="text-xs font-semibold">Message Listener</h3>
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
          <div ref={messagesEndRef} />
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

      {/* Draggable Splitter */}
      <div
        className="hidden md:flex w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 group-hover:bg-primary" />
      </div>

      {/* Right Side - Guest Panel */}
      <div 
        className="flex w-full h-full overflow-y-auto transition-none"
        style={{ 
          width: isMobile ? '100%' : `${100 - splitPosition}%`,
          flexShrink: isMobile ? undefined : 0
        }}
      >
        <div className="flex flex-col items-center gap-8 p-8">
          <div className="flex flex-col gap-4 max-w-2xl w-full">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Navigation Interceptor Test</h1>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Guest Panel
              </span>
            </div>
            
            {/* Control Settings */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">Interceptor Settings</h2>
              <p className="text-xs text-muted-foreground">
                Navigation interceptors are always active. Configure blocking rules below.
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
                  <span className="text-sm">Block External Links</span>
                </label>
                {blockExternal && (
                  <div className="ml-6 flex flex-col gap-2">
                    <label className="text-sm font-medium">Allowed External URL:</label>
                    <input
                      type="text"
                      value={allowedExternalUrl}
                      onChange={(e) => setAllowedExternalUrl(e.target.value)}
                      placeholder="e.g., https://example.com"
                      className="text-sm px-3 py-2 border rounded-md"
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
                  <span className="text-sm">Block Internal Links</span>
                </label>
                {blockInternal && (
                  <div className="ml-6 flex flex-col gap-2">
                    <label className="text-sm font-medium">Allowed SubLocation (hash routing):</label>
                    <input
                      type="text"
                      value={allowSubLocation}
                      onChange={(e) => setAllowSubLocation(e.target.value)}
                      placeholder="e.g., admin, public"
                      className="text-sm px-3 py-2 border rounded-md"
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
              <h2 className="text-lg font-semibold">HTML Tag Navigation</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">External</p>
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="https://google.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline hover:no-underline"
                    >
                      google.com
                    </a>
                    <a 
                      href="https://bing.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline hover:no-underline"
                    >
                      bing.com
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Internal</p>
                  <div className="flex flex-wrap gap-2">
                    <a href="/internal-page" className="text-sm text-primary underline hover:no-underline">
                      /internal-page
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Hash</p>
                  <div className="flex flex-wrap gap-4">
                    <a href="#/admin/dashboard" className="text-sm text-primary underline hover:no-underline">
                      #/admin/dashboard
                    </a>
                    <a href="#/settings/advanced" className="text-sm text-primary underline hover:no-underline">
                      #/settings/advanced
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* shadcn Button as Link Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">React Component Navigation</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">External</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="default">
                      <a href="https://google.com" target="_blank" rel="noopener noreferrer">
                        google.com
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="https://bing.com" target="_blank" rel="noopener noreferrer">
                        bing.com
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
                      <a href="#/settings/advanced">#/settings/advanced</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* JavaScript API Navigation Examples */}
            <div className="flex flex-col gap-4 p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">JavaScript API Navigation</h2>
              <div className="flex flex-col gap-4">
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
                          title="https://google.com"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => window.open('/internal-page', '_self')}
                          variant="outline"
                          size="sm"
                          title="/internal-page"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => window.open('#/admin/dashboard', '_self')}
                          variant="outline"
                          size="sm"
                          title="#/admin/dashboard"
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
                          title="https://google.com"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => history.pushState({}, '', '/internal-page')}
                          variant="outline"
                          size="sm"
                          title="/internal-page"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => history.pushState({}, '', '#/admin/dashboard')}
                          variant="outline"
                          size="sm"
                          title="#/admin/dashboard"
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
                          onClick={() => history.replaceState({}, '', 'https://google.com')}
                          variant="outline"
                          size="sm"
                          title="https://google.com"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => history.replaceState({}, '', '/internal-page')}
                          variant="outline"
                          size="sm"
                          title="/internal-page"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => history.replaceState({}, '', '#/admin/dashboard')}
                          variant="outline"
                          size="sm"
                          title="#/admin/dashboard"
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
                    <code>window.location</code> methods trigger <code>beforeunload</code> events, but the destination URL (href) cannot be captured due to browser security restrictions.
                  </p>
                  
                  <div className="space-y-4">
                    {/* location.href */}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">location.href</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => {
                            (window.location as any).href = 'https://google.com'
                          }}
                          variant="outline"
                          size="sm"
                          title="https://google.com"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => {
                            (window.location as any).href = '/internal-page'
                          }}
                          variant="outline"
                          size="sm"
                          title="/internal-page"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => {
                            (window.location as any).href = '#/admin/dashboard'
                          }}
                          variant="outline"
                          size="sm"
                          title="#/admin/dashboard"
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
                          onClick={() => window.location.replace('https://google.com')}
                          variant="outline"
                          size="sm"
                          title="https://google.com"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => window.location.replace('/internal-page')}
                          variant="outline"
                          size="sm"
                          title="/internal-page"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => window.location.replace('#/admin/dashboard')}
                          variant="outline"
                          size="sm"
                          title="#/admin/dashboard"
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
                          onClick={() => window.location.assign('https://google.com')}
                          variant="outline"
                          size="sm"
                          title="https://google.com"
                        >
                          External
                        </Button>
                        <Button
                          onClick={() => window.location.assign('/internal-page')}
                          variant="outline"
                          size="sm"
                          title="/internal-page"
                        >
                          Internal
                        </Button>
                        <Button
                          onClick={() => window.location.assign('#/admin/dashboard')}
                          variant="outline"
                          size="sm"
                          title="#/admin/dashboard"
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