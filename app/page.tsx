"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Building2, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Console } from "console"
console.log("Login page loaded")
const DEMO_USERS = [
  { username: "sldb00011", password: "password123", label: "Admin - Head Office" },
  { username: "sldb00002", password: "password123", label: "Staff - Downtown Branch" },
  { username: "sldb00003", password: "password123", label: "Staff - Westside Branch" },
]

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  // const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (isSubmitting) return // prevent double submit

  setIsSubmitting(true)
  setError(null)

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    
    // const text = await response.text()
    // console.log("venki " , text)
    const data = await response.json()
    console.log("Login response data:", data)
    if (!response.ok) {
      throw new Error(data.error || "Login failed")
    }

    router.push(data.redirectUrl)
    router.refresh()
  } catch (error) {
    console.log("Login error:", error)
    setError(error instanceof Error ? error.message : "An error occurred")
  } finally {
    setIsSubmitting(false)
  }
}


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] p-4 font-sans">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-foreground">Banker Dashboard</span>
      </div>

      <Card className="w-full max-w-[400px] border-none shadow-xl shadow-slate-200/50">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>Enter your credentials to access the banking portal</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )} */}
            <div className="space-y-2">
              <Label htmlFor="username">User Name</Label>
              <Input
                id="username"
                //type="email"
                placeholder="emp00001"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-50/50"
                placeholder="password123"
              />
            </div>
            <div className="pt-2">
              <p className="mb-2 text-xs font-medium text-slate-500">Quick Access (Demo):</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_USERS.map((user) => (
                  <Button
                    key={user.username}
                    type="button"
                    variant="outline"
                    className="h-7 px-2 text-[10px] bg-transparent"
                    onClick={() => {
                      setUsername(user.username)
                      setPassword(user.password)
                    }}
                  >
                    {user.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-4">
          <Button variant="link" className="h-auto p-0 text-slate-500 underline-offset-4 hover:underline">
            Privacy Policy
          </Button>
          <span className="h-1 w-1 rounded-full bg-slate-300"></span>
          <Button variant="link" className="h-auto p-0 text-slate-500 underline-offset-4 hover:underline">
            Terms of Service
          </Button>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1">
          <Building2 className="h-3 w-3" />
          <span>NextZen Financial Systems © 2025</span>
        </p>
      </div>
    </div>
  )
}
