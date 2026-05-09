"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  KeyRound,
  Fingerprint,
} from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

type Step = "idle" | "qr"

export default function SecurityPage() {
  const router = useRouter()

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null)
  const [loading2FA, setLoading2FA] = useState(true)
  const [enableStep, setEnableStep] = useState<Step>("idle")
  const [setupSecret, setSetupSecret] = useState("")
  const [setupQR, setSetupQR] = useState("")
  const [enableToken, setEnableToken] = useState("")
  const [enableLoading, setEnableLoading] = useState(false)
  const [enableError, setEnableError] = useState<string | null>(null)
  const [disableOpen, setDisableOpen] = useState(false)
  const [disableToken, setDisableToken] = useState("")
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableError, setDisableError] = useState<string | null>(null)

  // Fingerprint state
  const [isFPEnabled, setIsFPEnabled] = useState<boolean | null>(null)
  const [loadingFP, setLoadingFP] = useState(true)
  const [fpLoading, setFpLoading] = useState(false)
  const [fpError, setFpError] = useState<string | null>(null)
  const [fpDisableOpen, setFpDisableOpen] = useState(false)
  const [fpDisableLoading, setFpDisableLoading] = useState(false)
  const [webAuthnSupported, setWebAuthnSupported] = useState(false)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setWebAuthnSupported(
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    )

    fetch("/api/auth/2fa/setup")
      .then((r) => r.json())
      .then((d) => setIs2FAEnabled(d.enabled ?? false))
      .catch(() => setIs2FAEnabled(false))
      .finally(() => setLoading2FA(false))

    fetch("/api/auth/webauthn/status")
      .then((r) => r.json())
      .then((d) => setIsFPEnabled(d.enabled ?? false))
      .catch(() => setIsFPEnabled(false))
      .finally(() => setLoadingFP(false))
  }, [])

  // --- 2FA handlers ---
  const startEnableFlow = async () => {
    setEnableError(null)
    setEnableStep("qr")
    setEnableLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSetupSecret(data.secret)
      setSetupQR(data.qrCode)
    } catch (err: any) {
      setEnableError(err.message)
      setEnableStep("idle")
    } finally {
      setEnableLoading(false)
    }
  }

  const handleEnable2FA = async () => {
    if (enableToken.length !== 6) { setEnableError("Please enter a 6-digit code"); return }
    setEnableLoading(true)
    setEnableError(null)
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: enableToken, secret: setupSecret }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIs2FAEnabled(true)
      setEnableStep("idle")
      setEnableToken(""); setSetupSecret(""); setSetupQR("")
      setSuccessMessage("Two-factor authentication has been enabled.")
    } catch (err: any) {
      setEnableError(err.message)
    } finally {
      setEnableLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (disableToken.length !== 6) { setDisableError("Please enter a 6-digit code"); return }
    setDisableLoading(true)
    setDisableError(null)
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: disableToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIs2FAEnabled(false)
      setDisableOpen(false)
      setDisableToken("")
      setSuccessMessage("Two-factor authentication has been disabled.")
    } catch (err: any) {
      setDisableError(err.message)
    } finally {
      setDisableLoading(false)
    }
  }

  // --- Fingerprint handlers ---
  const handleRegisterFingerprint = async () => {
    setFpLoading(true)
    setFpError(null)
    try {
      const optRes = await fetch("/api/auth/webauthn/register-options")
      const options = await optRes.json()
      if (!optRes.ok) throw new Error(options.error)

      const { startRegistration } = await import("@simplewebauthn/browser")
      const attResp = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error)

      setIsFPEnabled(true)
      setSuccessMessage("Fingerprint login has been enabled on your account.")
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setFpError("Biometric registration was cancelled or not allowed")
      } else {
        setFpError(err.message || "Failed to register fingerprint")
      }
    } finally {
      setFpLoading(false)
    }
  }

  const handleDisableFingerprint = async () => {
    setFpDisableLoading(true)
    try {
      const res = await fetch("/api/auth/webauthn/disable", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIsFPEnabled(false)
      setFpDisableOpen(false)
      setSuccessMessage("Fingerprint login has been disabled.")
    } catch (err: any) {
      setFpError(err.message)
    } finally {
      setFpDisableLoading(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/settings")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50">
              <ShieldCheck className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Security</h2>
              <p className="text-muted-foreground">Manage your account security settings</p>
            </div>
          </div>
        </div>

        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* --- 2FA Card --- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <Smartphone className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                  <CardDescription className="text-sm">
                    Add an extra layer of security using an authenticator app
                  </CardDescription>
                </div>
              </div>
              {loading2FA ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant={is2FAEnabled ? "default" : "secondary"}
                  className={is2FAEnabled ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                  {is2FAEnabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading2FA && (
              <p className="text-sm text-muted-foreground">
                {is2FAEnabled
                  ? "Your account is protected with two-factor authentication. You will be required to enter a code from your authenticator app each time you log in."
                  : "Two-factor authentication is currently disabled. Enable it to secure your account with an additional verification step during login."}
              </p>
            )}
            <div className="border-t" />

            {!loading2FA && !is2FAEnabled && enableStep === "idle" && (
              <Button onClick={startEnableFlow} className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Enable Two-Factor Authentication
              </Button>
            )}

            {enableStep === "qr" && (
              <div className="space-y-4">
                {enableLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating your secret key...
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Step 1 — Scan this QR code with your authenticator app</p>
                      <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or any TOTP-compatible app.</p>
                      {setupQR && (
                        <div className="flex justify-center rounded-lg border bg-white p-4">
                          <img src={setupQR} alt="QR Code" className="h-48 w-48" />
                        </div>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Can't scan? Enter the key manually</summary>
                        <p className="mt-1 break-all rounded bg-slate-100 p-2 font-mono text-xs">{setupSecret}</p>
                      </details>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Step 2 — Enter the 6-digit code from your app to confirm</p>
                      <div className="flex gap-2">
                        <Input
                          type="text" inputMode="numeric" placeholder="000000"
                          value={enableToken}
                          onChange={(e) => { setEnableToken(e.target.value.replace(/\D/g, "").slice(0, 6)); setEnableError(null) }}
                          className="max-w-[140px] text-center font-mono tracking-widest"
                          maxLength={6}
                        />
                        <Button onClick={handleEnable2FA} disabled={enableLoading || enableToken.length !== 6} className="gap-2">
                          {enableLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          Confirm & Enable
                        </Button>
                        <Button variant="outline" onClick={() => { setEnableStep("idle"); setEnableToken(""); setSetupSecret(""); setSetupQR(""); setEnableError(null) }}>
                          Cancel
                        </Button>
                      </div>
                      {enableError && (
                        <Alert variant="destructive" className="py-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{enableError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading2FA && is2FAEnabled && (
              <Button variant="destructive" onClick={() => { setDisableToken(""); setDisableError(null); setDisableOpen(true) }} className="gap-2">
                <ShieldOff className="h-4 w-4" /> Disable Two-Factor Authentication
              </Button>
            )}
          </CardContent>
        </Card>

        {/* --- Fingerprint Card --- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Fingerprint className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Fingerprint Login</CardTitle>
                  <CardDescription className="text-sm">
                    Use your device's biometric sensor to log in instantly
                  </CardDescription>
                </div>
              </div>
              {loadingFP ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant={isFPEnabled ? "default" : "secondary"}
                  className={isFPEnabled ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                  {isFPEnabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loadingFP && !webAuthnSupported && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  Fingerprint login is not supported by your current browser or device.
                </AlertDescription>
              </Alert>
            )}

            {!loadingFP && webAuthnSupported && (
              <p className="text-sm text-muted-foreground">
                {isFPEnabled
                  ? "Fingerprint login is active. You can log in on this device using your fingerprint, Face ID, or Windows Hello."
                  : "Register your fingerprint to enable quick, secure login without entering a password. Works with fingerprint, Face ID, or Windows Hello."}
              </p>
            )}

            {fpError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{fpError}</AlertDescription>
              </Alert>
            )}

            <div className="border-t" />

            {!loadingFP && webAuthnSupported && !isFPEnabled && (
              <Button onClick={handleRegisterFingerprint} disabled={fpLoading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {fpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                {fpLoading ? "Registering..." : "Enable Fingerprint Login"}
              </Button>
            )}

            {!loadingFP && webAuthnSupported && isFPEnabled && (
              <Button variant="destructive" onClick={() => setFpDisableOpen(true)} className="gap-2">
                <ShieldOff className="h-4 w-4" /> Disable Fingerprint Login
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2FA Disable dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to confirm you want to disable 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="disable-token">Authenticator Code</Label>
            <Input
              id="disable-token" type="text" inputMode="numeric" placeholder="000000"
              value={disableToken}
              onChange={(e) => { setDisableToken(e.target.value.replace(/\D/g, "").slice(0, 6)); setDisableError(null) }}
              className="text-center font-mono tracking-widest text-lg"
              maxLength={6} autoFocus
            />
            {disableError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{disableError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisable2FA} disabled={disableLoading || disableToken.length !== 6}>
              {disableLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fingerprint Disable dialog */}
      <Dialog open={fpDisableOpen} onOpenChange={setFpDisableOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-destructive" />
              Disable Fingerprint Login
            </DialogTitle>
            <DialogDescription>
              This will remove all registered fingerprints for your account. You can re-enable it at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFpDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisableFingerprint} disabled={fpDisableLoading}>
              {fpDisableLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable Fingerprint Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
