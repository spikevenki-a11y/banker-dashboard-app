"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Building2, AlertCircle, Loader2, KeyRound } from "lucide-react"

export default function TwoFactorPage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Verification failed")
      }
      window.dispatchEvent(new Event("banker_login"))
      router.push(data.redirectUrl || "/dashboard")
    } catch (err: any) {
      setError(err.message)
      setCode("")
      inputRef.current?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
    setCode(val)
    if (val.length === 6) {
      // Auto-submit when 6 digits entered
      setTimeout(() => {
        const form = e.target.closest("form")
        form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
      }, 100)
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
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to continue
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-slate-50/50"
                maxLength={6}
                autoFocus
                suppressHydrationWarning
              />
              <p className="text-center text-xs text-muted-foreground">
                Open your authenticator app and enter the current code
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full"
              type="submit"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => router.push("/login")}
            >
              Back to login
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 text-center text-sm text-slate-500">
        <p className="flex items-center justify-center gap-1">
          <Building2 className="h-3 w-3" />
          <span>NextZen Financial Systems © 2025</span>
        </p>
      </div>
    </div>
  )
}
