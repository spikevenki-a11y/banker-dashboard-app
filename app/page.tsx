"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"



export default function DashboardPage() {
  
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
      if (!isLoading && isAuthenticated) {
        router.push("/dashboard")
      }else if (!isLoading && !isAuthenticated) {
        router.push("/login")
      }
  }, [isAuthenticated, isLoading, router])
  // if (isAuthenticated) {
  //    // loading spinner
  //   return (
  //     <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
  //       <div className="flex flex-col items-center gap-4">
  //         <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //         <p className="text-sm text-slate-600">Loading dashboard...</p>
  //       </div>
  //     </div>
  //   )
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
