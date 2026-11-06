"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
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
  Wallet,
  Loader2,
  PiggyBank,
  Landmark,
  TrendingUp,
  TrendingDown,
  Banknote,
  Book,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { CustomerImageFrame, useCustomerDocuments } from "@/components/customer-photo-signature"

/**
 * Shape of a member record as returned by /api/memberships/view_member.
 * Callers may pass a partial object — missing fields render as "---".
 */
export type ViewMemberData = {
  membership_no: string
  full_name: string
  father_name?: string | null
  spouse_name?: string | null
  gender?: string | null
  date_of_birth?: string | null
  mobile_no?: string | null
  phone_no?: string | null
  email?: string | null
  customer_type?: string | null
  member_type?: string | null
  membership_class?: string | null
  ledger_folio_number?: string | null
  board_resolution_number?: string | null
  boardresolutiondate?: string | null
  status?: string | null
  caste_category?: string | null
  house_no?: string | null
  street?: string | null
  village?: string | null
  thaluk?: string | null
  district?: string | null
  state?: string | null
  pincode?: string | null
  aadhaar_no?: string | null
  pan_no?: string | null
  ration_no?: string | null
  driving_license_no?: string | null
  customer_code?: string | null
  join_date?: string | null
  board_resolution_date?: string | null
  alt_mobile_no?: string | null
  marital_status?: string | null
  occupation?: string | null
  qualification?: string | null
  qualification_details?: string | null
  dccb_account_number?: string | null
  address_email?: string | null
  permanent_house_no?: string | null
  permanent_street?: string | null
  permanent_village?: string | null
  permanent_thaluk?: string | null
  permanent_district?: string | null
  permanent_state?: string | null
  permanent_pincode?: string | null
  permanent_phone_no?: string | null
  ration_card_type?: string | null
  passport_no?: string | null
  eb_bill_no?: string | null
  other_document_name?: string | null
  other_document_no?: string | null
  [key: string]: unknown
}

type NomineeItem = {
  account_number: string
  account_type?: string
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
}

type AccountSummary = {
  total_assets: number
  total_liabilities: number
  net_worth: number
  total_accounts: number
}

type TabKey = "personal" | "address" | "kyc" | "nominees" | "accounts"

export type ViewMemberPopupProps = {
  /** Whether the popup is open. Controlled by the calling module. */
  open: boolean
  /** Called when the popup should open/close (Close button, overlay click, Esc). */
  onOpenChange: (open: boolean) => void
  /**
   * Member data to display. Pass this when the calling module already has
   * the member record on hand — the popup will render it as-is with no fetch.
   */
  member?: ViewMemberData | null
  /**
   * Membership number to look up. Pass this when the calling module only has
   * an identifier (e.g. a table row) — the popup fetches the details itself
   * from /api/memberships/view_member. Ignored if `member` is also provided.
   */
  membershipNo?: string
}

/**
 * Reusable, self-contained popup for viewing a member's details.
 * Any screen can open it by rendering <ViewMemberPopup open onOpenChange member=... />
 * (or membershipNo=... to have it fetch the record). It owns no screen-level
 * state (search, results, pagination) — those remain the caller's responsibility.
 */
