// Global popup service — the app's replacement for the browser's alert(), confirm()
// and prompt(). Rendered by <GlobalPopup /> (components/global-popup.tsx), which is
// mounted once in app/layout.tsx.
//
//   popup.success("Saved")                      // green
//   popup.error("Failed to create member: …")   // red
//   popup.warning("Please select a security")   // amber
//   popup.info("…")                             // blue, OK button
//
//   if (await popup.confirm({ message: "Delete this voucher?" })) { … }
//
//   // Async action: buttons are disabled and the popup can't be dismissed while it
//   // runs, so the action can't be submitted twice. If it throws, the error is shown
//   // in the popup and the user can retry or cancel.
//   await popup.confirm({ message: "Post this voucher?", onConfirm: () => postVoucher() })
//
// Popups are shown one at a time, in the order they were requested. Unlike alert(),
// they don't block the code that opened them; await the returned promise when the
// next step must wait for the user.

export type PopupVariant = "success" | "error" | "warning" | "info" | "confirm"

export type PopupRequest = {
  id: number
  variant: PopupVariant
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  /** Confirmation only: red confirm button for destructive actions */
  destructive?: boolean
  onConfirm?: () => unknown | Promise<unknown>
  resolve: (confirmed: boolean) => void
}

export type PopupOptions = { title?: string; okText?: string }

export type ConfirmOptions = {
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm?: () => unknown | Promise<unknown>
}

type Listener = (queue: PopupRequest[]) => void

let queue: PopupRequest[] = []
let nextId = 1
const listeners = new Set<Listener>()

const emit = () => listeners.forEach((l) => l(queue))

export function subscribePopups(listener: Listener): () => void {
  listeners.add(listener)
  listener(queue)
  return () => {
    listeners.delete(listener)
  }
}

/** Called by <GlobalPopup /> when the current popup closes. */
export function closePopup(id: number, confirmed: boolean) {
  const req = queue.find((r) => r.id === id)
  if (!req) return
  queue = queue.filter((r) => r.id !== id)
  emit()
  req.resolve(confirmed)
}

function open(req: Omit<PopupRequest, "id" | "resolve">): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false)
      return
    }
    if (listeners.size === 0) {
      // <GlobalPopup /> isn't mounted — never fall back to a native dialog
      console.warn("[popup] <GlobalPopup /> is not mounted:", req.message)
    }
    queue = [...queue, { ...req, id: nextId++, resolve }]
    emit()
  })
}

const toText = (message: unknown) =>
  message instanceof Error ? message.message : String(message ?? "")

const notify = (variant: Exclude<PopupVariant, "confirm">) =>
  (message: unknown, opts: PopupOptions = {}): Promise<void> =>
    open({ variant, message: toText(message), title: opts.title, confirmText: opts.okText }).then(() => undefined)

export const popup = {
  success: notify("success"),
  error: notify("error"),
  warning: notify("warning"),
  info: notify("info"),
  /** Resolves true when confirmed (after onConfirm succeeds), false when cancelled. */
  confirm: (opts: ConfirmOptions): Promise<boolean> =>
    open({
      variant: "confirm",
      message: opts.message,
      title: opts.title,
      confirmText: opts.confirmText,
      cancelText: opts.cancelText,
      destructive: opts.destructive,
      onConfirm: opts.onConfirm,
    }),
}
