"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "./supabase/client"
import type { AuthContextType, User } from "./types"
import { getSession } from "@/lib/auth/session"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const session = getSession() 

  useEffect(() => {
    const getUserProfile = async (session: any) => {
      try {
        const userIdOrEmail = session.user.id || session.user.email
        const query = session.user.id
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
        console.log("[v1] Error fetching profile:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        getUserProfile(session.user)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const logout = async () => {
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
