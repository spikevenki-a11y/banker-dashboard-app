"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
} from "lucide-react"
import { Ledger } from "next/font/google"
import {
  CUSTOMER_IMAGE_ACCEPT,
  CustomerImageFrame,
  uploadCustomerDocument,
  useCustomerDocuments,
} from "@/components/customer-photo-signature"
import {
  MEMBER_EDIT_SECTIONS,
  pickSectionFields,
  validateMemberSection,
  type MemberEditSection,
} from "@/lib/member-profile-validation"

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
  // Additional saved customer details (Create Customer form)
  join_date?: string
  board_resolution_date?: string
  alt_mobile_no?: string
  marital_status?: string
  blood_group?: string
  occupation?: string
  qualification?: string
  qualification_details?: string
  dccb_account_number?: string
  address_email?: string
  permanent_house_no?: string
  permanent_street?: string
  permanent_village?: string
  permanent_thaluk?: string
  permanent_district?: string
  permanent_state?: string
  permanent_pincode?: string
  permanent_phone_no?: string
  ration_card_type?: string
  passport_no?: string
  eb_bill_no?: string
  other_document_name?: string
  other_document_no?: string
}

type NomineeItem = {
  account_number: string
  account_type?: "Membership" | "Savings" | "Deposit"
  nominee_name: string
  nominee_relation: string
  is_member: boolean
  member_id: string | null
  nominee_dob: string | null
  nominee_gender: string | null
  nominee_age: number | null
  nominee_address: string | null
  nominee_percentage: number | null
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
  membership_no: string
  member_name: string
  father_name: string
  spouse_name: string
  phone_number: string
  aadhaar_number: string
  ledger_folio_number: string
}

