"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  FileText,
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
  RefreshCw,
  ChevronRight,
  Building2,
  Phone,
  CreditCard,
  Banknote,
  Receipt,
  CheckCircle2,
} from "lucide-react"

interface LoanApplication {
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

export default function LoanSanctionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // URL parameter for pre-selected application
  const preSelectedAppId = searchParams.get("appId")

  // Identity for business date
  const [identity, setIdentity] = useState<{ businessDate?: string } | null>(null)

  // Search and list state
  const [searchQuery, setSearchQuery] = useState("")
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Selected application
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null)
  const [securities, setSecurities] = useState<SecurityDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Sanction form
  const [sanctionedAmount, setSanctionedAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [tenureMonths, setTenureMonths] = useState("")
  const [moratoriumPeriod, setMoratoriumPeriod] = useState("0")
  const [remarks, setRemarks] = useState("")
  
  // Repayment details
  const [repaymentType, setRepaymentType] = useState("MONTHLY")
  const [numberOfInstallments, setNumberOfInstallments] = useState(0)
  const [installmentStartDate, setInstallmentStartDate] = useState("")

  // EMI calculation
  const [calculatedEMI, setCalculatedEMI] = useState<number | null>(null)
  const [totalInterest, setTotalInterest] = useState<number | null>(null)
  const [totalPayment, setTotalPayment] = useState<number | null>(null)
  const [emiSchedule, setEmiSchedule] = useState<EMIScheduleItem[]>([])
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [sanctionedLoanAppId, setSanctionedLoanAppId] = useState<number | null>(null)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Repayment type options
  const repaymentTypeOptions = [
    { value: "CLOSING_TIME", label: "Closing Time", periodsPerYear: 0 },
    { value: "MONTHLY", label: "Monthly", periodsPerYear: 12 },
    { value: "QUARTERLY", label: "Quarterly", periodsPerYear: 4 },
    { value: "HALF_YEARLY", label: "Half Yearly", periodsPerYear: 2 },
    { value: "YEARLY", label: "Yearly", periodsPerYear: 1 },
  ]

  // Suggest repayment type based on tenure
  const suggestRepaymentType = (tenureInMonths: number): string => {
    if (tenureInMonths <= 1) return "CLOSING_TIME"
    if (tenureInMonths <= 12) return "MONTHLY"
    if (tenureInMonths <= 24) return "MONTHLY"
    if (tenureInMonths <= 36) return "QUARTERLY"
    if (tenureInMonths <= 60) return "HALF_YEARLY"
    return "YEARLY"
  }

  // Calculate number of installments based on tenure and repayment type
  const calculateInstallments = (tenureInMonths: number, type: string): number => {
    if (type === "CLOSING_TIME") return 1
    const option = repaymentTypeOptions.find(o => o.value === type)
    if (!option || option.periodsPerYear === 0) return 1
    return Math.ceil((tenureInMonths / 12) * option.periodsPerYear)
  }

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

  // Fetch identity
  useEffect(() => {
    fetch("/api/auth/identity", { credentials: "include" })
      .then((r) => r.json())
      .then(setIdentity)
  }, [])

  // Fetch pending applications
  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/loans/applications?status=PENDING")
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications || [])
        
        // If pre-selected app ID, select it
        if (preSelectedAppId && data.applications) {
          const app = data.applications.find(
            (a: LoanApplication) => a.loan_application_id === parseInt(preSelectedAppId)
          )
          if (app) {
            selectApplication(app)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [preSelectedAppId])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

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

  // Select application
  const selectApplication = async (app: LoanApplication) => {
    setSelectedApp(app)
    setLoadingDetails(true)
    setFormError("")

    // Pre-fill form with applied values
    const defaultTenure = app.minimum_period_months || 12
    setSanctionedAmount(app.applied_loan_amount.toString())
    setInterestRate(app.scheme_interest_rate?.toString() || "12")
    setTenureMonths(defaultTenure.toString())
    setMoratoriumPeriod("0")
    setRemarks("")
    setCalculatedEMI(null)
    setTotalInterest(null)
    setTotalPayment(null)
    setEmiSchedule([])
    
    // Set suggested repayment type based on tenure
    const suggestedType = suggestRepaymentType(defaultTenure)
    setRepaymentType(suggestedType)
    setNumberOfInstallments(calculateInstallments(defaultTenure, suggestedType))
    setInstallmentStartDate(calculateFirstInstallmentDate(suggestedType, 0))

    await fetchSecurityDetails(app.loan_application_id)
    setLoadingDetails(false)
  }

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
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, repaymentType, identity])

  // Auto-calculate when values change
  useEffect(() => {
    if (sanctionedAmount && interestRate && tenureMonths) {
      calculateEMI()
    }
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, repaymentType, calculateEMI])

  // Update suggested repayment type when tenure changes
  useEffect(() => {
    if (tenureMonths) {
      const tenure = parseInt(tenureMonths)
      if (!isNaN(tenure) && tenure > 0) {
        const suggested = suggestRepaymentType(tenure)
        setRepaymentType(suggested)
      }
    }
  }, [tenureMonths])

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

      // Store the loan application ID for navigation to disbursement
      const loanAppId = selectedApp.loan_application_id
      setSanctionedLoanAppId(loanAppId)
      
      setSuccessMessage(
        `Loan sanctioned successfully!\n\n` +
        `Sanction ID: ${data.sanction_id}\n` +
        `Amount: ${formatCurrency(parseFloat(sanctionedAmount))}\n` +
        `EMI: ${formatCurrency(data.emi_amount)}\n` +
        `Tenure: ${tenureMonths} months`
      )
      setSuccessOpen(true)
      setShowConfirmDialog(false)
      
      // Remove from list and reset
      setApplications(prev => prev.filter(a => a.loan_application_id !== loanAppId))
      setSelectedApp(null)
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
      setSuccessMessage("Loan application rejected successfully")
      setSuccessOpen(true)
      
      // Remove from list and reset
      setApplications(prev => prev.filter(a => a.loan_application_id !== selectedApp.loan_application_id))
      setSelectedApp(null)
      setRejectRemarks("")
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter applications
  const filteredApplications = applications.filter(
    (app) =>
      app.reference_no?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.membership_no?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchApplications()
  }

  // Reset form
  const handleReset = () => {
    setSelectedApp(null)
    setSanctionedAmount("")
    setInterestRate("")
    setTenureMonths("")
    setMoratoriumPeriod("0")
    setRemarks("")
    setFormError("")
    setSecurities([])
    setCalculatedEMI(null)
    setTotalInterest(null)
    setTotalPayment(null)
    setEmiSchedule([])
    setRepaymentType("MONTHLY")
    setNumberOfInstallments(0)
    setInstallmentStartDate("")
    setSanctionedLoanAppId(null)
  }

  return (
    <DashboardWrapper>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/loans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Loan Sanction</h1>
            <p className="text-sm text-muted-foreground">Review and approve or reject loan applications</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Panel: Applications List */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pending Applications</CardTitle>
                <CardDescription>{applications.length} applications awaiting review</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, name, membership..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">No pending applications</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-22rem)] overflow-y-auto divide-y">
                    {filteredApplications.map((app) => (
                      <button
                        key={app.loan_application_id}
                        onClick={() => selectApplication(app)}
                        className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                          selectedApp?.loan_application_id === app.loan_application_id 
                            ? "bg-primary/5 border-l-4 border-l-primary" 
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{app.member_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">
                              Ref: {app.reference_no} | {app.membership_no}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-primary">{formatCurrency(app.applied_loan_amount)}</span>
                          <Badge variant="outline" className="text-xs">
                            {app.scheme_name}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Applied: {new Date(app.application_date).toLocaleDateString("en-IN")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Application Details & Sanction Form */}
          <div className="lg:col-span-8">
            {!selectedApp ? (
              <Card className="h-full">
                <CardContent className="flex h-96 flex-col items-center justify-center text-center">
                  <Shield className="h-16 w-16 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">Select an Application</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a pending application from the list to review and process
                  </p>
                </CardContent>
              </Card>
            ) : loadingDetails ? (
              <Card className="h-full">
                <CardContent className="flex h-96 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
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
                              value={sanctionedAmount}
                              onChange={(e) => setSanctionedAmount(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interest-rate">Interest Rate (% p.a.) *</Label>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="interest-rate"
                              type="number"
                              step="0.01"
                              placeholder="Enter rate"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value)}
                              className="pl-9"
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
                            onChange={(e) => setTenureMonths(e.target.value)}
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
                            Suggested based on tenure
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
                    <Button variant="outline" onClick={handleReset}>
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
                        disabled={!calculatedEMI}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve & Sanction
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </div>

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
            <DialogFooter>
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
                disabled={isSubmitting}
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

        {/* Success Dialog */}
        <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                <CheckCircle2 className="h-5 w-5" />
                {successMessage.includes("sanctioned") ? "Loan Sanctioned Successfully!" : "Success"}
              </AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {successMessage}
                {successMessage.includes("sanctioned") && (
                  <span className="block mt-3 text-muted-foreground">
                    You can now proceed to disburse this loan or return to process more applications.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogAction 
                onClick={() => setSuccessOpen(false)}
                className={successMessage.includes("sanctioned") ? "bg-muted text-foreground hover:bg-muted/80" : ""}
              >
                {successMessage.includes("sanctioned") ? "Stay Here" : "OK"}
              </AlertDialogAction>
              {successMessage.includes("sanctioned") && sanctionedLoanAppId && (
                <AlertDialogAction
                  onClick={() => {
                    setSuccessOpen(false)
                    router.push(`/loans/disbursement?loanId=${sanctionedLoanAppId}`)
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Proceed to Disbursement
                  <ChevronRight className="ml-1 h-4 w-4" />
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardWrapper>
  )
}
