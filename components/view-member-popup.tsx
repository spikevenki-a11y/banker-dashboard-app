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
} from "lucide-react"

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
  [key: string]: unknown
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

type TabKey = "personal" | "address" | "kyc" | "accounts"

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

  useEffect(() => {
    if (!open) return
    setActiveTab("personal")
    setAccountsLoaded(false)
    setAssets([])
    setLiabilities([])
    setAccountSummary(null)
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
          setAssets(data.assets || [])
          setLiabilities(data.liabilities || [])
          setAccountSummary(data.summary || null)
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

  const formatAadhaar = (val?: string | null) => {
    if (!val) return "---"
    return `${val.slice(0, 4)} ${val.slice(4, 8)} ${val.slice(8)}`
  }

  const buildAddress = (m: ViewMemberData) => {
    const parts = [m.house_no, m.street, m.village, m.thaluk, m.district, m.state].filter(Boolean)
    const address = parts.join(", ")
    return m.pincode ? `${address} - ${m.pincode}` : address || "---"
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
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-foreground">{member.full_name || "---"}</h2>
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
                          {member.email || "---"}
                        </span>
                      </div>
                    </div>
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
                      { key: "accounts", label: "Assets & Liabilities", icon: Wallet },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
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
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField icon={User} label="Full Name" value={member.full_name} />
                      <DetailField icon={Users} label="Father Name" value={member.father_name} />
                      <DetailField icon={Users} label="Spouse Name" value={member.spouse_name} />
                      <DetailField icon={Calendar} label="Date of Birth" value={member.date_of_birth} />
                      <DetailField icon={User} label="Gender" value={member.gender} capitalize />
                      <DetailField icon={Phone} label="Mobile" value={member.mobile_no || member.phone_no} />
                      <DetailField icon={Mail} label="Email" value={member.email} />
                      <DetailField icon={FileText} label="Board Resolution No." value={member.board_resolution_number} />
                      <DetailField icon={Calendar} label="Board Resolution Date" value={member.boardresolutiondate} />
                      <DetailField icon={Book} label="Caste" value={member.caste_category} />
                    </div>
                  )}

                  {activeTab === "address" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailField icon={MapPin} label="House No." value={member.house_no} />
                        <DetailField icon={MapPin} label="Street" value={member.street} />
                        <DetailField icon={MapPin} label="Village" value={member.village} />
                        <DetailField icon={MapPin} label="Taluk" value={member.thaluk} />
                        <DetailField icon={MapPin} label="District" value={member.district} />
                        <DetailField icon={MapPin} label="State" value={member.state} />
                        <DetailField icon={Hash} label="Pincode" value={member.pincode} />
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-xs font-medium text-muted-foreground">Full Address</p>
                        <p className="mt-1 text-sm text-foreground">{buildAddress(member)}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === "kyc" && (
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField icon={CreditCard} label="Aadhaar No." value={formatAadhaar(member.aadhaar_no)} mono />
                      <DetailField icon={CreditCard} label="PAN No." value={member.pan_no} mono />
                      <DetailField icon={FileText} label="Ration No." value={member.ration_no} />
                      <DetailField icon={CreditCard} label="Driving License No." value={member.driving_license_no} />
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
                                <p className="mt-2 text-lg font-bold text-foreground">{accountSummary.total_accounts}</p>
                              </div>
                            </div>
                          )}

                          <AccountsTable title="Assets" icon={PiggyBank} accent="emerald" items={assets} emptyLabel="No asset accounts found" />
                          <AccountsTable title="Liabilities" icon={Banknote} accent="red" items={liabilities} emptyLabel="No liability accounts found" />
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
