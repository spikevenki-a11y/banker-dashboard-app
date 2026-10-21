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

// Repayment type options
const repaymentTypeOptions = [
  { value: "CLOSING_TIME", label: "Closing Time", periodsPerYear: 0 },
  { value: "MONTHLY", label: "Monthly", periodsPerYear: 12 },
  { value: "QUARTERLY", label: "Quarterly", periodsPerYear: 4 },
  { value: "HALF_YEARLY", label: "Half Yearly", periodsPerYear: 2 },
  { value: "YEARLY", label: "Yearly", periodsPerYear: 1 },
]

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// Repayment type pre-selected for every application; the user can change it
const DEFAULT_REPAYMENT_TYPE = "CLOSING_TIME"

// Calculate number of installments based on tenure and repayment type
const calculateInstallments = (tenureInMonths: number, type: string): number => {
  if (type === "CLOSING_TIME") return 1
  const option = repaymentTypeOptions.find(o => o.value === type)
  if (!option || option.periodsPerYear === 0) return 1
  return Math.ceil((tenureInMonths / 12) * option.periodsPerYear)
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
  const [repaymentType, setRepaymentType] = useState(DEFAULT_REPAYMENT_TYPE)
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

  // Calculate first installment date
  const calculateFirstInstallmentDate = (type: string, moratorium: number): string => {
    const today = identity?.businessDate ? new Date(identity.businessDate) : new Date()
    let monthsToAdd = moratorium

    switch (type) {
      case "CLOSING_TIME":
        monthsToAdd += parseInt(tenureMonths) || 1
        break
      case "MONTHLY":
        monthsToAdd += 1
        break
      case "QUARTERLY":
        monthsToAdd += 3
        break
      case "HALF_YEARLY":
        monthsToAdd += 6
        break
      case "YEARLY":
        monthsToAdd += 12
        break
      default:
        monthsToAdd += 1
    }

    today.setMonth(today.getMonth() + monthsToAdd)
    return today.toISOString().split("T")[0]
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
        ["Repayment Type", repaymentType.replace(/_/g, " ")],
        ["Moratorium", `${parseInt(moratoriumPeriod) || 0} months`],
        ["EMI", formatCurrency(calculatedEMI || 0)],
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
        <table>${detailRows.join("")}</table>
        <table>
          <thead>
            <tr>
              <th class="tc">No.</th><th>Due Date</th>
              <th class="tr">Principal</th><th class="tr">Interest</th>
              <th class="tr">Total EMI</th><th class="tr">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${emiSchedule
              .map(
                (item) => `<tr>
                  <td class="tc">${item.installment_no}</td>
                  <td>${new Date(item.due_date).toLocaleDateString("en-IN")}</td>
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
        contentHtml
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
    const defaultTenure = app.minimum_period_months || 12
    setSanctionedAmount(app.applied_loan_amount.toString())
    setInterestRate(app.scheme_interest_rate?.toString() || "12")
    setTenureMonths(app.loan_tenure_months.toString())
    setMoratoriumPeriod("0")
    setRemarks("")
    setCalculatedEMI(null)
    setTotalInterest(null)
    setTotalPayment(null)
    setEmiSchedule([])

    // Default repayment type
    setRepaymentType(DEFAULT_REPAYMENT_TYPE)
    setNumberOfInstallments(calculateInstallments(defaultTenure, DEFAULT_REPAYMENT_TYPE))
    setInstallmentStartDate(calculateFirstInstallmentDate(DEFAULT_REPAYMENT_TYPE, 0))

    fetchSecurityDetails(app.loan_application_id).finally(() => setLoadingDetails(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate EMI based on repayment type
  const calculateEMI = useCallback(() => {
    const P = parseFloat(sanctionedAmount)
    const annualRate = parseFloat(interestRate)
    const tenureInMonths = parseInt(tenureMonths)

    if (isNaN(P) || isNaN(annualRate) || isNaN(tenureInMonths) || P <= 0 || tenureInMonths <= 0) {
      setCalculatedEMI(null)
      setTotalInterest(null)
      setTotalPayment(null)
      setEmiSchedule([])
      return
    }

    // Calculate number of installments based on repayment type
    const numInstallments = calculateInstallments(tenureInMonths, repaymentType)
    setNumberOfInstallments(numInstallments)

    // Calculate installment start date
    const moratorium = parseInt(moratoriumPeriod) || 0
    setInstallmentStartDate(calculateFirstInstallmentDate(repaymentType, moratorium))

    // Get months per period based on repayment type
    let monthsPerPeriod = 1
    switch (repaymentType) {
      case "CLOSING_TIME":
        monthsPerPeriod = tenureInMonths
        break
      case "MONTHLY":
        monthsPerPeriod = 1
        break
      case "QUARTERLY":
        monthsPerPeriod = 3
        break
      case "HALF_YEARLY":
        monthsPerPeriod = 6
        break
      case "YEARLY":
        monthsPerPeriod = 12
        break
    }

    // Calculate periodic interest rate
    const periodicRate = (annualRate / 12 / 100) * monthsPerPeriod
    const N = repaymentType === "CLOSING_TIME" ? 1 : numInstallments

    let emi: number
    if (repaymentType === "CLOSING_TIME") {
      // For closing time, total = principal + interest for full tenure
      const totalInterestAmount = P * (annualRate / 100) * (tenureInMonths / 12)
      emi = P + totalInterestAmount
    } else if (periodicRate > 0) {
      emi = (P * periodicRate * Math.pow(1 + periodicRate, N)) / (Math.pow(1 + periodicRate, N) - 1)
    } else {
      emi = P / N
    }

    emi = Math.round(emi * 100) / 100
    const totalPay = emi * N
    const totalInt = totalPay - P

    setCalculatedEMI(emi)
    setTotalInterest(Math.round(totalInt * 100) / 100)
    setTotalPayment(Math.round(totalPay * 100) / 100)

    // Generate repayment schedule
    const schedule: EMIScheduleItem[] = []
    let balance = P
    const today = identity?.businessDate ? new Date(identity.businessDate) : new Date()
    const moratoriumPeriodVal = parseInt(moratoriumPeriod) || 0

    for (let i = 1; i <= N; i++) {
      const dueDate = new Date(today)
      dueDate.setMonth(dueDate.getMonth() + (i * monthsPerPeriod) + moratoriumPeriodVal)

      const interestForPeriod = balance * periodicRate
      const principalForPeriod = emi - interestForPeriod
      balance = Math.max(0, balance - principalForPeriod)

      schedule.push({
        installment_no: i,
        due_date: dueDate.toISOString().split("T")[0],
        principal: Math.round(principalForPeriod * 100) / 100,
        interest: Math.round(interestForPeriod * 100) / 100,
        total: emi,
        balance: Math.round(balance * 100) / 100,
      })
    }

    setEmiSchedule(schedule)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, repaymentType, identity])

  // Auto-calculate when values change
  useEffect(() => {
    if (sanctionedAmount && interestRate && tenureMonths) {
      calculateEMI()
    }
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, repaymentType, calculateEMI])

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
          repayment_type: repaymentType,
          number_of_installments: numberOfInstallments,
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
          `EMI: ${formatCurrency(data.emi_amount)}\n` +
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
                    className={`pl-9 ${amountError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
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
                    className="pl-9"
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
                />
                <p className="text-xs text-muted-foreground">Grace period before EMI starts</p>
              </div>
            </div>

            {/* Row 3: Repayment Type */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="repayment-type">Repayment Type *</Label>
                <Select value={repaymentType} onValueChange={setRepaymentType}>
                  <SelectTrigger id="repayment-type">
                    <SelectValue placeholder="Select repayment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {repaymentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Default: Closing Time
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="num-installments">Number of Installments</Label>
                <Input
                  id="num-installments"
                  type="number"
                  value={numberOfInstallments}
                  readOnly
                  className="bg-muted"
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
                  {repaymentType === "CLOSING_TIME" ? "Repayment Calculation" : "EMI Calculation"}
                </h4>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {repaymentType === "CLOSING_TIME" ? "Closing Amount" :
                       repaymentType === "MONTHLY" ? "Monthly EMI" :
                       repaymentType === "QUARTERLY" ? "Quarterly EMI" :
                       repaymentType === "HALF_YEARLY" ? "Half-Yearly EMI" : "Yearly EMI"}
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
                {repaymentType !== "CLOSING_TIME" && (
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
              <span>{repaymentTypeOptions.find(o => o.value === repaymentType)?.label || repaymentType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">No. of Installments:</span>
              <span>{numberOfInstallments}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">First Installment Date:</span>
              <span>{installmentStartDate ? new Date(installmentStartDate).toLocaleDateString("en-IN") : "-"}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-semibold">
                {repaymentType === "CLOSING_TIME" ? "Closing Amount:" :
                 repaymentType === "MONTHLY" ? "Monthly EMI:" :
                 repaymentType === "QUARTERLY" ? "Quarterly EMI:" :
                 repaymentType === "HALF_YEARLY" ? "Half-Yearly EMI:" : "Yearly EMI:"}
              </span>
              <span className="font-bold text-primary">{formatCurrency(calculatedEMI || 0)}</span>
            </div>
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
