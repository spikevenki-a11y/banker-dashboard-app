"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  function handleSelect(optionValue: string) {
    onValueChange(optionValue)
    setOpen(false)
    setSearch("")
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-1 ring-ring"
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results found.</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
