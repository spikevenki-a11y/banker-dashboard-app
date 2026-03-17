"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Wallet,
  CreditCard,
  Search,
  User,
  Phone,
  Calendar,
  IndianRupee,
  Percent,
  Clock,
  Banknote,
  Building2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Receipt,
  FileText,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type SanctionedLoan = {
  id: string
  loan_application_id: number
  reference_no: string
  membership_no: string
  member_name: string
  mobile_no: string
  aadhaar_no: string
  scheme_name: string
  loan_type: string
  applied_loan_amount: number
  sanctioned_amount: number
  interest_rate: number
  tenure_months: number
  emi_amount: number
  sanction_date: string
  application_status: string
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function LoanDisbursementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // URL parameter for pre-selected loan
  const preSelectedLoanId = searchParams.get("loanId")

  // Identity for business date
  const [identity, setIdentity] = useState<{ businessDate?: string } | null>(null)

  // State
  const [sanctionedLoans, setSanctionedLoans] = useState<SanctionedLoan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLoan, setSelectedLoan] = useState<SanctionedLoan | null>(null)

  // Disbursement form
  const [disbursementAmount, setDisbursementAmount] = useState("")
  const [disbursementMode, setDisbursementMode] = useState<"CASH" | "TRANSFER">("CASH")
  const [narration, setNarration] = useState("")

  // Batch selection for Transfer mode
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  // Fetch identity
  useEffect(() => {
    fetch("/api/auth/identity", { credentials: "include" })
      .then((r) => r.json())
      .then(setIdentity)
  }, [])

  // Fetch sanctioned loans
  const fetchSanctionedLoans = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/loans/applications?status=SANCTIONED")
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      const formatted = (data.applications || []).map((app: any) => ({
        id: app.loan_application_id?.toString(),
        loan_application_id: app.loan_application_id,
        reference_no: app.reference_no,
        membership_no: app.membership_no,
        member_name: app.member_name || 'N/A',
        mobile_no: app.mobile_no || '',
        aadhaar_no: app.aadhaar_no || '',
        scheme_name: app.scheme_name,
        loan_type: app.loan_type || 'Term Loan',
        applied_loan_amount: parseFloat(app.applied_loan_amount) || 0,
        sanctioned_amount: parseFloat(app.sanctioned_amount) || 0,
        interest_rate: parseFloat(app.sanctioned_interest_rate) || 0,
        tenure_months: parseInt(app.sanctioned_tenure) || 0,
        emi_amount: parseFloat(app.emi_amount) || 0,
        sanction_date: app.sanction_date,
        application_status: app.application_status
      }))

      setSanctionedLoans(formatted)

      // If pre-selected loan ID, select it
      if (preSelectedLoanId) {
        const loan = formatted.find((l: SanctionedLoan) => l.loan_application_id === parseInt(preSelectedLoanId))
        if (loan) {
          selectLoanForDisbursement(loan)
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch sanctioned loans:", error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [preSelectedLoanId])

  useEffect(() => {
    fetchSanctionedLoans()
  }, [fetchSanctionedLoans])

  // Select loan for disbursement
  const selectLoanForDisbursement = (loan: SanctionedLoan) => {
    setSelectedLoan(loan)
    setDisbursementAmount(loan.sanctioned_amount.toString())
    setDisbursementMode("CASH")
    setNarration("")
    setSelectedBatch(0)
    setFormError("")
  }

  // Load incomplete batches for transfer mode
  const loadIncompleteBatches = async () => {
    setIsBatchPopupOpen(true)
    try {
      const res = await fetch("/api/fas/incomplete-batches", {
        method: "GET",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load batches")
      setIncompleteBatches(data.data || [])
    } catch (err: any) {
      console.error("Load incomplete batches error:", err)
      setIncompleteBatches([])
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    setFormError("")

    if (!selectedLoan) {
      setFormError("Please select a loan to disburse")
      return false
    }

    const amount = parseFloat(disbursementAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid disbursement amount")
      return false
    }

    if (amount > selectedLoan.sanctioned_amount) {
      setFormError("Disbursement amount cannot exceed sanctioned amount")
      return false
    }

    if (!disbursementMode) {
      setFormError("Please select a payment mode")
      return false
    }

    return true
  }

  // Process disbursement
  const processDisbursement = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/loans/disbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_application_id: selectedLoan!.loan_application_id,
          disbursement_amount: parseFloat(disbursementAmount),
          disbursement_mode: disbursementMode,
          narration: narration || "Loan Disbursement",
          selectedBatch: selectedBatch
        })
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setSuccessMessage(
        `Loan disbursed successfully!\n\n` +
        `Loan Account: ${data.loan_account_no}\n` +
        `Amount: ${formatCurrency(parseFloat(disbursementAmount))}\n` +
        `EMI Amount: ${formatCurrency(data.emi_amount)}\n` +
        `Total EMIs: ${data.total_installments}\n` +
        `Voucher No: ${data.voucher_no}`
      )
      setSuccessOpen(true)
      setShowConfirmDialog(false)
      setSelectedLoan(null)
      fetchSanctionedLoans()

    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter loans
  const filteredLoans = sanctionedLoans.filter(
    (loan) =>
      loan.reference_no?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.membership_no?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchSanctionedLoans()
  }

  // Reset form
  const handleReset = () => {
    setSelectedLoan(null)
    setDisbursementAmount("")
    setDisbursementMode("CASH")
    setNarration("")
    setSelectedBatch(0)
    setFormError("")
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Loan Disbursement</h1>
            <p className="text-sm text-muted-foreground">Disburse sanctioned loans to members</p>
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
          {/* Left Panel: Sanctioned Loans List */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sanctioned Loans</CardTitle>
                <CardDescription>{sanctionedLoans.length} loans ready for disbursement</CardDescription>
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
                {isLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLoans.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                    <Wallet className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">No sanctioned loans pending disbursement</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-22rem)] overflow-y-auto divide-y">
                    {filteredLoans.map((loan) => (
                      <button
                        key={loan.id}
                        onClick={() => selectLoanForDisbursement(loan)}
                        className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                          selectedLoan?.id === loan.id 
                            ? "bg-primary/5 border-l-4 border-l-primary" 
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{loan.member_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Ref: {loan.reference_no} | {loan.membership_no}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-teal-600">{formatCurrency(loan.sanctioned_amount)}</span>
                          <Badge variant="outline" className="text-xs">
                            {loan.scheme_name}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>EMI: {formatCurrency(loan.emi_amount)}</span>
                          <span>{loan.tenure_months} months</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Disbursement Form */}
          <div className="lg:col-span-7">
            {!selectedLoan ? (
              <Card className="h-full">
                <CardContent className="flex h-96 flex-col items-center justify-center text-center">
                  <Banknote className="h-16 w-16 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">Select a Loan</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a sanctioned loan from the list to proceed with disbursement
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Loan Details Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <User className="h-5 w-5 text-primary" />
                          {selectedLoan.member_name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Reference: {selectedLoan.reference_no} | Membership: {selectedLoan.membership_no}
                        </CardDescription>
                      </div>
                      <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Sanctioned
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Member Info */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          Mobile
                        </div>
                        <p className="mt-1 font-medium">{selectedLoan.mobile_no || "N/A"}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          Aadhaar
                        </div>
                        <p className="mt-1 font-medium">{selectedLoan.aadhaar_no ? `XXXX-XXXX-${selectedLoan.aadhaar_no.slice(-4)}` : "N/A"}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          Scheme
                        </div>
                        <p className="mt-1 font-medium">{selectedLoan.scheme_name}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          Loan Type
                        </div>
                        <p className="mt-1 font-medium">{selectedLoan.loan_type}</p>
                      </div>
                    </div>

                    {/* Loan Details */}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border-2 border-teal-200 p-3 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/20">
                        <p className="text-xs text-muted-foreground">Sanctioned Amount</p>
                        <p className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">{formatCurrency(selectedLoan.sanctioned_amount)}</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Interest Rate</p>
                        <p className="mt-1 text-lg font-semibold">{selectedLoan.interest_rate}% p.a.</p>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Tenure</p>
                        <p className="mt-1 text-lg font-semibold">{selectedLoan.tenure_months} months</p>
                      </div>
                      <div className="rounded-lg border-2 border-primary/20 p-3 bg-primary/5">
                        <p className="text-xs text-muted-foreground">Monthly EMI</p>
                        <p className="mt-1 text-xl font-bold text-primary">{formatCurrency(selectedLoan.emi_amount)}</p>
                      </div>
                    </div>

                    {/* Applied vs Sanctioned */}
                    {selectedLoan.applied_loan_amount !== selectedLoan.sanctioned_amount && (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Applied Amount: {formatCurrency(selectedLoan.applied_loan_amount)} | 
                          Sanctioned: {formatCurrency(selectedLoan.sanctioned_amount)}
                        </p>
                      </div>
                    )}

                    {selectedLoan.sanction_date && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Sanctioned on: {new Date(selectedLoan.sanction_date).toLocaleDateString("en-IN")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Disbursement Form Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      Disbursement Details
                    </CardTitle>
                    <CardDescription>Enter the disbursement information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {/* Row 1: Transaction Date */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Transaction Type</Label>
                          <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            Loan Disbursement
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Transaction Date</Label>
                          <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                            {identity?.businessDate || "Loading..."}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Amount and Mode */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="disbursement-amount">Disbursement Amount *</Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="disbursement-amount"
                              type="number"
                              placeholder="Enter amount"
                              value={disbursementAmount}
                              onChange={(e) => setDisbursementAmount(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Max: {formatCurrency(selectedLoan.sanctioned_amount)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-mode">Payment Mode *</Label>
                          <Select 
                            value={disbursementMode} 
                            onValueChange={(v) => setDisbursementMode(v as "CASH" | "TRANSFER")}
                          >
                            <SelectTrigger id="payment-mode">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASH">
                                <div className="flex items-center gap-2">
                                  <Banknote className="h-4 w-4" />
                                  Cash
                                </div>
                              </SelectItem>
                              <SelectItem value="TRANSFER">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  Bank Transfer
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Conditional: GL Batch for Transfer */}
                      {disbursementMode === "TRANSFER" && (
                        <div className="space-y-2">
                          <Label>GL Batch ID</Label>
                          <div className="flex gap-2">
                            <Input
                              value={selectedBatch && selectedBatch !== 0 ? String(selectedBatch) : "New Batch"}
                              readOnly
                              placeholder="Select or create batch"
                              className="flex-1"
                            />
                            <Button type="button" variant="outline" onClick={loadIncompleteBatches}>
                              Select Batch
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Narration */}
                      <div className="space-y-2">
                        <Label htmlFor="narration">Narration</Label>
                        <Textarea
                          id="narration"
                          placeholder="Enter narration or remarks"
                          value={narration}
                          onChange={(e) => setNarration(e.target.value)}
                          rows={2}
                        />
                      </div>

                      {/* Summary */}
                      <div className="rounded-lg border-2 border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/20 p-4">
                        <h4 className="text-sm font-medium mb-3 text-teal-700 dark:text-teal-400">
                          Disbursement Summary
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Disbursement Amount</p>
                            <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
                              {formatCurrency(parseFloat(disbursementAmount) || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Payment Mode</p>
                            <p className="text-lg font-semibold">{disbursementMode}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly EMI</p>
                            <p className="text-lg font-semibold">{formatCurrency(selectedLoan.emi_amount)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pb-6">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => {
                      if (validateForm()) {
                        setShowConfirmDialog(true)
                      }
                    }}
                    disabled={!disbursementAmount || parseFloat(disbursementAmount) <= 0}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Disburse Loan
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Batch Selection Dialog */}
        <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Select GL Batch</DialogTitle>
              <DialogDescription>Choose an incomplete batch or create a new one</DialogDescription>
            </DialogHeader>
            <div className="flex justify-between pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedBatch(0)
                  setIsBatchPopupOpen(false)
                }}
              >
                + Create New Batch
              </Button>
              <Button variant="outline" onClick={() => setIsBatchPopupOpen(false)}>
                Cancel
              </Button>
            </div>
            {incompleteBatches.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incompleteBatches.map((b) => (
                    <TableRow key={b.batch_id}>
                      <TableCell>{b.batch_id}</TableCell>
                      <TableCell>{b.total_debit}</TableCell>
                      <TableCell>{b.total_credit}</TableCell>
                      <TableCell className="text-red-600">{b.difference}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBatch(b.batch_id)
                            setIsBatchPopupOpen(false)
                          }}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No incomplete batches found
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Disbursement Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Loan Disbursement</DialogTitle>
              <DialogDescription>
                Please review the disbursement details before confirming.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member:</span>
                <span className="font-medium">{selectedLoan?.member_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono">{selectedLoan?.reference_no}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sanctioned Amount:</span>
                <span>{formatCurrency(selectedLoan?.sanctioned_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Disbursement Amount:</span>
                <span className="font-bold text-teal-600">{formatCurrency(parseFloat(disbursementAmount) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Mode:</span>
                <span>{disbursementMode}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-semibold">Monthly EMI:</span>
                <span className="font-bold text-primary">{formatCurrency(selectedLoan?.emi_amount || 0)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={processDisbursement}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Disbursement
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
                Disbursement Successful
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <span className="whitespace-pre-line block">{successMessage}</span>
                  <span className="block mt-3 text-muted-foreground">
                    The loan has been successfully disbursed. The member can now begin repayments as per the EMI schedule.
                  </span>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogAction 
                onClick={() => setSuccessOpen(false)}
                className="bg-muted text-foreground hover:bg-muted/80"
              >
                Disburse More
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => {
                  setSuccessOpen(false)
                  router.push("/loans")
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Go to Loans Dashboard
                <ChevronRight className="ml-1 h-4 w-4" />
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardWrapper>
  )
}
