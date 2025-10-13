import './globals.css'
import Sidebar from '@/components/Sidebar'
import SessionProvider from '@/components/SessionProvider'

export const metadata = {
  title: 'Dofus Tools',
  description: 'Dofus Tools Application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
