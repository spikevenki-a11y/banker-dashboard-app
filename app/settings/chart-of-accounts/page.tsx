"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  FileSpreadsheet,
  Loader2,
  Plus,
  Pencil,
  Search,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  IndianRupee,
} from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

/* ── Types ── */

interface Account {
  branchId: number
  accountCode: number
  accountName: string
  accountTypeCode: number
  accountTypeLabel: string
  isLedger: boolean
  parentAccountCode: number
  accountBalance: number
  isActive: boolean
  createdDate: string
  modifiedDate: string
}

interface TreeNode extends Account {
  children: TreeNode[]
  depth: number
}

const ACCOUNT_TYPES = [
  { code: 1, label: "Liabilities", color: "text-blue-700", bg: "bg-blue-50" },
  { code: 2, label: "Assets", color: "text-emerald-700", bg: "bg-emerald-50" },
  { code: 3, label: "Income", color: "text-teal-700", bg: "bg-teal-50" },
  { code: 4, label: "Expenses", color: "text-rose-700", bg: "bg-rose-50" },
  { code: 5, label: "Profit & Loss", color: "text-amber-700", bg: "bg-amber-50" },
]

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(val)
}

/* ── Build tree from flat array ── */

function buildTree(accounts: Account[]): TreeNode[] {
  const map = new Map<number, TreeNode>()
  const roots: TreeNode[] = []

  // Initialize all nodes
  for (const acc of accounts) {
    map.set(acc.accountCode, { ...acc, children: [], depth: 0 })
  }

  // Build parent-child relationships
  for (const acc of accounts) {
    const node = map.get(acc.accountCode)!
    if (acc.parentAccountCode === 0 || !map.has(acc.parentAccountCode)) {
      roots.push(node)
    } else {
      const parent = map.get(acc.parentAccountCode)!
      parent.children.push(node)
    }
  }

  // Set depths
  function setDepth(nodes: TreeNode[], depth: number) {
    for (const n of nodes) {
      n.depth = depth
      setDepth(n.children, depth + 1)
    }
  }
  setDepth(roots, 0)

  return roots
}

/* ── Flatten tree for table rendering ── */

