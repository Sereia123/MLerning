import './globals.css'
import { SyntheProvider } from '@/hooks/SyntheProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <SyntheProvider>
          {children}
        </SyntheProvider>
      </body>
    </html>
  )
}
