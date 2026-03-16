"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Search, CheckCircle, XCircle, AlertCircle, Clock, Loader2, Calculator, User, FileText, IndianRupee, Calendar, Percent, Building2, Phone, CreditCard, RefreshCw, TrendingUp, TrendingDown, Ban, Info } from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

type LoanApplication = {
  loan_application_id: number
  reference_no: string
  membership_no: string
  application_date: string
  applied_loan_amount: number
  loan_purpose: string
  application_status: string
  scheme_name: string
  loan_type: string
  scheme_interest_rate: number
  minimum_period_months: number
  maximum_period_months: number
  member_name: string
  mobile_no: string
  customer_code: string
  aadhaar_no: string
  sanction_id?: number
  sanctioned_amount?: number
  sanction_date?: string
  sanctioned_interest_rate?: number
  sanctioned_tenure?: number
  emi_amount?: number
  sanction_status?: string
  sanction_remarks?: string
}

type EMICalculation = {
  emi_amount: number
  total_amount: number
  total_interest: number
  schedule: Array<{
    installment_no: number
    principal: number
    interest: number
    total: number
    balance: number
  }>
}

function formatCurrency(val: number | string | undefined) {
  if (!val) return "---"
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | undefined) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function LoanSanctionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const applicationIdParam = searchParams.get("id")

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [pendingLoans, setPendingLoans] = useState<LoanApplication[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingList, setIsLoadingList] = useState(true)

  // Selected loan
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Sanction form state
  const [sanctionAction, setSanctionAction] = useState<"APPROVE" | "REJECT">("APPROVE")
  const [sanctionAmount, setSanctionAmount] = useState("")
  const [sanctionInterestRate, setSanctionInterestRate] = useState("")
  const [sanctionTenure, setSanctionTenure] = useState("")
  const [moratoriumPeriod, setMoratoriumPeriod] = useState("0")
  const [sanctionRemarks, setSanctionRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  // EMI Calculation
  const [emiCalculation, setEmiCalculation] = useState<EMICalculation | null>(null)
  const [isCalculatingEMI, setIsCalculatingEMI] = useState(false)

  // Success dialog
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Fetch pending loans
  const fetchPendingLoans = useCallback(async () => {
    try {
      setIsLoadingList(true)
      const res = await fetch("/api/loans/applications?status=PENDING")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPendingLoans(data.applications || [])
    } catch (error) {
      console.error("Failed to fetch pending loans:", error)
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  // Fetch specific loan by ID
  const fetchLoanById = useCallback(async (applicationId: string) => {
    try {
      setIsLoadingDetails(true)
      const res = await fetch(`/api/loans/applications?membershipNo=&status=all`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      const loan = data.applications?.find((l: LoanApplication) => 
        l.loan_application_id.toString() === applicationId
      )
      
      if (loan) {
        selectLoan(loan)
      }
    } catch (error) {
      console.error("Failed to fetch loan:", error)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingLoans()
  }, [fetchPendingLoans])

  useEffect(() => {
    if (applicationIdParam) {
      fetchLoanById(applicationIdParam)
    }
  }, [applicationIdParam, fetchLoanById])

  // Select a loan and prefill form
  const selectLoan = (loan: LoanApplication) => {
    setSelectedLoan(loan)
    setSanctionAmount(loan.applied_loan_amount.toString())
    setSanctionInterestRate(loan.scheme_interest_rate?.toString() || "12")
    setSanctionTenure(loan.minimum_period_months?.toString() || "12")
    setMoratoriumPeriod("0")
    setSanctionRemarks("")
    setSanctionAction("APPROVE")
    setFormError("")
    setEmiCalculation(null)
  }

  // Calculate EMI
  const calculateEMI = useCallback(async () => {
    if (!sanctionAmount || !sanctionInterestRate || !sanctionTenure) return

    const amount = parseFloat(sanctionAmount)
    const rate = parseFloat(sanctionInterestRate)
    const tenure = parseInt(sanctionTenure)

    if (amount <= 0 || rate < 0 || tenure <= 0) return

    setIsCalculatingEMI(true)

    try {
      const res = await fetch("/api/loans/calculate-emi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: amount,
          interest_rate: rate,
          tenure_months: tenure
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setEmiCalculation({
        emi_amount: data.emi_amount,
        total_amount: data.total_amount,
        total_interest: data.total_interest,
        schedule: data.schedule || []
      })
    } catch (error) {
      console.error("EMI calculation failed:", error)
      // Fallback to client-side calculation
      const P = amount
      const R = rate / 12 / 100
      const N = tenure

      let emi = 0
      if (R > 0) {
        emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1)
      } else {
        emi = P / N
      }
      emi = Math.round(emi * 100) / 100
      const totalAmount = emi * N
      const totalInterest = totalAmount - P

      setEmiCalculation({
        emi_amount: emi,
        total_amount: Math.round(totalAmount * 100) / 100,
        total_interest: Math.round(totalInterest * 100) / 100,
        schedule: []
      })
    } finally {
      setIsCalculatingEMI(false)
    }
  }, [sanctionAmount, sanctionInterestRate, sanctionTenure])

  // Auto-calculate EMI when values change
  useEffect(() => {
    if (sanctionAction === "APPROVE" && sanctionAmount && sanctionInterestRate && sanctionTenure) {
      const timer = setTimeout(() => {
        calculateEMI()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [sanctionAmount, sanctionInterestRate, sanctionTenure, sanctionAction, calculateEMI])

  // Process sanction
  const processSanction = async () => {
    if (!selectedLoan) return

    if (sanctionAction === "APPROVE") {
      if (!sanctionAmount || !sanctionInterestRate || !sanctionTenure) {
        setFormError("Please fill all required fields for approval")
        return
      }

      const amount = parseFloat(sanctionAmount)
      if (amount <= 0) {
        setFormError("Sanctioned amount must be greater than 0")
        return
      }

      if (amount > selectedLoan.applied_loan_amount * 1.1) {
        setFormError("Sanctioned amount cannot exceed applied amount by more than 10%")
        return
      }
    }

    if (sanctionAction === "REJECT" && !sanctionRemarks.trim()) {
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
          loan_application_id: selectedLoan.loan_application_id,
          action: sanctionAction,
          sanctioned_amount: sanctionAction === "APPROVE" ? parseFloat(sanctionAmount) : undefined,
          interest_rate: sanctionAction === "APPROVE" ? parseFloat(sanctionInterestRate) : undefined,
          loan_tenure_months: sanctionAction === "APPROVE" ? parseInt(sanctionTenure) : undefined,
          moratorium_period: sanctionAction === "APPROVE" ? parseInt(moratoriumPeriod) : undefined,
          remarks: sanctionRemarks
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setSuccessMessage(
        sanctionAction === "APPROVE" 
          ? `Loan ${selectedLoan.reference_no} approved successfully! EMI: ${formatCurrency(data.emi_amount)}`
          : `Loan ${selectedLoan.reference_no} has been rejected.`
      )
      setSuccessOpen(true)
      setSelectedLoan(null)
      fetchPendingLoans()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Search filter
  const filteredLoans = pendingLoans.filter(loan => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      loan.reference_no?.toLowerCase().includes(query) ||
      loan.member_name?.toLowerCase().includes(query) ||
      loan.membership_no?.toString().includes(query) ||
      loan.mobile_no?.includes(query)
    )
  })

  return (
    <DashboardWrapper>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/loans")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Loan Sanction</h1>
              <p className="text-muted-foreground">Review and approve/reject loan applications</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchPendingLoans} disabled={isLoadingList}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingList ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Pending Applications List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Applications
                <Badge variant="secondary" className="ml-auto">
                  {pendingLoans.length}
                </Badge>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, reference, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {isLoadingList ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLoans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500/50 mb-3" />
                    <p className="text-muted-foreground">No pending applications</p>
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredLoans.map((loan) => (
                      <div
                        key={loan.loan_application_id}
                        className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedLoan?.loan_application_id === loan.loan_application_id
                            ? "bg-primary/5 border-l-4 border-l-primary"
                            : ""
                        }`}
                        onClick={() => selectLoan(loan)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{loan.member_name}</p>
                            <p className="text-sm text-muted-foreground">{loan.reference_no}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(loan.applied_loan_amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">{loan.scheme_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(loan.application_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {loan.mobile_no || "---"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sanction Form */}
          <Card className="lg:col-span-3">
            {!selectedLoan ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6">
                <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Select an Application</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  Click on a pending application from the list to review and process sanction
                </p>
              </div>
            ) : (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedLoan.reference_no}
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {selectedLoan.member_name} | {selectedLoan.membership_no}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLoan(null)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="details">Application Details</TabsTrigger>
                      <TabsTrigger value="sanction">Sanction Form</TabsTrigger>
                      <TabsTrigger value="emi" disabled={!emiCalculation}>EMI Schedule</TabsTrigger>
                    </TabsList>

                    {/* Application Details Tab */}
                    <TabsContent value="details" className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Member Info */}
                        <Card className="border-muted">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              Member Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Name:</span>
                              <span className="font-medium">{selectedLoan.member_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Membership No:</span>
                              <span>{selectedLoan.membership_no}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Customer Code:</span>
                              <span>{selectedLoan.customer_code}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Mobile:</span>
                              <span>{selectedLoan.mobile_no || "---"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Aadhaar:</span>
                              <span>{selectedLoan.aadhaar_no ? `XXXX-XXXX-${selectedLoan.aadhaar_no.slice(-4)}` : "---"}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Loan Details */}
                        <Card className="border-muted">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-green-500" />
                              Loan Request
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Scheme:</span>
                              <span className="font-medium">{selectedLoan.scheme_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span>{selectedLoan.loan_type || "Term Loan"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Applied Amount:</span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency(selectedLoan.applied_loan_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Scheme Rate:</span>
                              <span>{selectedLoan.scheme_interest_rate}% p.a.</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tenure Range:</span>
                              <span>{selectedLoan.minimum_period_months} - {selectedLoan.maximum_period_months} months</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Purpose */}
                      {selectedLoan.loan_purpose && (
                        <Card className="border-muted">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4 text-purple-500" />
                              Loan Purpose
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{selectedLoan.loan_purpose}</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Sanction Form Tab */}
                    <TabsContent value="sanction" className="space-y-6">
                      {/* Action Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          type="button"
                          variant={sanctionAction === "APPROVE" ? "default" : "outline"}
                          className={`h-auto py-4 ${sanctionAction === "APPROVE" ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => setSanctionAction("APPROVE")}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="h-6 w-6" />
                            <span className="font-semibold">Approve</span>
                            <span className="text-xs opacity-80">Sanction the loan</span>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant={sanctionAction === "REJECT" ? "destructive" : "outline"}
                          className="h-auto py-4"
                          onClick={() => setSanctionAction("REJECT")}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Ban className="h-6 w-6" />
                            <span className="font-semibold">Reject</span>
                            <span className="text-xs opacity-80">Decline application</span>
                          </div>
                        </Button>
                      </div>

                      {sanctionAction === "APPROVE" && (
                        <>
                          {/* Amount and Rate */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                                Sanctioned Amount *
                              </Label>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={sanctionAmount}
                                onChange={(e) => setSanctionAmount(e.target.value)}
                                className="text-lg font-semibold"
                              />
                              <p className="text-xs text-muted-foreground">
                                Applied: {formatCurrency(selectedLoan.applied_loan_amount)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-muted-foreground" />
                                Interest Rate (% p.a.) *
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g., 12.5"
                                value={sanctionInterestRate}
                                onChange={(e) => setSanctionInterestRate(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Scheme Rate: {selectedLoan.scheme_interest_rate}%
                              </p>
                            </div>
                          </div>

                          {/* Tenure and Moratorium */}
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                Loan Tenure (Months) *
                              </Label>
                              <Input
                                type="number"
                                placeholder="e.g., 24"
                                value={sanctionTenure}
                                onChange={(e) => setSanctionTenure(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Range: {selectedLoan.minimum_period_months} - {selectedLoan.maximum_period_months} months
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                Moratorium Period (Months)
                              </Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={moratoriumPeriod}
                                onChange={(e) => setMoratoriumPeriod(e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                Grace period before EMI starts
                              </p>
                            </div>
                          </div>

                          {/* EMI Summary */}
                          {emiCalculation && (
                            <Card className="border-green-200 bg-green-50/50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                                  <Calculator className="h-4 w-4" />
                                  EMI Calculation Summary
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                  <div>
                                    <p className="text-2xl font-bold text-green-700">
                                      {formatCurrency(emiCalculation.emi_amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Monthly EMI</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold text-blue-600">
                                      {formatCurrency(emiCalculation.total_interest)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Interest</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-semibold">
                                      {formatCurrency(emiCalculation.total_amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Payable</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {isCalculatingEMI && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">Calculating EMI...</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Remarks */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Remarks {sanctionAction === "REJECT" && <span className="text-destructive">*</span>}
                        </Label>
                        <Textarea
                          placeholder={
                            sanctionAction === "REJECT"
                              ? "Please provide a reason for rejection (required)"
                              : "Any additional notes or conditions"
                          }
                          value={sanctionRemarks}
                          onChange={(e) => setSanctionRemarks(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Error message */}
                      {formError && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {formError}
                        </div>
                      )}
                    </TabsContent>

                    {/* EMI Schedule Tab */}
                    <TabsContent value="emi" className="space-y-4">
                      {emiCalculation && emiCalculation.schedule.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">No.</TableHead>
                                <TableHead className="text-right">Principal</TableHead>
                                <TableHead className="text-right">Interest</TableHead>
                                <TableHead className="text-right">EMI</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {emiCalculation.schedule.slice(0, 12).map((row) => (
                                <TableRow key={row.installment_no}>
                                  <TableCell className="font-medium">{row.installment_no}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(row.interest)}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(row.total)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(row.balance)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {emiCalculation.schedule.length > 12 && (
                            <div className="p-3 bg-muted/50 text-center text-sm text-muted-foreground">
                              Showing first 12 of {emiCalculation.schedule.length} installments
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Fill in the sanction details to generate EMI schedule</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>

                <CardFooter className="border-t bg-muted/30 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedLoan(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={processSanction}
                    disabled={isSubmitting}
                    variant={sanctionAction === "REJECT" ? "destructive" : "default"}
                    className={sanctionAction === "APPROVE" ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {sanctionAction === "APPROVE" ? "Approve & Sanction" : "Reject Application"}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </div>

        {/* Success Dialog */}
        <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Success
              </AlertDialogTitle>
              <AlertDialogDescription>{successMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setSuccessOpen(false)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardWrapper>
  )
}