function flattenTree(nodes: TreeNode[], expandedSet: Set<number>): TreeNode[] {
  const result: TreeNode[] = []
  function walk(list: TreeNode[]) {
    for (const n of list) {
      result.push(n)
      if (n.children.length > 0 && expandedSet.has(n.accountCode)) {
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return result
}

function getAllNodeCodes(nodes: TreeNode[]): number[] {
  const codes: number[] = []
  function walk(list: TreeNode[]) {
    for (const n of list) {
      if (n.children.length > 0) codes.push(n.accountCode)
      walk(n.children)
    }
  }
  walk(nodes)
  return codes
}

/* ── Component ── */

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set())

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountTypeCode: "1",
    isLedger: true,
    parentAccountCode: "0",
    isActive: true,
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/chart-of-accounts", { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setAccounts(data.accounts)
        // Expand root nodes by default
        const tree = buildTree(data.accounts)
        setExpandedNodes(new Set(getAllNodeCodes(tree)))
      }
    } catch (err) {
      console.error("Failed to fetch chart of accounts:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered + searched accounts
  const filteredAccounts = useMemo(() => {
    let filtered = accounts
    if (filterType !== "all") {
      filtered = filtered.filter((a) => a.accountTypeCode === Number(filterType))
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.accountName.toLowerCase().includes(term) ||
          String(a.accountCode).includes(term)
      )
    }
    return filtered
  }, [accounts, filterType, searchTerm])

  const tree = useMemo(() => buildTree(filteredAccounts), [filteredAccounts])
  const flatList = useMemo(() => flattenTree(tree, expandedNodes), [tree, expandedNodes])

  function toggleExpand(code: number) {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  function expandAll() {
    setExpandedNodes(new Set(getAllNodeCodes(tree)))
  }

  function collapseAll() {
    setExpandedNodes(new Set())
  }

  function openCreateDialog(parentCode?: number, parentType?: number) {
    setDialogMode("create")
    setFormData({
      accountCode: "",
      accountName: "",
      accountTypeCode: parentType ? String(parentType) : "1",
      isLedger: true,
      parentAccountCode: parentCode ? String(parentCode) : "0",
      isActive: true,
    })
    setSaveMessage(null)
    setDialogOpen(true)
  }

  function openEditDialog(acc: Account) {
    setDialogMode("edit")
    setFormData({
      accountCode: String(acc.accountCode),
      accountName: acc.accountName,
      accountTypeCode: String(acc.accountTypeCode),
      isLedger: acc.isLedger,
      parentAccountCode: String(acc.parentAccountCode),
      isActive: acc.isActive,
    })
    setSaveMessage(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveMessage(null)

    const endpoint = "/api/chart-of-accounts"
    const method = dialogMode === "create" ? "POST" : "PUT"

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountCode: Number(formData.accountCode),
          accountName: formData.accountName,
          accountTypeCode: Number(formData.accountTypeCode),
          isLedger: formData.isLedger,
          parentAccountCode: Number(formData.parentAccountCode) || 0,
          isActive: formData.isActive,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSaveMessage({
          type: "success",
          text: dialogMode === "create" ? "Account created successfully." : "Account updated successfully.",
        })
        fetchAccounts()
        if (dialogMode === "create") {
          // Reset form for another entry
          setFormData((prev) => ({
            ...prev,
            accountCode: "",
            accountName: "",
          }))
        }
      } else {
        setSaveMessage({ type: "error", text: data.error || "Operation failed." })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  // Summary stats
  const totalAccounts = accounts.length
  const activeAccounts = accounts.filter((a) => a.isActive).length
  const typeCounts = ACCOUNT_TYPES.map((t) => ({
    ...t,
    count: accounts.filter((a) => a.accountTypeCode === t.code).length,
  }))

  // Get possible parents (for the dropdown in create/edit dialog)
  const possibleParents = accounts.filter(
    (a) => a.accountCode !== Number(formData.accountCode)
  )

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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50">
              <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                Chart of Accounts
              </h2>
              <p className="text-muted-foreground">
                View and manage your general ledger account hierarchy
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{totalAccounts}</p>
              </div>
            </CardContent>
          </Card>
          {typeCounts.map((t) => (
            <Card key={t.code}>
              <CardContent className="flex items-center gap-3 pt-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.bg}`}>
                  <FileText className={`h-5 w-5 ${t.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-xl font-bold">{t.count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.code} value={String(t.code)}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={expandAll} className="bg-transparent text-xs">
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} className="bg-transparent text-xs">
                  Collapse All
                </Button>
                <Button size="sm" onClick={() => openCreateDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading chart of accounts...</span>
          </div>
        )}

        {/* Tree Table */}
        {!isLoading && flatList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Account Hierarchy</CardTitle>
              <CardDescription>
                {filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""} displayed
                {filterType !== "all" && ` (filtered by ${ACCOUNT_TYPES.find((t) => t.code === Number(filterType))?.label})`}
                {searchTerm && ` matching "${searchTerm}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[400px]">Account</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flatList.map((node) => {
                      const hasChildren = node.children.length > 0
                      const isExpanded = expandedNodes.has(node.accountCode)
                      const typeInfo = ACCOUNT_TYPES.find((t) => t.code === node.accountTypeCode)

                      return (
                        <TableRow key={`${node.branchId}-${node.accountCode}`} className="group">
                          <TableCell>
                            <div
                              className="flex items-center gap-1.5"
                              style={{ paddingLeft: `${node.depth * 24}px` }}
                            >
                              {hasChildren ? (
                                <button
                                  onClick={() => toggleExpand(node.accountCode)}
                                  className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                                  aria-label={isExpanded ? "Collapse" : "Expand"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-6" />
                              )}
                              {hasChildren ? (
                                isExpanded ? (
                                  <FolderOpen className={`h-4 w-4 ${typeInfo?.color || "text-muted-foreground"}`} />
                                ) : (
                                  <Folder className={`h-4 w-4 ${typeInfo?.color || "text-muted-foreground"}`} />
                                )
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={`text-sm ${hasChildren && node.depth === 0 ? "font-semibold" : hasChildren ? "font-medium" : ""}`}>
                                {node.accountName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                              {node.accountCode}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${typeInfo ? `${typeInfo.bg} ${typeInfo.color} border-transparent` : ""}`}
                            >
                              {node.accountTypeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-0.5 text-sm font-mono">
                              <IndianRupee className="h-3 w-3 text-muted-foreground" />
                              {Number(node.accountBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={node.isActive ? "default" : "secondary"}
                              className={
                                node.isActive
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent"
                                  : "bg-gray-100 text-gray-500 border-transparent"
                              }
                            >
                              {node.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(node)}
                                className="h-7 bg-transparent text-xs"
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              {hasChildren || node.depth < 2 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCreateDialog(node.accountCode, node.accountTypeCode)}
                                  className="h-7 bg-transparent text-xs"
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Sub
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && flatList.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 mb-4">
                <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-xl mb-2">No Accounts Found</CardTitle>
              <CardDescription className="text-center max-w-md">
                {searchTerm || filterType !== "all"
                  ? "No accounts match your search or filter criteria."
                  : "No chart of accounts configured for your branch yet."}
              </CardDescription>
              {!searchTerm && filterType === "all" && (
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => openCreateDialog()}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Create First Account
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setSaveMessage(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add New Account" : "Edit Account"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Create a new account in the chart of accounts."
                : `Editing account ${formData.accountCode}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Account Code */}
            <div className="space-y-1.5">
              <Label htmlFor="accountCode">Account Code</Label>
              <Input
                id="accountCode"
                type="number"
                placeholder="e.g. 12100000"
                value={formData.accountCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, accountCode: e.target.value }))}
                disabled={dialogMode === "edit"}
              />
            </div>

            {/* Account Name */}
            <div className="space-y-1.5">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g. Savings Deposits"
                value={formData.accountName}
                onChange={(e) => setFormData((prev) => ({ ...prev, accountName: e.target.value }))}
              />
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={formData.accountTypeCode}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, accountTypeCode: v }))}
              >
                <SelectTrigger id="accountType">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.code} value={String(t.code)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parent Account */}
            <div className="space-y-1.5">
              <Label htmlFor="parentAccount">Parent Account</Label>
              <Select
                value={formData.parentAccountCode}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, parentAccountCode: v }))}
              >
                <SelectTrigger id="parentAccount">
                  <SelectValue placeholder="Select parent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (Root Account)</SelectItem>
                  {possibleParents.map((a) => (
                    <SelectItem key={a.accountCode} value={String(a.accountCode)}>
                      {a.accountCode} - {a.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Is Ledger & Is Active */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="isLedger" className="text-sm">Ledger Account</Label>
                <Switch
                  id="isLedger"
                  checked={formData.isLedger}
                  onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isLedger: v }))}
                />
              </div>
              {dialogMode === "edit" && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label htmlFor="isActive" className="text-sm">Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isActive: v }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save message */}
          {saveMessage && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                saveMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.accountCode || !formData.accountName}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === "create" ? "Create Account" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
