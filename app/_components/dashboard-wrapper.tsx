"use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardFooter } from "@/components/dashboard-footer"
import { useAuth } from "@/lib/auth-context"
import { Analytics } from "@vercel/analytics/next"

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  // const { isAuthenticated, isLoading } = useAuth()

  // During loading or if not authenticated, just show the children (which will be the login page)
  // if (isLoading || !isAuthenticated) {
    // return <>{children}</>
  // }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <DashboardSidebar />

        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader />

          <main className="min-h-0 flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Full-width footer under the sidebar and the page (Figma: ARDB Homepage › Footer) */}
      <DashboardFooter />

      <Analytics />
    </div>


  )
}

