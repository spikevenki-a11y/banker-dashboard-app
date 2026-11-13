"use client"

// Renders popups requested through `popup` (lib/popup.ts). Mounted once in app/layout.tsx.
// Built on the app's AlertDialog (Radix): centered, dimmed overlay, focus is trapped in
// the popup and returned to the previously focused element on close, Esc dismisses.

import { useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { closePopup, subscribePopups, type PopupRequest, type PopupVariant } from "@/lib/popup"

const VARIANTS: Record<PopupVariant, { title: string; icon: typeof Info; iconClass: string; ringClass: string }> = {
  success: {
    title: "Success",
    icon: CheckCircle2,
    iconClass: "text-green-600 dark:text-green-400",
    ringClass: "bg-green-100 dark:bg-green-950/50",
  },
  error: {
    title: "Error",
    icon: AlertCircle,
    iconClass: "text-red-600 dark:text-red-400",
    ringClass: "bg-red-100 dark:bg-red-950/50",
  },
  warning: {
    title: "Warning",
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    ringClass: "bg-amber-100 dark:bg-amber-950/50",
  },
  info: {
    title: "Information",
    icon: Info,
    iconClass: "text-blue-600 dark:text-blue-400",
    ringClass: "bg-blue-100 dark:bg-blue-950/50",
  },
  confirm: {
    title: "Please Confirm",
    icon: HelpCircle,
    iconClass: "text-blue-600 dark:text-blue-400",
    ringClass: "bg-blue-100 dark:bg-blue-950/50",
  },
}

export function GlobalPopup() {
  const [queue, setQueue] = useState<PopupRequest[]>([])
  useEffect(() => subscribePopups(setQueue), [])

  const current = queue[0]
  // key: a fresh dialog per popup, so state (processing / error) never leaks between them
  return current ? <PopupDialog key={current.id} req={current} /> : null
}

function PopupDialog({ req }: { req: PopupRequest }) {
  const [processing, setProcessing] = useState(false)
  const [actionError, setActionError] = useState("")
  const primaryRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const busy = useRef(false) // guards against double clicks before React re-renders

  const v = VARIANTS[req.variant]
  const Icon = v.icon
  const isConfirm = req.variant === "confirm"

  const cancel = () => {
    if (busy.current) return
    closePopup(req.id, false)
  }

  const confirm = async () => {
    if (busy.current) return
    if (!isConfirm || !req.onConfirm) {
      closePopup(req.id, true)
      return
    }
    busy.current = true
    setProcessing(true)
    setActionError("")
    try {
      await req.onConfirm()
      closePopup(req.id, true)
    } catch (e) {
      // Stay open so the user can retry or cancel
      setActionError(e instanceof Error ? e.message : String(e || "Something went wrong. Please try again."))
      busy.current = false
      setProcessing(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && cancel()}>
      <AlertDialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          if (busy.current) e.preventDefault()
        }}
        onOpenAutoFocus={(e) => {
          // Confirmation: focus Cancel (safe default); others: focus OK
          e.preventDefault()
          ;(isConfirm ? cancelRef.current : primaryRef.current)?.focus()
        }}
      >
        <AlertDialogHeader className="items-center text-center sm:items-start sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", v.ringClass)}>
              <Icon className={cn("h-6 w-6", v.iconClass)} aria-hidden="true" />
            </span>
            <AlertDialogTitle>{req.title || v.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="whitespace-pre-line break-words text-foreground/80">
            {req.message}
          </AlertDialogDescription>
          {actionError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {actionError}
            </p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isConfirm && (
            <Button ref={cancelRef} variant="outline" onClick={cancel} disabled={processing}>
              {req.cancelText || "Cancel"}
            </Button>
          )}
          <Button
            ref={primaryRef}
            onClick={confirm}
            disabled={processing}
            variant={isConfirm && req.destructive ? "destructive" : "default"}
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {req.confirmText || (isConfirm ? "Confirm" : "OK")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
