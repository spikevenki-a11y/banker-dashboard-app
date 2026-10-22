"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, ShieldCheck, Settings2, Search, Loader2 } from "lucide-react"
import { DashboardWrapper } from "../../../_components/dashboard-wrapper"

interface LoanScheme {
  scheme_id: number
  scheme_name: string
  loan_type: string
  scheme_status: string
}

interface SecurityType {
  security_id: number
  security_name: string
  security_code: string | null
  is_active: boolean
  requires_valuation: boolean
}

export default function LoanSchemeSecurityPage() {
  const router = useRouter()
  const [schemes, setSchemes] = useState<LoanScheme[]>([])
  const [securityTypes, setSecurityTypes] = useState<SecurityType[]>([])
  const [mapping, setMapping] = useState<Record<number, number[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState<LoanScheme | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchConfiguration()
  }, [])

  const fetchConfiguration = async () => {
    try {
      setIsLoading(true)
      setLoadError("")
      const res = await fetch("/api/settings/loan-scheme-security")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch configuration")
      setSchemes(data.schemes)
      setSecurityTypes(data.securityTypes)
      const grouped: Record<number, number[]> = {}
      for (const m of data.mappings as { scheme_id: number; security_id: number }[]) {
        ;(grouped[m.scheme_id] ??= []).push(Number(m.security_id))
      }
      setMapping(grouped)
    } catch (error: any) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const securityById = useMemo(
    () => new Map(securityTypes.map((s) => [Number(s.security_id), s])),
    [securityTypes]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return schemes
    return schemes.filter((s) =>
      [String(s.scheme_id), s.scheme_name, s.loan_type].some((v) => v?.toLowerCase().includes(q))
    )
  }, [schemes, search])

  const configuredCount = schemes.filter((s) => (mapping[s.scheme_id]?.length ?? 0) > 0).length

  const openConfigure = (scheme: LoanScheme) => {
    setEditing(scheme)
    setSelected(mapping[scheme.scheme_id] ?? [])
    setFormError("")
  }

  const toggle = (securityId: number, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, securityId] : prev.filter((id) => id !== securityId)))
  }

  // Inactive types stay visible only if already mapped, so they can be removed
  const selectableTypes = securityTypes.filter(
    (s) => s.is_active || selected.includes(Number(s.security_id))
  )

  const handleSave = async () => {
    if (!editing) return
    const securityIds = selected.filter((id) => securityById.get(id)?.is_active)
    if (securityIds.length === 0) {
      setFormError("Select at least one security type for this scheme.")
      return
    }
    try {
      setIsSaving(true)
      setFormError("")
      const res = await fetch("/api/settings/loan-scheme-security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheme_id: editing.scheme_id, security_ids: securityIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save configuration")
      setMapping((prev) => ({ ...prev, [editing.scheme_id]: securityIds }))
      setEditing(null)
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/settings/management")}
            className="h-10 w-10 bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50">
              <ShieldCheck className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Loan Scheme Security Configuration</h2>
              <p className="text-muted-foreground">Choose which security types each loan scheme accepts</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Loan Schemes</CardTitle>
                <CardDescription>
                  {configuredCount} of {schemes.length} scheme(s) configured
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-64"
                  placeholder="Search scheme code, name, type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading configuration...
              </div>
            ) : loadError ? (
              <div className="text-center py-8 text-destructive">{loadError}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {schemes.length === 0 ? "No loan schemes found for this branch." : "No schemes match your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme Code</TableHead>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Allowed Securities</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const mapped = mapping[s.scheme_id] ?? []
                    return (
                      <TableRow key={s.scheme_id}>
                        <TableCell className="font-mono text-sm">{s.scheme_id}</TableCell>
                        <TableCell className="font-medium">{s.scheme_name}</TableCell>
                        <TableCell>{s.loan_type}</TableCell>
                        <TableCell>
                          <Badge variant={s.scheme_status === "ACTIVE" ? "default" : "secondary"}>
                            {s.scheme_status === "ACTIVE" ? "Active" : s.scheme_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mapped.length === 0 ? (
                            <span className="text-sm text-destructive">Not configured</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {mapped.map((id) => {
                                const type = securityById.get(id)
                                return (
                                  <Badge
                                    key={id}
                                    variant="outline"
                                    className={type?.is_active === false ? "line-through text-muted-foreground" : ""}
                                  >
                                    {type?.security_name ?? `#${id}`}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openConfigure(s)}>
                            <Settings2 className="h-4 w-4" />
                            Configure
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !isSaving && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Securities</DialogTitle>
            <DialogDescription>
              {editing?.scheme_id} – {editing?.scheme_name}: select the security types accepted for loan applications
              under this scheme.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{selected.length} selected</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(securityTypes.filter((s) => s.is_active).map((s) => Number(s.security_id)))}
              >
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>

          <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {selectableTypes.map((s) => {
              const id = Number(s.security_id)
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selected.includes(id)}
                    onCheckedChange={(checked) => toggle(id, checked === true)}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{s.security_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.security_code ?? "-"}
                      {!s.is_active && " · Inactive (uncheck to remove)"}
                      {s.is_active && !s.requires_valuation && " · No valuation"}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
