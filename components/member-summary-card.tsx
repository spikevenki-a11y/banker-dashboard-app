"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, TrendingUp, TrendingDown, ShieldCheck, Eye, MapPin, Camera, PenTool } from "lucide-react"

// Member Summary card + "View Member Details" profile modal.
// Same layout, fields and behaviour as Fixed Deposits → Create Deposit.

export type MemberSummaryInfo = {
  membership_no: string
  member_type: string
  membership_class: string
  status: string
  full_name: string
  father_name: string
  mobile_no: string
  aadhaar_no: string
  ledger_folio_number?: string
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

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

export function MemberSummaryCard({ memberInfo }: { memberInfo: MemberSummaryInfo | null }) {
  const [viewMemberOpen, setViewMemberOpen] = useState(false)
  const [viewMemberTab, setViewMemberTab] = useState("personal")
  const [viewMemberProfile, setViewMemberProfile] = useState<MemberProfile | null>(null)
  const [viewMemberAssets, setViewMemberAssets] = useState<AccountAsset[]>([])
  const [viewMemberSummary, setViewMemberSummary] = useState<any>(null)
  const [viewMemberLoans, setViewMemberLoans] = useState<LoanAccount[]>([])
  const [viewMemberLoading, setViewMemberLoading] = useState(false)
  const [viewMemberError, setViewMemberError] = useState("")

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

  return (
    <>
      <Card>
        <CardHeader className="">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Member Summary</CardTitle>
            </div>
            {memberInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewMember}
                className="h-7 gap-1.5 text-xs bg-transparent"
              >
                <Eye className="h-3.5 w-3.5" />
                View Member Details
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {memberInfo ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-3">
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
                <div>
                  <p className="text-xs text-muted-foreground">Father's Name</p>
                  <p className="text-sm font-semibold">{memberInfo.father_name || "---"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                  <p className="text-sm font-mono font-semibold">{memberInfo.aadhaar_no || "---"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="text-sm font-semibold">{memberInfo.mobile_no || "---"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ledger Number</p>
                  <p className="text-sm font-mono font-semibold">{memberInfo.ledger_folio_number || "---"}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-4 sm:flex-col sm:items-end">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                    <Camera className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">Photo</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                    <PenTool className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">Signature</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Search a member to see details</p>
          )}
        </CardContent>
      </Card>

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
    </>
  )
}
