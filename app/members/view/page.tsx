"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  Shield,
  Building2,
  Users,
  Hash,
  Eye,
  Wallet,
  Loader2,
  PiggyBank,
  Landmark,
  TrendingUp,
  TrendingDown,
  Banknote,
  Pencil,
  CheckCircle2,
  Book,
} from "lucide-react"
import { Ledger } from "next/font/google"

type MemberData = {
  caste_category: string
  customer_code: string
  membership_class: string
  member_type: string
  membership_no: string
  ledger_folio_number: string
  board_resolution_number: string
  boardresolutiondate: string
  status: string
  full_name: string
  father_name: string
  gender: string
  date_of_birth: string
  customer_type: string
  spouse_name: string
  mobile_no: string
  email: string
  house_no: string
  street: string
  village: string
  thaluk: string
  district: string
  state: string
  pincode: string
  phone_no: string
  aadhaar_no: string
  pan_no: string
  ration_no: string
  driving_license_no: string
}

type AccountItem = {
  account_type: string
  account_number: string
  scheme_name: string
  balance: number
  status: string
  opening_date: string
  interest_rate: number
  close_date?: string
  extra?: Record<string, any> | null
}

type AccountSummary = {
  total_assets: number
  total_liabilities: number
  net_worth: number
  total_accounts: number
}

type SearchFields = {
  member_name: string
  father_name: string
  phone_number: string
  aadhaar_number: string
  ledger_folio_number: string
}

