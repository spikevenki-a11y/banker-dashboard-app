"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { AuthContextType, User } from "./types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOGIN_EVENT = "banker_login"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = () => {
    try {
      const storedUserStr = localStorage.getItem("banker_user")
      console.log("[v0] AuthProvider loading user:", storedUserStr)
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr)
        const initials = storedUser.fullName
          ? storedUser.fullName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
          : "B"

        const userData = {
          id: storedUser.id,
          name: storedUser.fullName ,
          email: storedUser.email || "",
          role: storedUser.role,
          branch: storedUser.branch,
          initials,
        }
        console.log("[v0] AuthProvider setting user:", userData)
        setUser(userData)
      } else {
        console.log("[v0] AuthProvider: No user in localStorage")
        setUser(null)
      }
    } catch (error) {
      console.error("[v0] Error loading user from localStorage:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUser()

    const handleLoginEvent = () => {
      console.log("[v0] AuthProvider received login event")
      loadUser()
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "banker_user") {
        console.log("[v0] AuthProvider detected storage change")
        loadUser()
      }
    }

    window.addEventListener(LOGIN_EVENT, handleLoginEvent)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener(LOGIN_EVENT, handleLoginEvent)
      window.removeEventListener("storage", handleStorageChange)
    }
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

  console.log("[v0] AuthProvider state:", { isAuthenticated: !!user, isLoading, hasUser: !!user })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
