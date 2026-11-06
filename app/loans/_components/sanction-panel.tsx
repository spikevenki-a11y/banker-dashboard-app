"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle,
  XCircle,
  User,
  IndianRupee,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Calculator,
  Shield,
  Percent,
  TrendingUp,
  Eye,
  Building2,
  Phone,
  CreditCard,
  Download,
} from "lucide-react"
import { useBranchInfo } from "@/app/reports/_components/use-branch-info"
import { downloadPdf } from "@/app/reports/_components/download-pdf"
import {
  buildRepaymentSchedule,
  effectiveFrequency,
  repaymentFrequencyLabel,
  repaymentMethodLabel,
  DEFAULT_FIXED_PRINCIPAL_FREQUENCY,
  DEFAULT_REPAYMENT_METHOD,
  REPAYMENT_FREQUENCY_OPTIONS,
  REPAYMENT_METHOD_OPTIONS,
  type RepaymentFrequency,
  type RepaymentMethod,
} from "@/lib/loan-repayment-schedule"

// Sanction form for one pending loan application: application details, sanction terms,
// EMI calculation, repayment schedule (with PDF), approve/reject. Shared by
// Loans → Sanction Loans and the Sanction popup in Loans → View / Reject Application.

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export interface SanctionApplication {
  loan_application_id: number
  reference_no: string
  membership_no: string
  member_name: string
  mobile_no: string
  aadhaar_no: string
  scheme_id: number
  scheme_name: string
  loan_type: string
  loan_purpose: string
  applied_loan_amount: number
  application_date: string
  application_status: string
  scheme_interest_rate: number
  minimum_period_months: number
  maximum_period_months: number
  loan_tenure_months: number
  loan_gl_account: string
}

interface SecurityDetail {
  security_id: number
  security_type: string
  security_description: string
  security_value: number
  document_reference: string
}

interface EMIScheduleItem {
  installment_no: number
  due_date: string
  principal: number
  interest: number
  total: number
  balance: number
}

interface SanctionPanelProps {
  app: SanctionApplication
  // Called after a successful approval with the success text to show
  onApproved: (result: { loanAppId: number; message: string }) => void
  // Called after a successful rejection
  onRejected: (result: { loanAppId: number; message: string }) => void
  onCancel: () => void
}

// Format currency
// Number inputs in the sanction form: no spinner buttons, and no stepping with the
// arrow keys or mouse wheel — values are typed in only
const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
const noStepProps = {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault()
  },
  onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
}

