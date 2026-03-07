"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Eye, CreditCard, AlertCircle, CheckCircle, Clock, Trash2, X, Loader2, Ban, Wallet } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

type LoanScheme = {
  scheme_id: number
  scheme_name: string
  loan_type: string
  interest_rate: number
  minimum_loan_amount: number
  maximum_loan_amount: number
  minimum_period_months: number
  maximum_period_months: number
}

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
  // Sanction details
  sanction_id?: number
  sanctioned_amount?: number
  sanction_date?: string
  sanctioned_interest_rate?: number
  sanctioned_tenure?: number
  emi_amount?: number
  sanction_status?: string
  sanction_remarks?: string
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

type MemberSearchResult = {
  membership_no: number
  full_name: string
  father_name: string
  mobile_no: string
  customer_code: string
  aadhaar_no: string
  status: string
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function LoansPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Main list state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loans, setLoans] = useState<LoanApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [schemes, setSchemes] = useState<LoanScheme[]>([])
  
  // Dialog states
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null)
  const [isSanctionOpen, setIsSanctionOpen] = useState(false)
  const [isDisbursementOpen, setIsDisbursementOpen] = useState(false)
  const [isCollectionOpen, setIsCollectionOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [loanToDelete, setLoanToDelete] = useState<LoanApplication | null>(null)
  
  // Member search
  const [memberSearchOpen, setMemberSearchOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([])
  const [isSearchingMembers, setIsSearchingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null)
  
  // New loan form
  const [newLoanScheme, setNewLoanScheme] = useState<string>("")
  const [newLoanAmount, setNewLoanAmount] = useState("")
  const [newLoanTenure, setNewLoanTenure] = useState("")
  const [newLoanPurpose, setNewLoanPurpose] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  
  // EMI calculation
  const [calculatedEMI, setCalculatedEMI] = useState<{
    emi_amount: number
    total_amount: number
    total_interest: number
  } | null>(null)
  
  // Sanction form
  const [sanctionAmount, setSanctionAmount] = useState("")
  const [sanctionInterestRate, setSanctionInterestRate] = useState("")
  const [sanctionTenure, setSanctionTenure] = useState("")
  const [sanctionRemarks, setSanctionRemarks] = useState("")
  const [sanctionAction, setSanctionAction] = useState<"APPROVE" | "REJECT">("APPROVE")
  
  // Disbursement form
  const [disbursementAmount, setDisbursementAmount] = useState("")
  const [disbursementMode, setDisbursementMode] = useState<"CASH" | "TRANSFER">("CASH")
  const [disbursementNarration, setDisbursementNarration] = useState("")
  
  // Collection form
  const [collectionAmount, setCollectionAmount] = useState("")
  const [collectionMode, setCollectionMode] = useState<"CASH" | "TRANSFER">("CASH")
  const [collectionNarration, setCollectionNarration] = useState("")
  
  // Loan details view
  const [emiSchedule, setEmiSchedule] = useState<EMISchedule[]>([])
  const [loanTransactions, setLoanTransactions] = useState<LoanTransaction[]>([])
  const [loanSummary, setLoanSummary] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  
  // Success dialog
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Fetch loans
  const fetchLoans = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      
      const res = await fetch(`/api/loans/applications?${params}`)
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      setLoans(data.applications || [])
    } catch (error: any) {
      console.error("Failed to fetch loans:", error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  // Fetch schemes
  const fetchSchemes = useCallback(async () => {
    try {
      const res = await fetch("/api/loans/schemes?status=ACTIVE")
      const data = await res.json()
      if (data.schemes) setSchemes(data.schemes)
    } catch (error) {
      console.error("Failed to fetch schemes:", error)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
    fetchSchemes()
  }, [fetchLoans, fetchSchemes])

  // Search members
  const searchMembers = async () => {
    if (!memberSearchQuery.trim()) return
    
    setIsSearchingMembers(true)
    try {
      const res = await fetch(`/api/memberships/search?q=${encodeURIComponent(memberSearchQuery)}&status=ACTIVE`)
      const data = await res.json()
      if (data.success) setMemberResults(data.data || [])
    } catch (error) {
      console.error("Failed to search members:", error)
    } finally {
      setIsSearchingMembers(false)
    }
  }

  // Calculate EMI
  const calculateEMI = async () => {
    if (!newLoanAmount || !newLoanTenure || !newLoanScheme) return
    
    const scheme = schemes.find(s => s.scheme_id.toString() === newLoanScheme)
    if (!scheme) return
    
    try {
      const res = await fetch("/api/loans/calculate-emi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: parseFloat(newLoanAmount),
          interest_rate: scheme.interest_rate,
          tenure_months: parseInt(newLoanTenure)
        })
      })
      const data = await res.json()
      if (!data.error) {
        setCalculatedEMI({
          emi_amount: data.emi_amount,
          total_amount: data.total_amount,
          total_interest: data.total_interest
        })
      }
    } catch (error) {
      console.error("Failed to calculate EMI:", error)
    }
  }

  useEffect(() => {
    if (newLoanAmount && newLoanTenure && newLoanScheme) {
      calculateEMI()
    } else {
      setCalculatedEMI(null)
    }
  }, [newLoanAmount, newLoanTenure, newLoanScheme])

  // Submit new loan application
  const submitNewLoan = async () => {
    if (!selectedMember || !newLoanScheme || !newLoanAmount) {
      setFormError("Please fill all required fields")
      return
    }
    
    setIsSubmitting(true)
    setFormError("")
    
    try {
      const res = await fetch("/api/loans/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: selectedMember.membership_no,
          loan_product_id: parseInt(newLoanScheme),
          applied_loan_amount: parseFloat(newLoanAmount),
          loan_purpose: newLoanPurpose
        })
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setSuccessMessage(`Loan application ${data.reference_no} created successfully!`)
      setSuccessOpen(true)
      setIsNewLoanOpen(false)
      resetNewLoanForm()
      fetchLoans()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetNewLoanForm = () => {
    setSelectedMember(null)
    setNewLoanScheme("")
    setNewLoanAmount("")
    setNewLoanTenure("")
    setNewLoanPurpose("")
    setCalculatedEMI(null)
    setFormError("")
  }

  // Process sanction
  const processSanction = async () => {
    if (!selectedLoan) return
    
    if (sanctionAction === "APPROVE" && (!sanctionAmount || !sanctionInterestRate || !sanctionTenure)) {
      setFormError("Please fill all required fields for approval")
      return
    }
    
    if (sanctionAction === "REJECT" && !sanctionRemarks) {
      setFormError("Please provide remarks for rejection")
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
          remarks: sanctionRemarks
        })
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setSuccessMessage(data.message)
      setSuccessOpen(true)
      setIsSanctionOpen(false)
      resetSanctionForm()
      fetchLoans()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetSanctionForm = () => {
    setSanctionAmount("")
    setSanctionInterestRate("")
    setSanctionTenure("")
    setSanctionRemarks("")
    setSanctionAction("APPROVE")
    setFormError("")
  }

  // Process disbursement
  const processDisbursement = async () => {
    if (!selectedLoan || !disbursementAmount) {
      setFormError("Please enter disbursement amount")
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
          disbursement_amount: parseFloat(disbursementAmount),
          disbursement_mode: disbursementMode,
          narration: disbursementNarration
        })
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setSuccessMessage(`Loan disbursed successfully! Account: ${data.loan_account_no}, EMI: ${formatCurrency(data.emi_amount)}`)
      setSuccessOpen(true)
      setIsDisbursementOpen(false)
      resetDisbursementForm()
      fetchLoans()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetDisbursementForm = () => {
    setDisbursementAmount("")
    setDisbursementMode("CASH")
    setDisbursementNarration("")
    setFormError("")
  }

  // Process collection/repayment
  const processCollection = async () => {
    if (!selectedLoan || !collectionAmount) {
      setFormError("Please enter collection amount")
      return
    }
    
    setIsSubmitting(true)
    setFormError("")
    
    try {
      // Find loan account number from transactions
      const loanAccountNo = `LN${selectedLoan.reference_no?.substring(2) || selectedLoan.loan_application_id.toString().padStart(8, '0')}`
      
      const res = await fetch("/api/loans/repayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_account_no: loanAccountNo,
          payment_amount: parseFloat(collectionAmount),
          payment_mode: collectionMode,
          narration: collectionNarration
        })
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setSuccessMessage(`Repayment recorded! Principal: ${formatCurrency(data.principal_paid)}, Interest: ${formatCurrency(data.interest_paid)}`)
      setSuccessOpen(true)
      setIsCollectionOpen(false)
      resetCollectionForm()
      fetchLoans()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCollectionForm = () => {
    setCollectionAmount("")
    setCollectionMode("CASH")
    setCollectionNarration("")
    setFormError("")
  }

  // Delete loan application
  const deleteLoan = async () => {
    if (!loanToDelete) return
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/loans/applications?id=${loanToDelete.loan_application_id}`, {
        method: "DELETE"
      })
      
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setSuccessMessage("Loan application deleted successfully")
      setSuccessOpen(true)
      setIsDeleteConfirmOpen(false)
      setLoanToDelete(null)
      fetchLoans()
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load loan details (EMI schedule, transactions)
  const loadLoanDetails = async (loan: LoanApplication) => {
    setSelectedLoan(loan)
    setIsLoadingDetails(true)
    
    try {
      const loanAccountNo = `LN${loan.reference_no?.substring(2) || loan.loan_application_id.toString().padStart(8, '0')}`
      
      const res = await fetch(`/api/loans/repayment?loanAccountNo=${loanAccountNo}`)
      const data = await res.json()
      
      if (!data.error) {
        setEmiSchedule(data.schedule || [])
        setLoanTransactions(data.transactions || [])
        setLoanSummary(data.summary || {})
      }
    } catch (error) {
      console.error("Failed to load loan details:", error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Open sanction dialog
  const openSanctionDialog = (loan: LoanApplication) => {
    setSelectedLoan(loan)
    setSanctionAmount(loan.applied_loan_amount.toString())
    
    const scheme = schemes.find(s => s.scheme_name === loan.scheme_name)
    if (scheme) {
      setSanctionInterestRate(scheme.interest_rate.toString())
      setSanctionTenure(scheme.minimum_period_months.toString())
    }
    
    setIsSanctionOpen(true)
  }

  // Open disbursement dialog
  const openDisbursementDialog = (loan: LoanApplication) => {
    setSelectedLoan(loan)
    setDisbursementAmount(loan.sanctioned_amount?.toString() || loan.applied_loan_amount.toString())
    setIsDisbursementOpen(true)
  }

  // Open collection dialog
  const openCollectionDialog = (loan: LoanApplication) => {
    setSelectedLoan(loan)
    setCollectionAmount(loan.emi_amount?.toString() || "")
    setIsCollectionOpen(true)
  }

  // Filter loans
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.reference_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.membership_no?.toString().includes(searchQuery)
    const matchesStatus = statusFilter === "all" || loan.application_status?.toUpperCase() === statusFilter.toUpperCase()
    return matchesSearch && matchesStatus
  })

  // Stats
  const totalLoans = loans.reduce((sum, loan) => sum + (parseFloat(loan.applied_loan_amount?.toString()) || 0), 0)
  const pendingLoans = loans.filter((loan) => loan.application_status === "PENDING")
  const sanctionedLoans = loans.filter((loan) => loan.application_status === "SANCTIONED")
  const activeLoans = loans.filter((loan) => loan.application_status === "ACTIVE")
  const overdueLoans = loans.filter((loan) => loan.application_status === "OVERDUE")

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

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Management</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches - Process applications, track EMIs, and manage repayments"
                    : `${user?.branch?.name || 'Branch'} - Process applications, track EMIs, and manage repayments`}
                </p>
              </div>
<Button onClick={() => router.push("/loans/apply")} className="gap-2">
  <Plus className="h-4 w-4" />
  New Application
  </Button>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Loans</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(totalLoans)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{loans.length} Applications</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-orange-50 p-3">
                      <Clock className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Pending Applications</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">{pendingLoans.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCurrency(pendingLoans.reduce((s, l) => s + (parseFloat(l.applied_loan_amount?.toString()) || 0), 0))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Sanctioned</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">{sanctionedLoans.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCurrency(sanctionedLoans.reduce((s, l) => s + (parseFloat(l.sanctioned_amount?.toString()) || 0), 0))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-red-50 p-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Active / Overdue</h3>
                    <p className="mt-1 text-2xl font-bold text-foreground">{activeLoans.length} / {overdueLoans.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loans Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by reference no, member name, or ID..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SANCTIONED">Sanctioned</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={fetchLoans}>
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLoans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-2" />
                    <p>No loan applications found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference No</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Applied Amount</TableHead>
                        <TableHead>Sanctioned</TableHead>
                        <TableHead>EMI</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLoans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-mono font-medium">{loan.reference_no}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{loan.member_name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{loan.membership_no}</div>
                            </div>
                          </TableCell>
                          <TableCell>{loan.scheme_name || loan.loan_type}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(loan.applied_loan_amount)}</TableCell>
                          <TableCell className="font-semibold">
                            {loan.sanctioned_amount ? formatCurrency(loan.sanctioned_amount) : '---'}
                          </TableCell>
                          <TableCell>
                            {loan.emi_amount ? formatCurrency(loan.emi_amount) : '---'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(loan.application_status)}>
                              {loan.application_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => loadLoanDetails(loan)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {loan.application_status === "PENDING" && (
                                  <>
                                    <DropdownMenuItem onClick={() => openSanctionDialog(loan)}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Sanction
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => { setLoanToDelete(loan); setIsDeleteConfirmOpen(true); }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {loan.application_status === "SANCTIONED" && (
                                  <DropdownMenuItem onClick={() => openDisbursementDialog(loan)}>
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Disburse
                                  </DropdownMenuItem>
                                )}
                                {(loan.application_status === "ACTIVE" || loan.application_status === "OVERDUE") && (
                                  <DropdownMenuItem onClick={() => openCollectionDialog(loan)}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Collection
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* New Loan Application Dialog */}
            <Dialog open={isNewLoanOpen} onOpenChange={(open) => { setIsNewLoanOpen(open); if (!open) resetNewLoanForm(); }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>New Loan Application</DialogTitle>
                  <DialogDescription>Process a new loan application for a member</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Member Selection */}
                  <div className="space-y-2">
                    <Label>Select Member *</Label>
                    {selectedMember ? (
                      <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
                        <div>
                          <div className="font-medium">{selectedMember.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Membership: {selectedMember.membership_no} | Mobile: {selectedMember.mobile_no}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full justify-start" onClick={() => setMemberSearchOpen(true)}>
                        <Search className="mr-2 h-4 w-4" />
                        Search and select member
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loan-type">Loan Scheme *</Label>
                      <Select value={newLoanScheme} onValueChange={setNewLoanScheme}>
                        <SelectTrigger id="loan-type">
                          <SelectValue placeholder="Select loan scheme" />
                        </SelectTrigger>
                        <SelectContent>
                          {schemes.map((scheme) => (
                            <SelectItem key={scheme.scheme_id} value={scheme.scheme_id.toString()}>
                              {scheme.scheme_name} ({scheme.interest_rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loan-amount">Loan Amount *</Label>
                      <Input 
                        id="loan-amount" 
                        type="number" 
                        placeholder="Enter amount" 
                        value={newLoanAmount}
                        onChange={(e) => setNewLoanAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loan-tenure">Tenure (Months)</Label>
                      <Select value={newLoanTenure} onValueChange={setNewLoanTenure}>
                        <SelectTrigger id="loan-tenure">
                          <SelectValue placeholder="Select tenure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                          <SelectItem value="24">24 months</SelectItem>
                          <SelectItem value="36">36 months</SelectItem>
                          <SelectItem value="60">60 months</SelectItem>
                          <SelectItem value="120">120 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loan-purpose">Purpose</Label>
                      <Input 
                        id="loan-purpose" 
                        placeholder="e.g., Home renovation" 
                        value={newLoanPurpose}
                        onChange={(e) => setNewLoanPurpose(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* EMI Calculation Preview */}
                  {calculatedEMI && (
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <h4 className="mb-2 font-semibold">EMI Calculation</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Loan Amount:</span>
                          <span className="font-medium">{formatCurrency(newLoanAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="font-medium">{schemes.find(s => s.scheme_id.toString() === newLoanScheme)?.interest_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenure:</span>
                          <span className="font-medium">{newLoanTenure} months</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="font-semibold">Monthly EMI:</span>
                          <span className="font-semibold text-foreground">{formatCurrency(calculatedEMI.emi_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Interest:</span>
                          <span className="font-medium">{formatCurrency(calculatedEMI.total_interest)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Payable:</span>
                          <span className="font-medium">{formatCurrency(calculatedEMI.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="text-sm text-destructive">{formError}</div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsNewLoanOpen(false); resetNewLoanForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={submitNewLoan} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Application
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Member Search Dialog */}
            <Dialog open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Search Member</DialogTitle>
                  <DialogDescription>Search by name, mobile, or Aadhaar</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter name, mobile or Aadhaar..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchMembers()}
                    />
                    <Button onClick={searchMembers} disabled={isSearchingMembers}>
                      {isSearchingMembers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {memberResults.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membership No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberResults.map((member) => (
                          <TableRow key={member.membership_no}>
                            <TableCell className="font-mono">{member.membership_no}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{member.full_name}</div>
                                <div className="text-sm text-muted-foreground">S/o {member.father_name}</div>
                              </div>
                            </TableCell>
                            <TableCell>{member.mobile_no}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedMember(member)
                                  setMemberSearchOpen(false)
                                  setMemberSearchQuery("")
                                  setMemberResults([])
                                }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Sanction Dialog */}
            <Dialog open={isSanctionOpen} onOpenChange={(open) => { setIsSanctionOpen(open); if (!open) resetSanctionForm(); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Loan Sanction</DialogTitle>
                  <DialogDescription>
                    {selectedLoan?.reference_no} - {selectedLoan?.member_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-4">
                    <Button 
                      variant={sanctionAction === "APPROVE" ? "default" : "outline"}
                      onClick={() => setSanctionAction("APPROVE")}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button 
                      variant={sanctionAction === "REJECT" ? "destructive" : "outline"}
                      onClick={() => setSanctionAction("REJECT")}
                      className="flex-1"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>

                  {sanctionAction === "APPROVE" && (
                    <>
                      <div className="space-y-2">
                        <Label>Sanctioned Amount *</Label>
                        <Input 
                          type="number" 
                          value={sanctionAmount}
                          onChange={(e) => setSanctionAmount(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Interest Rate (%) *</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={sanctionInterestRate}
                            onChange={(e) => setSanctionInterestRate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tenure (Months) *</Label>
                          <Input 
                            type="number" 
                            value={sanctionTenure}
                            onChange={(e) => setSanctionTenure(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Remarks {sanctionAction === "REJECT" && "*"}</Label>
                    <Textarea 
                      placeholder={sanctionAction === "REJECT" ? "Reason for rejection (required)" : "Optional remarks"}
                      value={sanctionRemarks}
                      onChange={(e) => setSanctionRemarks(e.target.value)}
                    />
                  </div>

                  {formError && <div className="text-sm text-destructive">{formError}</div>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsSanctionOpen(false); resetSanctionForm(); }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={processSanction} 
                    disabled={isSubmitting}
                    variant={sanctionAction === "REJECT" ? "destructive" : "default"}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {sanctionAction === "APPROVE" ? "Approve Loan" : "Reject Loan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Disbursement Dialog */}
            <Dialog open={isDisbursementOpen} onOpenChange={(open) => { setIsDisbursementOpen(open); if (!open) resetDisbursementForm(); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Loan Disbursement</DialogTitle>
                  <DialogDescription>
                    {selectedLoan?.reference_no} - {selectedLoan?.member_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sanctioned Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedLoan?.sanctioned_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">EMI Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedLoan?.emi_amount || 0)}</span>
                    </div>
                  </div>

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
                      value={disbursementNarration}
                      onChange={(e) => setDisbursementNarration(e.target.value)}
                    />
                  </div>

                  {formError && <div className="text-sm text-destructive">{formError}</div>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsDisbursementOpen(false); resetDisbursementForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={processDisbursement} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disburse Loan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Collection Dialog */}
            <Dialog open={isCollectionOpen} onOpenChange={(open) => { setIsCollectionOpen(open); if (!open) resetCollectionForm(); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Loan Repayment / Collection</DialogTitle>
                  <DialogDescription>
                    {selectedLoan?.reference_no} - {selectedLoan?.member_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">EMI Amount:</span>
                      <span className="font-semibold">{formatCurrency(selectedLoan?.emi_amount || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Collection Amount *</Label>
                    <Input 
                      type="number" 
                      value={collectionAmount}
                      onChange={(e) => setCollectionAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Mode *</Label>
                    <Select value={collectionMode} onValueChange={(v) => setCollectionMode(v as "CASH" | "TRANSFER")}>
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
                      value={collectionNarration}
                      onChange={(e) => setCollectionNarration(e.target.value)}
                    />
                  </div>

                  {formError && <div className="text-sm text-destructive">{formError}</div>}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCollectionOpen(false); resetCollectionForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={processCollection} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Record Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* View Loan Details Dialog */}
            <Dialog open={!!selectedLoan && !isSanctionOpen && !isDisbursementOpen && !isCollectionOpen} onOpenChange={() => setSelectedLoan(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Loan Details - {selectedLoan?.reference_no}</DialogTitle>
                  <DialogDescription>Complete loan information and repayment schedule</DialogDescription>
                </DialogHeader>
                {selectedLoan && (
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="schedule">EMI Schedule</TabsTrigger>
                      <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4">
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
                        {loanSummary && Object.keys(loanSummary).length > 0 && (
                          <div className="rounded-lg border p-4 bg-muted/50">
                            <h4 className="font-semibold mb-3">Repayment Summary</h4>
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
                              <div className="mt-4">
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
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="schedule" className="space-y-4">
                      {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : emiSchedule.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No EMI schedule available (loan not yet disbursed)
                        </div>
                      ) : (
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
                      )}
                    </TabsContent>
                    <TabsContent value="transactions" className="space-y-4">
                      {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : loanTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Voucher</TableHead>
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
                                <TableCell className="max-w-[200px] truncate">{txn.remarks}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Loan Application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete application {loanToDelete?.reference_no}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => { setIsDeleteConfirmOpen(false); setLoanToDelete(null); }}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={deleteLoan} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
                    Success
                  </AlertDialogTitle>
                  <AlertDialogDescription>{successMessage}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setSuccessOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
