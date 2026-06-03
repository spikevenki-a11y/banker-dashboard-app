"use client"

import { useState, useEffect } from "react"

export interface BranchInfo {
  bank_name: string
  branch_name: string
  address: string
  city: string
  state: string
  postal_code: string
  phone_number: string
  email: string
}

export function useBranchInfo(): BranchInfo | null {
  const [info, setInfo] = useState<BranchInfo | null>(null)

  useEffect(() => {
    fetch("/api/reports/branch-info", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setInfo(d) })
      .catch(() => {})
  }, [])

  return info
}
