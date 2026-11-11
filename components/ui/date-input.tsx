"use client"
import * as React from "react"
import { CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"
import { DATE_FORMAT_LABEL, formatDate, parseDisplayDate } from "@/lib/date-format"

// Date field shown and typed as DD-MM-YYYY.
//
// Drop-in for <input type="date">: `value`, `min`, `max` and the value seen by
// `onChange` (e.target.value) stay "YYYY-MM-DD", so forms, validation and API calls
// work unchanged. A hidden native date input holds that value and supplies the
// calendar popup; the visible text field only handles display and typing.

// Layout classes (width, margin, flex/grid placement) belong on the outer wrapper so
// the calendar button stays inside the field.
const LAYOUT_CLASS =
  /^(?:[a-z0-9]+:)*(?:w-|min-w-|max-w-|flex-|shrink|grow|basis-|col-|row-|self-|justify-self-|order-|m[trblxy]?-|-m[trblxy]?-)/

const SEGMENT_LEN = [2, 2, 4]

/** Builds "DD-MM-YYYY" as the user types; "1-5" becomes "01-05". */
function maskDateText(raw: string): string {
  const iso = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(raw) // pasted ISO date
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`

  const segs = [""]
  let endsWithSep = false
  for (const ch of raw) {
    const i = segs.length - 1
    if (/\d/.test(ch)) {
      endsWithSep = false
      if (segs[i].length === SEGMENT_LEN[i]) {
        if (i === 2) break
        segs.push(ch)
      } else {
        segs[i] += ch
      }
    } else if (/[-/. ]/.test(ch) && segs[i] !== "" && i < 2) {
      if (segs[i].length < SEGMENT_LEN[i]) segs[i] = segs[i].padStart(SEGMENT_LEN[i], "0")
      segs.push("")
      endsWithSep = true
    }
  }
  const filled = segs.filter(Boolean)
  return filled.join("-") + (endsWithSep && filled.length < 3 ? "-" : "")
}

/** Sets an input's value so React's onChange fires, as if the user had changed it. */
function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

type DateInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  /** Classes for the visible text field (from the shared Input styles) */
  inputClassName: string
}

export function DateInput({
  inputClassName,
  className,
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  min,
  max,
  form,
  disabled,
  readOnly,
  required,
  placeholder,
  ref,
  ...rest
}: DateInputProps) {
  const nativeRef = React.useRef<HTMLInputElement>(null)
  const textRef = React.useRef<HTMLInputElement | null>(null)
  const controlled = value !== undefined
  const isoValue = String((controlled ? value : defaultValue) ?? "")
  const [text, setText] = React.useState(() => formatDate(isoValue, ""))

  // Keep the visible text in step with the value set by the form
  React.useEffect(() => {
    if (!controlled) return
    const v = String(value ?? "")
    setText((t) => (parseDisplayDate(t) === v ? t : formatDate(v, "")))
  }, [controlled, value])

  // Keep native-style range checks for forms that rely on them
  const minStr = min == null ? "" : String(min)
  const maxStr = max == null ? "" : String(max)
  React.useEffect(() => {
    const el = textRef.current
    if (!el) return
    const iso = parseDisplayDate(text)
    let msg = ""
    if (text && !iso) msg = `Enter a valid date (${DATE_FORMAT_LABEL}).`
    else if (iso && minStr && iso < minStr) msg = `Date must be on or after ${formatDate(minStr)}.`
    else if (iso && maxStr && iso > maxStr) msg = `Date must be on or before ${formatDate(maxStr)}.`
    el.setCustomValidity(msg)
  }, [text, minStr, maxStr])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = maskDateText(e.target.value)
    setText(next)
    const native = nativeRef.current
    if (!native) return
    const iso = parseDisplayDate(next)
    // Like a native date input: the value is "" until the date is complete and valid
    if (iso !== native.value) setNativeValue(native, iso)
  }

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Drop half-typed text so the field shows what the form actually holds
    if (text && !parseDisplayDate(text)) setText(formatDate(nativeRef.current?.value, ""))
    onBlur?.(e)
  }

  // Calendar picked: the native input's onChange updates the form, then the text
  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setText(formatDate(e.target.value, ""))
    onChange?.(e)
  }

  const openPicker = () => {
    const native = nativeRef.current
    if (!native || disabled || readOnly) return
    try {
      native.showPicker()
    } catch {
      native.focus()
    }
  }

  const classes = String(className || "").split(/\s+/).filter(Boolean)
  const wrapperClasses = classes.filter((c) => LAYOUT_CLASS.test(c))
  const fieldClasses = classes.filter((c) => !LAYOUT_CLASS.test(c))
  const canPick = !disabled && !readOnly

  return (
    <div data-slot="date-input" className={cn("relative w-full min-w-0", wrapperClasses)}>
      <input
        {...rest}
        ref={(el) => {
          textRef.current = el
          if (typeof ref === "function") ref(el)
          else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = el
        }}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        data-slot="input"
        placeholder={placeholder || DATE_FORMAT_LABEL}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        onKeyDown={(e) => {
          if (e.altKey && e.key === "ArrowDown") {
            e.preventDefault()
            openPicker()
          }
          rest.onKeyDown?.(e)
        }}
        className={cn(inputClassName, "pr-9", fieldClasses)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Open calendar"
        disabled={!canPick}
        onClick={openPicker}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {/* Holds the YYYY-MM-DD value and supplies the calendar popup */}
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        form={form}
        min={min}
        max={max}
        disabled={disabled}
        readOnly={readOnly}
        {...(controlled ? { value: String(value ?? "") } : { defaultValue: isoValue })}
        onChange={handleNativeChange}
        className="pointer-events-none absolute bottom-0 left-0 h-full w-full opacity-0"
      />
    </div>
  )
}
