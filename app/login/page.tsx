"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  Loader2,
  Fingerprint,
  UserRound,
  Lock,
  Eye,
  EyeOff,
  Landmark,
  ShieldCheck,
  Sprout,
  Users2,
  TrendingUp,
  MonitorSmartphone,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getSafeRedirect } from "@/lib/safe-redirect"

const DEMO_USERS = [
  { username: "sldb00011", password: "password123", label: "Staff - Downtown Branch" },
]

const BRANCHES = [
  "Downtown Branch",
  "Anna Nagar Branch",
  "Coimbatore Branch",
  "Madurai Branch",
  "Tiruchirappalli Branch",
]

const FEATURES = [
  { icon: Sprout, title: "Support to", subtitle: "Farmers" },
  { icon: Users2, title: "Strengthening", subtitle: "Cooperatives" },
  { icon: TrendingUp, title: "Promoting", subtitle: "Rural Development" },
  { icon: ShieldCheck, title: "Secure", subtitle: "& Reliable" },
  { icon: MonitorSmartphone, title: "Digital Banking", subtitle: "for All" },
]

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [branch, setBranch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isBiometricLoading, setIsBiometricLoading] = useState(false)
  const [webAuthnSupported, setWebAuthnSupported] = useState(false)
  const [showForgotInfo, setShowForgotInfo] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const [from, setFrom] = useState<string | null>(null)

  useEffect(() => {
    setFrom(new URLSearchParams(window.location.search).get("from"))
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getSafeRedirect(from, "/dashboard"))
    }
  }, [isAuthenticated, from])

  useEffect(() => {
    setWebAuthnSupported(
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      if (data.requiresTwoFactor) {
        router.push(from ? `/2fa?from=${encodeURIComponent(from)}` : "/2fa")
        return
      }

      window.dispatchEvent(new Event("banker_login"))
      router.push(getSafeRedirect(from, "/dashboard"))
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFingerprintLogin = async () => {
    if (!username.trim()) {
      setError("Please enter your username before using fingerprint login")
      return
    }
    setIsBiometricLoading(true)
    setError(null)
    try {
      // Get authentication options
      const optRes = await fetch("/api/auth/webauthn/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const options = await optRes.json()
      if (!optRes.ok) throw new Error(options.error || "Failed to get authentication options")

      // Trigger browser biometric prompt
      const { startAuthentication } = await import("@simplewebauthn/browser")
      const assertion = await startAuthentication({ optionsJSON: options })

      // Verify with server
      const verifyRes = await fetch("/api/auth/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || "Fingerprint verification failed")

      window.dispatchEvent(new Event("banker_login"))
      router.push(getSafeRedirect(from, verifyData.redirectUrl || "/dashboard"))
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Fingerprint authentication was cancelled or not allowed")
      } else {
        setError(err.message || "Fingerprint authentication failed")
      }
    } finally {
      setIsBiometricLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative overflow-hidden">
        <img
          src="/images/login/background.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="relative z-10 flex min-h-[640px] flex-col sm:min-h-[760px] lg:min-h-[820px] opacity-80">
          <header className="flex items-start justify-between px-4 pt-4 sm:px-8 sm:pt-6 lg:px-12">
            <img
              src="/images/login/gov_logo.png"
              alt="Government of Tamil Nadu"
              className="h-14 w-auto shrink-0 object-contain drop-shadow sm:h-20 lg:h-24"
            />
            <div className="hidden flex-1 flex-col items-center px-4 text-center md:flex">
              <h1 className="text-lg font-bold leading-tight text-green-800 lg:text-2xl">
                Tamil Nadu State Cooperative
                <br />
                Agriculture &amp; Rural Development Bank
              </h1>
              <p className="mt-0.5 text-base font-bold text-green-800 lg:text-xl">( TNSCARDB )</p>
              <div className="my-1.5 h-px w-32 bg-green-700/40 lg:w-48" />
              <p className="text-sm font-bold tracking-wide text-blue-900 lg:text-base">CORE BANKING SOLUTION (CBS)</p>
              <p className="mt-1 text-[11px] text-slate-700 lg:text-xs">
                Empowering Farmers &nbsp;•&nbsp; Strengthening Rural Tamil Nadu &nbsp;•&nbsp; Secure Digital Banking
              </p>
            </div>
            <img
              src="/images/login/logo_2.png"
              alt="Tamil Nadu Cooperative"
              className="h-14 w-auto shrink-0 object-contain sm:h-20 lg:h-24"
            />
          </header>

          <div className="px-4 pt-2 text-center md:hidden">
            <h1 className="text-sm font-bold leading-snug text-green-800">
              Tamil Nadu State Cooperative Agriculture &amp; Rural Development Bank (TNSCARDB)
            </h1>
            <p className="mt-0.5 text-xs font-bold text-blue-900">CORE BANKING SOLUTION (CBS)</p>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-6 md:justify-end md:px-10 md:py-10 lg:px-16">
            <Card className="w-full max-w-sm border-none bg-white/95 shadow-2xl backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-px w-6 bg-green-600" />
                  <CardTitle className="text-lg text-green-800">Welcome Back!</CardTitle>
                  <span className="h-px w-6 bg-green-600" />
                </div>
                <CardDescription>Please login to access your account</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-3">
                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="username"
                      placeholder="User ID"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-11 bg-slate-50/60 pl-9"
                      suppressHydrationWarning
                    />
                  </div>

                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 bg-slate-50/60 pl-9 pr-9"
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* <div className="relative">
                    <Select value={branch} onValueChange={setBranch}>
                      <SelectTrigger className="h-11 w-full bg-slate-50/60 pl-9">
                        <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}

                  <div className="pt-1">
                    <p className="mb-1.5 text-xs font-medium text-slate-500">Quick Access (Demo):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DEMO_USERS.map((u) => (
                        <Button
                          key={u.username}
                          type="button"
                          variant="outline"
                          className="h-7 px-2 text-[10px] bg-transparent"
                          onClick={() => {
                            setUsername(u.username)
                            setPassword(u.password)
                          }}
                        >
                          {u.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isLoading || isBiometricLoading}
                    className="h-11 w-full bg-gradient-to-r from-green-600 to-blue-900 text-sm font-semibold tracking-wide hover:opacity-90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" /> LOGIN
                      </>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowForgotInfo((v) => !v)}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                  {showForgotInfo && (
                    <p className="-mt-1.5 text-center text-[11px] text-slate-500">
                      Please contact your branch administrator to reset your password.
                    </p>
                  )}

                  {webAuthnSupported && (
                    <>
                      <div className="flex w-full items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full gap-2 bg-transparent text-sm"
                        onClick={handleFingerprintLogin}
                        disabled={isLoading || isBiometricLoading}
                      >
                        {isBiometricLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Fingerprint className="h-4 w-4" />
                        )}
                        {isBiometricLoading ? "Verifying..." : "Login with Fingerprint"}
                      </Button>
                    </>
                  )}

                  <div className="mt-1 w-full rounded-md bg-green-50 px-3 py-2 text-center">
                    <p className="flex items-center justify-center gap-1 text-xs font-semibold text-green-800">
                      <ShieldCheck className="h-3.5 w-3.5" /> Security Notice
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      This is a secure system. Please do not share your credentials with anyone.
                    </p>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-5 border-t border-slate-100 bg-white px-6 py-6 sm:grid-cols-5 sm:gap-4 sm:px-10">
        {FEATURES.map(({ icon: Icon, title, subtitle }) => (
          <div key={subtitle} className="flex items-center gap-2.5">
            <Icon className="h-8 w-8 shrink-0 text-green-700" />
            <div className="text-xs leading-tight">
              <p className="text-slate-600">{title}</p>
              <p className="font-bold text-green-800">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5 bg-green-900 px-6 py-3 text-center text-[11px] text-green-50 sm:flex-row sm:justify-between sm:text-xs">
        <span className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> © {new Date().getFullYear()} TNSCARDB. All Rights Reserved.
        </span>
        <span className="text-green-200">Best viewed in Chrome 90+ / Firefox 90+ / Edge 90+</span>
        <span>Ver. 1.0.0</span>
      </div>
    </div>
  )
}
