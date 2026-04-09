"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Building2,
  RefreshCw,
  Eye,
  Settings,
  TrendingDown,
  IndianRupee,
  Calendar,
  Percent,
  FileText,
  XCircle,
  ShoppingCart,
  BarChart3,
  Wrench,
  Tag,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { SearchableSelect } from "@/components/ui/searchable-select"

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = {
  category_id: number
  category_name: string
  gl_account_code: string
  depreciation_gl_account_code: string | null
}

type AssetItem = {
  id: string
  asset_id: number
  asset_name: string
  category_id: number
  branch_id: number
  category_name: string
  gl_account_code: string
}

type AssetDetail = {
  id: string
  asset_id: number
  asset_name: string
  item_name: string
  category_id: number
  category_name: string
  serial_number: string
  purchase_id: number
  purchase_date: string
  purchase_value: number
  net_book_value: number
  last_depreciation_date: string | null
  status: string
  dep_method: string | null
  dep_rate: number | null
  dep_master_id: string | null
  gl_account_code: string
}

type Purchase = {
  id: string
  purchase_id: number
  branch_id: number
  purchase_date: string
  invoice_no: string
  vendor_name: string
  total_amount: number
  status: string
  batch_id: number | null
  voucher_no: string | null
  remarks: string
}

type PurchaseLineItem = {
  asset_id: string
  asset_name: string
  quantity: string
  unit_cost: string
  sgst: string
  cgst: string
}

type DepHistory = {
  id: string
  asset_detail_id: string
  depreciation_date: string
  depreciation_amount: number
  accumulated_depreciation: number
  book_value: number
}

type SaleRecord = {
  id: string
  sale_id: number
  asset_detail_id: string
  asset_name: string
  serial_number: string
  category_name: string
  disposal_type: string
  sale_date: string
  sale_amount: number
  book_value_at_sale: number
  profit_loss: number
  buyer_name: string
  remarks: string
}

type VoucherDetails = {
  type: "purchase_confirm" | "depreciation" | "sale"
  title: string
  voucherNo: string | number | null
  batchId: string | number | null
  date: string
  description: string
  amount: number
  extra?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | string) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    sold: "bg-blue-100 text-blue-700",
    scrapped: "bg-red-100 text-red-700",
    inactive: "bg-gray-100 text-gray-600",
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
  }
  return (
    <Badge className={`text-xs ${map[status] ?? "bg-gray-100 text-gray-600"}`}>{status}</Badge>
  )
}

