"use client"

import { popup } from "@/lib/popup"
import { formatDate } from "@/lib/date-format"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ArrowLeft, Search, Loader2, CheckCircle2, User, CreditCard, Banknote, Users, X, Eye, UserPlus, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Home } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { calculateAge } from "@/lib/member-age"
import { isValidNomineePhone, normaliseNomineePhone } from "@/lib/savings-nominees"
import { MemberSummaryCard } from "@/components/member-summary-card"
import { formatCurrency } from "@/lib/number-format"

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
  ledger_folio_number: string
}

type Nominee = {
  name: string
  relation: string
  is_member: boolean
  membership_id: string | null
  dob: string | null
  gender: string | null
  age: number | null
  address: string | null
  phone: string | null
  percentage: number | null
}

const formatNomineeAddress = (p: any) =>
  [p?.house_no, p?.street, p?.village, p?.thaluk, p?.district, p?.state, p?.pincode]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean)
    .join(", ")




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

const OPERATION_TYPES = [
  { value: "SINGLE", label: "Single" },
  { value: "EITHER_SURVIVOR", label: "Either or Survivor" },
  { value: "JOINT_HOLDER", label: "Joint holder" },
  { value: "FORMER_SURVIVOR", label: "Former or Survivor" },
  { value: "LATTER_SURVIVOR", label: "Latter or Survivor" },
]

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
  const [ledgerFolioNo, setLedgerFolioNo] = useState("")
  const [chequeRequired, setChequeRequired] = useState(false)
  const [operationType, setOperationType] = useState("SINGLE")

  // Secondary holder (every operation type except Single)
  const needsSecondaryHolder = operationType !== "SINGLE"
  const [secondaryNo, setSecondaryNo] = useState("")
  const [secondaryInfo, setSecondaryInfo] = useState<MemberInfo | null>(null)
  const [secondaryError, setSecondaryError] = useState("")
  const [isSecondarySearching, setIsSecondarySearching] = useState(false)

  const clearSecondaryHolder = () => {
    setSecondaryNo("")
    setSecondaryInfo(null)
    setSecondaryError("")
  }

  const handleOperationTypeChange = (value: string) => {
    setOperationType(value)
    if (value === "SINGLE") clearSecondaryHolder()
  }

  // Look up the secondary holder (same member lookup as the account holder)
  const loadSecondaryHolder = async (memberNo: string) => {
    const no = memberNo.trim()
    if (!no) return
    setSecondaryNo(no)
    setSecondaryInfo(null)
    setSecondaryError("")
    if (memberInfo && String(memberInfo.membership_no) === no) {
      setSecondaryError("Secondary holder must be a different member from the account holder.")
      return
    }
    setIsSecondarySearching(true)
    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: no }),
      })
      const data = await res.json()
      if (res.ok && data.found) {
        setSecondaryInfo(data.member)
      } else {
        setSecondaryError("No active member found with this membership number.")
      }
    } catch {
      setSecondaryError("Failed to search member. Please try again.")
    } finally {
      setIsSecondarySearching(false)
    }
  }

  // Nominee list (up to 4) + draft entry
  const MAX_NOMINEES = 4
  const [nominees, setNominees] = useState<Nominee[]>([])
  const [draftNomineeName, setDraftNomineeName] = useState("")
  const [draftNomineeRelation, setDraftNomineeRelation] = useState("")
  const [draftIsMember, setDraftIsMember] = useState(false)
  const [draftMembershipId, setDraftMembershipId] = useState("")
  const [draftDob, setDraftDob] = useState("")
  const [draftGender, setDraftGender] = useState("")
  const [draftAge, setDraftAge] = useState("")
  const [draftAddress, setDraftAddress] = useState("")
  const [draftPhone, setDraftPhone] = useState("") // editable; filled from the member record for a member nominee
  const [draftPercentage, setDraftPercentage] = useState("")
  const [draftMemberLoaded, setDraftMemberLoaded] = useState(false) // member details filled from lookup
  const [draftMemberLoading, setDraftMemberLoading] = useState(false)
  const [draftMemberNotFound, setDraftMemberNotFound] = useState(false) // lookup found no member: manual entry allowed
  const [draftNomineeError, setDraftNomineeError] = useState("")
  // Membership ID last looked up, so leaving the field again does not re-fetch it
  const [draftLookedUpNo, setDraftLookedUpNo] = useState("")
  // Bumped whenever the Membership ID changes, so a slower earlier lookup is ignored
  const nomineeLookupSeq = useRef(0)

  // Member search popup is shared: account holder (default) or nominee
  const [searchTarget, setSearchTarget] = useState<"holder" | "nominee" | "secondary">("holder")

  const canAddNominee = nominees.length < MAX_NOMINEES

  // Forget the current lookup (and ignore any still in flight)
  const cancelNomineeLookup = () => {
    nomineeLookupSeq.current++
    setDraftLookedUpNo("")
    setDraftMemberLoading(false)
  }

  const clearDraftPersonal = () => {
    setDraftNomineeName("")
    setDraftDob("")
    setDraftGender("")
    setDraftAge("")
    setDraftAddress("")
    setDraftPhone("")
    setDraftMemberLoaded(false)
    setDraftMemberNotFound(false)
  }

  const resetDraftNominee = () => {
    clearDraftPersonal()
    setDraftNomineeRelation("")
    setDraftPercentage("")
    setDraftIsMember(false)
    setDraftMembershipId("")
    setDraftNomineeError("")
    cancelNomineeLookup()
  }

  const handleDraftIsMemberChange = (checked: boolean) => {
    setDraftIsMember(checked)
    setDraftMembershipId("")
    setDraftNomineeError("")
    clearDraftPersonal()
    cancelNomineeLookup()
  }

  // Manual entry: derive age from date of birth
  const handleDraftDobChange = (value: string) => {
    setDraftDob(value)
    const age = value ? calculateAge(value, openingDate || new Date()) : null
    setDraftAge(age !== null && age >= 0 ? String(age) : "")
  }

  // Load a member's details into the nominee draft
  const loadNomineeMember = async (memberNo: string) => {
    const no = memberNo.trim()
    if (!no) return
    const seq = ++nomineeLookupSeq.current
    setDraftLookedUpNo(no)
    setDraftNomineeError("")
    clearDraftPersonal()
    setDraftMembershipId(no)

    if (memberInfo && String(memberInfo.membership_no) === no) {
      setDraftNomineeError("The account holder cannot be their own nominee.")
      return
    }
    if (nominees.some((n) => n.is_member && n.membership_id === no)) {
      setDraftNomineeError("This member is already added as a nominee.")
      return
    }

    setDraftMemberLoading(true)
    try {
      const res = await fetch(`/api/members/profile?membership_no=${encodeURIComponent(no)}`, { credentials: "include" })
      const data = await res.json()
      if (seq !== nomineeLookupSeq.current) return // Membership ID changed meanwhile
      if (!res.ok || !data.found) {
        setDraftNomineeError("No member found with this membership number.")
        setDraftMemberNotFound(true)
        return
      }
      const p = data.profile
      if (String(p.status || "").toUpperCase() !== "ACTIVE") {
        setDraftNomineeError("Only active members can be selected as a member nominee.")
        return
      }
      const age = p.date_of_birth ? calculateAge(p.date_of_birth, openingDate || new Date()) : null
      setDraftNomineeName(p.full_name || "")
      setDraftDob(p.date_of_birth || "")
      setDraftGender(p.gender || "")
      setDraftAge(age !== null && age >= 0 ? String(age) : "")
      setDraftAddress(formatNomineeAddress(p))
      setDraftPhone(p.mobile_no ? String(p.mobile_no).trim() : "")
      setDraftMemberLoaded(true)
    } catch {
      if (seq === nomineeLookupSeq.current) setDraftNomineeError("Failed to load member details. Please try again.")
    } finally {
      if (seq === nomineeLookupSeq.current) setDraftMemberLoading(false)
    }
  }

  // Membership ID field left (or Enter pressed): look the member up once per value
  const handleNomineeMembershipBlur = () => {
    const no = draftMembershipId.trim()
    if (!draftIsMember || !no || no === draftLookedUpNo) return
    loadNomineeMember(no)
  }

  // Nominee percentage: greater than 0 and not more than 100
  const draftPctNum = draftPercentage.trim() === "" ? NaN : Number(draftPercentage)
  const draftPctError =
    draftPercentage.trim() === ""
      ? ""
      : !Number.isFinite(draftPctNum) || draftPctNum <= 0 || draftPctNum > 100
        ? "Percentage must be greater than 0 and not more than 100."
        : ""
  const draftPctValid = draftPercentage.trim() !== "" && !draftPctError

  // Nominee phone (optional): 10 digits when given
  const draftPhoneValue = normaliseNomineePhone(draftPhone)
  const draftPhoneError =
    draftPhoneValue && !isValidNomineePhone(draftPhoneValue) ? "Phone number must be 10 digits." : ""

  // Member nominee: once a member is loaded, name, DOB, gender, age and address come
  // from the member record and are read-only (phone and relationship stay editable).
  // With Is Member ticked but no member loaded, the details stay locked while a
  // Membership ID is pending, and open for manual entry when the ID is cleared or no
  // member was found — such a nominee is saved as a non-member nominee.
  const draftAsMember = draftIsMember && draftMemberLoaded
  const detailsLocked = draftIsMember && !(draftMembershipId.trim() === "" || draftMemberNotFound)

  const draftReady =
    draftPctValid &&
    !draftPhoneError &&
    !!draftNomineeRelation &&
    (draftAsMember || (!detailsLocked && !!draftNomineeName.trim()))

  // Total nominee percentage — must be exactly 100% when any nominee is added
  const nomineeTotalHundredths = nominees.reduce((s, n) => s + Math.round((n.percentage || 0) * 100), 0)
  const nomineeTotal = nomineeTotalHundredths / 100
  const nomineeTotalOk = nominees.length === 0 || nomineeTotalHundredths === 10000
  const nomineeDiff = Math.abs(10000 - nomineeTotalHundredths) / 100

  const handleAddNominee = () => {
    if (!draftReady) return
    const age = draftAge === "" ? null : Number(draftAge)
    if (!draftAsMember && age !== null && (!Number.isInteger(age) || age < 0 || age > 150)) {
      setDraftNomineeError("Age must be a whole number between 0 and 150.")
      return
    }
    setNominees((prev) => [
      ...prev,
      {
        name: draftNomineeName.trim(),
        relation: draftNomineeRelation,
        is_member: draftAsMember,
        membership_id: draftAsMember ? draftMembershipId.trim() : null,
        dob: draftDob || null,
        gender: draftGender || null,
        age,
        address: draftAddress.trim() || null,
        phone: draftPhoneValue || null,
        percentage: Math.round(draftPctNum * 100) / 100,
      },
    ])
    resetDraftNominee()
  }

  const handleRemoveNominee = (idx: number) =>
    setNominees((prev) => prev.filter((_, i) => i !== idx))


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
    if (searchTarget === "nominee") {
      setSearchTarget("holder")
      setSearchDialogOpen(false)
      resetPopupSearch()
      loadNomineeMember(String(member.membership_no))
      return
    }
    if (searchTarget === "secondary") {
      setSearchTarget("holder")
      setSearchDialogOpen(false)
      resetPopupSearch()
      loadSecondaryHolder(String(member.membership_no))
      return
    }
    setMemberInfo(member)
    setMembershipNo(member.membership_no)
    setMemberError("")
    setSearchDialogOpen(false)
    resetPopupSearch()
  }

  const handleSubmit = async () => {
    if (!memberInfo || !selectedSchemeId || !openingDate) return
    if (!nomineeTotalOk) {
      popup.warning(`Nominee percentages must add up to exactly 100% (currently ${nomineeTotal}%).`)
      return
    }
    if (needsSecondaryHolder) {
      if (!secondaryInfo) {
        popup.warning("Please select the secondary holder for this operation type.")
        return
      }
      if (String(secondaryInfo.membership_no) === String(memberInfo.membership_no)) {
        popup.warning("Secondary holder must be a different member from the account holder.")
        return
      }
    }

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
          ledger_folio_no: ledgerFolioNo.trim(),
          is_cheque_required: chequeRequired,
          operation_type: operationType,
          secondary_membership_no: needsSecondaryHolder ? secondaryInfo?.membership_no ?? null : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCreatedAccountNo(data.account_number)
      setSuccessOpen(true)
    } catch (e: any) {
      popup.error("Error: " + e.message)
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
    setLedgerFolioNo("")
    setChequeRequired(false)
    setOperationType("SINGLE")
    clearSecondaryHolder()
    setNominees([])
    resetDraftNominee()
  }
  
