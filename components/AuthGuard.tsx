"use client"
import { useAuth } from "@/lib/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

const PUBLIC = ["/", "/login"]

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const path = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return        // ⛔ DO NOTHING until auth resolved

    if (!user && !PUBLIC.includes(path)) {
      router.replace("/login")
    }
  }, [user, isLoading, path])

  if (isLoading) return null
  if (!user && !PUBLIC.includes(path)) return null

  return <>{children}</>
}
