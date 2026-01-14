"use client"
import { createContext, useContext, useEffect, useState } from "react"

const AuthContext = createContext<any>(null)

export function AuthProvider({ children } : { children: React.ReactNode }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" })
      const data = await res.json()
      setUser(data || null)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)   // ⬅ only after /me completes
    }
  }

  useEffect(() => {
    loadUser()
  }, [])
    const logout = async () => {
    try {
      console.log("Logging out user...")
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } finally {
      setUser(null)
      window.location.href = "/"
    }
  }
  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
