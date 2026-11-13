import AuthGuard from "@/components/AuthGuard"
import { AuthProvider } from "@/lib/auth-context"
import { NumberInputGuard } from "@/components/number-input-guard"
import { GlobalPopup } from "@/components/global-popup"
import "./globals.css"
import { Geist, Geist_Mono } from "next/font/google"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <NumberInputGuard />
        <AuthProvider>
          {/* <AuthGuard> */}
            {children}
          {/* </AuthGuard> */}
        </AuthProvider>
        {/* App-wide replacement for alert()/confirm()/prompt() — see lib/popup.ts */}
        <GlobalPopup />
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
