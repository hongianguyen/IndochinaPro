import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Indochina Travel Pro — AI Itinerary Builder',
  description: 'Xây dựng hành trình Đông Dương sang trọng với AI',
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
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-navy-950 text-cream-100 antialiased">
        {children}
      </body>
    </html>
  )
}
