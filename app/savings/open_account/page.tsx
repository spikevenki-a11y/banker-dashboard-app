"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, Loader2, CheckCircle2, User, CreditCard, Banknote, Users, X, Eye, MapPin, ShieldCheck, TrendingUp, TrendingDown, UserPlus, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
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

type Nominee = {
  name: string
  relation: string
}

type MemberProfile = {
  membership_no: string
  membership_class: string
  member_type: string
  status: string
  join_date: string
  ledger_folio_number: string
  board_resolution_number: string
  customer_code: string
  full_name: string
  father_name: string
  gender: string
  date_of_birth: string
  customer_type: string
  spouse_name: string
  marital_status: string
  // blood_group: string
  occupation: string
  mobile_no: string
  customer_email: string
  house_no: string
  street: string
  village: string
  thaluk: string
  district: string
  state: string
  pincode: string
  address_phone: string
  aadhaar_no: string
  pan_no: string
  ration_no: string
  driving_license_no: string
}

type AccountAsset = {
  account_type: string
  account_number: string
  scheme_name: string
  balance: number
  status: string
  opening_date: string
  interest_rate: number
  close_date?: string
  extra: any
}

type LoanAccount = {
  loan_application_id: number
  scheme_name: string
  loan_type: string
  sanctioned_amount: number
  interest_rate: number
  loan_tenure_months: number
  emi_amount: number
  sanction_date: string
  outstanding_balance: number
  paid_installments: number
  total_installments: number
  overdue_installments: number
  application_status: string
  loan_account_no: string
}

type Scheme = {
  scheme_id: number
  scheme_name: string
  scheme_description: string
  interest_rate: number
  min_balance: number
  minimum_deposit: number
  maximum_deposit: number
  interest_frequency: string
  interest_calculation_method: string
  scheme_status: string
  minimum_age: number
  maximum_age: number
  is_staff_only: boolean
  savings_gl_account: number
}

