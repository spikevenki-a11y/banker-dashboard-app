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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
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
    setSanctionedAmount(app.applied_loan_amount.toString())
    setInterestRate(app.scheme_interest_rate?.toString() || "12")
    setTenureMonths(app.minimum_period_months?.toString() || "12")
    setMoratoriumPeriod("0")
    setRemarks("")
    setCalculatedEMI(null)
    setTotalInterest(null)
    setTotalPayment(null)
    setEmiSchedule([])

    await fetchSecurityDetails(app.loan_application_id)
    setLoadingDetails(false)
  }

  // Calculate EMI
  const calculateEMI = useCallback(() => {
    const P = parseFloat(sanctionedAmount)
    const annualRate = parseFloat(interestRate)
    const N = parseInt(tenureMonths)

    if (isNaN(P) || isNaN(annualRate) || isNaN(N) || P <= 0 || N <= 0) {
      setCalculatedEMI(null)
      setTotalInterest(null)
      setTotalPayment(null)
      setEmiSchedule([])
      return
    }

    const R = annualRate / 12 / 100 // Monthly interest rate

    let emi: number
    if (R > 0) {
      emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1)
    } else {
      emi = P / N
    }

    emi = Math.round(emi * 100) / 100
    const totalPay = emi * N
    const totalInt = totalPay - P

    setCalculatedEMI(emi)
    setTotalInterest(Math.round(totalInt * 100) / 100)
    setTotalPayment(Math.round(totalPay * 100) / 100)

    // Generate EMI schedule
    const schedule: EMIScheduleItem[] = []
    let balance = P
    const today = new Date()
    const moratorium = parseInt(moratoriumPeriod) || 0

    for (let i = 1; i <= N; i++) {
      const dueDate = new Date(today)
      dueDate.setMonth(dueDate.getMonth() + i + moratorium)

      const interestForMonth = balance * R
      const principalForMonth = emi - interestForMonth
      balance = Math.max(0, balance - principalForMonth)

      schedule.push({
        installment_no: i,
        due_date: dueDate.toISOString().split("T")[0],
        principal: Math.round(principalForMonth * 100) / 100,
        interest: Math.round(interestForMonth * 100) / 100,
        total: emi,
        balance: Math.round(balance * 100) / 100,
      })
    }

    setEmiSchedule(schedule)
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod])

  // Auto-calculate when values change
  useEffect(() => {
    if (sanctionedAmount && interestRate && tenureMonths) {
      calculateEMI()
    }
  }, [sanctionedAmount, interestRate, tenureMonths, moratoriumPeriod, calculateEMI])

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
          remarks: remarks,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to approve loan")
      }

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
      setApplications(prev => prev.filter(a => a.loan_application_id !== selectedApp.loan_application_id))
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

                      {/* EMI Calculation Summary */}
                      {calculatedEMI && (
                        <div className="rounded-lg border-2 border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/20 p-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-teal-700 dark:text-teal-400">
                            <TrendingUp className="h-4 w-4" />
                            EMI Calculation
                          </h4>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Monthly EMI</p>
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
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => setShowScheduleDialog(true)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Repayment Schedule
                          </Button>
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
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-semibold">Monthly EMI:</span>
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
                Success
              </AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {successMessage}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setSuccessOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardWrapper>
  )
}
