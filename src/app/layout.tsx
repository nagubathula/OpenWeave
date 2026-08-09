import '../app.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OpenWeave',
  description: 'Design editor'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground h-screen w-screen overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