export default function OpenSavingsAccountPage() {
  const router = useRouter()

  // Member lookup
  const [membershipNo, setMembershipNo] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberError, setMemberError] = useState("")

  // Member search popup
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchPhone, setSearchPhone] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchLedgerFolio, setSearchLedgerFolio] = useState("")
  const [searchResults, setSearchResults] = useState<MemberInfo[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)
  const [hasPopupSearched, setHasPopupSearched] = useState(false)
  const [popupPage, setPopupPage] = useState(1)
  const [popupPageSize, setPopupPageSize] = useState(10)

  // Schemes
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [selectedSchemeId, setSelectedSchemeId] = useState("")
  const [loadingSchemes, setLoadingSchemes] = useState(true)

  // Form fields
  const [openingDate, setOpeningDate] = useState("")
  const [initialDeposit, setInitialDeposit] = useState("")

  // Nominee list (up to 4) + draft entry
  const MAX_NOMINEES = 4
  const [nominees, setNominees] = useState<Nominee[]>([])
  const [draftNomineeName, setDraftNomineeName] = useState("")
  const [draftNomineeRelation, setDraftNomineeRelation] = useState("")

  const canAddNominee = nominees.length < MAX_NOMINEES

  const handleAddNominee = () => {
    if (!draftNomineeName.trim() || !draftNomineeRelation) return
    setNominees((prev) => [...prev, { name: draftNomineeName.trim(), relation: draftNomineeRelation }])
    setDraftNomineeName("")
    setDraftNomineeRelation("")
  }

  const handleRemoveNominee = (idx: number) =>
    setNominees((prev) => prev.filter((_, i) => i !== idx))

  // View member modal
  const [viewMemberOpen, setViewMemberOpen] = useState(false)
  const [viewMemberTab, setViewMemberTab] = useState("personal")
  const [viewMemberProfile, setViewMemberProfile] = useState<MemberProfile | null>(null)
  const [viewMemberAssets, setViewMemberAssets] = useState<AccountAsset[]>([])
  const [viewMemberSummary, setViewMemberSummary] = useState<any>(null)
  const [viewMemberLoans, setViewMemberLoans] = useState<LoanAccount[]>([])
  const [viewMemberLoading, setViewMemberLoading] = useState(false)
  const [viewMemberError, setViewMemberError] = useState("")

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [createdAccountNo, setCreatedAccountNo] = useState("")

  // Fetch schemes on mount
  useEffect(() => {
    async function fetchSchemes() {
      try {
        const res = await fetch("/api/savings/schemes", { credentials: "include" })
        const data = await res.json()
        if (res.ok) {
          setSchemes(data.schemes || [])
        }
      } catch (e) {
        console.error("Failed to fetch schemes:", e)
      } finally {
        setLoadingSchemes(false)
      }
    }
    fetchSchemes()
    getLogindate()
  }, [])

  const selectedScheme = schemes.find((s) => String(s.scheme_id) === selectedSchemeId)

  const handleMemberSearch = async () => {
    if (!membershipNo.trim()) return

    setIsSearching(true)
    setMemberError("")
    setMemberInfo(null)

    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: membershipNo.trim() }),
      })

      const data = await res.json()
      if (res.ok && data.found) {
        setMemberInfo(data.member)
      } else {
        setMemberError("No active member found with this membership number.")
      }
    } catch (e) {
      setMemberError("Failed to search member. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-load member on blur (when user types membership no directly)
  const handleMemberBlur = () => {
    if (membershipNo.trim() && !memberInfo && !isSearching) {
      handleMemberSearch()
    }
  }

  // Popup advanced search
  const handlePopupSearch = async () => {
    if (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchPhone.trim() && !searchAadhaar.trim() && !searchLedgerFolio.trim()) return

    setIsPopupSearching(true)
    setHasPopupSearched(true)
    setPopupPage(1)
    setSearchResults([])

    try {
      const res = await fetch("/api/savings/member-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNumber: searchMemberNo.trim(),
          memberName: searchMemberName.trim(),
          fatherName: searchFatherName.trim(),
          contactNo: searchPhone.trim(),
          aadhaarNumber: searchAadhaar.trim(),
          ledgerFolioNumber: searchLedgerFolio.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSearchResults(data.results || [])
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setIsPopupSearching(false)
    }
  }

  const popupTotalPages = Math.max(1, Math.ceil(searchResults.length / popupPageSize))
  const paginatedSearchResults = searchResults.slice((popupPage - 1) * popupPageSize, popupPage * popupPageSize)

  const resetPopupSearch = () => {
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchPhone("")
    setSearchAadhaar("")
    setSearchLedgerFolio("")
    setSearchResults([])
    setHasPopupSearched(false)
    setPopupPage(1)
  }

  const handleSelectMember = (member: MemberInfo) => {
    setMemberInfo(member)
    setMembershipNo(member.membership_no)
    setMemberError("")
    setSearchDialogOpen(false)
    resetPopupSearch()
  }

  const fmt = (n: number) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

  const handleViewMember = async () => {
    if (!memberInfo) return
    setViewMemberOpen(true)
    setViewMemberTab("personal")
    setViewMemberLoading(true)
    setViewMemberError("")
    setViewMemberProfile(null)
    setViewMemberAssets([])
    setViewMemberSummary(null)
    setViewMemberLoans([])

    try {
      const no = memberInfo.membership_no
      const [profileRes, accountsRes, loansRes] = await Promise.all([
        fetch(`/api/members/profile?membership_no=${no}`, { credentials: "include" }),
        fetch(`/api/members/accounts?membership_no=${no}`, { credentials: "include" }),
        fetch(`/api/loans/accounts?membershipNo=${no}`, { credentials: "include" }),
      ])
      const [profileData, accountsData, loansData] = await Promise.all([
        profileRes.json(),
        accountsRes.json(),
        loansRes.json(),
      ])
      if (profileData.found) setViewMemberProfile(profileData.profile)
      if (accountsData.success) {
        setViewMemberAssets(accountsData.assets || [])
        setViewMemberSummary(accountsData.summary)
      }
      if (loansData.accounts) setViewMemberLoans(loansData.accounts)
    } catch {
      setViewMemberError("Failed to load member details. Please try again.")
    } finally {
      setViewMemberLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!memberInfo || !selectedSchemeId || !openingDate) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/savings/open-account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: memberInfo.membership_no,
          scheme_id: Number(selectedSchemeId),
          opening_date: openingDate,
          initial_deposit: initialDeposit ? Number(initialDeposit) : 0,
          nominees,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCreatedAccountNo(data.account_number)
      setSuccessOpen(true)
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setMembershipNo("")
    setMemberInfo(null)
    setMemberError("")
    setSelectedSchemeId("")
    // setOpeningDate(new Date().toISOString().split("T")[0])
    setInitialDeposit("")
    setNominees([])
    setDraftNomineeName("")
    setDraftNomineeRelation("")
  }
  
const getLogindate = async () => {
  try {
    const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
    const data = await res.json()

    console.log("logindate =", data)

    if (data.businessDate) {
      setOpeningDate(data.businessDate)
      console.log("Updated openingDate-----:", openingDate)
    }
    console.log("Updated openingDate:", openingDate)

  } catch (err) {
    console.error("Failed to fetch date", err)
  }
}

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
                onClick={() => router.push("/savings")}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Open Savings Account</h1>
                <p className="text-muted-foreground">Create a new savings account for a member</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Member Lookup */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
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
                      <Label htmlFor="membership-no">Membership Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="membership-no"
                          placeholder="Enter membership number"
                          value={membershipNo}
                          onChange={(e) => {
                            setMembershipNo(e.target.value)
                            if (memberInfo) {
                              setMemberInfo(null)
                              setMemberError("")
                            }
                          }}
                          onBlur={handleMemberBlur}
                          onKeyDown={(e) => e.key === "Enter" && handleMemberSearch()}
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
                      {memberError && <p className="text-sm text-red-500">{memberError}</p>}
                    </div>

                    {memberInfo && (
                      <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-teal-600" />
                          <span className="font-medium text-teal-700">Member Found</span>
                          <Badge variant="outline" className="ml-auto border-teal-300 text-teal-700">
                            {memberInfo.member_type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleViewMember}
                            className="h-7 gap-1.5 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Full Name</p>
                            <p className="text-sm font-medium">{memberInfo.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Father Name</p>
                            <p className="text-sm font-medium">{memberInfo.father_name || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mobile</p>
                            <p className="text-sm font-medium">{memberInfo.mobile_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                            <p className="text-sm font-medium">{memberInfo.date_of_birth || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Gender</p>
                            <p className="text-sm font-medium">{memberInfo.gender || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Customer Code</p>
                            <p className="text-sm font-mono font-medium">{memberInfo.customer_code?.trim()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Scheme Selection */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-lg">Scheme & Account Details</CardTitle>
                        <CardDescription>Select a savings scheme and enter account details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheme">Savings Scheme *</Label>
                        <Select value={selectedSchemeId} onValueChange={setSelectedSchemeId} disabled={loadingSchemes}>
                          <SelectTrigger id="scheme">
                            <SelectValue placeholder={loadingSchemes ? "Loading schemes..." : "Select a scheme"} />
                          </SelectTrigger>
                          <SelectContent>
                            {schemes.map((scheme) => (
                              <SelectItem key={scheme.scheme_id} value={String(scheme.scheme_id)}>
                                {scheme.scheme_name} ({scheme.interest_rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="opening-date">Opening Date</Label>
                        <Input
                          id="opening-date"
                          type="date"
                          value={openingDate}
                          // onChange={(e) => setOpeningDate(e.target.value)}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="initial-deposit">Initial Deposit Amount</Label>
                        <Input
                          id="initial-deposit"
                          type="number"
                          placeholder="0.00"
                          value={initialDeposit}
                          // onChange={(e) => setInitialDeposit(e.target.value)}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Interest Rate</Label>
                        <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          {selectedScheme ? `${selectedScheme.interest_rate}% per annum` : "---"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Nominee Details */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        3
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">Nominee Details</CardTitle>
                        <CardDescription>Add up to 4 nominees for the account</CardDescription>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {nominees.length} / {MAX_NOMINEES} added
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Added nominees list */}
                    {nominees.length > 0 && (
                      <div className="rounded-lg border divide-y">
                        {nominees.map((n, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{n.name}</p>
                                <p className="text-xs text-muted-foreground">{n.relation}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveNominee(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add nominee entry form */}
                    {canAddNominee && (
                      <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/30 p-4 space-y-3">
                        <p className="text-xs font-medium text-teal-700 flex items-center gap-1.5">
                          <UserPlus className="h-3.5 w-3.5" />
                          Add Nominee
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="draft-nominee-name" className="text-xs">Nominee Name</Label>
                            <Input
                              id="draft-nominee-name"
                              placeholder="Enter nominee name"
                              value={draftNomineeName}
                              onChange={(e) => setDraftNomineeName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddNominee()}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="draft-nominee-relation" className="text-xs">Relationship</Label>
                            <Select value={draftNomineeRelation} onValueChange={setDraftNomineeRelation}>
                              <SelectTrigger id="draft-nominee-relation">
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Father">Father</SelectItem>
                                <SelectItem value="Mother">Mother</SelectItem>
                                <SelectItem value="Spouse">Spouse</SelectItem>
                                <SelectItem value="Son">Son</SelectItem>
                                <SelectItem value="Daughter">Daughter</SelectItem>
                                <SelectItem value="Brother">Brother</SelectItem>
                                <SelectItem value="Sister">Sister</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddNominee}
                          disabled={!draftNomineeName.trim() || !draftNomineeRelation}
                          className="gap-1.5 bg-white border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Add Nominee
                        </Button>
                      </div>
                    )}

                    {nominees.length === 0 && !canAddNominee && (
                      <p className="text-sm text-muted-foreground">Maximum nominees added.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset} className="bg-transparent">
                    Reset
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/savings")} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!memberInfo || !selectedSchemeId || !openingDate || isSubmitting}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      "Open Account"
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
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm font-semibold">{memberInfo.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Membership No</p>
                          <p className="text-sm font-mono font-semibold">{memberInfo.membership_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <Badge variant="outline">{memberInfo.member_type}</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Search a member to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Scheme Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Scheme Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedScheme ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Scheme</p>
                          <p className="text-sm font-semibold">{selectedScheme.scheme_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                          <p className="text-sm font-semibold text-teal-600">{selectedScheme.interest_rate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Min Balance</p>
                          <p className="text-sm font-semibold">
                            {selectedScheme.min_balance ? `₹${Number(selectedScheme.min_balance).toLocaleString()}` : "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Frequency</p>
                          <p className="text-sm font-semibold capitalize">{selectedScheme.interest_frequency || "---"}</p>
                        </div>
                        {selectedScheme.scheme_description && (
                          <div>
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{selectedScheme.scheme_description}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a scheme to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Deposit Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Account Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Opening Date</p>
                        <p className="text-sm font-semibold">{openingDate || "---"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Initial Deposit</p>
                        <p className="text-sm font-semibold">
                          {initialDeposit ? `₹${Number(initialDeposit).toLocaleString()}` : "₹0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nominees</p>
                        {nominees.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {nominees.map((n, i) => (
                              <p key={i} className="text-sm font-semibold">
                                {i + 1}. {n.name} <span className="font-normal text-muted-foreground">({n.relation})</span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-muted-foreground">Not provided</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Member Profile Modal */}
            <Dialog open={viewMemberOpen} onOpenChange={setViewMemberOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                {/* Fixed header */}
                <div className="px-6 pt-6 pb-4 border-b shrink-0">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-teal-700 text-lg">
                      <User className="h-5 w-5" />
                      Member Profile
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {memberInfo?.membership_no}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm">{memberInfo?.full_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            memberInfo?.status === "ACTIVE"
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-red-300 bg-red-50 text-red-700"
                          }
                        >
                          {memberInfo?.status}
                        </Badge>
                        {memberInfo?.member_type && (
                          <Badge variant="outline" className="border-teal-300 text-teal-700">
                            {memberInfo.member_type}
                          </Badge>
                        )}
                        {memberInfo?.membership_class && (
                          <Badge variant="secondary">{memberInfo.membership_class}</Badge>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Loading / error */}
                {viewMemberLoading && (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
                    <span className="ml-3 text-sm text-muted-foreground">Loading member details…</span>
                  </div>
                )}
                {viewMemberError && !viewMemberLoading && (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <p className="text-sm text-red-500">{viewMemberError}</p>
                  </div>
                )}

                {/* Tabbed content */}
                {!viewMemberLoading && !viewMemberError && (
                  <Tabs value={viewMemberTab} onValueChange={setViewMemberTab} className="flex flex-col flex-1 min-h-0">
                    <TabsList className="mx-6 mt-3 shrink-0 grid grid-cols-4 w-auto">
                      <TabsTrigger value="personal" className="gap-1.5 text-xs">
                        <User className="h-3.5 w-3.5" />Personal
                      </TabsTrigger>
                      <TabsTrigger value="address" className="gap-1.5 text-xs">
                        <MapPin className="h-3.5 w-3.5" />Address & KYC
                      </TabsTrigger>
                      <TabsTrigger value="assets" className="gap-1.5 text-xs">
                        <TrendingUp className="h-3.5 w-3.5" />Assets
                      </TabsTrigger>
                      <TabsTrigger value="liabilities" className="gap-1.5 text-xs">
                        <TrendingDown className="h-3.5 w-3.5" />Liabilities
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Personal ─────────────────────────────────────── */}
                    <TabsContent value="personal" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {viewMemberProfile ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Personal Information</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Full Name",       viewMemberProfile.full_name],
                                ["Father Name",     viewMemberProfile.father_name || "---"],
                                ["Date of Birth",   viewMemberProfile.date_of_birth || "---"],
                                ["Gender",          viewMemberProfile.gender ? viewMemberProfile.gender.charAt(0).toUpperCase() + viewMemberProfile.gender.slice(1) : "---"],
                                ["Mobile",          viewMemberProfile.mobile_no || "---"],
                                ["Email",           viewMemberProfile.customer_email || "---"],
                                // ["Blood Group",     viewMemberProfile.blood_group || "---"],
                                ["Marital Status",  viewMemberProfile.marital_status || "---"],
                                ["Spouse Name",     viewMemberProfile.spouse_name || "---"],
                                ["Occupation",      viewMemberProfile.occupation || "---"],
                                ["Customer Type",   viewMemberProfile.customer_type || "---"],
                                ["Customer Code",   viewMemberProfile.customer_code?.trim() || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium break-all">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Membership Information</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Membership No",          viewMemberProfile.membership_no],
                                ["Member Type",            viewMemberProfile.member_type || "---"],
                                ["Membership Class",       viewMemberProfile.membership_class || "---"],
                                ["Status",                 viewMemberProfile.status || "---"],
                                ["Join Date",              viewMemberProfile.join_date || "---"],
                                ["Ledger Folio No",        viewMemberProfile.ledger_folio_number || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No personal data available.</p>
                      )}
                    </TabsContent>

                    {/* ── Address & KYC ────────────────────────────────── */}
                    <TabsContent value="address" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {viewMemberProfile ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Current Address</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["House No",    viewMemberProfile.house_no || "---"],
                                ["Street",      viewMemberProfile.street || "---"],
                                ["Village",     viewMemberProfile.village || "---"],
                                ["Taluk",       viewMemberProfile.thaluk || "---"],
                                ["District",    viewMemberProfile.district || "---"],
                                ["State",       viewMemberProfile.state || "---"],
                                ["Pincode",     viewMemberProfile.pincode || "---"],
                                ["Phone",       viewMemberProfile.address_phone || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />KYC Documents
                            </p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Aadhaar No",         viewMemberProfile.aadhaar_no || "---"],
                                ["PAN No",             viewMemberProfile.pan_no || "---"],
                                ["Ration No",          viewMemberProfile.ration_no || "---"],
                                ["Driving License",    viewMemberProfile.driving_license_no || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium font-mono">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No address data available.</p>
                      )}
                    </TabsContent>

                    {/* ── Assets ───────────────────────────────────────── */}
                    <TabsContent value="assets" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {viewMemberSummary && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Total Assets",      value: fmt(viewMemberSummary.total_assets),      color: "text-teal-700 bg-teal-50 border-teal-200" },
                            { label: "Total Accounts",    value: String(viewMemberAssets.length),          color: "text-blue-700 bg-blue-50 border-blue-200" },
                            { label: "Net Worth",         value: fmt(viewMemberSummary.net_worth),         color: "text-green-700 bg-green-50 border-green-200" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                              <p className="text-xs opacity-70">{label}</p>
                              <p className="text-base font-bold mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {viewMemberAssets.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Account No</TableHead>
                                <TableHead className="text-xs">Scheme</TableHead>
                                <TableHead className="text-xs">Rate</TableHead>
                                <TableHead className="text-xs text-right">Balance</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewMemberAssets.map((a, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs">
                                    <Badge variant="secondary" className="text-xs font-normal">{a.account_type}</Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{a.account_number}</TableCell>
                                  <TableCell className="text-xs">{a.scheme_name}</TableCell>
                                  <TableCell className="text-xs">{a.interest_rate ? `${a.interest_rate}%` : "---"}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{fmt(a.balance)}</TableCell>
                                  <TableCell className="text-xs">
                                    <span className={`font-medium ${a.status === "ACTIVE" ? "text-green-600" : "text-muted-foreground"}`}>
                                      {a.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                          <TrendingUp className="h-8 w-8 opacity-20 mb-2" />
                          <p className="text-sm">No assets found for this member.</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Liabilities ──────────────────────────────────── */}
                    <TabsContent value="liabilities" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {viewMemberLoans.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            {(() => {
                              const activeLoans = viewMemberLoans.filter(l => l.application_status === "ACTIVE")
                              const totalOutstanding = viewMemberLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0)
                              const totalOverdue = viewMemberLoans.reduce((s, l) => s + Number(l.overdue_installments || 0), 0)
                              return [
                                { label: "Active Loans",       value: String(activeLoans.length),  color: "text-orange-700 bg-orange-50 border-orange-200" },
                                { label: "Total Outstanding",  value: fmt(totalOutstanding),        color: "text-red-700 bg-red-50 border-red-200" },
                                { label: "Overdue EMIs",       value: String(totalOverdue),         color: totalOverdue > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-green-700 bg-green-50 border-green-200" },
                              ].map(({ label, value, color }) => (
                                <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                                  <p className="text-xs opacity-70">{label}</p>
                                  <p className="text-base font-bold mt-0.5">{value}</p>
                                </div>
                              ))
                            })()}
                          </div>

                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-xs">Loan Scheme</TableHead>
                                  <TableHead className="text-xs text-right">Sanctioned</TableHead>
                                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                                  <TableHead className="text-xs text-right">EMI</TableHead>
                                  <TableHead className="text-xs">EMIs Paid</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {viewMemberLoans.map((loan, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs">
                                      <p className="font-medium">{loan.scheme_name}</p>
                                      {loan.sanction_date && <p className="text-muted-foreground text-xs">{loan.sanction_date}</p>}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">{fmt(loan.sanctioned_amount)}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold text-red-600">{fmt(loan.outstanding_balance)}</TableCell>
                                    <TableCell className="text-xs text-right">{fmt(loan.emi_amount)}</TableCell>
                                    <TableCell className="text-xs">
                                      {loan.paid_installments}/{loan.total_installments}
                                      {Number(loan.overdue_installments) > 0 && (
                                        <span className="ml-1 text-red-500">({loan.overdue_installments} overdue)</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <span className={`font-medium ${loan.application_status === "ACTIVE" ? "text-green-600" : loan.application_status === "OVERDUE" ? "text-red-600" : "text-muted-foreground"}`}>
                                        {loan.application_status}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                          <TrendingDown className="h-8 w-8 opacity-20 mb-2" />
                          <p className="text-sm">No loan accounts found for this member.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* Footer */}
                {!viewMemberLoading && (
                  <div className="px-6 py-3 border-t shrink-0 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewMemberOpen(false)} className="bg-transparent">
                      Close
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Member Search Dialog */}
            <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    Search Member
                  </DialogTitle>
                  <DialogDescription>
                    Search for a member using one or more criteria below
                  </DialogDescription>
                </DialogHeader>

                {/* Search Criteria */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="search-member-no" className="text-xs font-medium text-muted-foreground">Membership No.</Label>
                    <Input
                      id="search-member-no"
                      placeholder="Enter membership no."
                      value={searchMemberNo}
                      onChange={(e) => setSearchMemberNo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-member-name" className="text-xs font-medium text-muted-foreground">Member Name</Label>
                    <Input
                      id="search-member-name"
                      placeholder="Enter name"
                      value={searchMemberName}
                      onChange={(e) => setSearchMemberName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-father-name" className="text-xs font-medium text-muted-foreground">Father Name</Label>
                    <Input
                      id="search-father-name"
                      placeholder="Enter father name"
                      value={searchFatherName}
                      onChange={(e) => setSearchFatherName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-phone" className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                    <Input
                      id="search-phone"
                      placeholder="Enter phone"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-aadhaar" className="text-xs font-medium text-muted-foreground">Aadhaar Number</Label>
                    <Input
                      id="search-aadhaar"
                      placeholder="Enter Aadhaar"
                      value={searchAadhaar}
                      onChange={(e) => setSearchAadhaar(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-ledger" className="text-xs font-medium text-muted-foreground">Ledger No.</Label>
                    <Input
                      id="search-ledger"
                      placeholder="Enter ledger no."
                      value={searchLedgerFolio}
                      onChange={(e) => setSearchLedgerFolio(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPopupSearch}
                    className="gap-1.5 bg-transparent text-xs"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePopupSearch}
                    disabled={isPopupSearching || (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchPhone.trim() && !searchAadhaar.trim() && !searchLedgerFolio.trim())}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isPopupSearching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    Search
                  </Button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-auto border rounded-lg min-h-0">
                  {isPopupSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching members...</span>
                    </div>
                  ) : hasPopupSearched && searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm font-medium text-muted-foreground">No members found</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">Try adjusting your search criteria</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Member No</TableHead>
                          <TableHead className="text-xs">Full Name</TableHead>
                          <TableHead className="text-xs">Father Name</TableHead>
                          <TableHead className="text-xs">Aadhaar</TableHead>
                          <TableHead className="text-xs">Mobile</TableHead>
                          <TableHead className="text-xs w-20">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSearchResults.map((member) => (
                          <TableRow
                            key={member.membership_no}
                            className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                            onClick={() => handleSelectMember(member)}
                          >
                            <TableCell className="font-mono text-xs font-medium">{member.membership_no}</TableCell>
                            <TableCell className="text-xs font-medium">{member.full_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{member.father_name || "---"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{member.aadhaar_no || "---"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{member.mobile_no || "---"}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectMember(member)
                                }}
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
                        Search by member number, name, father name, phone, Aadhaar, or ledger number
                      </p>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Rows per page:</span>
                      <Select
                        value={String(popupPageSize)}
                        onValueChange={(v) => {
                          setPopupPageSize(Number(v))
                          setPopupPage(1)
                        }}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="ml-2">
                        {(popupPage - 1) * popupPageSize + 1}–{Math.min(popupPage * popupPageSize, searchResults.length)} of {searchResults.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage(1)} disabled={popupPage === 1}>
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage((p) => p - 1)} disabled={popupPage === 1}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="px-2 text-xs">Page {popupPage} of {popupTotalPages}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage((p) => p + 1)} disabled={popupPage >= popupTotalPages}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage(popupTotalPages)} disabled={popupPage >= popupTotalPages}>
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Account Opened Successfully!
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                      <p className="text-sm text-teal-700">The savings account has been created with the following details:</p>
                      <p className="mt-2 text-lg font-semibold text-teal-800">
                        Account No: <span className="font-mono">{createdAccountNo}</span>
                      </p>
                      {memberInfo && (
                        <p className="mt-1 text-sm text-teal-700">
                          Member: {memberInfo.full_name} ({memberInfo.membership_no})
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:justify-end">
                  <AlertDialogAction
                    onClick={() => {
                      setSuccessOpen(false)
                      handleReset()
                    }}
                    className="bg-transparent border border-input hover:bg-accent text-foreground"
                  >
                    Open Another
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => router.push("/savings")}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Go to Savings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
