import type { Metadata, Viewport } from 'next'

import '../app.css'
import Script from 'next/script'

export const viewport: Viewport = {
  themeColor: '#0e0e0e'
}

export const metadata: Metadata = {
  title: 'OpenWeave',
  description: 'Design editor',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OpenWeave'
  },
  formatDetection: {
    telephone: false
  }
}

// Browser extensions (Bitdefender, Grammarly, …) stamp attributes onto the DOM
// before React hydrates, producing false hydration-mismatch warnings. Strip
// those attributes as they appear until hydration has settled.
const STRIP_EXTENSION_ATTRIBUTES = `(function () {
  var EXT_ATTR = /^(bis_skin_checked|bis_register|__processed_|data-gr-|data-new-gr-)/
  function strip(el) {
    if (!el || el.nodeType !== 1) return
    for (var i = el.attributes.length - 1; i >= 0; i--) {
      var name = el.attributes[i].name
      if (EXT_ATTR.test(name)) el.removeAttribute(name)
    }
  }
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i]
      if (m.type === 'attributes' && EXT_ATTR.test(m.attributeName)) {
        m.target.removeAttribute(m.attributeName)
      } else if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) strip(m.addedNodes[j])
      }
    }
  })
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true
  })
  window.addEventListener('load', function () {
    setTimeout(function () { observer.disconnect() }, 3000)
  })
})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script
          id="strip-extension-attributes"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRIBUTES }}
        />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground h-screen w-screen overflow-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
