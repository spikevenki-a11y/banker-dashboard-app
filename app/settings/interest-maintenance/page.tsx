"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Percent,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

interface InterestCondition {
  condition_id?: number
  field_name: string
  operator: string
  value_from: string
  value_to: string
  interest_rate: number
  penal_rate: number | null
}

interface InterestPolicy {
  policy_id: number
  product_code: string
  base_rate: number
  effective_from: string
  effective_to: string | null
  status: string
  conditions: InterestCondition[]
}

interface Product {
  product_code: string
  product_name: string
  product_type: string
}

const FIELD_OPTIONS = [
  { value: "AMOUNT", label: "Deposit Amount" },
  { value: "TENURE_DAYS", label: "Tenure (Days)" },
  { value: "TENURE_MONTHS", label: "Tenure (Months)" },
  { value: "AGE", label: "Customer Age" },
  { value: "MEMBER_TYPE", label: "Member Type" },
]

const OPERATOR_OPTIONS = [
  { value: "BETWEEN", label: "Between" },
  { value: "GREATER_THAN", label: "Greater Than" },
  { value: "LESS_THAN", label: "Less Than" },
  { value: "EQUALS", label: "Equals" },
]

export default function InterestMaintenancePage() {
  const router = useRouter()
  const [policies, setPolicies] = useState<InterestPolicy[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPolicy, setExpandedPolicy] = useState<number | null>(null)

  // Add new policy dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // New policy form state
  const [newPolicy, setNewPolicy] = useState({
    product_code: "",
    base_rate: "",
    effective_from: "",
    effective_to: "",
  })
  const [newConditions, setNewConditions] = useState<InterestCondition[]>([])

  useEffect(() => {
    fetchPolicies()
    fetchProducts()
  }, [])

  async function fetchPolicies() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/interest-policy", { credentials: "include" })
      const data = await res.json()
      if (data.policies) {
        setPolicies(data.policies)
      }
    } catch (err) {
      console.error("Failed to fetch policies:", err)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/interest-policy/products", { credentials: "include" })
      const data = await res.json()
      if (data.products) {
        setProducts(data.products)
      }
    } catch (err) {
      console.error("Failed to fetch products:", err)
    }
  }

  function openAddDialog() {
    setNewPolicy({
      product_code: "",
      base_rate: "",
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: "",
    })
    setNewConditions([])
    setSaveMessage(null)
    setShowAddDialog(true)
  }

  function addCondition() {
    setNewConditions((prev) => [
      ...prev,
      {
        field_name: "AMOUNT",
        operator: "BETWEEN",
        value_from: "",
        value_to: "",
        interest_rate: 0,
        penal_rate: null,
      },
    ])
  }

  function updateCondition(index: number, field: keyof InterestCondition, value: string | number | null) {
    setNewConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  function removeCondition(index: number) {
    setNewConditions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSavePolicy() {
    if (!newPolicy.product_code || !newPolicy.base_rate || !newPolicy.effective_from) {
      setSaveMessage({ type: "error", text: "Please fill in all required fields." })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch("/api/interest-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_code: newPolicy.product_code,
          base_rate: parseFloat(newPolicy.base_rate),
          effective_from: newPolicy.effective_from,
          effective_to: newPolicy.effective_to || null,
          conditions: newConditions.map((c) => ({
            ...c,
            interest_rate: parseFloat(String(c.interest_rate)),
            penal_rate: c.penal_rate ? parseFloat(String(c.penal_rate)) : null,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMessage({ type: "success", text: "Interest policy created successfully." })
        fetchPolicies()
        setTimeout(() => {
          setShowAddDialog(false)
        }, 1500)
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to create policy." })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  function getProductName(code: string) {
    const product = products.find((p) => p.product_code === code)
    return product ? product.product_name : code
  }

  function toggleExpand(policyId: number) {
    setExpandedPolicy((prev) => (prev === policyId ? null : policyId))
  }

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50">
                <Percent className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Interest Maintenance</h2>
                <p className="text-muted-foreground">Configure interest rates and slabs by effective date</p>
              </div>
            </div>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Policy
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading policies...</span>
          </div>
        )}

        {/* Policies Table */}
        {!isLoading && policies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Interest Policies</CardTitle>
              <CardDescription>
                {policies.length} policy(ies) configured. Click a row to view interest slabs/conditions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Policy ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Base Rate (%)</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Effective To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Slabs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy) => (
                      <>
                        <TableRow
                          key={policy.policy_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(policy.policy_id)}
                        >
                          <TableCell>
                            {policy.conditions.length > 0 ? (
                              expandedPolicy === policy.policy_id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium">{policy.policy_id}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{getProductName(policy.product_code)}</span>
                              <span className="text-xs text-muted-foreground ml-2">({policy.product_code})</span>
                            </div>
                          </TableCell>
                          <TableCell>{policy.base_rate}%</TableCell>
                          <TableCell>{formatDate(policy.effective_from)}</TableCell>
                          <TableCell>{formatDate(policy.effective_to)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={policy.status === "ACTIVE" ? "default" : "secondary"}
                              className={
                                policy.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                  : ""
                              }
                            >
                              {policy.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{policy.conditions.length}</TableCell>
                        </TableRow>
                        {/* Expanded conditions */}
                        {expandedPolicy === policy.policy_id && policy.conditions.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Interest Slabs / Conditions</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Field</TableHead>
                                      <TableHead>Operator</TableHead>
                                      <TableHead>From</TableHead>
                                      <TableHead>To</TableHead>
                                      <TableHead>Interest Rate (%)</TableHead>
                                      <TableHead>Penal Rate (%)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {policy.conditions.map((cond, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell>
                                          {FIELD_OPTIONS.find((f) => f.value === cond.field_name)?.label || cond.field_name}
                                        </TableCell>
                                        <TableCell>
                                          {OPERATOR_OPTIONS.find((o) => o.value === cond.operator)?.label || cond.operator}
                                        </TableCell>
                                        <TableCell>{cond.value_from || "-"}</TableCell>
                                        <TableCell>{cond.value_to || "-"}</TableCell>
                                        <TableCell>{cond.interest_rate}%</TableCell>
                                        <TableCell>{cond.penal_rate != null ? `${cond.penal_rate}%` : "-"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && policies.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 mb-4">
                <Percent className="h-8 w-8 text-rose-600" />
              </div>
              <CardTitle className="text-xl mb-2">No Interest Policies</CardTitle>
              <CardDescription className="text-center max-w-md mb-4">
                No interest policies have been configured yet. Click the button below to add your first policy.
              </CardDescription>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Policy
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Policy Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Interest Policy</DialogTitle>
            <DialogDescription>
              Create a new interest policy with optional slabs/conditions based on effective date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Policy Details</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="product_code">Product *</Label>
                  <Select
                    value={newPolicy.product_code}
                    onValueChange={(v) => setNewPolicy((prev) => ({ ...prev, product_code: v }))}
                  >
                    <SelectTrigger id="product_code">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.product_code} value={p.product_code}>
                          {p.product_name} ({p.product_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="base_rate">Base Rate (%) *</Label>
                  <Input
                    id="base_rate"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 6.5"
                    value={newPolicy.base_rate}
                    onChange={(e) => setNewPolicy((prev) => ({ ...prev, base_rate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="effective_from">Effective From *</Label>
                  <Input
                    id="effective_from"
                    type="date"
                    value={newPolicy.effective_from}
                    onChange={(e) => setNewPolicy((prev) => ({ ...prev, effective_from: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="effective_to">Effective To (optional)</Label>
                  <Input
                    id="effective_to"
                    type="date"
                    value={newPolicy.effective_to}
                    onChange={(e) => setNewPolicy((prev) => ({ ...prev, effective_to: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Interest Slabs / Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Interest Slabs / Conditions (Optional)
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addCondition} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Slab
                </Button>
              </div>

              {newConditions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No slabs added. The base rate will apply to all transactions.
                </p>
              ) : (
                <div className="space-y-3">
                  {newConditions.map((cond, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Slab {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(idx)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Field</Label>
                          <Select
                            value={cond.field_name}
                            onValueChange={(v) => updateCondition(idx, "field_name", v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_OPTIONS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Operator</Label>
                          <Select
                            value={cond.operator}
                            onValueChange={(v) => updateCondition(idx, "operator", v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPERATOR_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">From Value</Label>
                          <Input
                            className="h-9"
                            placeholder="e.g., 0"
                            value={cond.value_from}
                            onChange={(e) => updateCondition(idx, "value_from", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">To Value</Label>
                          <Input
                            className="h-9"
                            placeholder="e.g., 100000"
                            value={cond.value_to}
                            onChange={(e) => updateCondition(idx, "value_to", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Interest Rate (%)</Label>
                          <Input
                            className="h-9"
                            type="number"
                            step="0.01"
                            placeholder="e.g., 7.0"
                            value={cond.interest_rate}
                            onChange={(e) => updateCondition(idx, "interest_rate", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Penal Rate (%)</Label>
                          <Input
                            className="h-9"
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            value={cond.penal_rate || ""}
                            onChange={(e) =>
                              updateCondition(idx, "penal_rate", e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save message */}
            {saveMessage && (
              <div
                className={`text-sm px-3 py-2 rounded-md ${
                  saveMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {saveMessage.text}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSavePolicy} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
