"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type SanctionedLoan = {
  id: string
  loan_application_id: number
  reference_no: string
  membership_no: string
  member_name: string
  mobile_no: string
  scheme_name: string
  applied_loan_amount: number
  sanctioned_amount: number
  interest_rate: number
  tenure_months: number
  emi_amount: number
  application_status: string
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function LoanDisbursementPage() {
  const router = useRouter()

  const [sanctionedLoans, setSanctionedLoans] = useState<SanctionedLoan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState<SanctionedLoan | null>(null)

  // Disbursement form
  const [disbursementAmount, setDisbursementAmount] = useState("")
  const [disbursementMode, setDisbursementMode] = useState<"CASH" | "TRANSFER">("CASH")
  const [narration, setNarration] = useState("")

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  // Fetch sanctioned loans
  const fetchSanctionedLoans = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/loans/applications?status=SANCTIONED")
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      const formatted = (data.applications || []).map((app: any) => ({
        id: app.id,
        loan_application_id: app.loan_application_id,
        reference_no: app.reference_no,
        membership_no: app.membership_no,
        member_name: app.member_name || 'N/A',
        mobile_no: app.mobile_no,
        scheme_name: app.scheme_name,
        applied_loan_amount: parseFloat(app.applied_loan_amount) || 0,
        sanctioned_amount: parseFloat(app.sanctioned_amount) || 0,
        interest_rate: parseFloat(app.sanctioned_interest_rate) || 0,
        tenure_months: parseInt(app.sanctioned_tenure) || 0,
        emi_amount: parseFloat(app.emi_amount) || 0,
        application_status: app.application_status
      }))

      setSanctionedLoans(formatted)
    } catch (error: any) {
      console.error("Failed to fetch sanctioned loans:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSanctionedLoans()
  }, [fetchSanctionedLoans])

  // Select loan for disbursement
  const selectLoanForDisbursement = (loan: SanctionedLoan) => {
    setSelectedLoan(loan)
    setDisbursementAmount(loan.sanctioned_amount.toString())
    setNarration("")
    setFormError("")
  }

  // Process disbursement
  const processDisbursement = async () => {
    if (!selectedLoan || !disbursementAmount) {
      setFormError("Please select a loan and enter disbursement amount")
      return
    }

    const amount = parseFloat(disbursementAmount)
    if (amount <= 0) {
      setFormError("Amount must be greater than zero")
      return
    }

    if (amount > selectedLoan.sanctioned_amount) {
      setFormError("Disbursement amount cannot exceed sanctioned amount")
      return
    }

    setIsSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/loans/disbursement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_application_id: selectedLoan.loan_application_id,
          disbursement_amount: amount,
          disbursement_mode: disbursementMode,
          narration: narration
        })
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setSuccessMessage(
        `Loan disbursed successfully!\n\n` +
        `Loan Account: ${data.loan_account_no}\n` +
        `Amount: ${formatCurrency(amount)}\n` +
        `EMI Amount: ${formatCurrency(data.emi_amount)}\n` +
        `Total EMIs: ${data.total_installments}\n` +
        `Voucher: ${data.voucher_no}`
      )
      setSuccessOpen(true)
      setSelectedLoan(null)
      fetchSanctionedLoans()

    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/loans")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loans
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Disbursement</h1>
          <p className="text-muted-foreground">Disburse sanctioned loans to members</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Sanctioned Loans List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sanctioned Loans</CardTitle>
                    <CardDescription>Select a loan to disburse</CardDescription>
                  </div>
                  <Button variant="outline" onClick={fetchSanctionedLoans}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : sanctionedLoans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mb-2" />
                    <p>No sanctioned loans pending disbursement</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Scheme</TableHead>
                        <TableHead>Sanctioned</TableHead>
                        <TableHead>EMI</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sanctionedLoans.map((loan) => (
                        <TableRow 
                          key={loan.id}
                          className={selectedLoan?.id === loan.id ? "bg-blue-50" : ""}
                        >
                          <TableCell className="font-mono">{loan.reference_no}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{loan.member_name}</div>
                              <div className="text-sm text-muted-foreground">{loan.membership_no}</div>
                            </div>
                          </TableCell>
                          <TableCell>{loan.scheme_name}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(loan.sanctioned_amount)}</TableCell>
                          <TableCell>{formatCurrency(loan.emi_amount)}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm"
                              variant={selectedLoan?.id === loan.id ? "default" : "outline"}
                              onClick={() => selectLoanForDisbursement(loan)}
                            >
                              <Wallet className="mr-2 h-4 w-4" />
                              {selectedLoan?.id === loan.id ? "Selected" : "Select"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Disbursement Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Disbursement Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedLoan ? (
                  <>
                    {/* Selected Loan Info */}
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reference:</span>
                          <span className="font-mono font-medium">{selectedLoan.reference_no}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Member:</span>
                          <span className="font-medium">{selectedLoan.member_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sanctioned:</span>
                          <span className="font-bold text-teal-600">{formatCurrency(selectedLoan.sanctioned_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="font-medium">{selectedLoan.interest_rate}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenure:</span>
                          <span className="font-medium">{selectedLoan.tenure_months} months</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-semibold">EMI Amount:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(selectedLoan.emi_amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Disbursement Form */}
                    <div className="space-y-2">
                      <Label>Disbursement Amount *</Label>
                      <Input
                        type="number"
                        value={disbursementAmount}
                        onChange={(e) => setDisbursementAmount(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Mode *</Label>
                      <Select value={disbursementMode} onValueChange={(v) => setDisbursementMode(v as "CASH" | "TRANSFER")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Narration</Label>
                      <Textarea
                        placeholder="Optional narration"
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {formError && (
                      <p className="text-sm text-destructive">{formError}</p>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedLoan(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={processDisbursement}
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Disburse
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mb-2" />
                    <p className="text-center">Select a sanctioned loan from the list to proceed with disbursement</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Success Dialog */}
        <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                Disbursement Successful
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
