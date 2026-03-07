"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  Search,
  Loader2,
  CheckCircle2,
  User,
  CreditCard,
  Banknote,
  History,
  X,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Progress } from "@/components/ui/progress"

type LoanAccountInfo = {
  loan_account_no: string
  reference_no: string
  membership_no: string
  member_name: string
  mobile_no: string
  scheme_name: string
  sanctioned_amount: number
  interest_rate: number
  emi_amount: number
  outstanding_balance: number
  paid_installments: number
  total_installments: number
  overdue_installments: number
  application_status: string
}

type EMISchedule = {
  schedule_id: number
  installment_no: number
  due_date: string
  total_installment: number
  principal_amount: number
  interest_amount: number
  balance_principal: number
  payment_status: string
}

type Transaction = {
  id: string
  transaction_date: string
  voucher_no: number
  transaction_type: string
  debit_amount: number
  credit_amount: number
  balance_after_transaction: number
  remarks: string
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function LoanCollectionPage() {
  const router = useRouter()

  // Account lookup
  const [loanAccountNo, setLoanAccountNo] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [accountInfo, setAccountInfo] = useState<LoanAccountInfo | null>(null)
  const [searchError, setSearchError] = useState("")

  // EMI Schedule & History
  const [emiSchedule, setEmiSchedule] = useState<EMISchedule[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loanSummary, setLoanSummary] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Collection form
  const [amount, setAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState<"CASH" | "TRANSFER">("CASH")
  const [narration, setNarration] = useState("")
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([])

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  // Search loan account
  const searchLoanAccount = async () => {
    if (!loanAccountNo.trim()) {
      setSearchError("Please enter loan account number")
      return
    }

    setIsSearching(true)
    setSearchError("")
    setAccountInfo(null)
    setEmiSchedule([])
    setTransactions([])

    try {
      // Get loan account details
      const accRes = await fetch(`/api/loans/accounts?loanAccountNo=${encodeURIComponent(loanAccountNo.trim())}`)
      const accData = await accRes.json()

      if (accData.error) throw new Error(accData.error)

      if (accData.accounts && accData.accounts.length > 0) {
        const acc = accData.accounts[0]
        setAccountInfo({
          loan_account_no: acc.loan_account_no || loanAccountNo,
          reference_no: acc.reference_no,
          membership_no: acc.membership_no,
          member_name: acc.member_name,
          mobile_no: acc.mobile_no,
          scheme_name: acc.scheme_name,
          sanctioned_amount: parseFloat(acc.sanctioned_amount) || 0,
          interest_rate: parseFloat(acc.interest_rate) || 0,
          emi_amount: parseFloat(acc.emi_amount) || 0,
          outstanding_balance: parseFloat(acc.outstanding_balance) || 0,
          paid_installments: parseInt(acc.paid_installments) || 0,
          total_installments: parseInt(acc.total_installments) || 0,
          overdue_installments: parseInt(acc.overdue_installments) || 0,
          application_status: acc.application_status
        })

        // Set default collection amount as EMI
        setAmount(acc.emi_amount?.toString() || "")

        // Fetch EMI schedule and transactions
        await fetchLoanDetails(acc.loan_account_no || loanAccountNo)
      } else {
        setSearchError("Loan account not found")
      }
    } catch (error: any) {
      setSearchError(error.message || "Failed to search loan account")
    } finally {
      setIsSearching(false)
    }
  }

  const fetchLoanDetails = async (accNo: string) => {
    setIsLoadingDetails(true)
    try {
      const res = await fetch(`/api/loans/repayment?loanAccountNo=${encodeURIComponent(accNo)}`)
      const data = await res.json()

      if (!data.error) {
        setEmiSchedule(data.schedule || [])
        setTransactions(data.transactions || [])
        setLoanSummary(data.summary || {})
      }
    } catch (error) {
      console.error("Failed to fetch loan details:", error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Process collection
  const processCollection = async () => {
    if (!accountInfo || !amount) {
      setFormError("Please enter collection amount")
      return
    }

    const collectionAmount = parseFloat(amount)
    if (collectionAmount <= 0) {
      setFormError("Amount must be greater than zero")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/loans/repayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_account_no: accountInfo.loan_account_no,
          payment_amount: collectionAmount,
          payment_mode: paymentMode,
          installment_numbers: selectedInstallments.length > 0 ? selectedInstallments : undefined,
          narration: narration
        })
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setSuccessMessage(
        `Repayment of ${formatCurrency(collectionAmount)} recorded successfully!\n` +
        `Principal: ${formatCurrency(data.principal_paid)}, Interest: ${formatCurrency(data.interest_paid)}\n` +
        `Voucher: ${data.voucher_no}, Outstanding: ${formatCurrency(data.outstanding_balance)}`
      )
      setSuccessOpen(true)

      // Reset form and refresh data
      setAmount(accountInfo.emi_amount.toString())
      setNarration("")
      setSelectedInstallments([])
      await fetchLoanDetails(accountInfo.loan_account_no)

      // Update account info
      setAccountInfo(prev => prev ? {
        ...prev,
        outstanding_balance: data.outstanding_balance,
        application_status: data.loan_status
      } : null)

    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle installment selection
  const toggleInstallment = (installmentNo: number) => {
    setSelectedInstallments(prev =>
      prev.includes(installmentNo)
        ? prev.filter(n => n !== installmentNo)
        : [...prev, installmentNo].sort((a, b) => a - b)
    )
  }

  // Calculate selected amount
  const calculateSelectedAmount = () => {
    if (selectedInstallments.length === 0) return 0
    return emiSchedule
      .filter(e => selectedInstallments.includes(e.installment_no))
      .reduce((sum, e) => sum + parseFloat(e.total_installment?.toString() || '0'), 0)
  }

  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/loans")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loans
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Collection</h1>
          <p className="text-muted-foreground">Record EMI payments and loan repayments</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Search & Account Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Loan Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter loan account number"
                    value={loanAccountNo}
                    onChange={(e) => setLoanAccountNo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchLoanAccount()}
                  />
                  <Button onClick={searchLoanAccount} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {searchError && (
                  <p className="text-sm text-destructive">{searchError}</p>
                )}
              </CardContent>
            </Card>

            {/* Account Info Card */}
            {accountInfo && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Loan Details
                    </CardTitle>
                    <Badge className={
                      accountInfo.application_status === "ACTIVE" ? "bg-teal-100 text-teal-700" :
                      accountInfo.application_status === "OVERDUE" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }>
                      {accountInfo.application_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Loan Account</span>
                      <p className="font-mono font-medium">{accountInfo.loan_account_no}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Membership</span>
                      <p className="font-medium">{accountInfo.membership_no}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Member Name</span>
                    <p className="font-medium">{accountInfo.member_name}</p>
                    <p className="text-sm text-muted-foreground">{accountInfo.mobile_no}</p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Loan Amount</span>
                        <p className="font-semibold">{formatCurrency(accountInfo.sanctioned_amount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Interest Rate</span>
                        <p className="font-semibold">{accountInfo.interest_rate}% p.a.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">EMI Amount</span>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(accountInfo.emi_amount)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Outstanding</span>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(accountInfo.outstanding_balance)}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Repayment Progress</span>
                      <span className="font-medium">
                        {accountInfo.paid_installments}/{accountInfo.total_installments} EMIs
                      </span>
                    </div>
                    <Progress 
                      value={(accountInfo.paid_installments / accountInfo.total_installments) * 100} 
                      className="h-2" 
                    />
                    {accountInfo.overdue_installments > 0 && (
                      <p className="text-sm text-red-600 mt-2">
                        {accountInfo.overdue_installments} overdue installment(s)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Collection Form & Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {accountInfo ? (
              <>
                {/* Collection Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Record Payment
                    </CardTitle>
                    <CardDescription>Enter payment details for loan collection</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Collection Amount *</Label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        {selectedInstallments.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Selected EMIs total: {formatCurrency(calculateSelectedAmount())}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Mode *</Label>
                        <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "CASH" | "TRANSFER")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Narration</Label>
                      <Textarea
                        placeholder="Optional narration for this payment"
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {formError && (
                      <p className="text-sm text-destructive">{formError}</p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAmount(accountInfo.emi_amount.toString())
                          setNarration("")
                          setSelectedInstallments([])
                        }}
                      >
                        Reset
                      </Button>
                      <Button onClick={processCollection} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CreditCard className="mr-2 h-4 w-4" />
                        Record Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* EMI Schedule */}
                <Card>
                  <CardHeader>
                    <CardTitle>EMI Schedule</CardTitle>
                    <CardDescription>Click on pending EMIs to select for payment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : emiSchedule.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No EMI schedule available</p>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10"></TableHead>
                              <TableHead>EMI #</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>EMI</TableHead>
                              <TableHead>Principal</TableHead>
                              <TableHead>Interest</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emiSchedule.map((emi) => (
                              <TableRow 
                                key={emi.schedule_id}
                                className={
                                  emi.payment_status === "PAID" ? "opacity-50" :
                                  selectedInstallments.includes(emi.installment_no) ? "bg-blue-50" : ""
                                }
                              >
                                <TableCell>
                                  {emi.payment_status !== "PAID" && (
                                    <input
                                      type="checkbox"
                                      checked={selectedInstallments.includes(emi.installment_no)}
                                      onChange={() => toggleInstallment(emi.installment_no)}
                                      className="h-4 w-4"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{emi.installment_no}</TableCell>
                                <TableCell>{formatDate(emi.due_date)}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(emi.total_installment)}</TableCell>
                                <TableCell>{formatCurrency(emi.principal_amount)}</TableCell>
                                <TableCell>{formatCurrency(emi.interest_amount)}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    emi.payment_status === "PAID" ? "bg-teal-100 text-teal-700" :
                                    emi.payment_status === "OVERDUE" ? "bg-red-100 text-red-700" :
                                    "bg-orange-100 text-orange-700"
                                  }>
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

                {/* Transaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Transaction History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No transactions found</p>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Voucher</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Debit</TableHead>
                              <TableHead>Credit</TableHead>
                              <TableHead>Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((txn) => (
                              <TableRow key={txn.id}>
                                <TableCell>{formatDate(txn.transaction_date)}</TableCell>
                                <TableCell className="font-mono">{txn.voucher_no}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{txn.transaction_type}</Badge>
                                </TableCell>
                                <TableCell className="text-red-600">
                                  {parseFloat(txn.debit_amount?.toString()) > 0 ? formatCurrency(txn.debit_amount) : '---'}
                                </TableCell>
                                <TableCell className="text-teal-600">
                                  {parseFloat(txn.credit_amount?.toString()) > 0 ? formatCurrency(txn.credit_amount) : '---'}
                                </TableCell>
                                <TableCell className="font-mono">{formatCurrency(txn.balance_after_transaction)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Search for a Loan Account</h3>
                  <p className="text-sm text-muted-foreground">Enter loan account number to view details and record payments</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Success Dialog */}
        <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                Payment Recorded
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
