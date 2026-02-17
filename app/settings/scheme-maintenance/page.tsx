"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  BookOpen,
  Pencil,
  Loader2,
  PiggyBank,
  Landmark,
  HandCoins,
} from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

/* ── field definitions per module ────────────────────────────────── */

interface FieldDef {
  key: string
  label: string
  type: "text" | "number" | "boolean" | "select"
  options?: string[]
  group?: string
}

const SAVINGS_FIELDS: FieldDef[] = [
  { key: "scheme_name", label: "Scheme Name", type: "text", group: "General" },
  { key: "scheme_description", label: "Description", type: "text", group: "General" },
  { key: "scheme_status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE", "CLOSED"], group: "General" },
  { key: "interest_rate", label: "Interest Rate (%)", type: "number", group: "Interest" },
  { key: "interest_frequency", label: "Interest Frequency", type: "select", options: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"], group: "Interest" },
  { key: "interest_calculation_method", label: "Calculation Method", type: "select", options: ["DAILY_BALANCE", "MINIMUM_BALANCE", "MONTHLY_BALANCE"], group: "Interest" },
  { key: "interest_rounding", label: "Rounding", type: "select", options: ["ROUND", "FLOOR", "CEIL"], group: "Interest" },
  { key: "minimum_balance_for_interest", label: "Min Balance for Interest", type: "number", group: "Interest" },
  { key: "minimum_interest_payable", label: "Min Interest Payable", type: "number", group: "Interest" },
  { key: "min_balance", label: "Minimum Balance", type: "number", group: "Limits" },
  { key: "minimum_deposit", label: "Min Deposit", type: "number", group: "Limits" },
  { key: "maximum_deposit", label: "Max Deposit", type: "number", group: "Limits" },
  { key: "minimum_age", label: "Min Age", type: "number", group: "Eligibility" },
  { key: "maximum_age", label: "Max Age", type: "number", group: "Eligibility" },
  { key: "is_staff_only", label: "Staff Only", type: "boolean", group: "Eligibility" },
  { key: "savings_gl_account", label: "Savings GL Account", type: "number", group: "GL Accounts" },
  { key: "interest_payable_gl_account", label: "Interest Payable GL", type: "text", group: "GL Accounts" },
  { key: "interest_paid_gl_account", label: "Interest Paid GL", type: "text", group: "GL Accounts" },
]