export default function ViewMemberPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const membershipNoFromParams = searchParams.get("membership_no")
  const { user } = useAuth()
  const [searchFields, setSearchFields] = useState<SearchFields>({
    membership_no: membershipNoFromParams || "",
    member_name: "",
    father_name: "",
    spouse_name: "",
    phone_number: "",
    aadhaar_number: "",
    ledger_folio_number: "",
  })
  const [members, setMembers] = useState<MemberData[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeTab, setActiveTab] = useState<"personal" | "address" | "kyc" | "nominees" | "accounts">("personal")
  const [assets, setAssets] = useState<AccountItem[]>([])
  const [liabilities, setLiabilities] = useState<AccountItem[]>([])
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [nominees, setNominees] = useState<NomineeItem[]>([])
  const [isLoadingNominees, setIsLoadingNominees] = useState(false)
  const [nomineesLoaded, setNomineesLoaded] = useState(false)

  // Photo & signature of the selected member (customer_documents)
  const memberDocs = useCustomerDocuments(selectedMember?.customer_code)
  const [docUploading, setDocUploading] = useState<"PHOTO" | "SIGNATURE" | null>(null)
  const [docMsg, setDocMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleDocUpload = async (type: "PHOTO" | "SIGNATURE", file: File | undefined) => {
    if (!file || !selectedMember || docUploading) return
    setDocUploading(type)
    setDocMsg(null)
    const result = await uploadCustomerDocument(selectedMember.customer_code, type, file)
    if (result.ok) {
      memberDocs.setDocument(result.document)
      setDocMsg({ type: "success", text: result.message })
    } else {
      setDocMsg({ type: "error", text: result.error })
    }
    setDocUploading(null)
  }

  const [editOpen, setEditOpen] = useState(false)
  const [editSection, setEditSection] = useState<MemberEditSection>("personal")
  const [editForm, setEditForm] = useState<any>({})
  // Each tab saves on its own: which tab is saving, and each tab's last result message
  const [savingSection, setSavingSection] = useState<MemberEditSection | null>(null)
  const [sectionMsg, setSectionMsg] = useState<
    Partial<Record<MemberEditSection, { type: "success" | "error"; text: string }>>
  >({})

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
      occupation: member.occupation || "",
      marital_status: member.marital_status || "",
      caste: "",
      // blood_group: "",
      caste_category: member.caste_category || "",
      alt_mobile_no: member.alt_mobile_no || "",
      qualification: member.qualification || "",
      qualification_details: member.qualification_details || "",
      dccb_account_number: member.dccb_account_number || "",
      // address
      house_no: member.house_no || "",
      street: member.street || "",
      village: member.village || "",
      thaluk: member.thaluk || "",
      district: member.district || "",
      state: member.state || "",
      pincode: member.pincode || "",
      phone_no: member.phone_no || "",
      permanent_house_no: member.permanent_house_no || "",
      permanent_street: member.permanent_street || "",
      permanent_village: member.permanent_village || "",
      permanent_thaluk: member.permanent_thaluk || "",
      permanent_district: member.permanent_district || "",
      permanent_state: member.permanent_state || "",
      permanent_pincode: member.permanent_pincode || "",
      permanent_phone_no: member.permanent_phone_no || "",
      // kyc
      pan_no: member.pan_no || "",
      ration_no: member.ration_no || "",
      ration_card_type: member.ration_card_type || "",
      passport_no: member.passport_no || "",
      eb_bill_no: member.eb_bill_no || "",
      other_document_name: member.other_document_name || "",
      other_document_no: member.other_document_no || "",
      driving_license_no: member.driving_license_no || "",
      // membership
      ledger_folio_number: member.ledger_folio_number || "",
      board_resolution_number: member.board_resolution_number || "",
      board_resolution_date: member.board_resolution_date || "",
    })
    setEditSection("personal")
    setSavingSection(null)
    setSectionMsg({})
    setDocMsg(null)
    setEditOpen(true)
  }

  const ef = (key: string, value: string) => {
    setEditForm((prev: any) => ({ ...prev, [key]: value }))
    // Editing a field clears that tab's previous success/error message
    const owner = (Object.keys(MEMBER_EDIT_SECTIONS) as MemberEditSection[]).find((s) =>
      MEMBER_EDIT_SECTIONS[s].fields.includes(key)
    )
    if (owner) setSectionMsg((prev) => (prev[owner] ? { ...prev, [owner]: undefined } : prev))
  }

  // Saves only the fields of one Edit Member tab
  const handleSectionSave = async (section: MemberEditSection) => {
    if (!selectedMember || savingSection) return
    const data = pickSectionFields(section, editForm)
    if (section === "kyc") {
      data.pan_no = data.pan_no.toUpperCase()
      data.passport_no = data.passport_no.toUpperCase()
    }

    const validationError = validateMemberSection(section, data)
    if (validationError) {
      setSectionMsg((prev) => ({ ...prev, [section]: { type: "error", text: validationError } }))
      return
    }

    setSavingSection(section)
    setSectionMsg((prev) => ({ ...prev, [section]: undefined }))
    try {
      const res = await fetch("/api/members/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: selectedMember.membership_no, section, data }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || `Failed to update ${MEMBER_EDIT_SECTIONS[section].label.toLowerCase()}.`)

      // Reflect this tab's saved values locally (field keys match MemberData)
      setEditForm((prev: any) => ({ ...prev, ...data }))
      setSelectedMember((prev) => (prev ? { ...prev, ...data } : prev))
      setMembers((prev) =>
        prev.map((m) => (m.membership_no === selectedMember.membership_no ? { ...m, ...data } : m))
      )
      setSectionMsg((prev) => ({
        ...prev,
        [section]: { type: "success", text: result.message || `${MEMBER_EDIT_SECTIONS[section].label} updated successfully.` },
      }))
    } catch (err: any) {
      setSectionMsg((prev) => ({
        ...prev,
        [section]: { type: "error", text: err?.message || "Update failed. Please try again." },
      }))
    } finally {
      setSavingSection(null)
    }
  }

  const handleSearch = async () => {
    setIsSearching(true)
    setHasSearched(true)
    setSelectedMember(null)
    setPage(1)
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

  // Auto-load a member when arriving with ?membership_no= (e.g. from Savings > View Account)
  useEffect(() => {
    if (!membershipNoFromParams) return

    const loadMemberByMembershipNo = async (no: string) => {
      setIsSearching(true)
      setHasSearched(true)
      setSelectedMember(null)
      setPage(1)
      try {
        const res = await fetch("/api/memberships/view_member", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membership_no: no,
            member_name: "",
            father_name: "",
            spouse_name: "",
            phone_number: "",
            aadhaar_number: "",
            ledger_folio_number: "",
          }),
        })
        const data = await res.json()
        if (res.ok && data.found && data.memberData) {
          setMembers(data.memberData)
          if (data.memberData.length === 1) {
            setSelectedMember(data.memberData[0])
          }
        } else {
          setMembers([])
        }
      } catch {
        setMembers([])
      } finally {
        setIsSearching(false)
      }
    }

    loadMemberByMembershipNo(membershipNoFromParams)
  }, [membershipNoFromParams])

  const totalPages = Math.max(1, Math.ceil(members.length / pageSize))
  const paginatedMembers = members.slice((page - 1) * pageSize, page * pageSize)

  const handleSelectMember = (member: MemberData) => {
    setSelectedMember(member)
    setAccountsLoaded(false)
    setAssets([])
    setLiabilities([])
    setAccountSummary(null)
    setNomineesLoaded(false)
    setNominees([])
  }

  const fetchMemberNominees = async (membershipNo: string) => {
    setIsLoadingNominees(true)
    try {
      const res = await fetch(`/api/members/nominees?membership_no=${encodeURIComponent(membershipNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      setNominees(data.success ? data.nominees || [] : [])
    } catch {
      setNominees([])
    } finally {
      setIsLoadingNominees(false)
      setNomineesLoaded(true)
    }
  }

  useEffect(() => {
    if (activeTab === "nominees" && selectedMember && !nomineesLoaded) {
      fetchMemberNominees(selectedMember.membership_no)
    }
  }, [activeTab, selectedMember, nomineesLoaded])

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

  const buildPermanentAddress = (m: MemberData) => {
    const parts = [
      m.permanent_house_no, m.permanent_street, m.permanent_village,
      m.permanent_thaluk, m.permanent_district, m.permanent_state,
    ].filter(Boolean)
    const address = parts.join(", ")
    return m.permanent_pincode ? `${address} - ${m.permanent_pincode}` : address || "---"
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
              {/* Search and view member details */}
              Search, View and Modify Member details
            </p>
          </div>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader className="">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Search Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Membership No.</Label>
                <Input
                  placeholder="Enter membership no."
                  value={searchFields.membership_no}
                  onChange={(e) => setSearchFields({ ...searchFields, membership_no: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
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
                <Label className="text-xs font-medium text-muted-foreground">Spouse Name</Label>
                <Input
                  placeholder="Enter spouse name"
                  value={searchFields.spouse_name}
                  onChange={(e) => setSearchFields({ ...searchFields, spouse_name: e.target.value })}
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
              {/* <div className="space-y-1.5"></div>
              <div className="space-y-1.5"></div>
              <div className="space-y-1.5"></div> */}
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
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
                 <div className="flex min-w-0 flex-1 items-start gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-xl font-semibold text-foreground">{selectedMember.full_name}</h2>
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

                  {/* Photo & Signature */}
                  <div className="flex shrink-0 flex-wrap items-end gap-4 border-t pt-4 md:border-t-0 md:border-l md:pl-6 md:pt-0">
                    <CustomerImageFrame kind="photo" doc={memberDocs.docs.photo} loading={memberDocs.loading} />
                    <CustomerImageFrame kind="signature" doc={memberDocs.docs.signature} loading={memberDocs.loading} />
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
                <div className="flex gap-1 overflow-x-auto border-b">
                  {(
                    [
                      { key: "personal", label: "Personal Details", icon: User },
                      { key: "address", label: "Address", icon: MapPin },
                      { key: "kyc", label: "KYC Details", icon: Shield },
                      { key: "nominees", label: "Nominees", icon: Users },
                      { key: "accounts", label: "Assets & Liabilities", icon: Wallet },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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
                  <div className="space-y-6">
                    <DetailSection title="Personal Information">
                      <DetailField icon={User} label="Full Name" value={selectedMember.full_name} />
                      <DetailField icon={Users} label="Father Name" value={selectedMember.father_name} />
                      <DetailField icon={Users} label="Spouse Name" value={selectedMember.spouse_name} />
                      <DetailField icon={Calendar} label="Date of Birth" value={selectedMember.date_of_birth} />
                      <DetailField icon={Calendar} label="Age" value={calcAge(selectedMember.date_of_birth)} />
                      <DetailField icon={User} label="Gender" value={selectedMember.gender} capitalize />
                      <DetailField icon={Users} label="Marital Status" value={selectedMember.marital_status} capitalize />
                      <DetailField icon={Book} label="Caste Category" value={selectedMember.caste_category} />
                      <DetailField icon={User} label="Customer Type" value={selectedMember.customer_type} capitalize />
                      <DetailField icon={Hash} label="Customer Code" value={selectedMember.customer_code?.trim()} mono />
                    </DetailSection>

                    <DetailSection title="Occupation & Education">
                      <DetailField icon={Building2} label="Occupation" value={selectedMember.occupation} capitalize />
                      <DetailField icon={Book} label="Qualification" value={selectedMember.qualification} />
                      <DetailField icon={FileText} label="Qualification Details" value={selectedMember.qualification_details} />
                      <DetailField icon={Landmark} label="DCCB Account Number" value={selectedMember.dccb_account_number} mono />
                    </DetailSection>

                    <DetailSection title="Contact Details">
                      <DetailField icon={Phone} label="Mobile" value={selectedMember.mobile_no || selectedMember.phone_no} />
                      <DetailField icon={Phone} label="Alternate Mobile" value={selectedMember.alt_mobile_no} />
                      <DetailField icon={Mail} label="Email" value={selectedMember.email || selectedMember.address_email} />
                    </DetailSection>

                    <DetailSection title="Membership Details">
                      <DetailField icon={Hash} label="Membership No." value={selectedMember.membership_no} mono />
                      <DetailField icon={Building2} label="Membership Class" value={selectedMember.membership_class} />
                      <DetailField icon={User} label="Member Type" value={selectedMember.member_type} capitalize />
                      <DetailField icon={CheckCircle2} label="Status" value={selectedMember.status} />
                      <DetailField icon={Calendar} label="Join Date" value={selectedMember.join_date} />
                      <DetailField icon={Book} label="Ledger Folio No." value={selectedMember.ledger_folio_number} mono />
                      <DetailField icon={FileText} label="Board Resolution No." value={selectedMember.board_resolution_number} />
                      <DetailField icon={Calendar} label="Board Resolution Date" value={selectedMember.board_resolution_date} />
                    </DetailSection>
                  </div>
                )}

                {activeTab === "address" && (
                  <div className="space-y-6">
                    <DetailSection title="Current Address">
                      <DetailField icon={MapPin} label="House No." value={selectedMember.house_no} />
                      <DetailField icon={MapPin} label="Street" value={selectedMember.street} />
                      <DetailField icon={MapPin} label="Revenue Village" value={selectedMember.village} />
                      <DetailField icon={MapPin} label="Taluk" value={selectedMember.thaluk} />
                      <DetailField icon={MapPin} label="District" value={selectedMember.district} />
                      <DetailField icon={MapPin} label="State" value={selectedMember.state} />
                      <DetailField icon={Hash} label="Pincode" value={selectedMember.pincode} />
                      <DetailField icon={Phone} label="Phone" value={selectedMember.phone_no} />
                    </DetailSection>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Full Current Address</p>
                      <p className="mt-1 text-sm text-foreground">{buildAddress(selectedMember)}</p>
                    </div>

                    <DetailSection title="Permanent Address">
                      <DetailField icon={MapPin} label="House No." value={selectedMember.permanent_house_no} />
                      <DetailField icon={MapPin} label="Street" value={selectedMember.permanent_street} />
                      <DetailField icon={MapPin} label="Revenue Village" value={selectedMember.permanent_village} />
                      <DetailField icon={MapPin} label="Taluk" value={selectedMember.permanent_thaluk} />
                      <DetailField icon={MapPin} label="District" value={selectedMember.permanent_district} />
                      <DetailField icon={MapPin} label="State" value={selectedMember.permanent_state} />
                      <DetailField icon={Hash} label="Pincode" value={selectedMember.permanent_pincode} />
                      <DetailField icon={Phone} label="Phone" value={selectedMember.permanent_phone_no} />
                    </DetailSection>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Full Permanent Address</p>
                      <p className="mt-1 text-sm text-foreground">{buildPermanentAddress(selectedMember)}</p>
                    </div>
                  </div>
                )}

                {activeTab === "kyc" && (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField icon={CreditCard} label="Aadhaar No." value={formatAadhaar(selectedMember.aadhaar_no)} mono />
                    <DetailField icon={CreditCard} label="PAN No." value={selectedMember.pan_no} mono />
                    <DetailField icon={FileText} label="Ration No." value={selectedMember.ration_no} />
                    <DetailField icon={FileText} label="Ration Card Type" value={selectedMember.ration_card_type} />
                    <DetailField icon={CreditCard} label="Driving License No." value={selectedMember.driving_license_no} />
                    <DetailField icon={CreditCard} label="Passport No." value={selectedMember.passport_no} mono />
                    <DetailField icon={FileText} label="EB Bill No." value={selectedMember.eb_bill_no} />
                    <DetailField
                      icon={FileText}
                      label={selectedMember.other_document_name ? `Others (${selectedMember.other_document_name})` : "Others"}
                      value={selectedMember.other_document_no}
                    />
                  </div>
                )}

                {activeTab === "nominees" && (
                  <div className="space-y-4">
                    {isLoadingNominees ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : nominees.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                        <Users className="mb-2 h-8 w-8 opacity-20" />
                        <p className="text-sm">No nominees registered for this member&apos;s accounts.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs">Account No.</TableHead>
                              <TableHead className="text-xs">Nominee Name</TableHead>
                              <TableHead className="text-xs">Relation</TableHead>
                              <TableHead className="text-xs">Date of Birth</TableHead>
                              <TableHead className="text-xs">Age</TableHead>
                              <TableHead className="text-xs">Gender</TableHead>
                              <TableHead className="text-xs">Member</TableHead>
                              <TableHead className="text-xs">Address</TableHead>
                              <TableHead className="text-xs text-right">Share %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nominees.map((n, i) => (
                              <TableRow key={`${n.account_number}-${i}`}>
                                <TableCell className="text-xs">
                                  <p className="font-mono">{n.account_number}</p>
                                  {n.account_type && <p className="text-muted-foreground">{n.account_type}</p>}
                                </TableCell>
                                <TableCell className="text-xs font-medium">{n.nominee_name || "---"}</TableCell>
                                <TableCell className="text-xs capitalize">{n.nominee_relation || "---"}</TableCell>
                                <TableCell className="text-xs">{n.nominee_dob || "---"}</TableCell>
                                <TableCell className="text-xs">{n.nominee_age ?? "---"}</TableCell>
                                <TableCell className="text-xs capitalize">{n.nominee_gender || "---"}</TableCell>
                                <TableCell className="text-xs">
                                  {n.is_member ? `Yes${n.member_id ? ` (${n.member_id})` : ""}` : "No"}
                                </TableCell>
                                <TableCell className="max-w-[220px] text-xs">{n.nominee_address || "---"}</TableCell>
                                <TableCell className="text-right text-xs">
                                  {n.nominee_percentage != null ? `${n.nominee_percentage}%` : "---"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
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
                                    <TableHead className="text-right font-semibold">Action</TableHead>
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
                                      <TableCell className="text-sm text-muted-foreground">
                                        {acc.scheme_name}
                                        {acc.interest_rate > 0 && <span className="text-xs"> · {acc.interest_rate}% p.a.</span>}
                                        {acc.extra?.maturity_date && (
                                          <div className="text-xs">
                                            Matures {fmtDay(acc.extra.maturity_date)}
                                            {acc.extra.maturity_amount ? ` · ${fmtInr(acc.extra.maturity_amount)}` : ""}
                                          </div>
                                        )}
                                        {acc.extra?.total_installments != null && (
                                          <div className="text-xs">
                                            {acc.extra.paid_installments || 0}/{acc.extra.total_installments} installments paid
                                          </div>
                                        )}
                                      </TableCell>
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
                                          className={statusBadgeClass(acc.status, "asset")}
                                        >
                                          {acc.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {accountViewHref(acc) && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 gap-1 px-2 text-xs"
                                            onClick={() => router.push(accountViewHref(acc)!)}
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                          </Button>
                                        )}
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
                                    <TableHead className="font-semibold">Disbursed On</TableHead>
                                    <TableHead className="text-right font-semibold">Outstanding</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Action</TableHead>
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
                                      <TableCell className="font-mono text-sm">
                                        {acc.account_number}
                                        {acc.extra?.reference_no && (
                                          <div className="text-[10px] text-muted-foreground">Ref {acc.extra.reference_no}</div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {acc.scheme_name}
                                        {acc.interest_rate > 0 && <span className="text-xs"> · {acc.interest_rate}% p.a.</span>}
                                        {acc.extra && (
                                          <div className="text-xs">
                                            Sanctioned {fmtInr(acc.extra.sanctioned_amount)}
                                            {acc.extra.emi_amount ? ` · EMI ${fmtInr(acc.extra.emi_amount)}` : ""}
                                          </div>
                                        )}
                                        {acc.status !== "CLOSED" && acc.extra?.next_due_date && (
                                          <div className="text-xs">Next due {fmtDay(acc.extra.next_due_date)}</div>
                                        )}
                                        {Number(acc.extra?.overdue_installments) > 0 && (
                                          <div className="text-xs font-medium text-red-600">
                                            {acc.extra?.overdue_installments} overdue installment{Number(acc.extra?.overdue_installments) > 1 ? "s" : ""}
                                          </div>
                                        )}
                                      </TableCell>
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
                                          className={statusBadgeClass(acc.status, "liability")}
                                        >
                                          {acc.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {accountViewHref(acc) && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 gap-1 px-2 text-xs"
                                            onClick={() => router.push(accountViewHref(acc)!)}
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            View
                                          </Button>
                                        )}
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
                        <TableHead className="font-semibold">Ledger No</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Father Name</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Aadhaar</TableHead>
                        <TableHead className="font-semibold">Class</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        {/* <TableHead className="text-right font-semibold">Action</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member, idx) => (
                        <TableRow
                          key={`${member.membership_no}-${idx}`}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSelectMember(member)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {member.membership_no}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {member.ledger_folio_number?.trim() || "---"}
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
                          {/* <TableCell className="text-right">
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
                          </TableCell> */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t pt-4 mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Rows per page:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPageSize(Number(v))
                          setPage(1)
                        }}
                      >
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="ml-2">
                        {members.length === 0
                          ? "No records"
                          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, members.length)} of ${members.length}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-3 text-sm">Page {page} of {totalPages}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
        <DialogContent className="flex h-[min(720px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 shrink-0" />
              Edit Member — {selectedMember?.membership_no}
            </DialogTitle>
          </DialogHeader>

          {/* Section tabs */}
          <div className="mx-6 flex shrink-0 gap-1 overflow-x-auto border-b">
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
                className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
            {editSection === "personal" && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo &amp; Signature</p>
                  <div className="flex flex-wrap items-end gap-6">
                    {(
                      [
                        { type: "PHOTO", kind: "photo", doc: memberDocs.docs.photo },
                        { type: "SIGNATURE", kind: "signature", doc: memberDocs.docs.signature },
                      ] as const
                    ).map(({ type, kind, doc }) => (
                      <div key={type} className="flex flex-col items-center gap-2">
                        <CustomerImageFrame kind={kind} doc={doc} loading={memberDocs.loading} />
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs" disabled={docUploading !== null}>
                          <label className={docUploading !== null ? "pointer-events-none opacity-50" : "cursor-pointer"}>
                            {docUploading === type ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
                            {docUploading === type ? "Uploading..." : doc ? "Replace" : "Upload"}
                            <input
                              type="file"
                              accept={CUSTOMER_IMAGE_ACCEPT}
                              hidden
                              onChange={(e) => {
                                handleDocUpload(type, e.target.files?.[0])
                                e.target.value = ""
                              }}
                            />
                          </label>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP, up to 2 MB. Uploads are saved immediately.</p>
                  {docMsg && (
                    <p
                      role={docMsg.type === "error" ? "alert" : "status"}
                      className={`flex items-start gap-1.5 text-sm ${docMsg.type === "success" ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {docMsg.type === "success" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      {docMsg.text}
                    </p>
                  )}
                </div>

                <EditGroup title="Personal Information">
                  <EditInput label="Full Name *" k="full_name" form={editForm} onChange={ef} />
                  <EditInput label="Father Name" k="father_name" form={editForm} onChange={ef} />
                  <EditInput label="Spouse Name" k="spouse_name" form={editForm} onChange={ef} />
                  <EditInput label="Date of Birth" k="date_of_birth" type="date" form={editForm} onChange={ef} />
                  <EditSelect
                    label="Gender" k="gender" form={editForm} onChange={ef}
                    options={[["male", "Male"], ["female", "Female"], ["others", "Others"]]}
                  />
                  <EditSelect
                    label="Marital Status" k="marital_status" form={editForm} onChange={ef}
                    options={[["single", "Single"], ["married", "Married"], ["divorced", "Divorced"], ["widowed", "Widowed"]]}
                  />
                  <EditSelect
                    label="Caste Category" k="caste_category" form={editForm} onChange={ef}
                    options={CASTE_CATEGORY_OPTIONS}
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer Type</Label>
                    <Input value={selectedMember?.customer_type || "---"} disabled className="bg-muted/50 capitalize" />
                  </div>
                </EditGroup>

                <EditGroup title="Occupation & Education">
                  <EditSelect label="Occupation" k="occupation" form={editForm} onChange={ef} options={OCCUPATION_OPTIONS} />
                  <EditSelect label="Qualification" k="qualification" form={editForm} onChange={ef} options={QUALIFICATION_OPTIONS} />
                  <EditInput label="Qualification Details" k="qualification_details" form={editForm} onChange={ef} />
                  <EditInput label="DCCB Account Number" k="dccb_account_number" form={editForm} onChange={ef} />
                </EditGroup>

                <EditGroup title="Contact Details">
                  <EditInput label="Mobile No" k="mobile_no" form={editForm} onChange={ef} digits={10} />
                  <EditInput label="Alternate Mobile" k="alt_mobile_no" form={editForm} onChange={ef} digits={10} />
                  <EditInput label="Email" k="email" type="email" form={editForm} onChange={ef} />
                </EditGroup>
              </div>
            )}

            {editSection === "address" && (
              <div className="space-y-5">
                <EditGroup title="Current Address">
                  <EditInput label="House No" k="house_no" form={editForm} onChange={ef} />
                  <EditInput label="Street" k="street" form={editForm} onChange={ef} />
                  <EditInput label="Revenue Village" k="village" form={editForm} onChange={ef} />
                  <EditInput label="Taluk" k="thaluk" form={editForm} onChange={ef} />
                  <EditInput label="District" k="district" form={editForm} onChange={ef} />
                  <EditInput label="State" k="state" form={editForm} onChange={ef} />
                  <EditInput label="Pincode" k="pincode" form={editForm} onChange={ef} digits={6} />
                  <EditInput label="Phone No" k="phone_no" form={editForm} onChange={ef} digits={10} />
                </EditGroup>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permanent Address</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setEditForm((prev: any) => ({
                          ...prev,
                          permanent_house_no: prev.house_no,
                          permanent_street: prev.street,
                          permanent_village: prev.village,
                          permanent_thaluk: prev.thaluk,
                          permanent_district: prev.district,
                          permanent_state: prev.state,
                          permanent_pincode: prev.pincode,
                          permanent_phone_no: prev.phone_no,
                        }))
                      }
                    >
                      Copy from Current Address
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <EditInput label="House No" k="permanent_house_no" form={editForm} onChange={ef} />
                    <EditInput label="Street" k="permanent_street" form={editForm} onChange={ef} />
                    <EditInput label="Revenue Village" k="permanent_village" form={editForm} onChange={ef} />
                    <EditInput label="Taluk" k="permanent_thaluk" form={editForm} onChange={ef} />
                    <EditInput label="District" k="permanent_district" form={editForm} onChange={ef} />
                    <EditInput label="State" k="permanent_state" form={editForm} onChange={ef} />
                    <EditInput label="Pincode" k="permanent_pincode" form={editForm} onChange={ef} digits={6} />
                    <EditInput label="Phone No" k="permanent_phone_no" form={editForm} onChange={ef} digits={10} />
                  </div>
                </div>
              </div>
            )}

            {editSection === "kyc" && (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Aadhaar number cannot be modified after enrollment.
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <EditInput label="Ration Card No" k="ration_no" form={editForm} onChange={ef} />
                  <EditSelect
                    label="Ration Card Type" k="ration_card_type" form={editForm} onChange={ef}
                    options={RATION_CARD_TYPE_OPTIONS}
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Driving License No</Label>
                    <Input
                      className="uppercase"
                      value={editForm.driving_license_no}
                      onChange={(e) => ef("driving_license_no", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Passport No</Label>
                    <Input
                      className="font-mono uppercase"
                      maxLength={8}
                      placeholder="e.g. A1234567"
                      value={editForm.passport_no}
                      onChange={(e) => ef("passport_no", e.target.value.toUpperCase())}
                    />
                  </div>
                  <EditInput label="EB Bill No" k="eb_bill_no" form={editForm} onChange={ef} />
                  <EditInput label="Others — Document Name" k="other_document_name" form={editForm} onChange={ef} />
                  <EditInput label="Others — Document No" k="other_document_no" form={editForm} onChange={ef} />
                </div>
              </div>
            )}

            {editSection === "membership" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Membership No</Label>
                  <Input value={selectedMember?.membership_no || ""} disabled className="font-mono bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Membership Class</Label>
                  <Input value={selectedMember?.membership_class || ""} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Member Type</Label>
                  <Input value={selectedMember?.member_type || ""} disabled className="bg-muted/50 capitalize" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Join Date</Label>
                  <Input value={selectedMember?.join_date || ""} disabled className="bg-muted/50" />
                </div>
                <EditInput label="Ledger Folio No" k="ledger_folio_number" form={editForm} onChange={ef} />
                <EditInput label="Board Resolution No" k="board_resolution_number" form={editForm} onChange={ef} />
                <EditInput label="Board Resolution Date" k="board_resolution_date" type="date" form={editForm} onChange={ef} />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-3 border-t bg-background px-6 py-3 sm:flex-col sm:justify-start">
            {sectionMsg[editSection] && (
              <span
                role={sectionMsg[editSection]!.type === "error" ? "alert" : "status"}
                className={`flex items-start gap-1.5 text-sm ${
                  sectionMsg[editSection]!.type === "success" ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {sectionMsg[editSection]!.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                {sectionMsg[editSection]!.text}
              </span>
            )}
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditSection(EDIT_TAB_ORDER[EDIT_TAB_ORDER.indexOf(editSection) - 1])}
                  disabled={savingSection !== null || EDIT_TAB_ORDER.indexOf(editSection) === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditSection(EDIT_TAB_ORDER[EDIT_TAB_ORDER.indexOf(editSection) + 1])}
                  disabled={savingSection !== null || EDIT_TAB_ORDER.indexOf(editSection) === EDIT_TAB_ORDER.length - 1}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingSection !== null}>
                  Close
                </Button>
                <Button
                  onClick={() => handleSectionSave(editSection)}
                  disabled={savingSection !== null}
                  className="gap-2"
                >
                  {savingSection === editSection ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {savingSection === editSection ? "Updating..." : `Update ${MEMBER_EDIT_SECTIONS[editSection].label}`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}

/* Edit Member tab order, used by the Prev / Next buttons */
const EDIT_TAB_ORDER: MemberEditSection[] = ["personal", "address", "kyc", "membership"]

/* ── Edit Member form helpers (options match the Create Customer form) ── */
const CASTE_CATEGORY_OPTIONS = ["General", "BC", "DNC", "MBC", "OC", "SC", "ST", "N/A"]
const OCCUPATION_OPTIONS = [
  "Farmer", "Cooperative", "Goverment/Public Sector", "Salaried", "Professional",
  "Self Employed / Business", "Student", "Retired", "Others", "N/A",
]
const QUALIFICATION_OPTIONS = [
  "No Formal Education", "Higher Secondery", "SSLC", "Diploma /ITI", "Graduate",
  "Post graduate", "Professional / Doctoral", "Others",
]
const RATION_CARD_TYPE_OPTIONS = ["PHH", "NPHH", "NPHH-S", "NPHH-NC", "PHH AAY", "Others"]

type EditFormProps = { k: string; form: Record<string, string>; onChange: (k: string, v: string) => void }

function EditGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function EditInput({
  label, k, form, onChange, type = "text", digits,
}: EditFormProps & { label: string; type?: string; digits?: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        inputMode={digits ? "numeric" : undefined}
        maxLength={digits}
        value={form[k] ?? ""}
        onChange={(e) => onChange(k, digits ? e.target.value.replace(/\D/g, "") : e.target.value)}
      />
    </div>
  )
}

function EditSelect({
  label, k, form, onChange, options,
}: EditFormProps & { label: string; options: (string | [string, string])[] }) {
  const items = options.map((o) => (Array.isArray(o) ? o : [o, o])) as [string, string][]
  const current = form[k] ?? ""
  // Keep a saved value visible even if it isn't one of the standard options
  if (current && !items.some(([value]) => value === current)) items.unshift([current, current])
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={current} onValueChange={(val) => onChange(k, val)}>
        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>
          {items.map(([value, text]) => (
            <SelectItem key={value} value={value}>{text}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* Titled group of detail fields, same grid as the original tabs */
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}

/* Age in whole years from a YYYY-MM-DD date of birth */
function calcAge(dob?: string | null): string {
  if (!dob) return ""
  const d = new Date(dob)
  if (isNaN(d.getTime())) return ""
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 ? String(age) : ""
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
// Screen that shows an account's full details (none for share capital)
function accountViewHref(acc: { account_type: string; account_number: string }): string | null {
  const no = encodeURIComponent(acc.account_number)
  switch (acc.account_type) {
    case "Savings":
      return `/savings/view_account?account=${no}`
    case "Term Deposit":
    case "Recurring Deposit":
    case "Pigmy Deposit":
      return `/fixed-deposits/view?account=${no}`
    case "Loan":
      return `/loans/${no}`
    default:
      return null
  }
}

const fmtInr = (n: number | null | undefined) =>
  Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })

const fmtDay = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "---"

// Status badge colours shared by both tables
function statusBadgeClass(status: string, side: "asset" | "liability") {
  const s = String(status || "").toUpperCase()
  if (s === "ACTIVE") {
    return side === "asset"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]"
      : "bg-red-100 text-red-700 border-red-200 text-[10px]"
  }
  if (s === "OVERDUE") return "bg-red-600 text-white border-red-700 text-[10px]"
  if (s === "MATURITY" || s === "MATURED") return "bg-orange-100 text-orange-700 border-orange-200 text-[10px]"
  return "text-[10px]"
}

function AccountTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Loan":
      return <CreditCard className="h-4 w-4 text-red-500" />
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
