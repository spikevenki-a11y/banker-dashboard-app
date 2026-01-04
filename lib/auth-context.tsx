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
  console.log("[user ",user)
  console.log("[v0] AuthProvider initialized")
  useEffect(() => {
    const checkStoredUser = () => {
      try {
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
        }
      } catch (error) {
        console.error("[v0] Error loading stored user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkStoredUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Real Supabase auth session
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
      setIsLoading(false)
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  console.log("[v0] useAuth context:", context)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