const getLogindate = async () => {
  try {
    const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
    const data = await res.json()

    console.log("logindate =", data.businessDate)

    if (data.businessDate) {
      const date = data.businessDate.split("T")[0]
      console.log(date)
      setOpeningDate(date)
    }

  } catch (err) {
    console.error("Failed to fetch date", err)
  }
}

  return (
    <DashboardWrapper>
      <div className="">
        <div className="">
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

                    {/* {memberInfo && (
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
                            <p className="text-sm font-medium">{formatDate(memberInfo.date_of_birth, "---")}</p>
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
                    )} */}
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
                        <CardDescription>Select a savings scheme</CardDescription>
                        {/* <CardDescription>Select a savings scheme and enter account details</CardDescription> */}
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
                                {scheme.scheme_name}
                                {/* {scheme.scheme_name} ({scheme.interest_rate}%) */}
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
                        <Label htmlFor="operation-type">Operation Type</Label>
                        <Select value={operationType} onValueChange={handleOperationTypeChange}>
                          <SelectTrigger id="operation-type">
                            <SelectValue placeholder="Select operation type" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATION_TYPES.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ledger-folio-no">Ledger Folio No</Label>
                        <Input
                          id="ledger-folio-no"
                          placeholder="Enter ledger folio no."
                          value={ledgerFolioNo}
                          onChange={(e) => setLedgerFolioNo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Secondary Holder — joint operation types only */}
                    {needsSecondaryHolder && (
                      <div className="space-y-2">
                        <Label htmlFor="secondary-holder">Secondary Holder *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondary-holder"
                            placeholder="Enter secondary holder's membership number"
                            value={secondaryNo}
                            onChange={(e) => {
                              setSecondaryNo(e.target.value)
                              setSecondaryInfo(null)
                              setSecondaryError("")
                            }}
                            onKeyDown={(e) => e.key === "Enter" && loadSecondaryHolder(secondaryNo)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0"
                            disabled={!secondaryNo.trim() || isSecondarySearching}
                            onClick={() => loadSecondaryHolder(secondaryNo)}
                            title="Load member"
                          >
                            {isSecondarySearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => {
                              setSearchTarget("secondary")
                              setSearchDialogOpen(true)
                            }}
                          >
                            Find Member
                          </Button>
                        </div>
                        {secondaryError && <p className="text-xs text-red-600">{secondaryError}</p>}
                        {secondaryInfo && (
                          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-800 dark:bg-teal-950/20">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 text-teal-700" />
                                {secondaryInfo.full_name}
                              </p>
                              <Badge variant="outline" className="border-teal-300 text-teal-700">
                                {secondaryInfo.status}
                              </Badge>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div><span className="text-muted-foreground">Membership No: </span><span className="font-mono">{secondaryInfo.membership_no}</span></div>
                              <div><span className="text-muted-foreground">Father's Name: </span>{secondaryInfo.father_name || "---"}</div>
                              <div><span className="text-muted-foreground">Mobile: </span>{secondaryInfo.mobile_no || "---"}</div>
                              <div><span className="text-muted-foreground">Date of Birth: </span>{secondaryInfo.date_of_birth
                                ? formatDate(secondaryInfo.date_of_birth)
                                : "---"}</div>
                              <div><span className="text-muted-foreground">Gender: </span>{secondaryInfo.gender || "---"}</div>
                              <div><span className="text-muted-foreground">Aadhaar: </span><span className="font-mono">{secondaryInfo.aadhaar_no?.trim() || "---"}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cheque Required</Label>
                        <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
                          <Checkbox
                            id="cheque-required"
                            checked={chequeRequired}
                            onCheckedChange={(checked) => setChequeRequired(checked === true)}
                          />
                          <Label htmlFor="cheque-required" className="text-sm font-normal cursor-pointer">
                            {chequeRequired ? "Yes" : "No"}
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="initial-deposit">Initial Deposit Amount</Label>
                        <Input
                          id="initial-deposit"
                          type="amount"
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
                    </div> */}
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
                                <p className="text-sm font-medium flex items-center gap-2">
                                  {n.name}
                                  {n.is_member && (
                                    <Badge variant="outline" className="border-teal-300 text-teal-700 text-[10px] px-1.5 py-0">
                                      Member {n.membership_id}
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {[
                                    n.relation,
                                    n.gender,
                                    n.age !== null && n.age !== undefined ? `${n.age} yrs` : null,
                                    n.dob ? formatDate(n.dob) : null,
                                    n.phone ? `Ph ${n.phone}` : null,
                      n.percentage ? `${n.percentage}%` : null,
                                  ].filter(Boolean).join(" · ")}
                                </p>
                                {n.address && <p className="text-xs text-muted-foreground">{n.address}</p>}
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

                    {/* Total nominee percentage */}
                    {nominees.length > 0 && (
                      <div
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                          nomineeTotalOk
                            ? "border-teal-200 bg-teal-50/50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300"
                            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        }`}
                      >
                        <span className="font-medium">Total Percentage: {nomineeTotal}%</span>
                        <span className="text-xs">
                          {nomineeTotalOk
                            ? "Total is 100%"
                            : nomineeTotalHundredths < 10000
                              ? `${nomineeDiff}% remaining — total must be exactly 100%`
                              : `${nomineeDiff}% excess — total must be exactly 100%`}
                        </span>
                      </div>
                    )}

                    {/* Add nominee entry form */}
                    {canAddNominee && (
                      <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/30 p-4 space-y-3">
                        <p className="text-xs font-medium text-teal-700 flex items-center gap-1.5">
                          <UserPlus className="h-3.5 w-3.5" />
                          Add Nominee
                        </p>
                        {/* Is Member */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="draft-nominee-is-member"
                            checked={draftIsMember}
                            onCheckedChange={(c) => handleDraftIsMemberChange(c === true)}
                          />
                          <Label htmlFor="draft-nominee-is-member" className="text-xs cursor-pointer">
                            Is Member
                          </Label>
                        </div>

                        {/* Membership ID — enabled only for a member nominee */}
                        <div className="space-y-1.5">
                          <Label htmlFor="draft-nominee-membership" className="text-xs">Membership ID</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id="draft-nominee-membership"
                                placeholder={draftIsMember ? "Enter membership number" : "Tick Is Member to enable"}
                                value={draftMembershipId}
                                disabled={!draftIsMember}
                                className={draftMemberLoading ? "pr-9" : undefined}
                                onChange={(e) => {
                                  // A changed or cleared ID drops the previously loaded member
                                  setDraftMembershipId(e.target.value)
                                  clearDraftPersonal()
                                  setDraftNomineeError("")
                                  cancelNomineeLookup()
                                }}
                                onBlur={handleNomineeMembershipBlur}
                                onKeyDown={(e) => e.key === "Enter" && handleNomineeMembershipBlur()}
                              />
                              {draftMemberLoading && (
                                <Loader2
                                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                                  aria-label="Loading member"
                                />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 bg-white"
                              disabled={!draftIsMember}
                              onClick={() => {
                                setSearchTarget("nominee")
                                setSearchDialogOpen(true)
                              }}
                            >
                              Find Member
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="draft-nominee-name" className="text-xs">Nominee Name</Label>
                            <Input
                              id="draft-nominee-name"
                              placeholder={detailsLocked ? "Filled from member record" : "Enter nominee name"}
                              value={draftNomineeName}
                              disabled={detailsLocked}
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
                          <div className="space-y-1.5">
                            <Label htmlFor="draft-nominee-dob" className="text-xs">Date of Birth</Label>
                            <Input
                              id="draft-nominee-dob"
                              type="date"
                              value={draftDob}
                              disabled={detailsLocked}
                              max={openingDate || undefined}
                              onChange={(e) => handleDraftDobChange(e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="draft-nominee-gender" className="text-xs">Gender</Label>
                              {detailsLocked ? (
                                <Input id="draft-nominee-gender" value={draftGender} disabled placeholder="—" />
                              ) : (
                                <Select value={draftGender} onValueChange={setDraftGender}>
                                  <SelectTrigger id="draft-nominee-gender">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="draft-nominee-age" className="text-xs">Age</Label>
                              <Input
                                id="draft-nominee-age"
                                type="number"
                                min="0"
                                max="150"
                                step="1"
                                value={draftAge}
                                disabled={detailsLocked || !!draftDob}
                                onChange={(e) => setDraftAge(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="draft-nominee-percentage" className="text-xs">Nominee Percentage (%) *</Label>
                            <Input
                              id="draft-nominee-percentage"
                              type="number"
                              min="0.01"
                              max="100"
                              step="0.01"
                              placeholder="e.g. 50"
                              value={draftPercentage}
                              onChange={(e) => setDraftPercentage(e.target.value)}
                            />
                            {draftPctError && <p className="text-xs text-red-600">{draftPctError}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="draft-nominee-phone" className="text-xs">Phone Number</Label>
                            <Input
                              id="draft-nominee-phone"
                              type="tel"
                              inputMode="numeric"
                              maxLength={15}
                              placeholder={draftAsMember ? "Filled from member record" : "Enter 10-digit phone number"}
                              value={draftPhone}
                              onChange={(e) => setDraftPhone(e.target.value)}
                            />
                            {draftPhoneError && <p className="text-xs text-red-600">{draftPhoneError}</p>}
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="draft-nominee-address" className="text-xs">Address</Label>
                            <Input
                              id="draft-nominee-address"
                              placeholder={detailsLocked ? "Filled from member record" : "Enter nominee address"}
                              value={draftAddress}
                              disabled={detailsLocked}
                              onChange={(e) => setDraftAddress(e.target.value)}
                            />
                          </div>
                        </div>
                        {draftNomineeError && (
                          <p className="text-xs text-red-600">{draftNomineeError}</p>
                        )}
                        {draftIsMember && draftMemberNotFound && (
                          <p className="text-xs text-muted-foreground">
                            Enter the nominee&apos;s details manually — they will be saved as a non-member nominee.
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddNominee}
                          disabled={!draftReady}
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
                    disabled={!memberInfo || !selectedSchemeId || !openingDate || isSubmitting || (needsSecondaryHolder && !secondaryInfo) || !nomineeTotalOk}
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
                {/* Member Summary — shared card and View Member Details popup (bank's perspective) */}
                <MemberSummaryCard memberInfo={memberInfo} />

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
                            {selectedScheme.min_balance ? `${formatCurrency(selectedScheme.min_balance)}` : "---"}
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
                {/* <Card>
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
                        <p className="text-sm font-semibold">{formatDate(openingDate, "---")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Initial Deposit</p>
                        <p className="text-sm font-semibold">
                          {initialDeposit ? `${formatCurrency(initialDeposit)}` : "₹0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Operation Type</p>
                        <p className="text-sm font-semibold">
                          {OPERATION_TYPES.find((op) => op.value === operationType)?.label || "---"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ledger Folio No</p>
                        <p className="text-sm font-mono font-semibold">{ledgerFolioNo || "---"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cheque Required</p>
                        <Badge variant="outline" className={chequeRequired ? "border-teal-300 text-teal-700" : ""}>
                          {chequeRequired ? "Yes" : "No"}
                        </Badge>
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
                </Card> */}
              </div>
            </div>


            {/* Member Search Dialog */}
            <Dialog
              open={searchDialogOpen}
              onOpenChange={(open) => {
                setSearchDialogOpen(open)
                if (!open) setSearchTarget("holder")
              }}
            >
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
                          {/* <TableHead className="text-xs w-20">Action</TableHead> */}
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
                            {/* <TableCell>
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
                            </TableCell> */}
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
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="ring-offset-background focus:ring-ring absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 py-1.5 text-xs font-medium text-foreground opacity-80 transition-opacity hover:bg-accent hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                >
                  <Home className="h-3.5 w-3.5" />
                  Home
                </button>
                <AlertDialogHeader className="pr-24">
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
                    onClick={() => router.push(`/savings/deposit?account=${encodeURIComponent(createdAccountNo)}`)}
                    className="gap-1.5 bg-transparent border border-teal-300 text-teal-700 hover:bg-teal-50"
                  >
                    <Banknote className="h-4 w-4" />
                    Deposit
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
