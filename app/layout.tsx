import './globals.css'
import { SyntheProvider } from '@/logic/SyntheProvider'

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