const DEPOSIT_FIELDS: FieldDef[] = [
  { key: "scheme_name", label: "Scheme Name", type: "text", group: "General" },
  { key: "scheme_description", label: "Description", type: "text", group: "General" },
  { key: "scheme_status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE", "CLOSED"], group: "General" },
  { key: "deposit_type", label: "Deposit Type", type: "select", options: ["FIXED", "RECURRING", "CUMULATIVE", "NON_CUMULATIVE"], group: "General" },
  { key: "interest_rate", label: "Interest Rate (%)", type: "number", group: "Interest" },
  { key: "interest_frequency", label: "Interest Frequency", type: "select", options: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"], group: "Interest" },
  { key: "interest_calculation_method", label: "Calculation Method", type: "select", options: ["SIMPLE", "COMPOUND"], group: "Interest" },
  { key: "compounding_frequency", label: "Compounding Frequency", type: "select", options: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"], group: "Interest" },
  { key: "interest_rounding", label: "Rounding", type: "select", options: ["ROUND", "FLOOR", "CEIL"], group: "Interest" },
  { key: "minimum_deposit", label: "Min Deposit", type: "number", group: "Limits" },
  { key: "maximum_deposit", label: "Max Deposit", type: "number", group: "Limits" },
  { key: "minimum_period_months", label: "Min Period (Months)", type: "number", group: "Limits" },
  { key: "maximum_period_months", label: "Max Period (Months)", type: "number", group: "Limits" },
  { key: "minimum_period_days", label: "Min Period (Days)", type: "number", group: "Limits" },
  { key: "maximum_period_days", label: "Max Period (Days)", type: "number", group: "Limits" },
  { key: "installment_frequency", label: "Installment Frequency", type: "select", options: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"], group: "Installment" },
  { key: "minimum_installment_amount", label: "Min Installment", type: "number", group: "Installment" },
  { key: "maximum_installment_amount", label: "Max Installment", type: "number", group: "Installment" },
  { key: "premature_closure_allowed", label: "Premature Closure", type: "boolean", group: "Rules" },
  { key: "premature_penal_rate", label: "Premature Penal Rate (%)", type: "number", group: "Rules" },
  { key: "auto_renewal_allowed", label: "Auto Renewal", type: "boolean", group: "Rules" },
  { key: "tds_applicable", label: "TDS Applicable", type: "boolean", group: "Rules" },
  { key: "penal_rate", label: "Penal Rate (%)", type: "number", group: "Rules" },
  { key: "agent_commission_percent", label: "Agent Commission (%)", type: "number", group: "Rules" },
  { key: "minimum_age", label: "Min Age", type: "number", group: "Eligibility" },
  { key: "maximum_age", label: "Max Age", type: "number", group: "Eligibility" },
  { key: "is_staff_only", label: "Staff Only", type: "boolean", group: "Eligibility" },
  { key: "deposit_gl_account", label: "Deposit GL Account", type: "text", group: "GL Accounts" },
  { key: "interest_payable_gl_account", label: "Interest Payable GL", type: "text", group: "GL Accounts" },
  { key: "interest_expense_gl_account", label: "Interest Expense GL", type: "text", group: "GL Accounts" },
  { key: "penal_interest_gl_account", label: "Penal Interest GL", type: "text", group: "GL Accounts" },
]

const MODULE_OPTIONS = [
  { value: "savings", label: "Savings Schemes", icon: PiggyBank, color: "text-emerald-600" },
  { value: "deposits", label: "Deposit Schemes", icon: Landmark, color: "text-blue-600" },
  { value: "loans", label: "Loan Schemes", icon: HandCoins, color: "text-amber-600" },
]

/* ── component ────────────────────────────────────────────── */

export default function SchemeMaintenancePage() {
  const router = useRouter()
  const [selectedModule, setSelectedModule] = useState<string>("")
  const [schemes, setSchemes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editScheme, setEditScheme] = useState<any | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!selectedModule) {
      setSchemes([])
      return
    }
    fetchSchemes(selectedModule)
  }, [selectedModule])

  async function fetchSchemes(mod: string) {
    setIsLoading(true)
    setSchemes([])
    try {
      const res = await fetch(`/api/schemes?module=${mod}`, { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setSchemes(data.schemes)
      }
    } catch (err) {
      console.error("Failed to fetch schemes:", err)
    } finally {
      setIsLoading(false)
    }
  }

  function openEdit(scheme: any) {
    setEditScheme(scheme)
    setEditValues({ ...scheme })
    setSaveMessage(null)
  }

  function handleFieldChange(key: string, value: any) {
    setEditValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!editScheme || !selectedModule) return
    setIsSaving(true)
    setSaveMessage(null)

    // Build only changed fields
    const updates: Record<string, any> = {}
    const fields = selectedModule === "savings" ? SAVINGS_FIELDS : DEPOSIT_FIELDS
    for (const f of fields) {
      const newVal = editValues[f.key]
      const oldVal = editScheme[f.key]
      if (newVal !== oldVal) {
        if (f.type === "number") {
          updates[f.key] = newVal === "" || newVal === null ? null : Number(newVal)
        } else {
          updates[f.key] = newVal
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      setSaveMessage({ type: "error", text: "No changes to save." })
      setIsSaving(false)
      return
    }

    try {
      const res = await fetch("/api/schemes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ module: selectedModule, id: editScheme.id, updates }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMessage({ type: "success", text: "Scheme updated successfully." })
        // Update local list
        setSchemes((prev) => prev.map((s) => (s.id === editScheme.id ? data.scheme : s)))
        setEditScheme(data.scheme)
        setEditValues({ ...data.scheme })
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save." })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  const fields = selectedModule === "savings" ? SAVINGS_FIELDS : selectedModule === "deposits" ? DEPOSIT_FIELDS : []

  // Summary columns for the table
  const summaryColumns =
    selectedModule === "savings"
      ? ["scheme_id", "scheme_name", "interest_rate", "min_balance", "scheme_status"]
      : selectedModule === "deposits"
        ? ["scheme_id", "scheme_name", "deposit_type", "interest_rate", "scheme_status"]
        : []

  const summaryLabels: Record<string, string> = {
    scheme_id: "ID",
    scheme_name: "Scheme Name",
    interest_rate: "Rate (%)",
    min_balance: "Min Balance",
    deposit_type: "Type",
    scheme_status: "Status",
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/settings")}
            className="h-10 w-10 bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
              <BookOpen className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Scheme Maintenance</h2>
              <p className="text-muted-foreground">View and modify deposit, savings, and loan schemes</p>
            </div>
          </div>
        </div>

        {/* Module Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Module</CardTitle>
            <CardDescription>Choose a module to view and manage its schemes</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select a module..." />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className={`h-4 w-4 ${opt.color}`} />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading schemes...</span>
          </div>
        )}

        {/* Schemes Table */}
        {!isLoading && selectedModule && schemes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {MODULE_OPTIONS.find((m) => m.value === selectedModule)?.label}
              </CardTitle>
              <CardDescription>
                {schemes.length} scheme{schemes.length !== 1 ? "s" : ""} found. Click Edit to modify a scheme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {summaryColumns.map((col) => (
                        <TableHead key={col}>{summaryLabels[col] || col}</TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((scheme) => (
                      <TableRow key={scheme.id}>
                        {summaryColumns.map((col) => (
                          <TableCell key={col}>
                            {col === "scheme_status" ? (
                              <Badge
                                variant={scheme[col] === "ACTIVE" ? "default" : "secondary"}
                                className={
                                  scheme[col] === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : ""
                                }
                              >
                                {scheme[col]}
                              </Badge>
                            ) : col === "interest_rate" ? (
                              `${scheme[col] ?? "-"}`
                            ) : col === "min_balance" || col === "minimum_deposit" ? (
                              scheme[col] != null ? Number(scheme[col]).toLocaleString("en-IN") : "-"
                            ) : (
                              scheme[col] ?? "-"
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEdit(scheme)} className="bg-transparent">
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && selectedModule && schemes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl mb-2">No Schemes Found</CardTitle>
              <CardDescription className="text-center max-w-md">
                {selectedModule === "loans"
                  ? "Loan schemes module is under development."
                  : `No ${selectedModule} schemes are configured for your branch yet.`}
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* No module selected prompt */}
        {!selectedModule && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 mb-4">
                <BookOpen className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl mb-2">Select a Module</CardTitle>
              <CardDescription className="text-center max-w-md">
                Choose a module from the dropdown above to view and manage its schemes.
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={!!editScheme} onOpenChange={(open) => { if (!open) { setEditScheme(null); setSaveMessage(null) } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Scheme: {editValues.scheme_name || ""}
            </DialogTitle>
            <DialogDescription>
              Scheme ID: {editValues.scheme_id} &middot; Modify the fields below and save.
            </DialogDescription>
          </DialogHeader>

          {/* Grouped fields */}
          <div className="space-y-6 py-2">
            {(() => {
              const groups: string[] = []
              for (const f of fields) {
                if (f.group && !groups.includes(f.group)) groups.push(f.group)
              }
              return groups.map((group) => (
                <div key={group}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{group}</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {fields
                      .filter((f) => f.group === group)
                      .map((f) => (
                        <div key={f.key} className={f.type === "boolean" ? "flex items-center justify-between rounded-md border px-3 py-2" : "space-y-1.5"}>
                          <Label htmlFor={f.key} className={f.type === "boolean" ? "text-sm" : "text-sm"}>{f.label}</Label>
                          {f.type === "boolean" ? (
                            <Switch
                              id={f.key}
                              checked={!!editValues[f.key]}
                              onCheckedChange={(v) => handleFieldChange(f.key, v)}
                            />
                          ) : f.type === "select" ? (
                            <Select value={editValues[f.key] || ""} onValueChange={(v) => handleFieldChange(f.key, v)}>
                              <SelectTrigger id={f.key}>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {f.options?.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt.replace(/_/g, " ")}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={f.key}
                              type={f.type === "number" ? "number" : "text"}
                              value={editValues[f.key] ?? ""}
                              onChange={(e) => handleFieldChange(f.key, f.type === "number" ? e.target.value : e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))
            })()}
          </div>

          {saveMessage && (
            <div className={`rounded-md px-3 py-2 text-sm ${saveMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {saveMessage.text}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditScheme(null); setSaveMessage(null) }} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
