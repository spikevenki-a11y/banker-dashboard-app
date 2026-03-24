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
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"

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

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
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
        const loanAccountNo = `LN${loan.reference_no?.substring(2) || loan.loan_application_id.toString().padStart(8, '0')}`
        const schedRes = await fetch(`/api/loans/repayment?loanAccountNo=${loanAccountNo}`)
        const schedData = await schedRes.json()

        if (!schedData.error) {
          setEmiSchedule(schedData.schedule || [])
          setLoanTransactions(schedData.transactions || [])
          setLoanSummary(schedData.summary || {})
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
      OVERDUE: "bg-red-100 text-red-700"
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
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
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

            {/* Content */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schedule">EMI Schedule</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
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
                          <p className="font-medium">{selectedLoan.member_name || 'N/A'}</p>
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
                          <p className="font-medium">{selectedLoan.loan_purpose || '---'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Applied Amount</Label>
                          <p className="text-2xl font-bold text-foreground">{formatCurrency(selectedLoan.applied_loan_amount)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Sanctioned Amount</Label>
                          <p className="text-2xl font-bold text-teal-600">
                            {selectedLoan.sanctioned_amount ? formatCurrency(selectedLoan.sanctioned_amount) : '---'}
                          </p>
                        </div>
                      </div>
                      {selectedLoan.sanctioned_amount && (
                        <>
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
                        </>
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
                          <span className={`font-medium ${(loanSummary.overdue_installments || 0) > 0 ? 'text-red-600' : ''}`}>
                            {loanSummary.overdue_installments || 0}
                          </span>
                        </div>
                      </div>
                      {(loanSummary.paid_installments || 0) > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{Math.round(((loanSummary.paid_installments || 0) / ((loanSummary.paid_installments || 0) + (loanSummary.pending_installments || 0))) * 100)}%</span>
                          </div>
                          <Progress 
                            value={((loanSummary.paid_installments || 0) / ((loanSummary.paid_installments || 0) + (loanSummary.pending_installments || 0))) * 100} 
                            className="h-2" 
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* EMI Schedule Tab */}
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

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loanTransactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </div>
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
                                <TableCell>{txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : '---'}</TableCell>
                                <TableCell>{txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '---'}</TableCell>
                                <TableCell className="font-mono font-semibold">{formatCurrency(txn.balance_after_transaction)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{txn.remarks || '---'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