// Due dates in the repayment schedule PDF: DD-MM-YYYY (e.g. 09-02-2027)
const formatDueDatePdf = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""))
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value || "")
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function SanctionPanel({ app: selectedApp, onApproved, onRejected, onCancel }: SanctionPanelProps) {
  // Identity for business date
  const [identity, setIdentity] = useState<{ businessDate?: string } | null>(null)

  const [securities, setSecurities] = useState<SecurityDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(true)

  // Sanction form
  const [sanctionedAmount, setSanctionedAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [tenureMonths, setTenureMonths] = useState("")
  const [moratoriumPeriod, setMoratoriumPeriod] = useState("0")
  const [remarks, setRemarks] = useState("")

  // Repayment details
  // Repayment Type (On Maturity / Fixed Principal) and Repayment Frequency;
  // On Maturity always repays at Closing Time
  const [repaymentMethod, setRepaymentMethod] = useState<RepaymentMethod>(DEFAULT_REPAYMENT_METHOD)
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>(
    effectiveFrequency(DEFAULT_REPAYMENT_METHOD, null)
  )
  const [numberOfInstallments, setNumberOfInstallments] = useState(0)
  const [installmentStartDate, setInstallmentStartDate] = useState("")

  // EMI calculation
  const [calculatedEMI, setCalculatedEMI] = useState<number | null>(null)
  const [totalInterest, setTotalInterest] = useState<number | null>(null)
  const [totalPayment, setTotalPayment] = useState<number | null>(null)
  const [emiSchedule, setEmiSchedule] = useState<EMIScheduleItem[]>([])
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [downloadingSchedule, setDownloadingSchedule] = useState(false)
  const [scheduleDownloadError, setScheduleDownloadError] = useState("")
  const branchInfo = useBranchInfo()

  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  // Repayment Type change: On Maturity fixes the frequency to Closing Time;
  // Fixed Principal starts on Monthly and lets the user pick any frequency
  const handleRepaymentMethodChange = (value: string) => {
    const method = value as RepaymentMethod
    setRepaymentMethod(method)
    setRepaymentFrequency(
      method === "ON_MATURITY" ? "CLOSING_TIME" : DEFAULT_FIXED_PRINCIPAL_FREQUENCY
    )
  }

  // Builds the PDF from the same emiSchedule rows shown in the Repayment Schedule dialog
  async function handleDownloadSchedule() {
    if (emiSchedule.length === 0) return
    setDownloadingSchedule(true)
    setScheduleDownloadError("")
    try {
      const sum = (key: "principal" | "interest" | "total") => emiSchedule.reduce((acc, item) => acc + item[key], 0)
      const details = [
        ["Reference No", selectedApp?.reference_no],
        ["Member", selectedApp ? `${selectedApp.member_name} (${selectedApp.membership_no})` : ""],
        ["Scheme", selectedApp?.scheme_name],
        ["Sanctioned Amount", formatCurrency(Number(sanctionedAmount) || 0)],
        ["Interest Rate", `${interestRate}% p.a.`],
        ["Tenure", `${tenureMonths} months`],
        ["Repayment Type", repaymentMethodLabel(repaymentMethod)],
        ["Repayment Frequency", repaymentFrequencyLabel(repaymentFrequency)],
        ["Moratorium", `${parseInt(moratoriumPeriod) || 0} months`],
        // ["EMI", formatCurrency(calculatedEMI || 0)],
        ["Total Installments", String(emiSchedule.length)],
        ["Total Interest", formatCurrency(totalInterest || 0)],
        ["Total Payment", formatCurrency(totalPayment || 0)],
      ]
      const detailRows = []
      for (let i = 0; i < details.length; i += 2) {
        detailRows.push(
          `<tr>${details
            .slice(i, i + 2)
            .map(([label, value]) => `<th style="width:18%">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td>`)
            .join("")}</tr>`
        )
      }

      const contentHtml = `
        <style>
          /* Fixed column widths so amounts at the larger font never wrap or overlap */
          #pdf-body .rs-schedule { table-layout:fixed; }
          #pdf-body .rs-schedule th, #pdf-body .rs-schedule td { white-space:nowrap; }
        </style>
        <table>${detailRows.join("")}</table>
        <table class="rs-schedule">
          <colgroup>
            <col style="width:8%" /><col style="width:16%" />
            <col style="width:19%" /><col style="width:19%" />
            <col style="width:19%" /><col style="width:19%" />
          </colgroup>
          <thead>
            <tr>
              <th class="tc">No.</th><th>Due Date</th>
              <th class="tr">Principal</th><th class="tr">Interest</th>
              <th class="tr">Total</th><th class="tr">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${emiSchedule
              .map(
                (item) => `<tr>
                  <td class="tc">${item.installment_no}</td>
                  <td>${formatDueDatePdf(item.due_date)}</td>
                  <td class="tr">${formatCurrency(item.principal)}</td>
                  <td class="tr">${formatCurrency(item.interest)}</td>
                  <td class="tr">${formatCurrency(item.total)}</td>
                  <td class="tr">${formatCurrency(item.balance)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">Total</td>
              <td class="tr">${formatCurrency(sum("principal"))}</td>
              <td class="tr">${formatCurrency(sum("interest"))}</td>
              <td class="tr">${formatCurrency(sum("total"))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>`

      const generatedOn = identity?.businessDate
        ? new Date(identity.businessDate).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN")
      await downloadPdf(
        `Repayment Schedule ${selectedApp?.reference_no ?? ""}`.trim(),
        `Generated on ${generatedOn}`,
        branchInfo,
        contentHtml,
        // Larger text for readability; page breaks only between rows
        { fontScale: 1.5, avoidRowSplit: true }
      )
    } catch (error) {
      console.error("Failed to download repayment schedule:", error)
      setScheduleDownloadError("Failed to generate the PDF. Please try again.")
    } finally {
      setDownloadingSchedule(false)
    }
  }

  // Fetch identity
  useEffect(() => {
    fetch("/api/auth/identity", { credentials: "include" })
      .then((r) => r.json())
      .then(setIdentity)
  }, [])

  // Fetch security details for selected application
  const fetchSecurityDetails = async (appId: number) => {
    try {
      const res = await fetch(`/api/loans/applications?id=${appId}&include_security=true`)
      if (res.ok) {
        const data = await res.json()
        setSecurities(data.securities || [])
      }
    } catch (error) {
      console.error("Failed to fetch security details:", error)
    }
  }

  // Pre-fill the form for the application (parent remounts the panel per application via key)
  useEffect(() => {
    const app = selectedApp
    setLoadingDetails(true)
    setFormError("")

    // Pre-fill form with applied values
    setSanctionedAmount(app.applied_loan_amount.toString())
    setInterestRate(app.scheme_interest_rate?.toString() || "12")
    setTenureMonths(app.loan_tenure_months.toString())
    setMoratoriumPeriod("0")
    setRemarks("")
    setCalculatedEMI(null)
    setTotalInterest(null)
    setTotalPayment(null)
    setEmiSchedule([])

    // Default repayment type (installment count / first date follow from the schedule)
    setRepaymentMethod(DEFAULT_REPAYMENT_METHOD)
    setRepaymentFrequency(effectiveFrequency(DEFAULT_REPAYMENT_METHOD, null))
    setNumberOfInstallments(0)
    setInstallmentStartDate("")

    fetchSecurityDetails(app.loan_application_id).finally(() => setLoadingDetails(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Repayment calculation + schedule preview — same calculation the disbursement
  // uses for the saved schedule (lib/loan-repayment-schedule)
  const calculateEMI = useCallback(() => {
    const P = parseFloat(sanctionedAmount)
    const annualRate = parseFloat(interestRate)
    const tenureInMonths = parseInt(tenureMonths)

    const schedule =
      isNaN(P) || isNaN(annualRate) || isNaN(tenureInMonths) || P <= 0 || tenureInMonths <= 0
        ? []
        : buildRepaymentSchedule({
            principal: P,
            annualRate,
            tenureMonths: tenureInMonths,
            moratoriumMonths: parseInt(moratoriumPeriod) || 0,
            method: repaymentMethod,
            frequency: repaymentFrequency,
            startDate: identity?.businessDate || new Date(),
          })

    if (schedule.length === 0) {
      setCalculatedEMI(null)
      setTotalInterest(null)
      setTotalPayment(null)
      setEmiSchedule([])
      return
    }

    const totalInt = schedule.reduce((s, r) => s + r.interest, 0)
    const totalPay = schedule.reduce((s, r) => s + r.total, 0)
    setNumberOfInstallments(schedule.length)
    setInstallmentStartDate(schedule[0].due_date)
    // First instalment (On Maturity: the maturity amount; Fixed Principal: the largest instalment)
    setCalculatedEMI(schedule[0].total)
    setTotalInterest(Math.round(totalInt * 100) / 100)
    setTotalPayment(Math.round(totalPay * 100) / 100)
    setEmiSchedule(schedule)
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, repaymentMethod, repaymentFrequency, identity])

  // Auto-calculate when values change
  useEffect(() => {
    if (sanctionedAmount && interestRate && tenureMonths) {
      calculateEMI()
    }
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, repaymentMethod, repaymentFrequency, calculateEMI])

  // Inline validation for the Sanctioned Amount field
  const getAmountError = (): string => {
    if (!selectedApp || sanctionedAmount.trim() === "") return ""
    const amount = parseFloat(sanctionedAmount)
    if (isNaN(amount)) return "Please enter a valid sanctioned amount"
    if (amount < 0) return "Sanctioned amount cannot be negative"
    if (amount === 0) return "Sanctioned amount must be greater than zero"
    if (amount > Number(selectedApp.applied_loan_amount)) {
      return `Sanctioned amount cannot exceed applied amount (${formatCurrency(selectedApp.applied_loan_amount)})`
    }
    return ""
  }
  const amountError = getAmountError()

  // Validate form
  const validateForm = (): boolean => {
    setFormError("")

    const amount = parseFloat(sanctionedAmount)
    const rate = parseFloat(interestRate)
    const tenure = parseInt(tenureMonths)

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid sanctioned amount")
      return false
    }

    if (amountError) {
      setFormError(amountError)
      return false
    }

    if (isNaN(rate) || rate <= 0 || rate > 50) {
      setFormError("Please enter a valid interest rate (0-50%)")
      return false
    }

    if (isNaN(tenure) || tenure <= 0) {
      setFormError("Please enter a valid tenure in months")
      return false
    }

    if (selectedApp && tenure < (selectedApp.minimum_period_months || 1)) {
      setFormError(`Tenure must be at least ${selectedApp.minimum_period_months} months`)
      return false
    }

    if (selectedApp && tenure > (selectedApp.maximum_period_months || 360)) {
      setFormError(`Tenure cannot exceed ${selectedApp.maximum_period_months} months`)
      return false
    }

    return true
  }

  // Process approval
  const processApproval = async () => {
    if (!selectedApp) return
    if (!validateForm()) return

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/loans/sanction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_application_id: selectedApp.loan_application_id,
          action: "APPROVE",
          sanctioned_amount: parseFloat(sanctionedAmount),
          interest_rate: parseFloat(interestRate),
          loan_tenure_months: parseInt(tenureMonths),
          moratorium_period: parseInt(moratoriumPeriod) || 0,
          repayment_method: repaymentMethod,
          repayment_type: repaymentFrequency,
          installment_start_date: installmentStartDate,
          remarks: remarks,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve loan")
      }

      setShowConfirmDialog(false)
      onApproved({
        loanAppId: selectedApp.loan_application_id,
        message:
          `Loan sanctioned successfully!\n\n` +
          `Sanction ID: ${data.sanction_id}\n` +
          `Amount: ${formatCurrency(parseFloat(sanctionedAmount))}\n` +
          // `EMI: ${formatCurrency(data.emi_amount)}\n` +
          `Tenure: ${tenureMonths} months`,
      })
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Process rejection
  const processRejection = async () => {
    if (!selectedApp) return

    if (!rejectRemarks.trim()) {
      setFormError("Please provide a reason for rejection")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/loans/sanction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_application_id: selectedApp.loan_application_id,
          action: "REJECT",
          remarks: rejectRemarks,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to reject loan")
      }

      setShowRejectDialog(false)
      setRejectRemarks("")
      onRejected({ loanAppId: selectedApp.loan_application_id, message: "Loan application rejected successfully" })
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingDetails) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Application Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5 text-primary" />
                {selectedApp.member_name || "N/A"}
              </CardTitle>
              <CardDescription className="mt-1">
                Reference: {selectedApp.reference_no} | Membership: {selectedApp.membership_no}
              </CardDescription>
            </div>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="mr-1 h-3 w-3" />
              Pending Review
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Member & Loan Info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                Mobile
              </div>
              <p className="mt-1 font-medium">{selectedApp.mobile_no || "N/A"}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="h-3 w-3" />
                Aadhaar
              </div>
              <p className="mt-1 font-medium">{selectedApp.aadhaar_no ? `XXXX-XXXX-${selectedApp.aadhaar_no.slice(-4)}` : "N/A"}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Application Date
              </div>
              <p className="mt-1 font-medium">{new Date(selectedApp.application_date).toLocaleDateString("en-IN")}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Loan Type
              </div>
              <p className="mt-1 font-medium">{selectedApp.loan_type || "Term Loan"}</p>
            </div>
          </div>

          {/* Applied Amount & Scheme Details */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border-2 border-primary/20 p-3 bg-primary/5">
              <p className="text-xs text-muted-foreground">Applied Amount</p>
              <p className="mt-1 text-xl font-bold text-primary">{formatCurrency(selectedApp.applied_loan_amount)}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Scheme</p>
              <p className="mt-1 font-medium">{selectedApp.scheme_name}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Scheme Interest</p>
              <p className="mt-1 font-medium">{selectedApp.scheme_interest_rate || 12}% p.a.</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Tenure Range</p>
              <p className="mt-1 font-medium">{selectedApp.minimum_period_months || 1} - {selectedApp.maximum_period_months || 60} months</p>
            </div>
          </div>

          {/* Purpose */}
          {selectedApp.loan_purpose && (
            <div className="mt-4 rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Loan Purpose</p>
              <p className="mt-1 text-sm">{selectedApp.loan_purpose}</p>
            </div>
          )}

          {/* Security Details */}
          {securities.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Security / Collateral Details
              </h4>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Value</TableHead>
                      <TableHead className="text-xs">Document Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securities.map((sec) => (
                      <TableRow key={sec.security_id}>
                        <TableCell className="text-sm">{sec.security_type}</TableCell>
                        <TableCell className="text-sm">{sec.security_description}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatCurrency(sec.security_value)}</TableCell>
                        <TableCell className="text-sm">{sec.document_reference || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sanction Form Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Sanction Details
          </CardTitle>
          <CardDescription>Enter the sanctioned loan terms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Row 1: Amount and Interest */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sanctioned-amount">Sanctioned Amount *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sanctioned-amount"
                    type="number"
                    placeholder="Enter amount"
                    min="0"
                    max={selectedApp.applied_loan_amount}
                    value={sanctionedAmount}
                    onChange={(e) => setSanctionedAmount(e.target.value)}
                    aria-invalid={!!amountError}
                    className={`pl-9 ${NO_SPINNER_CLASS} ${amountError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    {...noStepProps}
                  />
                </div>
                {amountError ? (
                  <p className="text-xs text-red-500">{amountError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Max: {formatCurrency(selectedApp.applied_loan_amount)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (% p.a.)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="interest-rate"
                    type="number"
                    step="0.01"
                    placeholder="Enter rate"
                    value={interestRate}
                    className={`pl-9 ${NO_SPINNER_CLASS}`}
                    {...noStepProps}
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Tenure and Moratorium */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tenure">Tenure (Months) *</Label>
                <Input
                  id="tenure"
                  type="number"
                  placeholder="Enter tenure"
                  value={tenureMonths}
                  className={NO_SPINNER_CLASS}
                  {...noStepProps}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Min: {selectedApp.minimum_period_months || 1} | Max: {selectedApp.maximum_period_months || 60} months
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moratorium">Moratorium Period (Months)</Label>
                <Input
                  id="moratorium"
                  type="number"
                  placeholder="0"
                  value={moratoriumPeriod}
                  onChange={(e) => setMoratoriumPeriod(e.target.value)}
                  className={NO_SPINNER_CLASS}
                  {...noStepProps}
                />
                <p className="text-xs text-muted-foreground">Grace period before EMI starts</p>
              </div>
            </div>

            {/* Row 3: Repayment Type & Frequency */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="repayment-type">Repayment Type *</Label>
                <Select value={repaymentMethod} onValueChange={handleRepaymentMethodChange}>
                  <SelectTrigger id="repayment-type">
                    <SelectValue placeholder="Select repayment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAYMENT_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {repaymentMethod === "ON_MATURITY"
                    ? "Principal and interest repaid at the end of the tenure"
                    : "Equal principal each instalment, plus interest on the balance"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="repayment-frequency">Repayment Frequency *</Label>
                <Select
                  value={repaymentFrequency}
                  onValueChange={(v) => setRepaymentFrequency(v as RepaymentFrequency)}
                  disabled={repaymentMethod === "ON_MATURITY"}
                >
                  <SelectTrigger id="repayment-frequency">
                    <SelectValue placeholder="Select repayment frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAYMENT_FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {repaymentMethod === "ON_MATURITY" ? "Fixed to Closing Time for On Maturity" : "How often instalments are due"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="num-installments">Number of Installments</Label>
                <Input
                  id="num-installments"
                  type="number"
                  value={numberOfInstallments}
                  readOnly
                  className={`bg-muted ${NO_SPINNER_CLASS}`}
                  {...noStepProps}
                />
                <p className="text-xs text-muted-foreground">Auto-calculated</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installment-start">First Installment Date</Label>
                <Input
                  id="installment-start"
                  type="date"
                  value={installmentStartDate}
                  onChange={(e) => setInstallmentStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">When first payment is due</p>
              </div>
            </div>

            {/* EMI Calculation Summary */}
            {calculatedEMI && (
              <div className="rounded-lg border-2 border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/20 p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-teal-700 dark:text-teal-400">
                  <TrendingUp className="h-4 w-4" />
                  Repayment Calculation
                </h4>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {emiSchedule.length <= 1
                        ? "Amount Due at Closing"
                        : `First Instalment (${repaymentFrequencyLabel(repaymentFrequency)})`}
                    </p>
                    <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{formatCurrency(calculatedEMI)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Interest</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalInterest || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Payment</p>
                    <p className="text-lg font-semibold">{formatCurrency(totalPayment || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">No. of Installments</p>
                    <p className="text-lg font-semibold">{numberOfInstallments}</p>
                  </div>
                </div>
                {emiSchedule.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowScheduleDialog(true)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Repayment Schedule
                  </Button>
                )}
              </div>
            )}

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Enter any remarks or notes for sanction"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                if (validateForm()) {
                  setShowConfirmDialog(true)
                }
              }}
              disabled={!calculatedEMI || !!amountError}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve & Sanction
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Repayment Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Repayment Schedule</DialogTitle>
            <DialogDescription>
              Monthly EMI: {formatCurrency(calculatedEMI || 0)} | Total Installments: {emiSchedule.length}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">No.</TableHead>
                  <TableHead className="text-xs">Due Date</TableHead>
                  <TableHead className="text-xs text-right">Principal</TableHead>
                  <TableHead className="text-xs text-right">Interest</TableHead>
                  <TableHead className="text-xs text-right">Total EMI</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emiSchedule.map((item) => (
                  <TableRow key={item.installment_no}>
                    <TableCell>{item.installment_no}</TableCell>
                    <TableCell>{new Date(item.due_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.principal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.interest)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {scheduleDownloadError && <p className="text-sm text-red-500">{scheduleDownloadError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDownloadSchedule}
              disabled={downloadingSchedule || emiSchedule.length === 0}
            >
              {downloadingSchedule ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button onClick={() => setShowScheduleDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Approval Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Loan Sanction</DialogTitle>
            <DialogDescription>
              Please review the sanction details before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Member:</span>
              <span className="font-medium">{selectedApp?.member_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Applied Amount:</span>
              <span>{formatCurrency(selectedApp?.applied_loan_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sanctioned Amount:</span>
              <span className="font-bold text-teal-600">{formatCurrency(parseFloat(sanctionedAmount) || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest Rate:</span>
              <span>{interestRate}% p.a.</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tenure:</span>
              <span>{tenureMonths} months</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repayment Type:</span>
              <span>{repaymentMethodLabel(repaymentMethod)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repayment Frequency:</span>
              <span>{repaymentFrequencyLabel(repaymentFrequency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">No. of Installments:</span>
              <span>{numberOfInstallments}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">First Installment Date:</span>
              <span>{installmentStartDate ? new Date(installmentStartDate).toLocaleDateString("en-IN") : "-"}</span>
            </div>
            {/* <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-semibold">
                {repaymentType === "CLOSING_TIME" ? "Closing Amount:" :
                 repaymentType === "MONTHLY" ? "Monthly EMI:" :
                 repaymentType === "QUARTERLY" ? "Quarterly EMI:" :
                 repaymentType === "HALF_YEARLY" ? "Half-Yearly EMI:" : "Yearly EMI:"}
              </span>
              <span className="font-bold text-primary">{formatCurrency(calculatedEMI || 0)}</span>
            </div> */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={processApproval}
              disabled={isSubmitting || !!amountError}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Sanction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reject Loan Application
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this loan application.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-remarks">Rejection Reason *</Label>
            <Textarea
              id="reject-remarks"
              placeholder="Enter the reason for rejection..."
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={processRejection}
              disabled={isSubmitting || !rejectRemarks.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
