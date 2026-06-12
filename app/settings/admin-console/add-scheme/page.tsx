"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft, PlusSquare, PiggyBank, Landmark, HandCoins,
  Loader2, CheckCircle2, AlertCircle, Download,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/* ── Module config ─────────────────────────────────────────────────── */

const MODULES = [
  { value: "savings",  label: "Savings",  icon: PiggyBank, color: "text-emerald-600", bg: "bg-emerald-50",  activeBorder: "border-emerald-400" },
  { value: "deposits", label: "Deposit",  icon: Landmark,  color: "text-blue-600",    bg: "bg-blue-50",     activeBorder: "border-blue-400"    },
  { value: "loans",    label: "Loan",     icon: HandCoins, color: "text-amber-600",   bg: "bg-amber-50",    activeBorder: "border-amber-400"   },
]

type RowStatus = { type: "success" | "error"; text: string }

/* ── Component ─────────────────────────────────────────────────────── */

export default function AddSchemePage() {
  const router = useRouter()

  const [selectedModule, setSelectedModule] = useState<string>("")
  const [masters, setMasters]               = useState<any[]>([])
  const [importedNames, setImportedNames]   = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading]           = useState(false)
  const [importingId, setImportingId]       = useState<string | null>(null)
  const [rowStatus, setRowStatus]           = useState<Map<string, RowStatus>>(new Map())

  /* ── Load masters when module changes ───────────────────── */
  useEffect(() => {
    if (!selectedModule) {
      setMasters([])
      setImportedNames(new Set())
      setRowStatus(new Map())
      return
    }
    setIsLoading(true)
    setMasters([])
    setRowStatus(new Map())
    fetch(`/api/admin/add-scheme?module=${selectedModule}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setMasters(data.masters ?? [])
          setImportedNames(new Set(data.importedNames ?? []))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [selectedModule])

  /* ── Import a master record into the operational table ──── */
  async function doImport(master: any) {
    setImportingId(master.id)
    try {
      const res = await fetch("/api/admin/add-scheme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ module: selectedModule, masterId: master.id }),
      })
      const data = await res.json()
      if (data.success) {
        setImportedNames((prev) => new Set([...prev, master.scheme_name]))
        setRowStatus((prev) => new Map(prev).set(master.id, {
          type: "success",
          text: `Imported — Scheme ID ${data.scheme.scheme_id}`,
        }))
      } else {
        setRowStatus((prev) => new Map(prev).set(master.id, { type: "error", text: data.error }))
      }
    } catch {
      setRowStatus((prev) => new Map(prev).set(master.id, { type: "error", text: "Network error" }))
    } finally {
      setImportingId(null)
    }
  }

  const moduleConfig = MODULES.find((m) => m.value === selectedModule)

  /* ── Column helpers ─────────────────────────────────────── */
  const columnHeaders =
    selectedModule === "savings"  ? ["Rate (%)", "Frequency", "Min Balance"] :
    selectedModule === "deposits" ? ["Type", "Rate (%)", "Period (Months)"] :
    selectedModule === "loans"    ? ["Loan Type", "Rate (%)", "Period (Months)"] : []

  function rowCols(m: any): string[] {
    if (selectedModule === "savings") return [
      m.interest_rate != null ? `${m.interest_rate}%` : "—",
      m.interest_frequency?.replace(/_/g, " ") ?? "—",
      m.min_balance != null ? `₹${Number(m.min_balance).toLocaleString("en-IN")}` : "—",
    ]
    if (selectedModule === "deposits") return [
      m.deposit_type ?? "—",
      m.interest_rate != null ? `${m.interest_rate}%` : "—",
      [m.minimum_period_months, m.maximum_period_months].filter((v) => v != null && v !== 0).join(" – ") || "—",
    ]
    if (selectedModule === "loans") return [
      m.loan_type?.replace(/_/g, " ") ?? "—",
      m.interest_rate != null ? `${m.interest_rate}%` : "—",
      [m.minimum_period_months, m.maximum_period_months].filter((v) => v != null && v !== 0).join(" – ") || "—",
    ]
    return []
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline" size="icon"
            className="h-10 w-10 bg-transparent"
            onClick={() => router.push("/settings/admin-console")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <PlusSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Add Scheme</h2>
              <p className="text-muted-foreground">
                Select a module and import predefined schemes from the master table
              </p>
            </div>
          </div>
        </div>

        {/* Module selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Module</CardTitle>
            <CardDescription>Choose which scheme type to view and import</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {MODULES.map((m) => {
                const active = selectedModule === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => setSelectedModule(m.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border-2 px-5 py-2.5 text-sm font-medium transition-all",
                      active
                        ? `${m.bg} ${m.activeBorder} ${m.color}`
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Master schemes table */}
        {selectedModule && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {moduleConfig && <moduleConfig.icon className={`h-4 w-4 ${moduleConfig.color}`} />}
                {moduleConfig?.label} — Master Schemes
              </CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading…"
                  : masters.length === 0
                    ? "No master schemes found in this module"
                    : `${masters.length} scheme${masters.length !== 1 ? "s" : ""} available · click Import to copy into your branch`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading master schemes…
                </div>
              ) : masters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
                  <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ${moduleConfig?.bg}`}>
                    {moduleConfig && <moduleConfig.icon className={`h-6 w-6 ${moduleConfig.color}`} />}
                  </div>
                  No master schemes configured for this module.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scheme Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Description</TableHead>
                        {columnHeaders.map((h) => (
                          <TableHead key={h} className="hidden md:table-cell">{h}</TableHead>
                        ))}
                        <TableHead className="hidden lg:table-cell">Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {masters.map((master) => {
                        const alreadyImported = importedNames.has(master.scheme_name)
                        const status          = rowStatus.get(master.id)
                        const isImporting     = importingId === master.id
                        const cols            = rowCols(master)

                        return (
                          <TableRow key={master.id} className={alreadyImported ? "opacity-60" : ""}>
                            <TableCell className="font-medium">{master.scheme_name}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm max-w-52 truncate">
                              {master.scheme_description || "—"}
                            </TableCell>
                            {cols.map((val, i) => (
                              <TableCell key={i} className="hidden md:table-cell text-sm">{val}</TableCell>
                            ))}
                            <TableCell className="hidden lg:table-cell">
                              <Badge
                                variant={master.scheme_status === "ACTIVE" ? "default" : "secondary"}
                                className={master.scheme_status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                  : ""}
                              >
                                {master.scheme_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* per-row feedback */}
                                {status && (
                                  <span className={cn(
                                    "flex items-center gap-1 text-xs font-medium",
                                    status.type === "success" ? "text-emerald-600" : "text-red-600"
                                  )}>
                                    {status.type === "success"
                                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                                      : <AlertCircle  className="h-3.5 w-3.5" />}
                                    {status.text}
                                  </span>
                                )}

                                {alreadyImported && !status ? (
                                  <Badge variant="secondary" className="text-xs">Already imported</Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-transparent"
                                    disabled={isImporting || !!status || alreadyImported}
                                    onClick={() => doImport(master)}
                                  >
                                    {isImporting ? (
                                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Importing…</>
                                    ) : (
                                      <><Download className="mr-1.5 h-3.5 w-3.5" />Import</>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardWrapper>
  )
}
