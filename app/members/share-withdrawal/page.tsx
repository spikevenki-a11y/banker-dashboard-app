"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle2,
  User,
  CreditCard,
  Banknote,
  ArrowUpRight,
  AlertTriangle,
  Users,
  X,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type MemberInfo = {
  membership_id: string
  membership_no: string
  full_name: string
  email: string
  phone: string
  membership_class: string
  share_balance: number
  status: string
  joined_date: string
  branch_id: number
}

type SearchResult = {
  membership_no: string
  full_name: string
  father_name: string
  phone_no: string
  member_type: string
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function ShareWithdrawalPage() {
  const router = useRouter()

  // Member lookup
  const [memberNo, setMemberNo] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [searchError, setSearchError] = useState("")

  // Transaction form
  const [amount, setAmount] = useState("")
  const [narration, setNarration] = useState("")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  // Member search dialog
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchPhone, setSearchPhone] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchLedger, setSearchLedger] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)

  const fetchMember = async (no: string) => {
    if (!no.trim()) return
    setIsSearching(true)
    setSearchError("")
    setMemberInfo(null)
    try {
      const res = await fetch(
        `/api/memberships/share_details?membership_no=${encodeURIComponent(no.trim())}`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Member not found")
      setMemberInfo({
        membership_id: data.membership_id,
        membership_no: data.membership_no,
        full_name: data.full_name,
        email: data.email || "",
        phone: data.phone || "",
        membership_class: data.membership_class || "",
        share_balance: Number(data.share_balance) || 0,
        status: data.status || "active",
        joined_date: data.joined_date || "",
        branch_id: data.branch_id || 0,
      })
    } catch (err: any) {
      setSearchError(err.message || "Failed to fetch member details")
    } finally {
      setIsSearching(false)
    }
  }

  const handleMemberBlur = () => {
    if (memberNo.trim() && !memberInfo && !isSearching) fetchMember(memberNo)
  }

  const handlePopupSearch = async () => {
    if (!searchMemberName.trim() && !searchFatherName.trim() && !searchPhone.trim() && !searchAadhaar.trim() && !searchLedger.trim()) return
    setIsPopupSearching(true)
    setSearchResults([])
    try {
      const res = await fetch("/api/memberships/view_member", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_name: searchMemberName.trim(),
          father_name: searchFatherName.trim(),
          phone_number: searchPhone.trim(),
          aadhaar_number: searchAadhaar.trim(),
          ledger_folio_number: searchLedger.trim(),
        }),
      })
      const data = await res.json()
      if (data.found && data.memberData) setSearchResults(data.memberData)
      else setSearchResults([])
    } catch {
      setSearchResults([])
    } finally {
      setIsPopupSearching(false)
    }
  }

  const handleSelectMember = (result: SearchResult) => {
    const no = result.membership_no || ""
    setMemberNo(no)
    setSearchDialogOpen(false)
    setSearchMemberName(""); setSearchFatherName(""); setSearchPhone(""); setSearchAadhaar(""); setSearchLedger("")
    setSearchResults([])
    fetchMember(no)
  }

  const fetchIncompleteBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) setIncompleteBatches(data.data)
    } catch {
      // silent
    }
  }

  const handleSubmit = async () => {
    if (!memberInfo) return
    if (!voucherType) { setFormError("Please select a voucher type."); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setFormError("Enter a valid positive amount."); return }
    if (amt > memberInfo.share_balance) {
      setFormError(`Withdrawal amount exceeds available share balance of ${formatCurrency(memberInfo.share_balance)}.`)
      return
    }

    setIsSubmitting(true)
    setFormError("")
    try {
      const res = await fetch("/api/share/withdraw", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: memberInfo.membership_no,
          voucher_type: voucherType,
          amount: amt,
          narration: narration || "Share Withdrawal",
          selectedBatch,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMemberInfo({ ...memberInfo, share_balance: memberInfo.share_balance - amt })
      setSuccessMessage(`Voucher No: ${data.voucher_no} | Amount: ${formatCurrency(amt)} | Status: ${data.status}`)
      setSuccessOpen(true)
      setAmount(""); setNarration(""); setVoucherType(""); setSelectedBatch(0)
    } catch (e: any) {
      setFormError(e.message || "Share withdrawal failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setMemberNo(""); setMemberInfo(null); setSearchError("")
    setAmount(""); setNarration(""); setVoucherType(""); setSelectedBatch(0); setFormError("")
  }

  const isActive = memberInfo?.status?.toUpperCase() === "ACTIVE"
  const balanceAfter = memberInfo && amount ? memberInfo.share_balance - Number(amount) : null
  const isInsufficientBalance = balanceAfter !== null && balanceAfter < 0

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/members")}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Share Withdrawal</h1>
                <p className="text-muted-foreground">Withdraw share capital for a member</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Member Lookup */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                        1
                      </div>
                      <div>
                        <CardTitle className="text-lg">Member Information</CardTitle>
                        <CardDescription>Search for the member by membership number</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member-no">Membership Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="member-no"
                          placeholder="Enter membership number"
                          value={memberNo}
                          onChange={(e) => {
                            setMemberNo(e.target.value)
                            if (memberInfo) { setMemberInfo(null); setSearchError("") }
                          }}
                          onBlur={handleMemberBlur}
                          onKeyDown={(e) => e.key === "Enter" && fetchMember(memberNo)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setSearchDialogOpen(true)}
                          className="gap-2 bg-transparent"
                        >
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                      </div>
                      {isSearching && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading member details...
                        </div>
                      )}
                      {searchError && <p className="text-sm text-red-500">{searchError}</p>}
                    </div>

                    {memberInfo && (
                      <div className={`rounded-lg border p-4 ${isActive ? "border-orange-200 bg-orange-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className={`h-5 w-5 ${isActive ? "text-orange-600" : "text-amber-600"}`} />
                          <span className={`font-medium ${isActive ? "text-orange-700" : "text-amber-700"}`}>Member Found</span>
                          <Badge variant="outline" className={`ml-auto ${isActive ? "border-orange-300 text-orange-700" : "border-amber-300 text-amber-700"}`}>
                            {memberInfo.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Member Name</p>
                            <p className="text-sm font-medium">{memberInfo.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Membership No</p>
                            <p className="text-sm font-mono font-medium">{memberInfo.membership_no}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Member Class</p>
                            <p className="text-sm font-medium">{memberInfo.membership_class}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Share Balance</p>
                            <p className="text-sm font-semibold text-orange-600">{formatCurrency(memberInfo.share_balance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm font-medium">{memberInfo.phone || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Joined Date</p>
                            <p className="text-sm font-medium">{formatDate(memberInfo.joined_date)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Withdrawal Details */}
                <Card className={!memberInfo || !isActive ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-lg">Withdrawal Details</CardTitle>
                        <CardDescription>Enter the share withdrawal amount and transaction details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isActive && memberInfo && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        Transactions are only allowed for active members. Current status: <strong>{memberInfo.status}</strong>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="voucher-type">Transaction Type *</Label>
                        <Select
                          value={voucherType || ""}
                          onValueChange={(value) => {
                            setVoucherType(value === "CASH" ? "CASH" : value === "TRANSFER" ? "TRANSFER" : "")
                            if (value !== "TRANSFER") setSelectedBatch(0)
                          }}
                        >
                          <SelectTrigger id="voucher-type" className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="withdrawal-amount">Withdrawal Amount (INR) *</Label>
                        <Input
                          id="withdrawal-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Enter withdrawal amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        {memberInfo && (
                          <p className="text-xs text-muted-foreground">
                            Available: {formatCurrency(memberInfo.share_balance)}
                          </p>
                        )}
                      </div>
                    </div>

                    {isInsufficientBalance && (
                      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Withdrawal amount exceeds available share balance.
                      </div>
                    )}

                    {voucherType === "TRANSFER" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">GL Batch ID</Label>
                          <div className="flex gap-2">
                            <Input
                              value={selectedBatch && selectedBatch !== 0 ? selectedBatch : "New Batch"}
                              readOnly
                              placeholder="Select or create batch"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => { fetchIncompleteBatches(); setIsBatchPopupOpen(true) }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="narration">Narration</Label>
                      <Textarea
                        id="narration"
                        placeholder="e.g. Share capital withdrawal"
                        rows={2}
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {formError && <p className="text-sm text-red-500">{formError}</p>}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset} className="bg-transparent">
                    Reset
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/members")} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!memberInfo || !isActive || !amount || isInsufficientBalance || isSubmitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Process Withdrawal
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column - Summary Sidebar */}
              <div className="space-y-6">
                {/* Member Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Member Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memberInfo ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Member Name</p>
                          <p className="text-sm font-semibold">{memberInfo.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Membership No</p>
                          <p className="text-sm font-mono font-semibold">{memberInfo.membership_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant="outline" className={isActive ? "border-orange-300 text-orange-700" : "border-amber-300 text-amber-700"}>
                            {memberInfo.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Member Class</p>
                          <Badge variant="outline">{memberInfo.membership_class}</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Search a member to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Share Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Share Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memberInfo ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Balance</p>
                          <p className="text-sm font-semibold text-orange-600">{formatCurrency(memberInfo.share_balance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Member Class</p>
                          <p className="text-sm font-semibold">{memberInfo.membership_class}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Joined Date</p>
                          <p className="text-sm font-semibold">{formatDate(memberInfo.joined_date)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a member to see share details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Withdrawal Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Withdrawal Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                        <p className="text-sm font-semibold">
                          {memberInfo ? formatCurrency(memberInfo.share_balance) : "---"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Withdrawal Amount</p>
                        <p className="text-sm font-semibold text-orange-600">
                          {amount ? formatCurrency(Number(amount)) : "₹0.00"}
                        </p>
                      </div>
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground">Balance After Withdrawal</p>
                        <p className={`text-lg font-bold ${isInsufficientBalance ? "text-red-600" : "text-orange-600"}`}>
                          {memberInfo && amount ? formatCurrency(balanceAfter!) : "---"}
                        </p>
                        {isInsufficientBalance && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            Insufficient balance
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Member Search Dialog */}
            <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    Search Member
                  </DialogTitle>
                  <DialogDescription>
                    Search for a member using one or more criteria below
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Member Name</Label>
                    <Input placeholder="Enter member name" value={searchMemberName} onChange={(e) => setSearchMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{"Father's Name"}</Label>
                    <Input placeholder="Enter father's name" value={searchFatherName} onChange={(e) => setSearchFatherName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number</Label>
                    <Input placeholder="Enter phone number" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aadhaar Number</Label>
                    <Input placeholder="Enter Aadhaar number" value={searchAadhaar} onChange={(e) => setSearchAadhaar(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs">Ledger Number</Label>
                    <Input placeholder="Enter ledger number" value={searchLedger} onChange={(e) => setSearchLedger(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchMemberName(""); setSearchFatherName(""); setSearchPhone("")
                      setSearchAadhaar(""); setSearchLedger(""); setSearchResults([])
                    }}
                    className="gap-1.5 bg-transparent text-xs"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePopupSearch}
                    disabled={isPopupSearching || (!searchMemberName.trim() && !searchFatherName.trim() && !searchPhone.trim() && !searchAadhaar.trim() && !searchLedger.trim())}
                    className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isPopupSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg min-h-0">
                  {isPopupSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching members...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Membership No</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">{"Father's Name"}</TableHead>
                          <TableHead className="text-xs">Phone</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs w-20">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((result) => (
                          <TableRow
                            key={result.membership_no}
                            className="cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-950/20"
                            onClick={() => handleSelectMember(result)}
                          >
                            <TableCell className="font-mono text-xs font-medium">{result.membership_no}</TableCell>
                            <TableCell className="text-xs font-medium">{result.full_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{result.father_name || "---"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{result.phone_no || "---"}</TableCell>
                            <TableCell>
                              <Badge className="text-[10px] bg-orange-100 text-orange-700">{result.member_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={(e) => { e.stopPropagation(); handleSelectMember(result) }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchMemberName || searchFatherName || searchPhone || searchAadhaar || searchLedger
                          ? "No members found. Try different search criteria."
                          : "Enter search criteria and click Search to find members."}
                      </p>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Share Withdrawal Successful!
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-base">
                      <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <p className="text-sm text-orange-700">{successMessage}</p>
                        {memberInfo && (
                          <p className="mt-2 text-sm text-orange-700">
                            Member: <span className="font-semibold">{memberInfo.full_name}</span> | No:{" "}
                            <span className="font-mono font-semibold">{memberInfo.membership_no}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:justify-end">
                  <AlertDialogAction
                    onClick={() => setSuccessOpen(false)}
                    className="bg-transparent border border-input hover:bg-accent text-foreground"
                  >
                    Continue Withdrawing
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => router.push("/members")}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Go to Members
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* GL Batch Selection Dialog */}
            <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Select Incomplete GL Batch</DialogTitle>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto">
                  {incompleteBatches.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No incomplete batches found. A new batch will be created.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch ID</TableHead>
                          <TableHead>Total Debit</TableHead>
                          <TableHead>Total Credit</TableHead>
                          <TableHead>Difference</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incompleteBatches.map((b) => (
                          <TableRow key={b.batch_id}>
                            <TableCell>{b.batch_id}</TableCell>
                            <TableCell>{formatCurrency(b.total_debit)}</TableCell>
                            <TableCell>{formatCurrency(b.total_credit)}</TableCell>
                            <TableCell className="text-red-600">{formatCurrency(b.difference)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() => { setSelectedBatch(b.batch_id); setIsBatchPopupOpen(false) }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() => { setSelectedBatch(0); setIsBatchPopupOpen(false) }}
                  >
                    New Batch
                  </Button>
                  <Button variant="outline" className="bg-transparent" onClick={() => setIsBatchPopupOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
