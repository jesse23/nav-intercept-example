import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { setupLinkGuard } from "@/lib/linkGuard"

function App() {
  const [guardEnabled, setGuardEnabled] = useState(false)
  const [allowExampleCom, setAllowExampleCom] = useState(false)

  useEffect(() => {
    // Setup link guard with current options and get cleanup function
    const cleanup = setupLinkGuard({
      enabled: guardEnabled,
      allowedDomains: allowExampleCom ? ["example.com"] : undefined,
    })
    
    // Return cleanup function to remove event listener when disabled or component unmounts
    return cleanup
  }, [guardEnabled, allowExampleCom])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col gap-4 max-w-2xl w-full">
        <h1 className="text-2xl font-bold">Link Guard Test</h1>
        
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
        </div>

        {/* Status */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            Guard Status: <strong>{guardEnabled ? "Enabled" : "Disabled"}</strong>
          </p>
          {guardEnabled && (
            <p className="text-sm text-muted-foreground mt-1">
              External links will be blocked {allowExampleCom && "(except example.com)"}
            </p>
          )}
        </div>

        {/* shadcn Button as Link Examples */}
        <div className="flex flex-col gap-4 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">shadcn Button (asChild with &lt;a&gt;)</h2>
          <div className="flex flex-col gap-2">
            <Button asChild variant="link">
              <a href="/internal-page">Internal Link (Button variant="link")</a>
            </Button>
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
            <a href="/another-page" className="text-primary underline hover:no-underline">
              Internal Link (Native &lt;a&gt;)
            </a>
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

        {/* Instructions */}
        <div className="p-4 bg-muted rounded-lg text-sm">
          <p className="font-semibold mb-2">How to test:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enable the Link Guard checkbox</li>
            <li>Try clicking the external links - they should be blocked</li>
            <li>Try clicking the internal links - they should work normally</li>
            <li>Enable "Allow example.com" checkbox - example.com link should work, others still blocked</li>
            <li>Disable the guard and all links should work normally</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default App