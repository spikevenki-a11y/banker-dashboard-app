"use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useAuth } from "@/lib/auth-context"
import { Analytics } from "@vercel/analytics/next"

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  // const { isAuthenticated, isLoading } = useAuth()

  // During loading or if not authenticated, just show the children (which will be the login page)
  // if (isLoading || !isAuthenticated) {
    // return <>{children}</>
  // }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
      <Analytics />
    </div>
  )
}