export function ViewMemberPopup({ open, onOpenChange, member: memberProp, membershipNo }: ViewMemberPopupProps) {
  const [member, setMember] = useState<ViewMemberData | null>(memberProp ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("personal")

  const [assets, setAssets] = useState<AccountItem[]>([])
  const [liabilities, setLiabilities] = useState<AccountItem[]>([])
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null)
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [accountsLoaded, setAccountsLoaded] = useState(false)

  const [nominees, setNominees] = useState<NomineeItem[]>([])
  const [isLoadingNominees, setIsLoadingNominees] = useState(false)
  const [nomineesLoaded, setNomineesLoaded] = useState(false)

  const memberDocs = useCustomerDocuments(open ? (member?.customer_code as string | undefined) : undefined)

  useEffect(() => {
    if (!open) return
    setActiveTab("personal")
    setAccountsLoaded(false)
    setAssets([])
    setLiabilities([])
    setAccountSummary(null)
    setNomineesLoaded(false)
    setNominees([])
    setLoadError("")

    if (memberProp) {
      setMember(memberProp)
      return
    }

    if (membershipNo) {
      setMember(null)
      setIsLoading(true)
      fetch("/api/memberships/view_member", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: membershipNo }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.found && data.memberData?.length) {
            setMember(data.memberData[0])
          } else {
            setLoadError("Member not found")
          }
        })
        .catch(() => setLoadError("Failed to load member details"))
        .finally(() => setIsLoading(false))
    } else {
      setMember(null)
      setLoadError("No member information provided")
    }
  }, [open, membershipNo, memberProp])

  useEffect(() => {
    if (activeTab !== "accounts" || !member?.membership_no || accountsLoaded) return
    setIsLoadingAccounts(true)
    fetch(`/api/members/accounts?membership_no=${encodeURIComponent(member.membership_no)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // The API reports from the member's side; this popup shows the bank's side:
          //   bank assets      = member's loans (outstanding balances owed to the bank)
          //   bank liabilities = member's savings, deposits and shares (held by the bank)
          setAssets(data.liabilities || [])
          setLiabilities(data.assets || [])
          const s = data.summary
          setAccountSummary(
            s
              ? {
                  ...s,
                  total_assets: s.total_liabilities,
                  total_liabilities: s.total_assets,
                  net_worth: Math.round((s.total_liabilities - s.total_assets) * 100) / 100,
                }
              : null
          )
        }
      })
      .catch(() => {
        setAssets([])
        setLiabilities([])
      })
      .finally(() => {
        setIsLoadingAccounts(false)
        setAccountsLoaded(true)
      })
  }, [activeTab, member, accountsLoaded])

  useEffect(() => {
    if (activeTab !== "nominees" || !member?.membership_no || nomineesLoaded) return
    setIsLoadingNominees(true)
    fetch(`/api/members/nominees?membership_no=${encodeURIComponent(member.membership_no)}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setNominees(data.success ? data.nominees || [] : []))
      .catch(() => setNominees([]))
      .finally(() => {
        setIsLoadingNominees(false)
        setNomineesLoaded(true)
      })
  }, [activeTab, member, nomineesLoaded])

  const formatAadhaar = (val?: string | null) => {
    if (!val) return "---"
    return `${val.slice(0, 4)} ${val.slice(4, 8)} ${val.slice(8)}`
  }

  const buildAddress = (m: ViewMemberData) => {
    const parts = [m.house_no, m.street, m.village, m.thaluk, m.district, m.state].filter(Boolean)
    const address = parts.join(", ")
    return m.pincode ? `${address} - ${m.pincode}` : address || "---"
  }

  const buildPermanentAddress = (m: ViewMemberData) => {
    const parts = [
      m.permanent_house_no, m.permanent_street, m.permanent_village,
      m.permanent_thaluk, m.permanent_district, m.permanent_state,
    ].filter(Boolean)
    const address = parts.join(", ")
    return m.permanent_pincode ? `${address} - ${m.permanent_pincode}` : address || "---"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Member Details
          </DialogTitle>
          <DialogDescription>
            {member ? `Membership No. ${member.membership_no}` : "View member information"}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading member details...</span>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">{loadError}</p>
            </div>
          ) : member ? (
            <div className="space-y-6">
              {/* Summary header */}
              <div className="rounded-xl border border-l-4 border-l-primary p-4 sm:p-5">
                <div className="flex flex-col items-start gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-semibold text-foreground">{member.full_name || "---"}</h2>
                      <p className="text-sm text-muted-foreground">S/o D/o {member.father_name || "---"}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5" />
                          {member.membership_no || "---"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {member.phone_no || member.mobile_no || "---"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {member.email || member.address_email || "---"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-end gap-3">
                    <CustomerImageFrame kind="photo" doc={memberDocs.docs.photo} loading={memberDocs.loading} />
                    <CustomerImageFrame kind="signature" doc={memberDocs.docs.signature} loading={memberDocs.loading} />
                  </div>
                  <Badge
                    variant={member.status?.toUpperCase() === "ACTIVE" ? "default" : "secondary"}
                    className={
                      member.status?.toUpperCase() === "ACTIVE"
                        ? "shrink-0 border-emerald-200 bg-emerald-100 text-emerald-700"
                        : "shrink-0 bg-gray-100 text-gray-600"
                    }
                  >
                    {member.status || "---"}
                  </Badge>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Customer Type" value={member.customer_type} capitalize />
                <StatTile label="Member Type" value={member.member_type} capitalize />
                <StatTile label="Ledger Folio No." value={member.ledger_folio_number} mono />
                <StatTile label="Gender" value={member.gender} capitalize />
              </div>

              {/* Tabs */}
              <div>
                <div className="flex gap-1 overflow-x-auto border-b">
                  {(
                    [
                      { key: "personal", label: "Personal", icon: User },
                      { key: "address", label: "Address", icon: MapPin },
                      { key: "kyc", label: "KYC Details", icon: Shield },
                      { key: "nominees", label: "Nominees", icon: Users },
                      { key: "accounts", label: "Assets & Liabilities", icon: Wallet },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
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

                <div className="pt-5">
                  {activeTab === "personal" && (
                    <div className="space-y-6">
                      <DetailSection title="Personal Information">
                        <DetailField icon={User} label="Full Name" value={member.full_name} />
                        <DetailField icon={Users} label="Father Name" value={member.father_name} />
                        <DetailField icon={Users} label="Spouse Name" value={member.spouse_name} />
                        <DetailField icon={Calendar} label="Date of Birth" value={member.date_of_birth} />
                        <DetailField icon={Calendar} label="Age" value={calcAge(member.date_of_birth)} />
                        <DetailField icon={User} label="Gender" value={member.gender} capitalize />
                        <DetailField icon={Users} label="Marital Status" value={member.marital_status} capitalize />
                        <DetailField icon={Book} label="Caste Category" value={member.caste_category} />
                        <DetailField icon={User} label="Customer Type" value={member.customer_type} capitalize />
                        <DetailField icon={Hash} label="Customer Code" value={member.customer_code?.trim()} mono />
                      </DetailSection>

                      <DetailSection title="Occupation & Education">
                        <DetailField icon={Building2} label="Occupation" value={member.occupation} capitalize />
                        <DetailField icon={Book} label="Qualification" value={member.qualification} />
                        <DetailField icon={FileText} label="Qualification Details" value={member.qualification_details} />
                        <DetailField icon={Landmark} label="DCCB Account Number" value={member.dccb_account_number} mono />
                      </DetailSection>

                      <DetailSection title="Contact Details">
                        <DetailField icon={Phone} label="Mobile" value={member.mobile_no || member.phone_no} />
                        <DetailField icon={Phone} label="Alternate Mobile" value={member.alt_mobile_no} />
                        <DetailField icon={Mail} label="Email" value={member.email || member.address_email} />
                      </DetailSection>

                      <DetailSection title="Membership Details">
                        <DetailField icon={Hash} label="Membership No." value={member.membership_no} mono />
                        <DetailField icon={Building2} label="Membership Class" value={member.membership_class} />
                        <DetailField icon={User} label="Member Type" value={member.member_type} capitalize />
                        <DetailField icon={CheckCircle2} label="Status" value={member.status} />
                        <DetailField icon={Calendar} label="Join Date" value={member.join_date} />
                        <DetailField icon={Book} label="Ledger Folio No." value={member.ledger_folio_number} mono />
                        <DetailField icon={FileText} label="Board Resolution No." value={member.board_resolution_number} />
                        <DetailField icon={Calendar} label="Board Resolution Date" value={member.board_resolution_date} />
                      </DetailSection>
                    </div>
                  )}

                  {activeTab === "address" && (
                    <div className="space-y-6">
                      <DetailSection title="Current Address">
                        <DetailField icon={MapPin} label="House No." value={member.house_no} />
                        <DetailField icon={MapPin} label="Street" value={member.street} />
                        <DetailField icon={MapPin} label="Village" value={member.village} />
                        <DetailField icon={MapPin} label="Taluk" value={member.thaluk} />
                        <DetailField icon={MapPin} label="District" value={member.district} />
                        <DetailField icon={MapPin} label="State" value={member.state} />
                        <DetailField icon={Hash} label="Pincode" value={member.pincode} />
                        <DetailField icon={Phone} label="Phone" value={member.phone_no} />
                      </DetailSection>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground">Full Current Address</p>
                        <p className="mt-1 text-sm text-foreground">{buildAddress(member)}</p>
                      </div>

                      <DetailSection title="Permanent Address">
                        <DetailField icon={MapPin} label="House No." value={member.permanent_house_no} />
                        <DetailField icon={MapPin} label="Street" value={member.permanent_street} />
                        <DetailField icon={MapPin} label="Village" value={member.permanent_village} />
                        <DetailField icon={MapPin} label="Taluk" value={member.permanent_thaluk} />
                        <DetailField icon={MapPin} label="District" value={member.permanent_district} />
                        <DetailField icon={MapPin} label="State" value={member.permanent_state} />
                        <DetailField icon={Hash} label="Pincode" value={member.permanent_pincode} />
                        <DetailField icon={Phone} label="Phone" value={member.permanent_phone_no} />
                      </DetailSection>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground">Full Permanent Address</p>
                        <p className="mt-1 text-sm text-foreground">{buildPermanentAddress(member)}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === "kyc" && (
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField icon={CreditCard} label="Aadhaar No." value={formatAadhaar(member.aadhaar_no)} mono />
                      <DetailField icon={CreditCard} label="PAN No." value={member.pan_no} mono />
                      <DetailField icon={FileText} label="Ration No." value={member.ration_no} />
                      <DetailField icon={FileText} label="Ration Card Type" value={member.ration_card_type} />
                      <DetailField icon={CreditCard} label="Driving License No." value={member.driving_license_no} />
                      <DetailField icon={CreditCard} label="Passport No." value={member.passport_no} mono />
                      <DetailField icon={FileText} label="EB Bill No." value={member.eb_bill_no} />
                      <DetailField
                        icon={FileText}
                        label={member.other_document_name ? `Others (${member.other_document_name})` : "Others"}
                        value={member.other_document_no}
                      />
                    </div>
                  )}

                  {activeTab === "nominees" && (
                    <div>
                      {isLoadingNominees ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading nominees...</span>
                        </div>
                      ) : nominees.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-6 text-center">
                          <Users className="mx-auto h-8 w-8 text-muted-foreground/30" />
                          <p className="mt-2 text-sm text-muted-foreground">No nominees registered for this member.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">Account</TableHead>
                                <TableHead className="text-xs">Nominee Name</TableHead>
                                <TableHead className="text-xs">Relation</TableHead>
                                <TableHead className="text-xs">DOB / Age</TableHead>
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
                                  <TableCell className="whitespace-nowrap text-xs">
                                    {n.nominee_dob || "---"}
                                    {n.nominee_age != null && <span className="text-muted-foreground"> · {n.nominee_age} yrs</span>}
                                  </TableCell>
                                  <TableCell className="text-xs capitalize">{n.nominee_gender || "---"}</TableCell>
                                  <TableCell className="text-xs">
                                    {n.is_member ? `Yes${n.member_id ? ` (${n.member_id})` : ""}` : "No"}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] text-xs">{n.nominee_address || "---"}</TableCell>
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
                          {accountSummary && (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                              <div className="rounded-lg border bg-emerald-50 p-4">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                                  <p className="text-xs font-medium text-emerald-700">Bank Assets</p>
                                </div>
                                <p className="mt-2 text-lg font-bold text-emerald-800">
                                  {accountSummary.total_assets.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </p>
                              </div>
                              <div className="rounded-lg border bg-red-50 p-4">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                  <p className="text-xs font-medium text-red-700">Bank Liabilities</p>
                                </div>
                                <p className="mt-2 text-lg font-bold text-red-800">
                                  {accountSummary.total_liabilities.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </p>
                              </div>
                              {/* <div className="rounded-lg border bg-blue-50 p-4">
                                <div className="flex items-center gap-2">
                                  <Landmark className="h-4 w-4 text-blue-600" />
                                  <p className="text-xs font-medium text-blue-700">Net Position</p>
                                </div>
                                <p className="mt-2 text-lg font-bold text-blue-800">
                                  {accountSummary.net_worth.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </p>
                              </div> */}
                              <div className="rounded-lg border bg-muted/50 p-4">
                                <div className="flex items-center gap-2">
                                  <Wallet className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-xs font-medium text-muted-foreground">Total Accounts</p>
                                </div>
                                <p className="mt-2 text-lg font-bold text-foreground">{accountSummary.total_accounts}</p>
                              </div>
                            </div>
                          )}

                          <AccountsTable title="Bank Assets" icon={Banknote} accent="emerald" items={assets} emptyLabel="No loan accounts found" />
                          <AccountsTable title="Bank Liabilities" icon={PiggyBank} accent="red" items={liabilities} emptyLabel="No savings, deposit or share accounts found" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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

function StatTile({
  label,
  value,
  mono = false,
  capitalize = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
  capitalize?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-foreground ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>
        {value || "---"}
      </p>
    </div>
  )
}

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
      <p className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}>
        {value || "---"}
      </p>
    </div>
  )
}

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

function AccountsTable({
  title,
  icon: Icon,
  accent,
  items,
  emptyLabel,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  accent: "emerald" | "red"
  items: AccountItem[]
  emptyLabel: string
}) {
  const headerBg = accent === "emerald" ? "bg-emerald-50/50" : "bg-red-50/50"
  const balanceColor = accent === "emerald" ? "text-emerald-700" : "text-red-700"
  const badgeActive = accent === "emerald" ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-red-200 bg-red-100 text-red-700"
  const iconColor = accent === "emerald" ? "text-emerald-600" : "text-red-600"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" className="text-xs">
          {items.length} account{items.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Icon className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className={headerBg}>
                <TableHead className="font-semibold">Account Type</TableHead>
                <TableHead className="font-semibold">Account No.</TableHead>
                <TableHead className="font-semibold">Scheme</TableHead>
                <TableHead className="font-semibold">Opening Date</TableHead>
                <TableHead className="text-right font-semibold">Balance</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((acc, idx) => (
                <TableRow key={`${title}-${idx}`}>
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
                  <TableCell className={`text-right font-mono text-sm font-semibold ${balanceColor}`}>
                    {acc.balance.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={acc.status === "ACTIVE" ? "default" : "secondary"}
                      className={acc.status === "ACTIVE" ? `text-[10px] ${badgeActive}` : "text-[10px]"}
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
  )
}
