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

  useEffect(() => {
    const getUserProfile = async (sessionUserOrEmail: any) => {
      try {
        const userIdOrEmail = sessionUserOrEmail.id || sessionUserOrEmail.email
        const query = sessionUserOrEmail.id
          ? supabase.from("profiles").select("*").eq("id", userIdOrEmail)
          : supabase.from("profiles").select("*").eq("email", userIdOrEmail)

        const { data: profile, error } = await query.single()

        if (error) throw error

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.full_name || "Banker",
            email: profile.email,
            role: profile.role || "staff",
            branch: profile.branch || "Main Branch",
            initials: (profile.full_name || "B")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase(),
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const demoUserStr = localStorage.getItem("v0_demo_user")
    if (demoUserStr) {
      const demoUser = JSON.parse(demoUserStr)
      getUserProfile(demoUser)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.removeItem("v0_demo_user") // Clear bypass if real session exists
        getUserProfile(session.user)
      } else if (!demoUserStr) {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const logout = async () => {
    localStorage.removeItem("v0_demo_user")
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
