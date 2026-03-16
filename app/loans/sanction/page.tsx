"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import DashboardWrapper from "@/app/_components/dashboard-wrapper"
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
} from "lucide-react"

interface LoanApplication {
  loan_application_id: number
  reference_no: string
  membership_no: string
  member_name: string
  scheme_id: number
  scheme_name: string
  loan_purpose: string
  applied_loan_amount: number
  application_date: string
  application_status: string
  scheme_interest_rate: number
  scheme_min_period: number
  scheme_max_period: number
  scheme_max_amount: number
  collateral_required: boolean
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
  const { user } = useAuth()

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
  const [showSchedule, setShowSchedule] = useState(false)

  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Fetch pending applications
  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/loans/applications?status=PENDING")
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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
    setSuccessMessage("")

    // Pre-fill form with applied values
    setSanctionedAmount(app.applied_loan_amount.toString())
    setInterestRate(app.scheme_interest_rate.toString())
    setTenureMonths(app.scheme_min_period.toString())
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

    if (selectedApp && amount > selectedApp.scheme_max_amount) {
      setFormError(`Amount exceeds maximum limit of ${formatCurrency(selectedApp.scheme_max_amount)}`)
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

    if (selectedApp && tenure < selectedApp.scheme_min_period) {
      setFormError(`Tenure must be at least ${selectedApp.scheme_min_period} months`)
      return false
    }

    if (selectedApp && tenure > selectedApp.scheme_max_period) {
      setFormError(`Tenure cannot exceed ${selectedApp.scheme_max_period} months`)
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

      setSuccessMessage(`Loan approved successfully! Sanction ID: ${data.sanction_id}, EMI: ${formatCurrency(data.emi_amount)}`)
      
      // Remove from list and reset
      setApplications(prev => prev.filter(a => a.loan_application_id !== selectedApp.loan_application_id))
      setTimeout(() => {
        setSelectedApp(null)
        setSuccessMessage("")
      }, 3000)
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
      setSuccessMessage("Loan application rejected")
      
      // Remove from list and reset
      setApplications(prev => prev.filter(a => a.loan_application_id !== selectedApp.loan_application_id))
      setTimeout(() => {
        setSelectedApp(null)
        setSuccessMessage("")
        setRejectRemarks("")
      }, 2000)
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter applications
  const filteredApplications = applications.filter(
    (app) =>
      app.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.membership_no.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchApplications()
  }

  return (
    <DashboardWrapper>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push("/loans")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Loan Sanction</h1>
              <p className="text-sm text-muted-foreground">Review and approve or reject loan applications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Applications List */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pending Applications</CardTitle>
                <CardDescription>{applications.length} applications awaiting review</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, name, or membership..."
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
                  <div className="max-h-[calc(100vh-20rem)] overflow-y-auto divide-y">
                    {filteredApplications.map((app) => (
                      <button
                        key={app.loan_application_id}
                        onClick={() => selectApplication(app)}
                        className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                          selectedApp?.loan_application_id === app.loan_application_id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{app.member_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {app.reference_no} | {app.membership_no}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {app.scheme_name}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-primary">{formatCurrency(app.applied_loan_amount)}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(app.application_date).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          Purpose: {app.loan_purpose || "Not specified"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sanction Form */}
          <div className="lg:col-span-3">
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
            ) : (
              <div className="space-y-4">
                {/* Success/Error Messages */}
                {successMessage && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-400">{successMessage}</AlertDescription>
                  </Alert>
                )}
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {/* Application Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          {selectedApp.member_name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedApp.reference_no} | Membership: {selectedApp.membership_no}
                        </CardDescription>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Applied Amount</p>
                        <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(selectedApp.applied_loan_amount)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Scheme</p>
                        <p className="mt-1 font-medium">{selectedApp.scheme_name}</p>
                        <p className="text-xs text-muted-foreground">Max: {formatCurrency(selectedApp.scheme_max_amount)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Scheme Interest</p>
                        <p className="mt-1 font-medium">{selectedApp.scheme_interest_rate}% p.a.</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Tenure Range</p>
                        <p className="mt-1 font-medium">{selectedApp.scheme_min_period} - {selectedApp.scheme_max_period} months</p>
                      </div>
                    </div>

                    {selectedApp.loan_purpose && (
                      <div className="mt-4 rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Loan Purpose</p>
                        <p className="mt-1 text-sm">{selectedApp.loan_purpose}</p>
                      </div>
                    )}

                    {/* Security/Collateral Details */}
                    {loadingDetails ? (
                      <div className="mt-4 flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : securities.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          Security / Collateral Details
                        </p>
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs text-right">Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {securities.map((sec) => (
                                <TableRow key={sec.security_id}>
                                  <TableCell className="text-xs">{sec.security_type}</TableCell>
                                  <TableCell className="text-xs">{sec.security_description}</TableCell>
                                  <TableCell className="text-xs text-right font-medium">{formatCurrency(sec.security_value)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={2} className="text-xs font-medium">Total Security Value</TableCell>
                                <TableCell className="text-xs text-right font-bold text-primary">
                                  {formatCurrency(securities.reduce((s, sec) => s + sec.security_value, 0))}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sanction Parameters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      Sanction Parameters
                    </CardTitle>
                    <CardDescription>Configure loan terms for approval</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="sanctionedAmount" className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          Sanctioned Amount *
                        </Label>
                        <Input
                          id="sanctionedAmount"
                          type="number"
                          value={sanctionedAmount}
                          onChange={(e) => setSanctionedAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {formatCurrency(selectedApp.scheme_max_amount)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interestRate" className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Interest Rate (% p.a.) *
                        </Label>
                        <Input
                          id="interestRate"
                          type="number"
                          step="0.01"
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                          placeholder="Enter rate"
                        />
                        <p className="text-xs text-muted-foreground">
                          Scheme rate: {selectedApp.scheme_interest_rate}%
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tenureMonths" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Loan Tenure (Months) *
                        </Label>
                        <Input
                          id="tenureMonths"
                          type="number"
                          value={tenureMonths}
                          onChange={(e) => setTenureMonths(e.target.value)}
                          placeholder="Enter tenure"
                        />
                        <p className="text-xs text-muted-foreground">
                          Range: {selectedApp.scheme_min_period} - {selectedApp.scheme_max_period} months
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="moratorium" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Moratorium Period (Months)
                        </Label>
                        <Select value={moratoriumPeriod} onValueChange={setMoratoriumPeriod}>
                          <SelectTrigger id="moratorium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No Moratorium</SelectItem>
                            <SelectItem value="1">1 Month</SelectItem>
                            <SelectItem value="2">2 Months</SelectItem>
                            <SelectItem value="3">3 Months</SelectItem>
                            <SelectItem value="6">6 Months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks">Remarks / Conditions</Label>
                      <Textarea
                        id="remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Add any special conditions or notes for this sanction..."
                        rows={2}
                      />
                    </div>

                    {/* EMI Summary */}
                    {calculatedEMI && (
                      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            EMI Calculation Summary
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSchedule(true)}
                            className="text-xs"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View Schedule
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="text-center p-3 rounded-lg bg-background/80">
                            <p className="text-xs text-muted-foreground">Monthly EMI</p>
                            <p className="text-xl font-bold text-primary">{formatCurrency(calculatedEMI)}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-background/80">
                            <p className="text-xs text-muted-foreground">Total Interest</p>
                            <p className="text-lg font-semibold text-foreground">{formatCurrency(totalInterest || 0)}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-background/80">
                            <p className="text-xs text-muted-foreground">Total Repayment</p>
                            <p className="text-lg font-semibold text-foreground">{formatCurrency(totalPayment || 0)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4">
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isSubmitting}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Application
                    </Button>
                    <Button onClick={processApproval} disabled={isSubmitting || !calculatedEMI}>
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve & Sanction
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* EMI Schedule Dialog */}
        <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>EMI Repayment Schedule</DialogTitle>
              <DialogDescription>
                {selectedApp?.member_name} - {selectedApp?.reference_no}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">No.</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs text-right">Principal</TableHead>
                    <TableHead className="text-xs text-right">Interest</TableHead>
                    <TableHead className="text-xs text-right">EMI</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emiSchedule.map((item) => (
                    <TableRow key={item.installment_no}>
                      <TableCell className="text-sm">{item.installment_no}</TableCell>
                      <TableCell className="text-sm">{new Date(item.due_date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.principal)}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.interest)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setShowSchedule(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Reject Application
              </DialogTitle>
              <DialogDescription>
                This will reject the loan application. Please provide a reason for rejection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm">
                  <span className="text-muted-foreground">Applicant:</span>{" "}
                  <span className="font-medium">{selectedApp?.member_name}</span>
                </p>
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-medium">{formatCurrency(selectedApp?.applied_loan_amount || 0)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectRemarks">Reason for Rejection *</Label>
                <Textarea
                  id="rejectRemarks"
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Enter the reason for rejecting this application..."
                  rows={3}
                />
              </div>
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
    </DashboardWrapper>
  )
}
