"use client"

import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useAuth } from "@/lib/auth-context"
import { Analytics } from "@vercel/analytics/next"
import { Loader2 } from "lucide-react"

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  // const { isAuthenticated, isLoading } = useAuth()

  // During loading or if not authenticated, just show the children (which will be the login page)
  // if (isLoading || !isAuthenticated) {
    // return <>{children}</>
  // }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading LDB Banking System...</p>
        </div>
      </div>
  )
}
