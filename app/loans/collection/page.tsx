"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { MemberSearchDialog } from "@/components/member-search-dialog"
import { MemberSummaryCard, type MemberSummaryInfo } from "@/components/member-summary-card"

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

type MemberInfo = {
  membership_no: string | number
  full_name: string
  father_name?: string
  mobile_no?: string
  aadhaar_no?: string
  member_type?: string
  status?: string
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
  credit_principal_amount: number
  credit_interest_amount: number
  balance_after_transaction: number
  remarks: string
}

// Number inputs on this screen: no spinner buttons, and no stepping with the
// arrow keys or mouse wheel — values are typed in only
const NO_SPINNER_CLASS =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
const noStepProps = {
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault()
  },
  onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function LoanCollectionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("applicationId")

  // Member lookup → member's loan accounts → selected account
  const [membershipNo, setMembershipNo] = useState("")
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberLoans, setMemberLoans] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [accountInfo, setAccountInfo] = useState<LoanAccountInfo | null>(null)
  const [searchError, setSearchError] = useState("")

  // EMI Schedule & History
  const [emiSchedule, setEmiSchedule] = useState<EMISchedule[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loanSummary, setLoanSummary] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Collection form
  const [amount, setAmount] = useState("")
  const [principalAmount, setPrincipalAmount] = useState("")
  const [interestAmount, setInterestAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState<"CASH" | "TRANSFER">("CASH")
  const [narration, setNarration] = useState("")
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([])

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formError, setFormError] = useState("")

  const applyAccountData = (acc: any, fallbackAccNo: string) => {
    const resolvedAccNo = acc.loan_account_no || fallbackAccNo
    setAccountInfo({
      loan_account_no: resolvedAccNo,
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
      application_status: acc.application_status,
    })
    setAmount(acc.emi_amount?.toString() || "")
    return resolvedAccNo
  }

  // Auto-load when navigated from loans list with applicationId
  useEffect(() => {
    if (!applicationId) return
    ;(async () => {
      setIsSearching(true)
      setSearchError("")
      setAccountInfo(null)
      setEmiSchedule([])
      setTransactions([])
      try {
        const accRes = await fetch(
          `/api/loans/accounts?applicationId=${encodeURIComponent(applicationId)}`,
          { credentials: "include" }
        )
        const accData = await accRes.json()
        if (accData.error) throw new Error(accData.error)
        if (accData.accounts?.length > 0) {
          const acc = accData.accounts[0]
          const resolvedAccNo = applyAccountData(acc, "")
          if (acc.membership_no) {
            setMembershipNo(String(acc.membership_no))
            await loadMember(String(acc.membership_no))
          }
          if (resolvedAccNo) {
            await fetchLoanDetails(resolvedAccNo)
          } else {
            setSearchError("Loan account number not available. The loan may not have been fully disbursed.")
          }
        } else {
          setSearchError("Loan account not found. The loan may not have been disbursed yet.")
        }
      } catch (e: any) {
        setSearchError(e.message || "Failed to load loan account")
      } finally {
        setIsSearching(false)
      }
    })()
  }, [applicationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch the member's loan accounts (one row per loan application)
  const loadMemberLoans = async (memNo: string): Promise<any[]> => {
    const res = await fetch(`/api/loans/accounts?membershipNo=${encodeURIComponent(memNo)}`, {
      credentials: "include",
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    const seen = new Set<string>()
    const loans = (data.accounts || []).filter((a: any) => {
      const key = String(a.loan_application_id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setMemberLoans(loans)
    return loans
  }

  // Fetch member details and their loan accounts
  const loadMember = async (memNo: string) => {
    const [memberRes, loans] = await Promise.all([
      fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: memNo }),
      }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null),
      loadMemberLoans(memNo),
    ])

    if (memberRes?.found) {
      setMemberInfo(memberRes.member)
    } else if (loans.length > 0) {
      // Member is no longer active but still has loans to collect on
      setMemberInfo({
        membership_no: memNo,
        full_name: loans[0].member_name,
        mobile_no: loans[0].mobile_no,
        status: "INACTIVE",
      })
    } else {
      setMemberInfo(null)
    }
    return { found: !!memberRes?.found, loans }
  }

  const resetCollectionForm = () => {
    setPrincipalAmount("")
    setInterestAmount("")
    setNarration("")
    setSelectedInstallments([])
    setPaymentMode("CASH")
    setFormError("")
  }

  // Search member by membership number
  const searchMember = async (memberNoOverride?: string) => {
    const memNo = (memberNoOverride ?? membershipNo).trim()
    if (!memNo) {
      setSearchError("Please enter membership number")
      return
    }

    setIsSearching(true)
    setSearchError("")
    setMemberInfo(null)
    setMemberLoans([])
    setAccountInfo(null)
    setEmiSchedule([])
    setTransactions([])
    resetCollectionForm()

    try {
      const { found, loans } = await loadMember(memNo)
      if (!found && loans.length === 0) {
        setSearchError("No member found with this membership number")
      } else if (loans.length === 0) {
        setSearchError("No loan accounts found for this member")
      }
    } catch (error: any) {
      setSearchError(error.message || "Failed to search member")
    } finally {
      setIsSearching(false)
    }
  }

  // Load the member when the user leaves the Membership Number field
  // (skipped when empty, already loading, or that member is already shown)
  const handleMembershipBlur = () => {
    const memNo = membershipNo.trim()
    if (!memNo || isSearching) return
    if (memberInfo && String(memberInfo.membership_no) === memNo) return
    searchMember(memNo)
  }

  // Member Summary card details, from the member already loaded above
  const memberSummary: MemberSummaryInfo | null = memberInfo
    ? {
        membership_no: String(memberInfo.membership_no),
        full_name: memberInfo.full_name || "",
        father_name: memberInfo.father_name || "",
        mobile_no: memberInfo.mobile_no || "",
        aadhaar_no: memberInfo.aadhaar_no || "",
        member_type: memberInfo.member_type || "---",
        membership_class: (memberInfo as any).membership_class || "",
        status: memberInfo.status || "",
        ledger_folio_number: (memberInfo as any).ledger_folio_number,
      }
    : null

  // Select one of the member's loan accounts for collection
  const selectLoanAccount = async (acc: any) => {
    if (!acc.loan_account_no) {
      setSearchError("Loan account number not available. The loan may not have been fully disbursed.")
      return
    }
    setSearchError("")
    setEmiSchedule([])
    setTransactions([])
    resetCollectionForm()
    applyAccountData(acc, "")
    await fetchLoanDetails(String(acc.loan_account_no))
  }

  const loanDetailsSeq = useRef(0)

  const isCollectible = (status?: string) => ["ACTIVE", "OVERDUE"].includes(String(status || "").toUpperCase())

  const fetchLoanDetails = async (accNo: string) => {
    // Only the latest request may update the screen, so switching accounts
    // quickly never shows an earlier account's schedule or history
    const seq = ++loanDetailsSeq.current
    setIsLoadingDetails(true)
    try {
      const res = await fetch(`/api/loans/repayment?loanAccountNo=${encodeURIComponent(accNo)}`)
      const data = await res.json()
      if (seq !== loanDetailsSeq.current) return

      if (!data.error) {
        setEmiSchedule(data.schedule || [])
        setTransactions(data.transactions || [])
        setLoanSummary(data.summary || {})
      }
    } catch (error) {
      console.error("Failed to fetch loan details:", error)
    } finally {
      if (seq === loanDetailsSeq.current) setIsLoadingDetails(false)
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

    if (breakupError) {
      setFormError(breakupError)
      return
    }

    if (!isCollectible(accountInfo.application_status)) {
      setFormError(`Collection is not allowed on a ${String(accountInfo.application_status).toLowerCase()} loan`)
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
          narration: narration,
          principal_amount: pNum > 0 || iNum > 0 ? pNum : undefined,
          interest_amount: pNum > 0 || iNum > 0 ? iNum : undefined,
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

      // Reset form — clear breakup fields so the emiSchedule effect recalculates after refresh
      setAmount(accountInfo.emi_amount.toString())
      setPrincipalAmount("")
      setInterestAmount("")
      setNarration("")
      setSelectedInstallments([])
      await fetchLoanDetails(accountInfo.loan_account_no)

      // Update account info
      setAccountInfo(prev => prev ? {
        ...prev,
        outstanding_balance: data.outstanding_balance,
        application_status: data.loan_status
      } : null)

      // Refresh the member's loan list (outstanding / status)
      if (accountInfo.membership_no) {
        loadMemberLoans(String(accountInfo.membership_no)).catch(() => {/* silent */})
      }

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

  // Mirror the API's interest-first allocation to estimate the breakup for a given total
  const calculateBreakup = (totalAmt: number): { principal: number; interest: number } => {
    const pending = emiSchedule
      .filter(e => e.payment_status !== "PAID")
      .sort((a, b) => a.installment_no - b.installment_no)
    let remaining = totalAmt
    let principal = 0
    let interest = 0
    for (const inst of pending) {
      if (remaining <= 0) break
      const instTotal   = parseFloat(inst.total_installment?.toString()  || "0")
      const instPrincipal = parseFloat(inst.principal_amount?.toString() || "0")
      const instInterest  = parseFloat(inst.interest_amount?.toString()  || "0")
      if (remaining >= instTotal) {
        principal += instPrincipal
        interest  += instInterest
        remaining -= instTotal
      } else {
        const interestPortion  = Math.min(remaining, instInterest)
        const principalPortion = remaining - interestPortion
        interest  += interestPortion
        principal += principalPortion
        remaining = 0
      }
    }
    return { principal, interest }
  }

  // When user types in the total amount field
  const handleAmountChange = (val: string) => {
    setAmount(val)
    if (selectedInstallments.length > 0) return // breakup controlled by selection
    const amt = parseFloat(val) || 0
    if (amt > 0 && emiSchedule.length > 0) {
      const { principal, interest } = calculateBreakup(amt)
      setPrincipalAmount(principal.toFixed(2))
      setInterestAmount(interest.toFixed(2))
    } else {
      setPrincipalAmount("")
      setInterestAmount("")
    }
  }

  // When user edits principal → recalculate total
  const handlePrincipalChange = (val: string) => {
    setPrincipalAmount(val)
    const p = parseFloat(val) || 0
    const i = parseFloat(interestAmount) || 0
    setAmount((p + i).toFixed(2))
  }

  // When user edits interest → recalculate total
  const handleInterestChange = (val: string) => {
    setInterestAmount(val)
    const p = parseFloat(principalAmount) || 0
    const i = parseFloat(val) || 0
    setAmount((p + i).toFixed(2))
  }

  // When installment selection changes, sync all three fields from the selection
  useEffect(() => {
    if (selectedInstallments.length === 0) return
    const selected = emiSchedule.filter(e => selectedInstallments.includes(e.installment_no))
    const p = selected.reduce((s, e) => s + parseFloat(e.principal_amount?.toString() || "0"), 0)
    const i = selected.reduce((s, e) => s + parseFloat(e.interest_amount?.toString()  || "0"), 0)
    setAmount((p + i).toFixed(2))
    setPrincipalAmount(p.toFixed(2))
    setInterestAmount(i.toFixed(2))
  }, [selectedInstallments, emiSchedule])

  // When the EMI schedule first loads, auto-calculate breakup for the default amount
  useEffect(() => {
    if (emiSchedule.length === 0 || !amount || principalAmount || interestAmount) return
    const amt = parseFloat(amount) || 0
    if (amt > 0) {
      const { principal, interest } = calculateBreakup(amt)
      setPrincipalAmount(principal.toFixed(2))
      setInterestAmount(interest.toFixed(2))
    }
  }, [emiSchedule]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derived breakup validation (no extra state needed)
  const pNum = parseFloat(principalAmount) || 0
  const iNum = parseFloat(interestAmount) || 0
  const aNum = parseFloat(amount) || 0
  const breakupError =
    principalAmount !== "" && interestAmount !== ""
      ? pNum < 0 || iNum < 0
        ? "Principal and Interest cannot be negative"
        : Math.abs(aNum - (pNum + iNum)) > 0.01
        ? `Total mismatch: ₹${(pNum + iNum).toFixed(2)} ≠ Collection Amount ₹${aNum.toFixed(2)}`
        : ""
      : ""

  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/loans")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loans
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Collection</h1>
          <p className="text-muted-foreground">Record loan repayments</p>
          {/* <p className="text-muted-foreground">Record EMI payments and loan repayments</p> */}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Membership search & loan accounts (same layout as New Loan Application) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Member Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Member Information</CardTitle>
                <CardDescription>Search for the member by membership number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="membership-no">Membership Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="membership-no"
                      placeholder="Enter membership number"
                      value={membershipNo}
                      onChange={(e) => setMembershipNo(e.target.value)}
                      onBlur={handleMembershipBlur}
                      onKeyDown={(e) => e.key === "Enter" && searchMember()}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setSearchDialogOpen(true)}
                      disabled={isSearching}
                      className="gap-2 bg-transparent"
                    >
                      <Search className="h-4 w-4" /> Search
                    </Button>
                  </div>
                  {isSearching && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading member details...
                    </div>
                  )}
                  {searchError && <p className="text-sm text-red-500">{searchError}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Member's Loan Accounts */}
            {memberInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Loan Accounts
                  </CardTitle>
                  <CardDescription>Select a loan account for collection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {memberLoans.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No loan accounts found for this member</p>
                  ) : (
                    <>
                      <Label htmlFor="loan-account-select">
                        Loan Account ({memberLoans.length} found)
                      </Label>
                      <Select
                        value={accountInfo?.loan_account_no ? String(accountInfo.loan_account_no) : ""}
                        onValueChange={(accNo) => {
                          const loan = memberLoans.find((l) => String(l.loan_account_no) === accNo)
                          if (loan && accNo !== String(accountInfo?.loan_account_no ?? "")) selectLoanAccount(loan)
                        }}
                      >
                        <SelectTrigger id="loan-account-select" className="h-auto min-h-10 w-full py-2 text-left">
                          <SelectValue placeholder="Select a loan account" />
                        </SelectTrigger>
                        <SelectContent>
                          {memberLoans.map((loan) => {
                            const accNo = loan.loan_account_no ? String(loan.loan_account_no) : ""
                            const status = String(loan.application_status || "")
                            return (
                              <SelectItem
                                key={loan.loan_application_id}
                                // Loans without an account number (not disbursed) are listed but can't be picked
                                value={accNo || `not-disbursed-${loan.loan_application_id}`}
                                disabled={!accNo}
                              >
                                <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium">{accNo || "Not disbursed"}</span>
                                    <Badge className={
                                      status === "ACTIVE" ? "bg-teal-100 text-teal-700" :
                                      status === "OVERDUE" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700"
                                    }>
                                      {status}
                                    </Badge>
                                  </div>
                                  <span className="truncate text-xs text-muted-foreground">
                                    {loan.scheme_name} · Ref {loan.reference_no} · O/S {formatCurrency(loan.outstanding_balance || 0)}
                                  </span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      {isLoadingDetails && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading loan details...
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Member Summary (shared with New Loan Application) */}
          <div className="space-y-6 lg:row-span-2">
            <MemberSummaryCard memberInfo={memberSummary} />

            {/* Loan Details — below Member Summary */}
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
                    {/* <div>
                      <span className="text-muted-foreground">EMI Amount</span>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(accountInfo.emi_amount)}</p>
                    </div> */}
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

            {/* Transaction History — below Loan Details */}
            {accountInfo && (
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
                    <div className="max-h-[300px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Voucher</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Principal</TableHead>
                            <TableHead>Interest</TableHead>
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
                                {parseFloat(txn.credit_principal_amount?.toString()) > 0 ? formatCurrency(txn.credit_principal_amount) : '---'}
                              </TableCell>
                              <TableCell className="text-teal-600">
                                {parseFloat(txn.credit_interest_amount?.toString()) > 0 ? formatCurrency(txn.credit_interest_amount) : '---'}
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
            )}
          </div>

          {/* Collection Form & Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {accountInfo ? (
              <>
                {/* Collection Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Record Collection
                    </CardTitle>
                    <CardDescription>Enter payment details for loan collection</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Collection Amount *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className={NO_SPINNER_CLASS}
                          {...noStepProps}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Voucher Type *</Label>
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

                    {/* Principal / Interest breakup */}
                    {(principalAmount !== "" || interestAmount !== "") && (
                      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Amount Breakup
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="principal-amt" className="text-xs">Principal</Label>
                            <Input
                              id="principal-amt"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={principalAmount}
                              onChange={(e) => handlePrincipalChange(e.target.value)}
                              className={NO_SPINNER_CLASS}
                              {...noStepProps}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="interest-amt" className="text-xs">Interest</Label>
                            <Input
                              id="interest-amt"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={interestAmount}
                              onChange={(e) => handleInterestChange(e.target.value)}
                              className={NO_SPINNER_CLASS}
                              {...noStepProps}
                            />
                          </div>
                        </div>
                        {breakupError ? (
                          <p className="text-xs text-destructive">{breakupError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Principal + Interest = {formatCurrency(pNum + iNum)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Narration</Label>
                      <Textarea
                        placeholder="Optional narration for this payment"
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                      />
                    </div>

                    {!isCollectible(accountInfo.application_status) && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        This loan is {String(accountInfo.application_status).toLowerCase()}. Collection is only allowed on active or overdue loans.
                      </p>
                    )}

                    {formError && (
                      <p className="text-sm text-destructive">{formError}</p>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const defaultAmt = accountInfo.emi_amount
                          setAmount(defaultAmt.toString())
                          setNarration("")
                          setSelectedInstallments([])
                          const { principal, interest } = calculateBreakup(defaultAmt)
                          setPrincipalAmount(principal.toFixed(2))
                          setInterestAmount(interest.toFixed(2))
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={processCollection}
                        disabled={isSubmitting || !isCollectible(accountInfo.application_status)}
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CreditCard className="mr-2 h-4 w-4" />
                        save
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* EMI Schedule */}
                <Card>
                  <CardHeader>
                    <CardTitle>Repayment Schedule</CardTitle>
                    <CardDescription>Click on pending repayments to select for payment</CardDescription>
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
              </>
            ) : isSearching ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Loading loan account...</h3>
                  <p className="text-sm text-muted-foreground">Fetching loan details, please wait</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    {memberInfo ? "Select a Loan Account" : "Search for a Member"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {memberInfo
                      ? "Choose one of the member's loan accounts to view details and record payments"
                      : "Enter a membership number to view the member's loan accounts"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Success Dialog */}
        {/* Member Search Dialog (shared with Loan Apply / Savings) */}
        <MemberSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
          onSelect={(member) => {
            setSearchDialogOpen(false)
            setMembershipNo(String(member.membership_no))
            searchMember(String(member.membership_no))
          }}
        />

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

export default function LoanCollectionPage() {
  return (
    <Suspense fallback={
      <DashboardWrapper>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardWrapper>
    }>
      <LoanCollectionContent />
    </Suspense>
  )
}