export default function ViewMemberPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchFields, setSearchFields] = useState<SearchFields>({
    member_name: "",
    father_name: "",
    phone_number: "",
    aadhaar_number: "",
    ledger_folio_number: "",
  })
  const [members, setMembers] = useState<MemberData[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<"personal" | "address" | "kyc" | "accounts">("personal")
  const [assets, setAssets] = useState<AccountItem[]>([])
  const [liabilities, setLiabilities] = useState<AccountItem[]>([])
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [accountsLoaded, setAccountsLoaded] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editSection, setEditSection] = useState<"personal" | "address" | "kyc" | "membership">("personal")
  const [editForm, setEditForm] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const openEdit = (member: MemberData) => {
    setEditForm({
      // personal
      full_name: member.full_name || "",
      father_name: member.father_name || "",
      spouse_name: member.spouse_name || "",
      date_of_birth: member.date_of_birth || "",
      gender: member.gender || "",
      mobile_no: member.mobile_no || "",
      email: member.email || "",
      occupation: "",
      marital_status: "",
      caste: "",
      // blood_group: "",
      caste_category: member.caste_category || "",
      // address
      house_no: member.house_no || "",
      street: member.street || "",
      village: member.village || "",
      thaluk: member.thaluk || "",
      district: member.district || "",
      state: member.state || "",
      pincode: member.pincode || "",
      phone_no: member.phone_no || "",
      // kyc
      pan_no: member.pan_no || "",
      ration_no: member.ration_no || "",
      driving_license_no: member.driving_license_no || "",
      // membership
      ledger_folio_number: member.ledger_folio_number || "",
      board_resolution_number: member.board_resolution_number || "",
      boardresolutiondate: member.boardresolutiondate || "",
    })
    setEditSection("personal")
    setSaveSuccess(false)
    setEditOpen(true)
  }

  const ef = (key: string, value: string) => setEditForm((prev: any) => ({ ...prev, [key]: value }))

  const handleEditSave = async () => {
    if (!selectedMember) return
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/members/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: selectedMember.membership_no,
          personal: {
            full_name: editForm.full_name,
            father_name: editForm.father_name,
            spouse_name: editForm.spouse_name,
            date_of_birth: editForm.date_of_birth,
            gender: editForm.gender,
            mobile_no: editForm.mobile_no,
            email: editForm.email,
            occupation: editForm.occupation,
            marital_status: editForm.marital_status,
            // blood_group: editForm.blood_group,
            caste_category: editForm.caste_category,
          },
          address: {
            house_no: editForm.house_no,
            street: editForm.street,
            village: editForm.village,
            thaluk: editForm.thaluk,
            district: editForm.district,
            state: editForm.state,
            pincode: editForm.pincode,
            phone_no: editForm.phone_no,
          },
          kyc: {
            pan_no: editForm.pan_no,
            ration_no: editForm.ration_no,
            driving_license_no: editForm.driving_license_no,
          },
          membership: {
            ledger_folio_number: editForm.ledger_folio_number,
            board_resolution_number: editForm.board_resolution_number,
            boardresolutiondate: editForm.boardresolutiondate,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update failed")
      setSaveSuccess(true)
      // Reflect changes locally
      setSelectedMember((prev) =>
        prev
          ? {
              ...prev,
              full_name: editForm.full_name,
              father_name: editForm.father_name,
              spouse_name: editForm.spouse_name,
              date_of_birth: editForm.date_of_birth,
              gender: editForm.gender,
              mobile_no: editForm.mobile_no,
              email: editForm.email,
              house_no: editForm.house_no,
              street: editForm.street,
              village: editForm.village,
              thaluk: editForm.thaluk,
              district: editForm.district,
              state: editForm.state,
              pincode: editForm.pincode,
              phone_no: editForm.phone_no,
              pan_no: editForm.pan_no,
              ration_no: editForm.ration_no,
              driving_license_no: editForm.driving_license_no,
              ledger_folio_number: editForm.ledger_folio_number,
              board_resolution_number: editForm.board_resolution_number,
              boardresolutiondate: editForm.boardresolutiondate,
            }
          : prev
      )
      setTimeout(() => setEditOpen(false), 1200)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSearch = async () => {
    setIsSearching(true)
    setHasSearched(true)
    setSelectedMember(null)
    try {
      const res = await fetch("/api/memberships/view_member", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchFields),
      })
      const data = await res.json()
      if (res.ok && data.found && data.memberData) {
        setMembers(data.memberData)
      } else {
        setMembers([])
      }
    } catch {
      setMembers([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectMember = (member: MemberData) => {
    setSelectedMember(member)
    setAccountsLoaded(false)
    setAssets([])
    setLiabilities([])
    setAccountSummary(null)
  }

  const fetchMemberAccounts = async (membershipNo: string) => {
    setIsLoadingAccounts(true)
    try {
      const res = await fetch(`/api/members/accounts?membership_no=${encodeURIComponent(membershipNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setAssets(data.assets || [])
        setLiabilities(data.liabilities || [])
        setAccountSummary(data.summary || null)
      }
    } catch {
      setAssets([])
      setLiabilities([])
    } finally {
      setIsLoadingAccounts(false)
      setAccountsLoaded(true)
    }
  }

  useEffect(() => {
    if (activeTab === "accounts" && selectedMember && !accountsLoaded) {
      fetchMemberAccounts(selectedMember.membership_no)
    }
  }, [activeTab, selectedMember, accountsLoaded])

  const formatAadhaar = (val: string) => {
    if (!val) return "---"
    return `${val.slice(0, 4)} ${val.slice(4, 8)} ${val.slice(8)}`
  }

  const buildAddress = (m: MemberData) => {
    const parts = [m.house_no, m.street, m.village, m.thaluk, m.district, m.state].filter(Boolean)
    const address = parts.join(", ")
    return m.pincode ? `${address} - ${m.pincode}` : address || "---"
  }

  return (
    <DashboardWrapper>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/members")}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to members</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">View Member</h1>
            <p className="text-sm text-muted-foreground">
              Search and view member details
            </p>
          </div>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Search Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Member Name</Label>
                <Input
                  placeholder="Enter name"
                  value={searchFields.member_name}
                  onChange={(e) => setSearchFields({ ...searchFields, member_name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Father Name</Label>
                <Input
                  placeholder="Enter father name"
                  value={searchFields.father_name}
                  onChange={(e) => setSearchFields({ ...searchFields, father_name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                <Input
                  placeholder="Enter phone"
                  value={searchFields.phone_number}
                  onChange={(e) => setSearchFields({ ...searchFields, phone_number: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Aadhaar Number</Label>
                <Input
                  placeholder="Enter Aadhaar"
                  value={searchFields.aadhaar_number}
                  onChange={(e) => setSearchFields({ ...searchFields, aadhaar_number: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Ledger No.</Label>
                <Input
                  placeholder="Enter ledger no."
                  value={searchFields.ledger_folio_number}
                  onChange={(e) => setSearchFields({ ...searchFields, ledger_folio_number: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={isSearching} className="w-full gap-2">
                  <Search className="h-4 w-4" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results or Detail */}
        {selectedMember ? (
          /* Member Detail View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setSelectedMember(null)} className="gap-2">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to results
              </Button>
              <div className="flex items-center gap-3">
                <Badge
                  variant={selectedMember.status?.toUpperCase() === "ACTIVE" ? "default" : "secondary"}
                  className={
                    selectedMember.status?.toUpperCase() === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {selectedMember.status || "---"}
                </Badge>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(selectedMember)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </div>

            {/* Member Summary Header */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="py-5">
                <div className="flex items-start gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-foreground">{selectedMember.full_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {"S/o D/o"} {selectedMember.father_name || "---"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" />
                        {selectedMember.membership_no}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedMember.phone_no || selectedMember.mobile_no || "---"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {selectedMember.email || "---"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Class {selectedMember.membership_class || "---"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Customer Type</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                    {selectedMember.customer_type || "---"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Member Type</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                    {selectedMember.member_type || "---"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Ledger Folio No.</p>
                  <p className="mt-1 text-sm font-semibold font-mono text-foreground">
                    {selectedMember.ledger_folio_number || "---"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Gender</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                    {selectedMember.gender || "---"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Details */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex gap-1 border-b">
                  {(
                    [
                      { key: "personal", label: "Personal Details", icon: User },
                      { key: "address", label: "Address", icon: MapPin },
                      { key: "kyc", label: "KYC Details", icon: Shield },
                      { key: "accounts", label: "Assets & Liabilities", icon: Wallet },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {activeTab === "personal" && (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField icon={User} label="Full Name" value={selectedMember.full_name} />
                    <DetailField icon={Users} label="Father Name" value={selectedMember.father_name} />
                    <DetailField icon={Users} label="Spouse Name" value={selectedMember.spouse_name} />
                    <DetailField icon={Calendar} label="Date of Birth" value={selectedMember.date_of_birth} />
                    <DetailField icon={User} label="Gender" value={selectedMember.gender} capitalize />
                    <DetailField icon={Phone} label="Mobile" value={selectedMember.mobile_no || selectedMember.phone_no} />
                    <DetailField icon={Mail} label="Email" value={selectedMember.email} />
                    <DetailField icon={FileText} label="Board Resolution No." value={selectedMember.board_resolution_number} />
                    <DetailField icon={Calendar} label="Board Resolution Date" value={selectedMember.boardresolutiondate} />
                    <DetailField icon={Book} label="Caste" value={selectedMember.caste_category} />
                  </div>
                )}

                {activeTab === "address" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField icon={MapPin} label="House No." value={selectedMember.house_no} />
                      <DetailField icon={MapPin} label="Street" value={selectedMember.street} />
                      <DetailField icon={MapPin} label="Village" value={selectedMember.village} />
                      <DetailField icon={MapPin} label="Taluk" value={selectedMember.thaluk} />
                      <DetailField icon={MapPin} label="District" value={selectedMember.district} />
                      <DetailField icon={MapPin} label="State" value={selectedMember.state} />
                      <DetailField icon={Hash} label="Pincode" value={selectedMember.pincode} />
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Full Address</p>
                      <p className="mt-1 text-sm text-foreground">{buildAddress(selectedMember)}</p>
                    </div>
                  </div>
                )}

                {activeTab === "kyc" && (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField icon={CreditCard} label="Aadhaar No." value={formatAadhaar(selectedMember.aadhaar_no)} mono />
                    <DetailField icon={CreditCard} label="PAN No." value={selectedMember.pan_no} mono />
                    <DetailField icon={FileText} label="Ration No." value={selectedMember.ration_no} />
                    <DetailField icon={CreditCard} label="Driving License No." value={selectedMember.driving_license_no} />
                  </div>
                )}

                {activeTab === "accounts" && (
                  <div className="space-y-6">
                    {isLoadingAccounts ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
                      </div>
                    ) : (
                      <>
                        {/* Summary Cards */}
                        {accountSummary && (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="rounded-lg border bg-emerald-50 p-4">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <p className="text-xs font-medium text-emerald-700">Total Assets</p>
                              </div>
                              <p className="mt-2 text-lg font-bold text-emerald-800">
                                {accountSummary.total_assets.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-red-50 p-4">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <p className="text-xs font-medium text-red-700">Total Liabilities</p>
                              </div>
                              <p className="mt-2 text-lg font-bold text-red-800">
                                {accountSummary.total_liabilities.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-blue-50 p-4">
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-blue-600" />
                                <p className="text-xs font-medium text-blue-700">Net Worth</p>
                              </div>
                              <p className="mt-2 text-lg font-bold text-blue-800">
                                {accountSummary.net_worth.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-4">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                                <p className="text-xs font-medium text-muted-foreground">Total Accounts</p>
                              </div>
                              <p className="mt-2 text-lg font-bold text-foreground">
                                {accountSummary.total_accounts}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Assets Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-base font-semibold text-foreground">Assets</h3>
                            <Badge variant="outline" className="text-xs">
                              {assets.length} account{assets.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>

                          {assets.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center">
                              <PiggyBank className="mx-auto h-8 w-8 text-muted-foreground/30" />
                              <p className="mt-2 text-sm text-muted-foreground">No asset accounts found</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-emerald-50/50">
                                    <TableHead className="font-semibold">Account Type</TableHead>
                                    <TableHead className="font-semibold">Account No.</TableHead>
                                    <TableHead className="font-semibold">Scheme</TableHead>
                                    <TableHead className="font-semibold">Opening Date</TableHead>
                                    <TableHead className="text-right font-semibold">Balance</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assets.map((acc, idx) => (
                                    <TableRow key={`asset-${idx}`}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <AccountTypeIcon type={acc.account_type} />
                                          <span className="text-sm font-medium">{acc.account_type}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">{acc.account_number}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{acc.scheme_name}</TableCell>
                                      <TableCell className="text-sm">
                                        {acc.opening_date
                                          ? new Date(acc.opening_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                          : "---"}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm font-semibold text-emerald-700">
                                        {acc.balance.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={acc.status === "ACTIVE" ? "default" : "secondary"}
                                          className={
                                            acc.status === "ACTIVE"
                                              ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]"
                                              : "text-[10px]"
                                          }
                                        >
                                          {acc.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        {/* Liabilities Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-red-600" />
                            <h3 className="text-base font-semibold text-foreground">Liabilities</h3>
                            <Badge variant="outline" className="text-xs">
                              {liabilities.length} account{liabilities.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>

                          {liabilities.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center">
                              <Banknote className="mx-auto h-8 w-8 text-muted-foreground/30" />
                              <p className="mt-2 text-sm text-muted-foreground">No liability accounts found</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-red-50/50">
                                    <TableHead className="font-semibold">Account Type</TableHead>
                                    <TableHead className="font-semibold">Account No.</TableHead>
                                    <TableHead className="font-semibold">Scheme</TableHead>
                                    <TableHead className="font-semibold">Opening Date</TableHead>
                                    <TableHead className="text-right font-semibold">Outstanding</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {liabilities.map((acc, idx) => (
                                    <TableRow key={`liability-${idx}`}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <AccountTypeIcon type={acc.account_type} />
                                          <span className="text-sm font-medium">{acc.account_type}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">{acc.account_number}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{acc.scheme_name}</TableCell>
                                      <TableCell className="text-sm">
                                        {acc.opening_date
                                          ? new Date(acc.opening_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                          : "---"}
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm font-semibold text-red-700">
                                        {acc.balance.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={acc.status === "ACTIVE" ? "default" : "secondary"}
                                          className={
                                            acc.status === "ACTIVE"
                                              ? "bg-red-100 text-red-700 border-red-200 text-[10px]"
                                              : "text-[10px]"
                                          }
                                        >
                                          {acc.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Search Results Table */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {hasSearched
                  ? `Search Results (${members.length})`
                  : "Member Results"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Searching members...</p>
                  </div>
                </div>
              ) : hasSearched && members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-base font-medium text-muted-foreground">No members found</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : members.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Membership No</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Father Name</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Aadhaar</TableHead>
                        <TableHead className="font-semibold">Class</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member, idx) => (
                        <TableRow
                          key={`${member.membership_no}-${idx}`}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSelectMember(member)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {member.membership_no}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              {member.email && (
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{member.father_name || "---"}</TableCell>
                          <TableCell className="text-sm">
                            {member.phone_no || member.mobile_no || "---"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {member.aadhaar_no ? formatAadhaar(member.aadhaar_no) : "---"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {member.membership_class === "A"
                                ? "Class A"
                                : member.membership_class === "B"
                                  ? "Class B"
                                  : member.membership_class || "---"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={member.status?.toUpperCase() === "ACTIVE" ? "default" : "secondary"}
                              className={
                                member.status?.toUpperCase() === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {member.status || "---"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-primary hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectMember(member)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">
                    Search by name, father name, phone, Aadhaar, or ledger number
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Edit Member Dialog ───────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Member — {selectedMember?.membership_no}
            </DialogTitle>
          </DialogHeader>

          {/* Section tabs */}
          <div className="flex gap-1 border-b shrink-0">
            {(
              [
                { key: "personal", label: "Personal" },
                { key: "address", label: "Address" },
                { key: "kyc", label: "KYC" },
                { key: "membership", label: "Membership" },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                onClick={() => setEditSection(s.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  editSection === s.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="overflow-y-auto flex-1 px-1 py-2">
            {editSection === "personal" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={editForm.full_name} onChange={(e) => ef("full_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Father Name</Label>
                  <Input value={editForm.father_name} onChange={(e) => ef("father_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Spouse Name</Label>
                  <Input value={editForm.spouse_name} onChange={(e) => ef("spouse_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={editForm.date_of_birth} onChange={(e) => ef("date_of_birth", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <Select value={editForm.gender} onValueChange={(v) => ef("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mobile No</Label>
                  <Input value={editForm.mobile_no} onChange={(e) => ef("mobile_no", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => ef("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Occupation</Label>
                  <Input value={editForm.occupation} onChange={(e) => ef("occupation", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Marital Status</Label>
                  <Select value={editForm.marital_status} onValueChange={(v) => ef("marital_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* <div className="space-y-1.5">
                  <Label className="text-xs">Blood Group</Label>
                  <Select value={editForm.blood_group} onValueChange={(v) => ef("blood_group", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div> */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Caste</Label>
                  <Select value={editForm.caste_category} onValueChange={(v) => ef("caste_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["arasiyal vathi", "asrasu uliyar ", "panakkarar", "emali", "komali", "velaikkaran", "adimaikal", "kooli"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {editSection === "address" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">House No</Label>
                  <Input value={editForm.house_no} onChange={(e) => ef("house_no", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Street</Label>
                  <Input value={editForm.street} onChange={(e) => ef("street", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Village</Label>
                  <Input value={editForm.village} onChange={(e) => ef("village", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Taluk</Label>
                  <Input value={editForm.thaluk} onChange={(e) => ef("thaluk", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">District</Label>
                  <Input value={editForm.district} onChange={(e) => ef("district", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input value={editForm.state} onChange={(e) => ef("state", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pincode</Label>
                  <Input maxLength={6} value={editForm.pincode} onChange={(e) => ef("pincode", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone No</Label>
                  <Input value={editForm.phone_no} onChange={(e) => ef("phone_no", e.target.value)} />
                </div>
              </div>
            )}

            {editSection === "kyc" && (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Aadhaar number cannot be modified after enrollment.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aadhaar No</Label>
                    <Input
                      value={selectedMember?.aadhaar_no ? `${selectedMember.aadhaar_no.slice(0, 4)} ${selectedMember.aadhaar_no.slice(4, 8)} ${selectedMember.aadhaar_no.slice(8)}` : "---"}
                      disabled
                      className="font-mono bg-muted/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">PAN No</Label>
                    <Input
                      className="font-mono uppercase"
                      maxLength={10}
                      value={editForm.pan_no}
                      onChange={(e) => ef("pan_no", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ration Card No</Label>
                    <Input value={editForm.ration_no} onChange={(e) => ef("ration_no", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Driving License No</Label>
                    <Input
                      className="uppercase"
                      value={editForm.driving_license_no}
                      onChange={(e) => ef("driving_license_no", e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
            )}

            {editSection === "membership" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Membership No</Label>
                  <Input value={selectedMember?.membership_no || ""} disabled className="font-mono bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Membership Class</Label>
                  <Input value={selectedMember?.membership_class || ""} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ledger Folio No</Label>
                  <Input value={editForm.ledger_folio_number} onChange={(e) => ef("ledger_folio_number", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Board Resolution No</Label>
                  <Input value={editForm.board_resolution_number} onChange={(e) => ef("board_resolution_number", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Board Resolution Date</Label>
                  <Input type="date" value={editForm.boardresolutiondate} onChange={(e) => ef("boardresolutiondate", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 pt-2 border-t">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 mr-auto">
                <CheckCircle2 className="h-4 w-4" /> Saved successfully
              </span>
            )}
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}

/* Reusable detail field component */
function DetailField({
  icon: Icon,
  label,
  value,
  mono = false,
  capitalize = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
  mono?: boolean
  capitalize?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p
        className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {value || "---"}
      </p>
    </div>
  )
}

/* Icon for each account type */
function AccountTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Savings":
      return <PiggyBank className="h-4 w-4 text-emerald-500" />
    case "Term Deposit":
      return <Landmark className="h-4 w-4 text-blue-500" />
    case "Recurring Deposit":
      return <Calendar className="h-4 w-4 text-violet-500" />
    case "Pigmy Deposit":
      return <Wallet className="h-4 w-4 text-amber-500" />
    case "Share Capital":
      return <Building2 className="h-4 w-4 text-teal-500" />
    default:
      return <Banknote className="h-4 w-4 text-muted-foreground" />
  }
}
