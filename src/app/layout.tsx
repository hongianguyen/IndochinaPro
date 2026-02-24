import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Indochina Travel Pro — AI Luxury Itinerary Builder',
  description: 'Craft bespoke luxury journeys across Indochina powered by AI and curated from 2,000+ real tour programs',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-navy-950 text-cream-100 antialiased">
        {children}
      </body>
    </html>
  )
}
