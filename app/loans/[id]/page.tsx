"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"
import {
  ArrowLeft, CreditCard, Loader2, ShieldCheck, Scale,
  Building2, Car, Landmark, FileText, ImageIcon, ExternalLink,
} from "lucide-react"

type LoanApplication = {
  id: string
  loan_application_id: number
  reference_no: string
  membership_no: string
  application_date: string
  applied_loan_amount: number
  loan_purpose: string
  application_status: string
  scheme_name: string
  loan_type: string
  member_name: string
  mobile_no: string
  customer_code: string
  sanctioned_amount?: number
  sanction_date?: string
  sanctioned_interest_rate?: number
  sanctioned_tenure?: number
  emi_amount?: number
  sanction_status?: string
  sanction_remarks?: string
  maximum_period_months?: number
  loan_outstanding?: number
}

type EMISchedule = {
  schedule_id: number
  installment_no: number
  due_date: string
  principal_amount: number
  interest_amount: number
  total_installment: number
  balance_principal: number
  payment_status: string
}

type LoanTransaction = {
  id: string
  transaction_date: string
  voucher_no: number
  loan_account_no: string
  transaction_type: string
  debit_amount: number
  credit_amount: number
  balance_after_transaction: number
  remarks: string
}

type GoldDetail = {
  gold_form: string
  purity_karat: number
  number_of_items: number
  gross_weight_grams: string
  stone_weight_grams: string
  net_weight_grams: string
  packet_no: string
  appraiser_name: string
  appraiser_license_no: string
  appraisal_date: string
  gold_rate_per_gram: string
  gold_rate_date: string
  market_value: string
  storage_location: string
}

type GoldItem = {
  item_seq: number
  ornament_name: string
  gold_form: string
  purity_karat: number
  number_of_pieces: number
  gross_weight_grams: string
  stone_weight_grams: string
  net_weight_grams: string
}

type GoldDocument = {
  id: string
  file_name: string
  file_type: string
  file_size: number
  public_url: string
  document_category: string
  created_at: string
}

type PropertyDetail = {
  property_type: string
  ownership_type: string
  survey_no: string
  owner_name: string
  address_line1: string
  city: string
  district: string
  state: string
  pincode: string
  land_area_sqft: string
  built_up_area_sqft: string
  land_area_acres: string
  registration_no: string
  registration_date: string
  document_type: string
  guideline_value: string
  market_value: string
  title_clear: boolean
  legal_opinion_by: string
  legal_opinion_date: string
  encumbrance_cert_date: string
}

type VehicleDetail = {
  vehicle_type: string
  registration_no: string
  chassis_no: string
  engine_no: string
  manufacturer: string
  model: string
  year_of_manufacture: number
  registration_date: string
  rc_book_held: boolean
  insurance_policy_no: string
  insurance_expiry: string
  purchase_price: string
  current_market_value: string
}

type DepositDetail = {
  deposit_type: string
  deposit_account_no: string
  certificate_no: string
  institution_name: string
  deposit_amount: string
  deposit_date: string
  maturity_date: string
  maturity_amount: string
  interest_rate: string
  lien_amount: string
}

type InsuranceDetail = {
  policy_no: string
  policy_type: string
  insurer_name: string
  insured_name: string
  sum_assured: string
  surrender_value: string
  surrender_value_date: string
  premium_amount: string
  premium_frequency: string
  policy_start_date: string
  policy_maturity_date: string
  assignment_done: boolean
  assignee_name: string
}

type LoanSecurity = {
  id: string
  security_ref_no: string
  security_type_id: number
  security_name: string
  security_code: string
  description: string
  is_primary_security: boolean
  security_rank: number
  assessed_value: string
  forced_sale_value: string
  valuation_date: string
  lien_marked: boolean
  security_status: string
  verification_status: string
  detail: GoldDetail | PropertyDetail | VehicleDetail | DepositDetail | InsuranceDetail | null
  gold_items: GoldItem[]
  gold_documents: GoldDocument[]
}

function formatCurrency(val: number | string | null | undefined) {
  if (val === null || val === undefined || val === "") return "---"
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null | undefined) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "---"}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">{title}</p>
      {children}
    </div>
  )
}

function SecurityStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-orange-100 text-orange-700",
    ACTIVE: "bg-teal-100 text-teal-700",
    RELEASED: "bg-gray-100 text-gray-600",
    UNDER_REVIEW: "bg-blue-100 text-blue-700",
    DISCHARGED: "bg-gray-100 text-gray-500",
  }
  return <Badge className={map[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>
}

function VerificationBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    VERIFIED: "bg-teal-100 text-teal-700",
    PENDING: "bg-orange-100 text-orange-700",
    REJECTED: "bg-red-100 text-red-700",
  }
  return <Badge className={map[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>
}

function GoldSecurityPanel({ detail, items, documents }: {
  detail: GoldDetail
  items: GoldItem[]
  documents: GoldDocument[]
}) {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <Section title="Gold Summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Gold Form" value={detail.gold_form} />
          <InfoRow label="Purity" value={detail.purity_karat ? `${detail.purity_karat}K` : null} />
          <InfoRow label="Number of Items" value={detail.number_of_items} />
          <InfoRow label="Gross Weight" value={detail.gross_weight_grams ? `${parseFloat(detail.gross_weight_grams).toFixed(3)} g` : null} />
          <InfoRow label="Stone Weight" value={detail.stone_weight_grams ? `${parseFloat(detail.stone_weight_grams).toFixed(3)} g` : null} />
          <InfoRow label="Net Weight" value={detail.net_weight_grams ? `${parseFloat(detail.net_weight_grams).toFixed(3)} g` : null} />
        </div>
      </Section>

      {/* Appraisal */}
      <Section title="Appraisal & Valuation">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Appraiser Name" value={detail.appraiser_name} />
          <InfoRow label="Appraiser License" value={detail.appraiser_license_no} />
          <InfoRow label="Appraisal Date" value={formatDate(detail.appraisal_date)} />
          <InfoRow label="Gold Rate / Gram" value={detail.gold_rate_per_gram ? formatCurrency(detail.gold_rate_per_gram) : null} />
          <InfoRow label="Rate Date" value={formatDate(detail.gold_rate_date)} />
          <InfoRow label="Market Value" value={formatCurrency(detail.market_value)} />
        </div>
      </Section>

      {/* Storage */}
      <Section title="Custody">
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Packet No" value={detail.packet_no} />
          <InfoRow label="Storage Location" value={detail.storage_location} />
        </div>
      </Section>

      {/* Gold Items Table */}
      {items.length > 0 && (
        <Section title={`Gold Items (${items.length})`}>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-50/60">
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Ornament</TableHead>
                  <TableHead className="text-xs">Form</TableHead>
                  <TableHead className="text-xs">Purity</TableHead>
                  <TableHead className="text-xs text-right">Pieces</TableHead>
                  <TableHead className="text-xs text-right">Gross (g)</TableHead>
                  <TableHead className="text-xs text-right">Net (g)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{item.item_seq}</TableCell>
                    <TableCell className="text-xs font-medium">{item.ornament_name}</TableCell>
                    <TableCell className="text-xs">{item.gold_form}</TableCell>
                    <TableCell className="text-xs">{item.purity_karat}K</TableCell>
                    <TableCell className="text-xs text-right">{item.number_of_pieces}</TableCell>
                    <TableCell className="text-xs text-right">{parseFloat(item.gross_weight_grams).toFixed(3)}</TableCell>
                    <TableCell className="text-xs text-right">{parseFloat(item.net_weight_grams).toFixed(3)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-yellow-50/60 font-semibold">
                  <TableCell className="text-xs" colSpan={4}>Totals</TableCell>
                  <TableCell className="text-xs text-right">
                    {items.reduce((s, i) => s + (i.number_of_pieces || 0), 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {items.reduce((s, i) => s + (parseFloat(i.gross_weight_grams) || 0), 0).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {items.reduce((s, i) => s + (parseFloat(i.net_weight_grams) || 0), 0).toFixed(3)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      {/* Gold Documents */}
      <Section title={`Documents & Photos (${documents.length})`}>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {documents.map((doc) => {
              const isImage = doc.file_type?.startsWith("image/")
              const categoryLabel: Record<string, string> = {
                GOLD_PHOTO: "Gold Photo",
                WEIGHT_CERTIFICATE: "Weight Cert.",
                APPRAISAL_REPORT: "Appraisal Report",
                OTHER: "Other",
              }
              return (
                <a
                  key={doc.id}
                  href={doc.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border border-yellow-200 bg-yellow-50/40 hover:bg-yellow-50 overflow-hidden flex flex-col"
                >
                  <div className="h-24 flex items-center justify-center bg-muted/30 overflow-hidden">
                    {isImage ? (
                      <img
                        src={doc.public_url}
                        alt={doc.file_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-yellow-400" />
                    )}
                  </div>
                  <div className="p-2 flex-1">
                    <p className="text-[10px] font-medium truncate">{doc.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {categoryLabel[doc.document_category] || doc.document_category}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                    </p>
                  </div>
                  <div className="px-2 pb-2">
                    <span className="text-[10px] text-blue-500 group-hover:underline flex items-center gap-0.5">
                      <ExternalLink className="h-2.5 w-2.5" /> View
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

function PropertySecurityPanel({ detail }: { detail: PropertyDetail }) {
  return (
    <div className="space-y-5">
      <Section title="Property Info">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Property Type" value={detail.property_type} />
          <InfoRow label="Ownership Type" value={detail.ownership_type?.replace("_", " ")} />
          <InfoRow label="Survey No" value={detail.survey_no} />
          <InfoRow label="Owner Name" value={detail.owner_name} />
          <InfoRow label="Document Type" value={detail.document_type} />
          <InfoRow label="Registration No" value={detail.registration_no} />
        </div>
      </Section>
      <Section title="Address">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Address" value={detail.address_line1} />
          <InfoRow label="City" value={detail.city} />
          <InfoRow label="District" value={detail.district} />
          <InfoRow label="State" value={detail.state} />
          <InfoRow label="Pincode" value={detail.pincode} />
        </div>
      </Section>
      <Section title="Area & Valuation">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Land Area (sqft)" value={detail.land_area_sqft} />
          <InfoRow label="Built-up Area (sqft)" value={detail.built_up_area_sqft} />
          <InfoRow label="Land Area (acres)" value={detail.land_area_acres} />
          <InfoRow label="Guideline Value" value={formatCurrency(detail.guideline_value)} />
          <InfoRow label="Market Value" value={formatCurrency(detail.market_value)} />
          <InfoRow label="Registration Date" value={formatDate(detail.registration_date)} />
        </div>
      </Section>
      <Section title="Legal">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Title Clear" value={detail.title_clear === true ? "Yes" : detail.title_clear === false ? "No" : null} />
          <InfoRow label="Legal Opinion By" value={detail.legal_opinion_by} />
          <InfoRow label="Legal Opinion Date" value={formatDate(detail.legal_opinion_date)} />
          <InfoRow label="EC Date" value={formatDate(detail.encumbrance_cert_date)} />
        </div>
      </Section>
    </div>
  )
}

function VehicleSecurityPanel({ detail }: { detail: VehicleDetail }) {
  return (
    <div className="space-y-5">
      <Section title="Vehicle Info">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Vehicle Type" value={detail.vehicle_type?.replace("_", " ")} />
          <InfoRow label="Registration No" value={detail.registration_no} />
          <InfoRow label="Manufacturer" value={detail.manufacturer} />
          <InfoRow label="Model" value={detail.model} />
          <InfoRow label="Year of Manufacture" value={detail.year_of_manufacture} />
          <InfoRow label="Chassis No" value={detail.chassis_no} />
          <InfoRow label="Engine No" value={detail.engine_no} />
          <InfoRow label="RC Book Held" value={detail.rc_book_held ? "Yes" : "No"} />
        </div>
      </Section>
      <Section title="Registration & Insurance">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Registration Date" value={formatDate(detail.registration_date)} />
          <InfoRow label="Insurance Policy No" value={detail.insurance_policy_no} />
          <InfoRow label="Insurance Expiry" value={formatDate(detail.insurance_expiry)} />
        </div>
      </Section>
      <Section title="Valuation">
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Purchase Price" value={formatCurrency(detail.purchase_price)} />
          <InfoRow label="Current Market Value" value={formatCurrency(detail.current_market_value)} />
        </div>
      </Section>
    </div>
  )
}

function DepositSecurityPanel({ detail }: { detail: DepositDetail }) {
  return (
    <div className="space-y-5">
      <Section title="Deposit Info">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Deposit Type" value={detail.deposit_type} />
          <InfoRow label="Institution" value={detail.institution_name} />
          <InfoRow label="Deposit Account No" value={detail.deposit_account_no} />
          <InfoRow label="Certificate No" value={detail.certificate_no} />
          <InfoRow label="Interest Rate" value={detail.interest_rate ? `${detail.interest_rate}%` : null} />
        </div>
      </Section>
      <Section title="Amounts & Dates">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Deposit Amount" value={formatCurrency(detail.deposit_amount)} />
          <InfoRow label="Deposit Date" value={formatDate(detail.deposit_date)} />
          <InfoRow label="Maturity Date" value={formatDate(detail.maturity_date)} />
          <InfoRow label="Maturity Amount" value={formatCurrency(detail.maturity_amount)} />
          <InfoRow label="Lien Amount" value={formatCurrency(detail.lien_amount)} />
        </div>
      </Section>
    </div>
  )
}

function InsuranceSecurityPanel({ detail }: { detail: InsuranceDetail }) {
  return (
    <div className="space-y-5">
      <Section title="Policy Info">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Policy No" value={detail.policy_no} />
          <InfoRow label="Policy Type" value={detail.policy_type} />
          <InfoRow label="Insurer" value={detail.insurer_name} />
          <InfoRow label="Insured Name" value={detail.insured_name} />
        </div>
      </Section>
      <Section title="Financial Details">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Sum Assured" value={formatCurrency(detail.sum_assured)} />
          <InfoRow label="Surrender Value" value={formatCurrency(detail.surrender_value)} />
          <InfoRow label="Surrender Value Date" value={formatDate(detail.surrender_value_date)} />
          <InfoRow label="Premium Amount" value={formatCurrency(detail.premium_amount)} />
          <InfoRow label="Premium Frequency" value={detail.premium_frequency} />
          <InfoRow label="Premium Due Date" value={formatDate(detail.premium_due_date as any)} />
        </div>
      </Section>
      <Section title="Policy Dates">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Start Date" value={formatDate(detail.policy_start_date)} />
          <InfoRow label="Maturity Date" value={formatDate(detail.policy_maturity_date)} />
          <InfoRow label="Assignment Done" value={detail.assignment_done ? "Yes" : "No"} />
          {detail.assignment_done && <InfoRow label="Assignee" value={detail.assignee_name} />}
        </div>
      </Section>
    </div>
  )
}

function SecurityTypeIcon({ code }: { code: string }) {
  if (code === "GOLD") return <Scale className="h-5 w-5 text-yellow-600" />
  if (code === "LAND" || code === "BUILDING") return <Building2 className="h-5 w-5 text-green-600" />
  if (code === "VEHICLE") return <Car className="h-5 w-5 text-blue-600" />
  if (code === "DEPOSIT" || code === "NSC_KVP") return <Landmark className="h-5 w-5 text-purple-600" />
  return <ShieldCheck className="h-5 w-5 text-gray-500" />
}

export default function LoanDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const loanId = params.id as string

  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null)
  const [emiSchedule, setEmiSchedule] = useState<EMISchedule[]>([])
  const [loanTransactions, setLoanTransactions] = useState<LoanTransaction[]>([])
  const [loanSummary, setLoanSummary] = useState<any>(null)
  const [loanSecurity, setLoanSecurity] = useState<LoanSecurity | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/loans/applications?id=${loanId}`)
        const data = await res.json()

        if (data.error || !data.applications || data.applications.length === 0) {
          throw new Error("Loan not found")
        }

        const loan = data.applications[0]
        setSelectedLoan(loan)

        // Load EMI schedule and transactions
        const loanAccountNo = `LN${loan.reference_no?.substring(2) || loan.loan_application_id.toString().padStart(8, "0")}`
        const [schedRes, secRes] = await Promise.all([
          fetch(`/api/loans/repayment?loanAccountNo=${loanAccountNo}`),
          fetch(`/api/loans/security?loan_application_id=${loan.loan_application_id}`),
        ])

        const schedData = await schedRes.json()
        if (!schedData.error) {
          setEmiSchedule(schedData.schedule || [])
          setLoanTransactions(schedData.transactions || [])
          setLoanSummary(schedData.summary || {})
        }

        const secData = await secRes.json()
        if (!secData.error && secData.security) {
          setLoanSecurity(secData.security)
        }
      } catch (error) {
        console.error("Failed to fetch loan details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoanDetails()
  }, [loanId])

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: "bg-orange-100 text-orange-700",
      SANCTIONED: "bg-blue-100 text-blue-700",
      ACTIVE: "bg-teal-100 text-teal-700",
      CLOSED: "bg-gray-100 text-gray-700",
      REJECTED: "bg-red-100 text-red-700",
      OVERDUE: "bg-red-100 text-red-700",
    }
    return statusColors[status?.toUpperCase()] || "bg-gray-100 text-gray-700"
  }

  if (isLoading) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardWrapper>
    )
  }

  if (!selectedLoan) {
    return (
      <DashboardWrapper>
        <div className="flex h-screen flex-col items-center justify-center">
          <CreditCard className="h-12 w-12 mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Loan not found</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </DashboardWrapper>
    )
  }

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Details</h1>
                <p className="text-muted-foreground">Reference: {selectedLoan.reference_no}</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className={`grid w-full ${loanSecurity ? "grid-cols-4" : "grid-cols-3"}`}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schedule">EMI Schedule</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                {loanSecurity && <TabsTrigger value="security">Security</TabsTrigger>}
              </TabsList>

              {/* ── Overview ───────────────────────────────────────────── */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Loan Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Reference Number</Label>
                          <p className="font-mono font-medium">{selectedLoan.reference_no}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <div className="mt-1">
                            <Badge className={getStatusBadge(selectedLoan.application_status)}>
                              {selectedLoan.application_status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Member Name</Label>
                          <p className="font-medium">{selectedLoan.member_name || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Membership No</Label>
                          <p className="font-mono font-medium">{selectedLoan.membership_no}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Loan Scheme</Label>
                          <p className="font-medium">{selectedLoan.scheme_name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Purpose</Label>
                          <p className="font-medium">{selectedLoan.loan_purpose || "---"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Applied Amount</Label>
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(selectedLoan.applied_loan_amount)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Sanctioned Amount</Label>
                          <p className="text-2xl font-bold text-teal-600">
                            {selectedLoan.sanctioned_amount ? formatCurrency(selectedLoan.sanctioned_amount) : "---"}
                          </p>
                        </div>
                      </div>
                      {selectedLoan.sanctioned_amount && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Interest Rate</Label>
                            <p className="font-medium">{selectedLoan.sanctioned_interest_rate}% p.a.</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Tenure</Label>
                            <p className="font-medium">{selectedLoan.sanctioned_tenure} months</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">EMI Amount</Label>
                            <p className="text-xl font-semibold">{formatCurrency(selectedLoan.emi_amount || 0)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Repayment Summary */}
                {loanSummary && Object.keys(loanSummary).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Repayment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Paid Installments:</span>
                          <span className="font-medium">{loanSummary.paid_installments || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pending Installments:</span>
                          <span className="font-medium">{loanSummary.pending_installments || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Principal Paid:</span>
                          <span className="font-medium">{formatCurrency(loanSummary.total_principal_paid || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Interest Paid:</span>
                          <span className="font-medium">{formatCurrency(loanSummary.total_interest_paid || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Next Due Date:</span>
                          <span className="font-medium">{formatDate(loanSummary.next_due_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Overdue Installments:</span>
                          <span className={`font-medium ${(loanSummary.overdue_installments || 0) > 0 ? "text-red-600" : ""}`}>
                            {loanSummary.overdue_installments || 0}
                          </span>
                        </div>
                      </div>
                      {(loanSummary.paid_installments || 0) > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>
                              {Math.round(
                                ((loanSummary.paid_installments || 0) /
                                  ((loanSummary.paid_installments || 0) + (loanSummary.pending_installments || 0))) *
                                  100
                              )}%
                            </span>
                          </div>
                          <Progress
                            value={
                              ((loanSummary.paid_installments || 0) /
                                ((loanSummary.paid_installments || 0) + (loanSummary.pending_installments || 0))) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── EMI Schedule ───────────────────────────────────────── */}
              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>EMI Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {emiSchedule.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No EMI schedule available (loan not yet disbursed)
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>EMI #</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>EMI Amount</TableHead>
                              <TableHead>Principal</TableHead>
                              <TableHead>Interest</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emiSchedule.map((emi) => (
                              <TableRow key={emi.schedule_id}>
                                <TableCell className="font-medium">{emi.installment_no}</TableCell>
                                <TableCell>{formatDate(emi.due_date)}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(emi.total_installment)}</TableCell>
                                <TableCell>{formatCurrency(emi.principal_amount)}</TableCell>
                                <TableCell>{formatCurrency(emi.interest_amount)}</TableCell>
                                <TableCell className="font-mono">{formatCurrency(emi.balance_principal)}</TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      emi.payment_status === "PAID"
                                        ? "bg-teal-100 text-teal-700"
                                        : emi.payment_status === "OVERDUE"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-orange-100 text-orange-700"
                                    }
                                  >
                                    {emi.payment_status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Transactions ───────────────────────────────────────── */}
              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loanTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Voucher No</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Debit</TableHead>
                              <TableHead>Credit</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Remarks</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanTransactions.map((txn) => (
                              <TableRow key={txn.id}>
                                <TableCell>{formatDate(txn.transaction_date)}</TableCell>
                                <TableCell className="font-mono">{txn.voucher_no}</TableCell>
                                <TableCell className="font-medium">{txn.transaction_type}</TableCell>
                                <TableCell>{txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : "---"}</TableCell>
                                <TableCell>{txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : "---"}</TableCell>
                                <TableCell className="font-mono font-semibold">
                                  {formatCurrency(txn.balance_after_transaction)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{txn.remarks || "---"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Security ───────────────────────────────────────────── */}
              {loanSecurity && (
                <TabsContent value="security" className="space-y-4">
                  {/* Security header card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SecurityTypeIcon code={loanSecurity.security_code} />
                        {loanSecurity.security_name}
                        {loanSecurity.is_primary_security && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-700 text-[10px]">Primary</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Security Ref</p>
                          <p className="text-sm font-mono font-medium">{loanSecurity.security_ref_no || "---"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <div className="mt-0.5">
                            <SecurityStatusBadge status={loanSecurity.security_status} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Verification</p>
                          <div className="mt-0.5">
                            <VerificationBadge status={loanSecurity.verification_status} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Lien Marked</p>
                          <p className="text-sm font-medium">{loanSecurity.lien_marked ? "Yes" : "No"}</p>
                        </div>
                        {loanSecurity.assessed_value && (
                          <div>
                            <p className="text-xs text-muted-foreground">Assessed Value</p>
                            <p className="text-sm font-semibold text-teal-700">
                              {formatCurrency(loanSecurity.assessed_value)}
                            </p>
                          </div>
                        )}
                        {loanSecurity.forced_sale_value && (
                          <div>
                            <p className="text-xs text-muted-foreground">Forced Sale Value</p>
                            <p className="text-sm font-medium">{formatCurrency(loanSecurity.forced_sale_value)}</p>
                          </div>
                        )}
                        {loanSecurity.valuation_date && (
                          <div>
                            <p className="text-xs text-muted-foreground">Valuation Date</p>
                            <p className="text-sm font-medium">{formatDate(loanSecurity.valuation_date)}</p>
                          </div>
                        )}
                        {loanSecurity.description && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{loanSecurity.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Type-specific detail card */}
                  {loanSecurity.detail && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Security Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loanSecurity.security_code === "GOLD" && (
                          <GoldSecurityPanel
                            detail={loanSecurity.detail as GoldDetail}
                            items={loanSecurity.gold_items}
                            documents={loanSecurity.gold_documents}
                          />
                        )}
                        {(loanSecurity.security_code === "LAND" || loanSecurity.security_code === "BUILDING") && (
                          <PropertySecurityPanel detail={loanSecurity.detail as PropertyDetail} />
                        )}
                        {loanSecurity.security_code === "VEHICLE" && (
                          <VehicleSecurityPanel detail={loanSecurity.detail as VehicleDetail} />
                        )}
                        {(loanSecurity.security_code === "DEPOSIT" || loanSecurity.security_code === "NSC_KVP") && (
                          <DepositSecurityPanel detail={loanSecurity.detail as DepositDetail} />
                        )}
                        {loanSecurity.security_code === "INSUR" && (
                          <InsuranceSecurityPanel detail={loanSecurity.detail as InsuranceDetail} />
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
