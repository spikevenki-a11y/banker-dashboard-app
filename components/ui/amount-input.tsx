"use client"
import * as React from "react"

import { cn } from "@/lib/utils"
import { formatAmount, normalizeAmountInput } from "@/lib/number-format"

type AmountInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  inputClassName?: string
}

// Money input. While focused the user types a plain number ("100000.5"); when not focused
// the amount is shown with Indian separators and 2 decimals ("1,00,000.50").
// The value given to onChange (e.target.value) is always a plain numeric string without
// commas, so form state, validation and API payloads are unchanged.
// Used through <Input type="amount" />.
export function AmountInput({
  className,
  inputClassName,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  min,
  max: _max,
  step: _step,
  ...props
}: AmountInputProps) {
  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = React.useState(() => String(defaultValue ?? ""))
  const [focused, setFocused] = React.useState(false)

  const plain = isControlled ? (value === null ? "" : String(value)) : innerValue
  const allowNegative = min !== undefined && Number(min) < 0
  const display = focused || plain === "" || !Number.isFinite(Number(plain)) ? plain : formatAmount(plain)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeAmountInput(e.target.value, { allowNegative })
    e.target.value = normalized
    if (!isControlled) setInnerValue(normalized)
    onChange?.(e)
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      data-slot="input"
      className={cn(inputClassName, "tabular-nums", className)}
      value={display}
      onChange={handleChange}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
    />
  )
}