const emptyLine = (): PurchaseLineItem => ({
  asset_id: "", asset_name: "", quantity: "1", unit_cost: "", sgst: "0", cgst: "0",
})

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FixedAssetsPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("records")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [voucherDetails, setVoucherDetails] = useState<VoucherDetails | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  // Data
  const [categories, setCategories] = useState<Category[]>([])
  const [assetItems, setAssetItems] = useState<AssetItem[]>([])
  const [assetDetails, setAssetDetails] = useState<AssetDetail[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [depConfigs, setDepConfigs] = useState<AssetDetail[]>([])

  // Filters
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus,   setFilterStatus]   = useState("all")

  // ── Asset Types form ──────────────────────────────────────────────────────
  const [newItemName, setNewItemName]     = useState("")
  const [newItemCategory, setNewItemCategory] = useState("")

  // ── Purchase form ─────────────────────────────────────────────────────────
  const [pVendorName,    setPVendorName]    = useState("")
  const [pVendorGstin,   setPVendorGstin]   = useState("")
  const [pVendorContact, setPVendorContact] = useState("")
  const [pVendorAddress, setPVendorAddress] = useState("")
  const [pInvoiceNo,     setPInvoiceNo]     = useState("")
  const [pPurchaseDate,  setPPurchaseDate]  = useState("")
  const [pVoucherType,   setPVoucherType]   = useState("CASH")
  const [pRemarks,       setPRemarks]       = useState("")
  const [pLines, setPLines] = useState<PurchaseLineItem[]>([emptyLine()])

  // ── Depreciation config dialog ────────────────────────────────────────────
  const [depDialog, setDepDialog] = useState(false)
  const [depAsset,  setDepAsset]  = useState<AssetDetail | null>(null)
  const [depMethod, setDepMethod] = useState("SLM")
  const [depRate,   setDepRate]   = useState("")

  // ── Depreciation run ──────────────────────────────────────────────────────
  const [depRunDate,     setDepRunDate]     = useState("")
  const [depSelectedIds, setDepSelectedIds] = useState<string[]>([])

  // ── Depreciation history dialog ───────────────────────────────────────────
  const [depHistDialog, setDepHistDialog] = useState(false)
  const [depHistory,    setDepHistory]    = useState<DepHistory[]>([])
  const [depHistAsset,  setDepHistAsset]  = useState<AssetDetail | null>(null)

  // ── Sale/Disposal form ────────────────────────────────────────────────────
  const [saleAsset,       setSaleAsset]       = useState("")
  const [saleDisposalType, setSaleDisposalType] = useState("SALE")
  const [saleDate,        setSaleDate]        = useState("")
  const [saleAmount,      setSaleAmount]      = useState("")
  const [saleBuyer,       setSaleBuyer]       = useState("")
  const [saleRemarks,     setSaleRemarks]     = useState("")
  const [saleVoucherType, setSaleVoucherType] = useState("CASH")

  // ── Purchase detail dialog ────────────────────────────────────────────────
  const [purchaseDialog,      setPurchaseDialog]      = useState(false)
  const [purchaseDialogItems, setPurchaseDialogItems] = useState<any[]>([])
  const [purchaseDialogData,  setPurchaseDialogData]  = useState<Purchase | null>(null)
  const [confirmingPurchaseId, setConfirmingPurchaseId] = useState<number | null>(null)
  const [cancelConfirmOpen,   setCancelConfirmOpen]   = useState(false)
  const [pendingCancelId,     setPendingCancelId]     = useState<number | null>(null)
  const [cancellingPurchaseId, setCancellingPurchaseId] = useState<number | null>(null)

  // ─── Data loaders ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [catRes, itemsRes, detailsRes, purchasesRes, salesRes, depRes] = await Promise.all([
        fetch("/api/fixed-assets/categories"),
        fetch("/api/fixed-assets/items"),
        fetch("/api/fixed-assets/item-details"),
        fetch("/api/fixed-assets/purchase"),
        fetch("/api/fixed-assets/sales"),
        fetch("/api/fixed-assets/depreciation"),
      ])
      const [catData, itemsData, detailsData, purchasesData, salesData, depData] = await Promise.all([
        catRes.json(), itemsRes.json(), detailsRes.json(),
        purchasesRes.json(), salesRes.json(), depRes.json(),
      ])
      console.log({ catData, itemsData, detailsData, purchasesData, salesData, depData })
      if (catData.success)       setCategories(catData.categories)
      if (itemsData.success)     setAssetItems(itemsData.items)
      if (detailsData.success)   setAssetDetails(detailsData.assets)
      if (purchasesData.success) setPurchases(purchasesData.purchases)
      if (salesData.success)     setSales(salesData.sales)
      if (depData.success)       setDepConfigs(depData.configs)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ─── Computed ──────────────────────────────────────────────────────────────

  const filteredDetails = assetDetails.filter(a => {
    const catOk    = filterCategory === "all" || String(a.category_id) === filterCategory
    const statusOk = filterStatus === "all" || a.status === filterStatus
    return catOk && statusOk
  })

  const activeAssets      = assetDetails.filter(a => a.status === "active")
  const totalBookValue    = assetDetails.reduce((s, a) => s + parseFloat(String(a.net_book_value || 0)), 0)
  const totalPurchaseValue = assetDetails.reduce((s, a) => s + parseFloat(String(a.purchase_value || 0)), 0)
  const assetsWithDep     = assetDetails.filter(a => a.dep_master_id && a.status === "active")

  const pLineTotal = pLines.reduce((sum, l) => {
    const base  = parseFloat(l.unit_cost || "0") * parseInt(l.quantity || "1")
    const sgst  = base * (parseFloat(l.sgst || "0") / 100)
    const cgst  = base * (parseFloat(l.cgst || "0") / 100)
    return sum + base + sgst + cgst
  }, 0)

  const assetOptions = assetItems.map(a => ({ value: String(a.asset_id), label: a.asset_name }))
  const activeAssetOptions = activeAssets.map(a => ({
    value: a.id,
    label: `${a.asset_name} — ${a.serial_number} (${fmt(a.net_book_value)})`,
  }))

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function submitAssetType() {
    if (!newItemName || !newItemCategory) { setErrorMsg("Fill all fields"); return }
    setIsSubmitting(true)
    try {
      const res  = await fetch("/api/fixed-assets/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_name: newItemName, category_id: parseInt(newItemCategory) }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      setNewItemName(""); setNewItemCategory("")
      await loadAll()
      setActiveTab("asset-types")
    } finally { setIsSubmitting(false) }
  }

  async function submitPurchase() {
    if (!pPurchaseDate || pLines.some(l => !l.asset_name || !l.unit_cost)) {
      setErrorMsg("Fill purchase date and all line item fields"); return
    }
    setIsSubmitting(true)
    try {
      const res  = await fetch("/api/fixed-assets/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: pVendorName, vendor_gstin: pVendorGstin,
          vendor_contact: pVendorContact, vendor_address: pVendorAddress,
          invoice_no: pInvoiceNo, purchase_date: pPurchaseDate,
          remarks: pRemarks, items: pLines,
        }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      setPVendorName(""); setPVendorGstin(""); setPVendorContact(""); setPVendorAddress("")
      setPInvoiceNo(""); setPPurchaseDate(""); setPRemarks(""); setPLines([emptyLine()])
      await loadAll()
      setActiveTab("purchases")
    } finally { setIsSubmitting(false) }
  }

  async function confirmPurchase(purchaseId: number, vType = "CASH") {
    setConfirmingPurchaseId(purchaseId)
    try {
      const res  = await fetch("/api/fixed-assets/purchase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_id: purchaseId, voucher_type: vType }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      setVoucherDetails({
        type: "purchase_confirm",
        title: "Purchase Confirmed",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        date: new Date().toISOString().split("T")[0],
        description: `${data.assets_created} individual asset record(s) created`,
        amount: 0,
      })
      await loadAll()
    } finally { setConfirmingPurchaseId(null) }
  }

  async function cancelPurchase(purchaseId: number) {
    setCancellingPurchaseId(purchaseId)
    try {
      const res  = await fetch("/api/fixed-assets/purchase", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_id: purchaseId }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      await loadAll()
    } finally {
      setCancellingPurchaseId(null)
      setCancelConfirmOpen(false)
      setPendingCancelId(null)
    }
  }

  async function openPurchaseDialog(purchaseId: number) {
    const res  = await fetch(`/api/fixed-assets/purchase?purchase_id=${purchaseId}`)
    const data = await res.json()
    if (data.success) {
      setPurchaseDialogData(data.purchase)
      setPurchaseDialogItems(data.items)
      setPurchaseDialog(true)
    }
  }

  async function openDepConfig(asset: AssetDetail) {
    setDepAsset(asset)
    setDepMethod(asset.dep_method || "SLM")
    setDepRate(asset.dep_rate ? String(asset.dep_rate) : "")
    setDepDialog(true)
  }

  async function saveDepConfig() {
    if (!depAsset || !depMethod || !depRate) return
    setIsSubmitting(true)
    try {
      const res  = await fetch("/api/fixed-assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_detail_id: depAsset.id,
          method: depMethod,
          depreciation_rate: parseFloat(depRate),
        }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      setDepDialog(false)
      await loadAll()
    } finally { setIsSubmitting(false) }
  }

  async function runDepreciation() {
    if (!depRunDate || depSelectedIds.length === 0) {
      setErrorMsg("Select depreciation date and at least one asset"); return
    }
    setIsSubmitting(true)
    try {
      const res  = await fetch("/api/fixed-assets/depreciation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depreciation_date: depRunDate, asset_detail_ids: depSelectedIds }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      const totalDep = data.results.reduce((s: number, r: any) => s + r.dep_amount, 0)
      setVoucherDetails({
        type: "depreciation",
        title: "Depreciation Run Complete",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        date: depRunDate,
        description: `${data.results.length} asset(s) depreciated`,
        amount: totalDep,
      })
      setDepRunDate(""); setDepSelectedIds([])
      await loadAll()
    } finally { setIsSubmitting(false) }
  }

  async function openDepHistory(asset: AssetDetail) {
    setDepHistAsset(asset)
    const res  = await fetch(`/api/fixed-assets/item-details?id=${asset.id}&type=dep_history`)
    const data = await res.json()
    if (data.success) { setDepHistory(data.history); setDepHistDialog(true) }
  }

  async function submitSale() {
    if (!saleAsset || !saleDisposalType || !saleDate) {
      setErrorMsg("Fill all required fields"); return
    }
    if (saleDisposalType === "SALE" && !saleAmount) {
      setErrorMsg("Sale amount is required for SALE disposal type"); return
    }
    setIsSubmitting(true)
    const asset = assetDetails.find(a => a.id === saleAsset)
    try {
      const res  = await fetch("/api/fixed-assets/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_detail_id: saleAsset,
          disposal_type: saleDisposalType,
          sale_date: saleDate,
          sale_amount: parseFloat(saleAmount || "0"),
          buyer_name: saleBuyer,
          remarks: saleRemarks,
          voucher_type: saleVoucherType,
        }),
      })
      const data = await res.json()
      if (!data.success) { setErrorMsg(data.error); return }
      const pl = data.profit_loss
      setVoucherDetails({
        type: "sale",
        title: saleDisposalType === "SALE" ? "Asset Sale Recorded" : "Asset Scrapped",
        voucherNo: data.voucher_no,
        batchId: data.batch_id,
        date: saleDate,
        description: `${asset?.asset_name} (${asset?.serial_number})`,
        amount: parseFloat(saleAmount || "0"),
        extra: pl >= 0 ? `Profit: ${fmt(pl)}` : `Loss: ${fmt(Math.abs(pl))}`,
      })
      setSaleAsset(""); setSaleDisposalType("SALE"); setSaleDate("")
      setSaleAmount(""); setSaleBuyer(""); setSaleRemarks(""); setSaleVoucherType("CASH")
      await loadAll()
    } finally { setIsSubmitting(false) }
  }

  function toggleDepSelect(id: string) {
    setDepSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function updateLine(idx: number, field: keyof PurchaseLineItem, value: string) {
    setPLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function lineTax(l: PurchaseLineItem) {
    const base = parseFloat(l.unit_cost || "0") * parseInt(l.quantity || "1")
    return base + base * (parseFloat(l.sgst || "0") / 100) + base * (parseFloat(l.cgst || "0") / 100)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardWrapper>
    )
  }

  return (
    <DashboardWrapper>
      <div className="p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/bank-level")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Fixed Assets</h1>
            <p className="text-muted-foreground">Asset Management &amp; Depreciation</p>
          </div>
          <Button variant="outline" size="icon" className="ml-auto" onClick={loadAll}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
              <Building2 className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{assetDetails.length}</p>
              <p className="text-xs text-muted-foreground">{activeAssets.length} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(totalPurchaseValue)}</p>
              <p className="text-xs text-muted-foreground">Original cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Book Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(totalBookValue)}</p>
              <p className="text-xs text-muted-foreground">After depreciation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dep. Configured</CardTitle>
              <TrendingDown className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{assetsWithDep.length}</p>
              <p className="text-xs text-muted-foreground">of {activeAssets.length} active</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="records" className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Asset Records
            </TabsTrigger>
            <TabsTrigger value="asset-types" className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> Asset Types
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5" /> Purchases
            </TabsTrigger>
            <TabsTrigger value="new-purchase" className="flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> New Purchase
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" /> Depreciation
            </TabsTrigger>
            <TabsTrigger value="disposal" className="flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5" /> Sale / Disposal
            </TabsTrigger>
            <TabsTrigger value="sales-list" className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Disposal History
            </TabsTrigger>
          </TabsList>

          {/* ── Asset Records ──────────────────────────────────────────── */}
          <TabsContent value="records" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.category_id} value={String(c.category_id)}>
                      {c.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="scrapped">Scrapped</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Book Value</TableHead>
                    <TableHead>Dep. Method</TableHead>
                    <TableHead>Last Dep.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No asset records found
                      </TableCell>
                    </TableRow>
                  ) : filteredDetails.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.asset_name || a.item_name}</TableCell>
                      <TableCell className="text-sm">{a.category_name}</TableCell>
                      <TableCell className="font-mono text-xs">{a.serial_number}</TableCell>
                      <TableCell className="text-sm">{fmtDate(a.purchase_date)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(a.purchase_value)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(a.net_book_value)}</TableCell>
                      <TableCell className="text-sm">
                        {a.dep_method ? (
                          <span className="text-xs">{a.dep_method} @ {a.dep_rate}%</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{a.last_depreciation_date ? fmtDate(a.last_depreciation_date) : "—"}</TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          {a.status === "active" && (
                            <Button
                              variant="ghost" size="icon" title="Configure Depreciation"
                              onClick={() => openDepConfig(a)}
                            >
                              <Settings className="h-4 w-4 text-purple-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" title="Depreciation History"
                            onClick={() => openDepHistory(a)}
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Asset Types ────────────────────────────────────────────── */}
          <TabsContent value="asset-types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Asset Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Asset Name *</Label>
                    <Input
                      placeholder="e.g. Dell Laptop, Office Chair"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category *</Label>
                    <SearchableSelect
                      options={categories.map(c => ({ value: String(c.category_id), label: c.category_name }))}
                      value={newItemCategory}
                      onValueChange={setNewItemCategory}
                      placeholder="Select category"
                      searchPlaceholder="Search categories..."
                    />
                  </div>
                </div>
                <Button onClick={submitAssetType} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Asset Type
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Asset GL</TableHead>
                    <TableHead>Dep. GL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No asset types defined
                      </TableCell>
                    </TableRow>
                  ) : assetItems.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell>{a.category_name}</TableCell>
                      <TableCell className="font-mono text-xs">{a.gl_account_code}</TableCell>
                      <TableCell className="font-mono text-xs">{a.depreciation_gl_account_code || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Purchases List ─────────────────────────────────────────── */}
          <TabsContent value="purchases" className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No purchases recorded
                      </TableCell>
                    </TableRow>
                  ) : purchases.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.purchase_id}</TableCell>
                      <TableCell>{fmtDate(p.purchase_date)}</TableCell>
                      <TableCell>{p.vendor_name || "—"}</TableCell>
                      <TableCell className="text-sm">{p.invoice_no || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.total_amount)}</TableCell>
                      <TableCell className="text-sm">{p.voucher_no || "—"}</TableCell>
                      <TableCell>
                        {p.status === "CANCELLED"
                          ? <Badge className="text-xs bg-red-100 text-red-700">Cancelled</Badge>
                          : p.batch_id
                          ? <Badge className="text-xs bg-green-100 text-green-700">Confirmed</Badge>
                          : <Badge className="text-xs bg-yellow-100 text-yellow-700">Pending</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="ghost" size="icon" title="View Items"
                            onClick={() => openPurchaseDialog(p.purchase_id)}
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          {!p.batch_id && p.status !== "CANCELLED" && (
                            <>
                              <Button
                                variant="ghost" size="sm" title="Confirm Purchase"
                                className="text-green-600 hover:text-green-700"
                                disabled={confirmingPurchaseId === p.purchase_id || cancellingPurchaseId === p.purchase_id}
                                onClick={() => confirmPurchase(p.purchase_id, "CASH")}
                              >
                                {confirmingPurchaseId === p.purchase_id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <CheckCircle2 className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost" size="sm" title="Cancel Purchase"
                                className="text-red-500 hover:text-red-600"
                                disabled={cancellingPurchaseId === p.purchase_id || confirmingPurchaseId === p.purchase_id}
                                onClick={() => { setPendingCancelId(p.purchase_id); setCancelConfirmOpen(true) }}
                              >
                                {cancellingPurchaseId === p.purchase_id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <XCircle className="h-4 w-4" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── New Purchase ───────────────────────────────────────────── */}
          <TabsContent value="new-purchase" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Purchase Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Purchase Date *</Label>
                    <Input type="date" value={pPurchaseDate} onChange={e => setPPurchaseDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Invoice No.</Label>
                    <Input placeholder="INV-2024-001" value={pInvoiceNo} onChange={e => setPInvoiceNo(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Voucher Type</Label>
                    <Select value={pVoucherType} onValueChange={setPVoucherType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Vendor Name</Label>
                    <Input placeholder="Vendor / Supplier name" value={pVendorName} onChange={e => setPVendorName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vendor GSTIN</Label>
                    <Input placeholder="22AAAAA0000A1Z5" value={pVendorGstin} onChange={e => setPVendorGstin(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact</Label>
                    <Input placeholder="+91 98765 43210" value={pVendorContact} onChange={e => setPVendorContact(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Remarks</Label>
                    <Input placeholder="Optional remarks" value={pRemarks} onChange={e => setPRemarks(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Vendor Address</Label>
                    <Textarea rows={2} placeholder="Vendor address" value={pVendorAddress} onChange={e => setPVendorAddress(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setPLines(prev => [...prev, emptyLine()])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Asset Type</th>
                        <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-16">Qty</th>
                        <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-28">Unit Cost</th>
                        <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-16">SGST%</th>
                        <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-16">CGST%</th>
                        <th className="text-right py-2 font-medium text-muted-foreground w-28">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pLines.map((line, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2 pr-2">
                            <div className="flex gap-2">
                              <SearchableSelect
                                options={assetOptions}
                                value={line.asset_id}
                                placeholder="Select type"
                                onValueChange={val => {
                                  const item = assetItems.find(a => String(a.asset_id) === val)
                                  updateLine(idx, "asset_id", val)
                                  if (item) updateLine(idx, "asset_name", item.asset_name)
                                }}
                                className="w-48"
                              />
                              {!line.asset_id && (
                                <Input
                                  placeholder="Or type name"
                                  value={line.asset_name}
                                  onChange={e => updateLine(idx, "asset_name", e.target.value)}
                                  className="w-40"
                                />
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number" min="1" value={line.quantity}
                              onChange={e => updateLine(idx, "quantity", e.target.value)}
                              className="w-16"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number" placeholder="0.00" value={line.unit_cost}
                              onChange={e => updateLine(idx, "unit_cost", e.target.value)}
                              className="w-28"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number" placeholder="0" value={line.sgst}
                              onChange={e => updateLine(idx, "sgst", e.target.value)}
                              className="w-16"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number" placeholder="0" value={line.cgst}
                              onChange={e => updateLine(idx, "cgst", e.target.value)}
                              className="w-16"
                            />
                          </td>
                          <td className="py-2 text-right font-medium">
                            {fmt(lineTax(line))}
                          </td>
                          <td className="py-2 pl-2">
                            {pLines.length > 1 && (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setPLines(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="pt-3 text-right font-semibold">Grand Total:</td>
                        <td className="pt-3 text-right font-bold text-lg">{fmt(pLineTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <Button onClick={submitPurchase} disabled={isSubmitting} className="mt-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                  Save Purchase
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Depreciation ───────────────────────────────────────────── */}
          <TabsContent value="depreciation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" /> Run Depreciation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="space-y-1.5">
                    <Label>Depreciation Date *</Label>
                    <Input type="date" value={depRunDate} onChange={e => setDepRunDate(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setDepSelectedIds(assetsWithDep.map(a => a.id))}
                    >
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDepSelectedIds([])}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          <Checkbox
                            checked={depSelectedIds.length === assetsWithDep.length && assetsWithDep.length > 0}
                            onCheckedChange={checked =>
                              setDepSelectedIds(checked ? assetsWithDep.map(a => a.id) : [])
                            }
                          />
                        </TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Serial No.</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Rate %</TableHead>
                        <TableHead className="text-right">Book Value</TableHead>
                        <TableHead className="text-right">Est. Dep.</TableHead>
                        <TableHead>Last Run</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetsWithDep.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No assets with depreciation configured. Use the gear icon in Asset Records.
                          </TableCell>
                        </TableRow>
                      ) : assetsWithDep.map(a => {
                        const bv  = parseFloat(String(a.net_book_value))
                        const pv  = parseFloat(String(a.purchase_value))
                        const rate = a.dep_rate || 0
                        const estDep = a.dep_method === "SLM"
                          ? (pv * rate) / 100
                          : (bv * rate) / 100
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Checkbox
                                checked={depSelectedIds.includes(a.id)}
                                onCheckedChange={() => toggleDepSelect(a.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{a.asset_name || a.item_name}</TableCell>
                            <TableCell className="font-mono text-xs">{a.serial_number}</TableCell>
                            <TableCell className="text-sm">{a.category_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{a.dep_method}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{a.dep_rate}%</TableCell>
                            <TableCell className="text-right">{fmt(bv)}</TableCell>
                            <TableCell className="text-right font-medium text-orange-600">{fmt(estDep)}</TableCell>
                            <TableCell className="text-sm">{a.last_depreciation_date ? fmtDate(a.last_depreciation_date) : "—"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  onClick={runDepreciation}
                  disabled={isSubmitting || depSelectedIds.length === 0}
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <TrendingDown className="h-4 w-4 mr-2" />}
                  Run Depreciation ({depSelectedIds.length} selected)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sale / Disposal ────────────────────────────────────────── */}
          <TabsContent value="disposal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Record Sale / Disposal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Select Asset *</Label>
                    <SearchableSelect
                      options={activeAssetOptions}
                      value={saleAsset}
                      placeholder="Select active asset"
                      onValueChange={setSaleAsset}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Disposal Type *</Label>
                    <Select value={saleDisposalType} onValueChange={setSaleDisposalType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALE">Sale</SelectItem>
                        <SelectItem value="SCRAP">Scrap / Write-off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date *</Label>
                    <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                  </div>
                  {saleDisposalType === "SALE" && (
                    <div className="space-y-1.5">
                      <Label>Sale Amount *</Label>
                      <Input
                        type="number" placeholder="0.00" value={saleAmount}
                        onChange={e => setSaleAmount(e.target.value)}
                      />
                    </div>
                  )}
                  {saleDisposalType === "SALE" && (
                    <div className="space-y-1.5">
                      <Label>Buyer Name</Label>
                      <Input placeholder="Buyer / Purchaser name" value={saleBuyer} onChange={e => setSaleBuyer(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Voucher Type</Label>
                    <Select value={saleVoucherType} onValueChange={setSaleVoucherType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Remarks</Label>
                    <Textarea rows={2} value={saleRemarks} onChange={e => setSaleRemarks(e.target.value)} />
                  </div>
                </div>

                {/* Profit/Loss preview */}
                {saleAsset && saleAmount && saleDisposalType === "SALE" && (() => {
                  const asset = assetDetails.find(a => a.id === saleAsset)
                  if (!asset) return null
                  const pl = parseFloat(saleAmount) - parseFloat(String(asset.net_book_value))
                  return (
                    <div className={`p-3 rounded-md text-sm font-medium flex items-center gap-2 ${pl >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {pl >= 0 ? <TrendingDown className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {pl >= 0 ? `Profit on Sale: ${fmt(pl)}` : `Loss on Sale: ${fmt(Math.abs(pl))}`}
                      <span className="text-muted-foreground ml-2 font-normal">
                        (Book value: {fmt(asset.net_book_value)})
                      </span>
                    </div>
                  )
                })()}

                <Button onClick={submitSale} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
                  {saleDisposalType === "SALE" ? "Record Sale" : "Record Disposal"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Disposal History ───────────────────────────────────────── */}
          <TabsContent value="sales-list" className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Sale Amount</TableHead>
                    <TableHead className="text-right">Book Value</TableHead>
                    <TableHead className="text-right">Profit / Loss</TableHead>
                    <TableHead>Buyer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No disposal records
                      </TableCell>
                    </TableRow>
                  ) : sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-mono">{s.sale_id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{s.asset_name}</div>
                        <div className="text-xs text-muted-foreground">{s.serial_number}</div>
                      </TableCell>
                      <TableCell className="text-sm">{s.category_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{s.disposal_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(s.sale_date)}</TableCell>
                      <TableCell className="text-right">{fmt(s.sale_amount)}</TableCell>
                      <TableCell className="text-right">{fmt(s.book_value_at_sale)}</TableCell>
                      <TableCell className={`text-right font-medium ${s.profit_loss >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {s.profit_loss >= 0 ? "+" : ""}{fmt(s.profit_loss)}
                      </TableCell>
                      <TableCell className="text-sm">{s.buyer_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Cancel Purchase Confirmation Dialog ──────────────────────────── */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pending purchase record and all its line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setCancelConfirmOpen(false); setPendingCancelId(null) }}>
              Keep
            </Button>
            <Button
              variant="destructive"
              disabled={cancellingPurchaseId === pendingCancelId}
              onClick={() => pendingCancelId && cancelPurchase(pendingCancelId)}
            >
              {cancellingPurchaseId === pendingCancelId
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelling...</>
                : "Yes, Cancel Purchase"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Error Dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!errorMsg} onOpenChange={() => setErrorMsg("")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" /> Error
            </AlertDialogTitle>
            <AlertDialogDescription>{errorMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMsg("")}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Success / Voucher Details Dialog ─────────────────────────────── */}
      <AlertDialog open={!!voucherDetails} onOpenChange={() => setVoucherDetails(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" /> {voucherDetails?.title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 mt-2">
                <p className="text-sm text-muted-foreground">{voucherDetails?.description}</p>
                <div className="rounded-md border divide-y text-sm">
                  {voucherDetails?.voucherNo && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Voucher No.</span>
                      <span className="font-mono font-semibold">{voucherDetails.voucherNo}</span>
                    </div>
                  )}
                  {voucherDetails?.batchId && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Batch ID</span>
                      <span className="font-mono">{voucherDetails.batchId}</span>
                    </div>
                  )}
                  {voucherDetails?.date && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Date</span>
                      <span>{fmtDate(voucherDetails.date)}</span>
                    </div>
                  )}
                  {voucherDetails?.amount > 0 && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">{fmt(voucherDetails.amount)}</span>
                    </div>
                  )}
                  {voucherDetails?.extra && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Result</span>
                      <span className="font-semibold">{voucherDetails.extra}</span>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setVoucherDetails(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Depreciation Config Dialog ────────────────────────────────────── */}
      <Dialog open={depDialog} onOpenChange={setDepDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configure Depreciation</DialogTitle>
            <DialogDescription>
              {depAsset?.asset_name} — {depAsset?.serial_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={depMethod} onValueChange={setDepMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SLM">SLM — Straight Line Method</SelectItem>
                  <SelectItem value="WDV">WDV — Written Down Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Annual Rate (%)</Label>
              <Input
                type="number" placeholder="e.g. 10" value={depRate}
                onChange={e => setDepRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {depMethod === "SLM"
                  ? `Annual dep = Cost × Rate% = ${depAsset ? fmt(parseFloat(String(depAsset.purchase_value)) * (parseFloat(depRate || "0") / 100)) : "—"}`
                  : `Annual dep = Book Value × Rate% = ${depAsset ? fmt(parseFloat(String(depAsset.net_book_value)) * (parseFloat(depRate || "0") / 100)) : "—"}`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepDialog(false)}>Cancel</Button>
            <Button onClick={saveDepConfig} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Depreciation History Dialog ───────────────────────────────────── */}
      <Dialog open={depHistDialog} onOpenChange={setDepHistDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Depreciation History</DialogTitle>
            <DialogDescription>
              {depHistAsset?.asset_name} — {depHistAsset?.serial_number}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Dep. Amount</TableHead>
                  <TableHead className="text-right">Accumulated</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No depreciation runs recorded
                    </TableCell>
                  </TableRow>
                ) : depHistory.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>{fmtDate(h.depreciation_date)}</TableCell>
                    <TableCell className="text-right text-orange-600">{fmt(h.depreciation_amount)}</TableCell>
                    <TableCell className="text-right">{fmt(h.accumulated_depreciation)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(h.book_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Purchase Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase #{purchaseDialogData?.purchase_id}</DialogTitle>
            <DialogDescription>
              {purchaseDialogData?.vendor_name} — {fmtDate(purchaseDialogData?.purchase_date || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Invoice No: </span>{purchaseDialogData?.invoice_no || "—"}</div>
              <div><span className="text-muted-foreground">Status: </span>{purchaseDialogData?.status}</div>
              <div><span className="text-muted-foreground">Total: </span><strong>{fmt(purchaseDialogData?.total_amount || 0)}</strong></div>
              {purchaseDialogData?.voucher_no && (
                <div><span className="text-muted-foreground">Voucher: </span>{purchaseDialogData.voucher_no}</div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseDialogItems.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{item.asset_name || item.item_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(item.unit_cost)}</TableCell>
                    <TableCell className="text-right">{item.sgst}%</TableCell>
                    <TableCell className="text-right">{item.cgst}%</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.total_cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
