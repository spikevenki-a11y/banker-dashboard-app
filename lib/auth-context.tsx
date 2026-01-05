"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "./supabase/client"
import type { AuthContextType, User } from "./types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  console.log("[v0] AuthProvider initialized")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check localStorage (synchronous)
        const storedUserStr = localStorage.getItem("banker_user")
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr)
          const initials = storedUser.fullName
            ? storedUser.fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
            : "B"

          setUser({
            id: storedUser.id,
            name: storedUser.fullName || "Banker",
            email: storedUser.email || "",
            role: storedUser.role || "staff",
            branch: storedUser.branch || "Main Branch",
            initials,
          })
          setIsLoading(false)
          return
        }

        // Then check Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          const initials = (session.user.user_metadata?.full_name || "B")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()

          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || "Banker",
            email: session.user.email || "",
            role: session.user.user_metadata?.role || "staff",
            branch: session.user.user_metadata?.branch || "Main Branch",
            initials,
          })
        }
      } catch (error) {
        console.error("[v0] Error loading auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const initials = (session.user.user_metadata?.full_name || "B")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()

        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || "Banker",
          email: session.user.email || "",
          role: session.user.user_metadata?.role || "staff",
          branch: session.user.user_metadata?.branch || "Main Branch",
          initials,
        })
      } else if (!localStorage.getItem("banker_user")) {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const logout = async () => {
    localStorage.removeItem("banker_user")
    await supabase.auth.signOut()
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    logout,
    isLoading,
  }

  console.log("[v0] Auth state:", value)

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
