"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { AuthContextType, User } from "./types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = () => {
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
        console.error("[v0] Error loading user from localStorage:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "banker_user") {
        if (e.newValue) {
          const storedUser = JSON.parse(e.newValue)
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
        } else {
          setUser(null)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("[v0] Error calling logout API:", error)
    }

    localStorage.removeItem("banker_user")
    setUser(null)
    window.location.href = "/login"
  }

  const value = {
    user,
    isAuthenticated: !!user,
    logout,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
