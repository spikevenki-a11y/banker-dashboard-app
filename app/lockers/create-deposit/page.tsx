"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft, Search, Loader2, CheckCircle2, User, Banknote,
  Lock, LockOpen, KeyRound, Users, X, Info,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type MemberInfo = {
  membership_no: string
  member_type: string
  membership_class: string
  status: string
  full_name: string
  father_name: string
  mobile_no: string
  date_of_birth: string
  aadhaar_no: string
  customer_code: string
  gender: string
}

type LockerType = {
  id: number
  type_name: string
  dimensions: string | null
  annual_rent: number
}

type AvailableLocker = {
  id: string
  locker_no: string
  location: string | null
  status: string
  type_id: number
  type_name: string
  dimensions: string | null
  annual_rent: number
}

const fmt = (n: number | string | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

export default function CreateLockerDepositPage() {
  const router = useRouter()

  // Member lookup
  const [memberSearch, setMemberSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberError, setMemberError] = useState("")

  // Member search popup
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [popupResults, setPopupResults] = useState<MemberInfo[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)

  // Deposit details
  const [depositAmount, setDepositAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [periodYears, setPeriodYears] = useState("1")
  const [openingDate, setOpeningDate] = useState("")
  const [nomineeName, setNomineeName] = useState("")
  const [nomineeRelation, setNomineeRelation] = useState("")

  // Locker selection
  const [lockerTypes, setLockerTypes] = useState<LockerType[]>([])
  const [availableLockers, setAvailableLockers] = useState<AvailableLocker[]>([])
  const [lockerTypeFilter, setLockerTypeFilter] = useState("all")
  const [selectedLockerId, setSelectedLockerId] = useState<string>("")
  const [lockersLoading, setLockersLoading] = useState(false)

  // Transaction details
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [narration, setNarration] = useState("")
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{
    account_number: string
    expiry_date: string
    locker_assigned: boolean
  } | null>(null)

  useEffect(() => {
    getLoginDate()
    fetchLockerData()
  }, [])

  const getLoginDate = async () => {
    try {
      const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
      const data = await res.json()
      if (data.businessDate) setOpeningDate(data.businessDate)
    } catch {}
  }

  const fetchLockerData = async () => {
    setLockersLoading(true)
    try {
      const [typesRes, availRes] = await Promise.all([
        fetch("/api/lockers/types", { credentials: "include" }),
        fetch("/api/lockers/available", { credentials: "include" }),
      ])
      const [typesData, availData] = await Promise.all([typesRes.json(), availRes.json()])
      if (typesData.success) setLockerTypes(typesData.types || [])
      if (availData.success) setAvailableLockers(availData.lockers || [])
    } catch {}
    setLockersLoading(false)
  }

  const fetchIncompleteBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) setIncompleteBatches(data.data)
    } catch {}
  }

  const searchMember = async () => {
    if (!memberSearch.trim()) return
    setIsSearching(true)
    setMemberError("")
    setMemberInfo(null)
    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: memberSearch.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.member) {
        setMemberInfo(data.member)
      } else {
        setMemberError(data.error || "Member not found")
      }
    } catch {
      setMemberError("Failed to search member")
    } finally {
      setIsSearching(false)
    }
  }

  const handleMemberBlur = () => {
    if (memberSearch.trim() && !memberInfo && !isSearching) searchMember()
  }

  const handlePopupSearch = async () => {
    if (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim()) return
    setIsPopupSearching(true)
    setPopupResults([])
    try {
      const res = await fetch("/api/savings/member-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNumber: searchMemberNo.trim(),
          memberName: searchMemberName.trim(),
          fatherName: searchFatherName.trim(),
          aadhaarNumber: searchAadhaar.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) setPopupResults(data.results || [])
    } catch {}
    setIsPopupSearching(false)
  }

  const handleSelectMember = (member: MemberInfo) => {
    setMemberInfo(member)
    setMemberSearch(member.membership_no)
    setMemberError("")
    setSearchDialogOpen(false)
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchAadhaar("")
    setPopupResults([])
  }

  const filteredLockers =
    lockerTypeFilter === "all"
      ? availableLockers
      : availableLockers.filter((l) => String(l.type_id) === lockerTypeFilter)

  const selectedLocker = availableLockers.find((l) => l.id === selectedLockerId)

  // Calculated values
  const expiryDate = (() => {
    if (!openingDate || !periodYears) return null
    const d = new Date(openingDate)
    d.setFullYear(d.getFullYear() + Number(periodYears))
    return d.toISOString().split("T")[0]
  })()

  const annualInterest = (() => {
    const amt = Number(depositAmount) || 0
    const rate = Number(interestRate) || 0
    if (amt <= 0 || rate <= 0) return null
    return (amt * rate) / 100
  })()

  const handleSubmit = async () => {
    if (!memberInfo || !depositAmount || !openingDate) return
    if (!voucherType) {
      alert("Please select a voucher type.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/lockers/create-deposit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: memberInfo.membership_no,
          deposit_amount: Number(depositAmount),
          interest_rate: Number(interestRate) || 0,
          opening_date: openingDate,
          period_years: Number(periodYears) || 1,
          nominee_name: nomineeName,
          nominee_relation: nomineeRelation,
          locker_id: selectedLockerId || null,
          voucher_type: voucherType,
          selected_batch: selectedBatch,
          narration: narration || "Locker Deposit Opening",
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessInfo({
          account_number: data.account_number,
          expiry_date: data.expiry_date,
          locker_assigned: data.locker_assigned,
        })
      } else {
        alert(data.error || "Failed to create locker deposit")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/lockers")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Locker Deposit</h1>
            <p className="text-muted-foreground">Open a new locker deposit account and optionally assign a locker</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left column: form ───────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Step 1: Member */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">1</div>
                  <div>
                    <CardTitle className="text-lg">Member Information</CardTitle>
                    <CardDescription>Search for the member by membership number</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Enter membership number…"
                      className="pl-10"
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value)
                        if (memberInfo) { setMemberInfo(null); setMemberError("") }
                      }}
                      onBlur={handleMemberBlur}
                      onKeyDown={(e) => e.key === "Enter" && searchMember()}
                    />
                  </div>
                  <Button variant="outline" onClick={() => setSearchDialogOpen(true)} className="gap-2 bg-transparent">
                    <Search className="h-4 w-4" />Search
                  </Button>
                </div>

                {isSearching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />Loading member…
                  </div>
                )}
                {memberError && <p className="text-sm text-destructive">{memberError}</p>}

                {memberInfo && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-amber-600" />
                      <span className="font-medium text-amber-700">Member Found</span>
                      <Badge variant="outline" className="ml-auto border-amber-300 text-amber-700">{memberInfo.member_type}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      {[
                        ["Full Name", memberInfo.full_name],
                        ["Father Name", memberInfo.father_name || "—"],
                        ["Mobile", memberInfo.mobile_no || "—"],
                        ["Date of Birth", memberInfo.date_of_birth || "—"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Deposit Details */}
            <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">2</div>
                  <div>
                    <CardTitle className="text-lg">Deposit Details</CardTitle>
                    <CardDescription>Enter the deposit amount and period</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opening-date">Opening Date</Label>
                      <Input id="opening-date" type="date" value={openingDate} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period-years">Period (Years)</Label>
                      <Select value={periodYears} onValueChange={setPeriodYears}>
                        <SelectTrigger id="period-years">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5].map((y) => (
                            <SelectItem key={y} value={String(y)}>{y} year{y > 1 ? "s" : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deposit & Interest</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-amount">Deposit Amount (₹) *</Label>
                      <Input
                        id="deposit-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interest-rate">Interest Rate (% p.a.)</Label>
                      <Input
                        id="interest-rate"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 6.00"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                      />
                    </div>
                  </div>
                  {annualInterest !== null && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                      <Info className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-amber-700">
                        Annual interest (= locker rent):{" "}
                        <span className="font-semibold">{fmt(annualInterest)}</span>
                        {expiryDate && (
                          <> · Expiry: <span className="font-semibold">{expiryDate}</span></>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nominee (Optional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nominee-name">Nominee Name</Label>
                      <Input
                        id="nominee-name"
                        placeholder="Enter nominee name"
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nominee-relation">Relationship</Label>
                      <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                        <SelectTrigger id="nominee-relation">
                          <SelectValue placeholder="Select relation" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Father", "Mother", "Spouse", "Son", "Daughter", "Brother", "Sister", "Other"].map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Transaction Details */}
            <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">3</div>
                  <div>
                    <CardTitle className="text-lg">Transaction Details</CardTitle>
                    <CardDescription>Select voucher type and batch for GL posting</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="voucher-type">Voucher Type *</Label>
                    <Select
                      value={voucherType}
                      onValueChange={(v) => {
                        setVoucherType(v as "CASH" | "TRANSFER")
                        if (v !== "TRANSFER") setSelectedBatch(0)
                      }}
                    >
                      <SelectTrigger id="voucher-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {voucherType === "TRANSFER" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>GL Batch ID</Label>
                      <div className="flex gap-2">
                        <Input
                          value={selectedBatch && selectedBatch !== 0 ? String(selectedBatch) : "New Batch"}
                          readOnly
                          placeholder="Select or create batch"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => {
                            fetchIncompleteBatches()
                            setIsBatchPopupOpen(true)
                          }}
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
                    placeholder="e.g. Locker deposit opening"
                    rows={2}
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Assign Locker (optional) */}
            <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">4</div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Assign Locker <span className="ml-1 text-sm font-normal text-muted-foreground">(Optional)</span></CardTitle>
                    <CardDescription>Select an available locker from the vault</CardDescription>
                  </div>
                  {selectedLockerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => setSelectedLockerId("")}
                    >
                      <X className="h-3 w-3" />Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type filter */}
                {lockerTypes.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setLockerTypeFilter("all")}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        lockerTypeFilter === "all"
                          ? "bg-amber-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      All Types
                    </button>
                    {lockerTypes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setLockerTypeFilter(String(t.id))}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          lockerTypeFilter === String(t.id)
                            ? "bg-amber-600 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {t.type_name}
                      </button>
                    ))}
                  </div>
                )}

                {lockersLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading available lockers…</span>
                  </div>
                ) : filteredLockers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
                    <LockOpen className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No available lockers found.</p>
                    <p className="text-xs text-muted-foreground">You can assign a locker later from the Lockers page.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filteredLockers.map((locker) => (
                      <button
                        key={locker.id}
                        type="button"
                        onClick={() => setSelectedLockerId(locker.id === selectedLockerId ? "" : locker.id)}
                        className={`rounded-lg border p-3 text-left text-sm transition-all ${
                          selectedLockerId === locker.id
                            ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                            : "border-border hover:border-amber-200 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-base">{locker.locker_no}</span>
                          {selectedLockerId === locker.id && (
                            <CheckCircle2 className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">{locker.type_name}</Badge>
                        {locker.dimensions && (
                          <p className="mt-1 text-xs text-muted-foreground">{locker.dimensions}</p>
                        )}
                        {locker.location && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{locker.location}</p>
                        )}
                        <p className="mt-1.5 text-xs font-medium text-amber-700">
                          Rent: {fmt(locker.annual_rent)}/yr
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/lockers")} className="bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!memberInfo || !depositAmount || !openingDate || !voucherType || isSubmitting}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating…" : "Create Deposit"}
              </Button>
            </div>
          </div>

          {/* ── Right column: summary sidebar ────────────────────── */}
          <div className="space-y-5">
            {/* Member summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Member</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {memberInfo ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">{memberInfo.full_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{memberInfo.membership_no}</p>
                    <Badge variant="outline">{memberInfo.member_type}</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Search a member to begin</p>
                )}
              </CardContent>
            </Card>

            {/* Deposit summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Deposit Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Opening Date", openingDate || "—"],
                  ["Period", `${periodYears} year${Number(periodYears) > 1 ? "s" : ""}`],
                  ["Expiry Date", expiryDate || "—"],
                  ["Deposit Amount", depositAmount ? fmt(Number(depositAmount)) : "—"],
                  ["Interest Rate", interestRate ? `${interestRate}% p.a.` : "—"],
                  ["Annual Rent", annualInterest !== null ? fmt(annualInterest) : "—"],
                  ["Nominee", nomineeName ? `${nomineeName}${nomineeRelation ? ` (${nomineeRelation})` : ""}` : "Not provided"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right max-w-[55%] truncate">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Locker summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Selected Locker</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {selectedLocker ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-amber-700">{selectedLocker.locker_no}</span>
                      <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">Available</Badge>
                    </div>
                    <p className="text-sm font-medium">{selectedLocker.type_name}</p>
                    {selectedLocker.dimensions && <p className="text-xs text-muted-foreground">{selectedLocker.dimensions}</p>}
                    {selectedLocker.location && <p className="text-xs text-muted-foreground">{selectedLocker.location}</p>}
                    <p className="text-sm text-amber-700 font-medium">Rent: {fmt(selectedLocker.annual_rent)}/yr</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 py-2 text-center">
                    <LockOpen className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No locker selected</p>
                    <p className="text-xs text-muted-foreground">Can be assigned later</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info card */}
            <Card className="border-amber-100 bg-amber-50/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />How locker rent works
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  The interest earned on the locker deposit acts as the annual locker rent.
                  A higher deposit or interest rate covers the annual rent cost.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Member Search Dialog */}
        <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                Search Member
              </DialogTitle>
              <DialogDescription>Search using one or more criteria</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              {[
                { id: "lc-search-no", label: "Member Number", value: searchMemberNo, set: setSearchMemberNo },
                { id: "lc-search-name", label: "Member Name", value: searchMemberName, set: setSearchMemberName },
                { id: "lc-search-father", label: "Father's Name", value: searchFatherName, set: setSearchFatherName },
                { id: "lc-search-aadhaar", label: "Aadhaar Number", value: searchAadhaar, set: setSearchAadhaar },
              ].map(({ id, label, value, set }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-xs">{label}</Label>
                  <Input
                    id={id}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearchMemberNo(""); setSearchMemberName(""); setSearchFatherName(""); setSearchAadhaar(""); setPopupResults([]) }}
                className="gap-1.5 bg-transparent text-xs"
              >
                <X className="h-3 w-3" />Clear
              </Button>
              <Button
                size="sm"
                onClick={handlePopupSearch}
                disabled={isPopupSearching || (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim())}
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isPopupSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Search
              </Button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg min-h-0">
              {isPopupSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Searching…</span>
                </div>
              ) : popupResults.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Member No</TableHead>
                      <TableHead className="text-xs">Full Name</TableHead>
                      <TableHead className="text-xs">Father Name</TableHead>
                      <TableHead className="text-xs">Aadhaar</TableHead>
                      <TableHead className="text-xs">Mobile</TableHead>
                      <TableHead className="text-xs w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popupResults.map((member) => (
                      <TableRow
                        key={member.membership_no}
                        className="cursor-pointer hover:bg-amber-50/50"
                        onClick={() => handleSelectMember(member)}
                      >
                        <TableCell className="font-mono text-xs font-medium">{member.membership_no}</TableCell>
                        <TableCell className="text-xs font-medium">{member.full_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{member.father_name || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{member.aadhaar_no || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{member.mobile_no || "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={(e) => { e.stopPropagation(); handleSelectMember(member) }}
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
                    {searchMemberNo || searchMemberName || searchFatherName || searchAadhaar
                      ? "No members found."
                      : "Enter search criteria and click Search."}
                  </p>
                </div>
              )}
            </div>
            {popupResults.length > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {popupResults.length} result{popupResults.length !== 1 ? "s" : ""} found
              </p>
            )}
          </DialogContent>
        </Dialog>

        {/* GL Batch Selection Dialog */}
        <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Incomplete GL Batch</DialogTitle>
              <DialogDescription>Select an existing batch or create a new one</DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {incompleteBatches.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No incomplete batches found. A new batch will be created.</p>
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
                        <TableCell className="font-mono">{b.batch_id}</TableCell>
                        <TableCell>{fmt(b.total_debit)}</TableCell>
                        <TableCell>{fmt(b.total_credit)}</TableCell>
                        <TableCell className="text-destructive">{fmt(b.difference)}</TableCell>
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

        {/* Success Dialog */}
        <AlertDialog open={!!successInfo}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
                <CheckCircle2 className="h-6 w-6" />
                Locker Deposit Created
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-mono font-semibold">{successInfo?.account_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Member</span>
                      <span className="font-medium">{memberInfo?.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expiry Date</span>
                      <span className="font-medium">{successInfo?.expiry_date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Locker Assigned</span>
                      <span className={`font-medium ${successInfo?.locker_assigned ? "text-teal-600" : "text-muted-foreground"}`}>
                        {successInfo?.locker_assigned
                          ? `${selectedLocker?.locker_no} ✓`
                          : "Not assigned yet"}
                      </span>
                    </div>
                  </div>
                  {!successInfo?.locker_assigned && (
                    <p className="text-sm text-muted-foreground">
                      You can assign a locker anytime from the Lockers page.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-end">
              <AlertDialogAction
                onClick={() => router.push("/lockers")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Go to Lockers
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardWrapper>
  )
}
