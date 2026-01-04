"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Eye, CreditCard, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

type Loan = {
  multidisbursement: "Yes" | "No"
  id: string
  loanNumber: string
  memberName: string
  memberId: string
  loanType: string
  loanAmount: string
  interestRate: number
  tenure: number
  status: "pending" | "approved" | "active" | "closed" | "overdue"
  applicationDate: string
  disbursementDate: string | null
  emiAmount: string
  paidEmis: number
  totalEmis: number
  outstandingBalance: string
  branchId: string
}

const mockLoans: Loan[] = [
  {
    id: "1",
    loanNumber: "LN001234",
    memberName: "Vengatesh",
    memberId: "ACC001234",
    loanType: "Personal Loan",
    loanAmount: "₹25,000.00",
    interestRate: 9.5,
    tenure: 24,
    status: "active",
    applicationDate: "2023-01-15",
    disbursementDate: "2023-01-20",
    emiAmount: "₹1,156.25",
    paidEmis: 18,
    totalEmis: 24,
    outstandingBalance: "₹6,937.50",
    multidisbursement: "No",
    branchId: "1", // Chennai branch
  },
  {
    id: "2",
    loanNumber: "LN001235",
    memberName: "Priya",
    memberId: "ACC001235",
    loanType: "Business Loan",
    loanAmount: "₹100,000.00",
    interestRate: 10.0,
    tenure: 60,
    status: "active",
    applicationDate: "2022-06-20",
    disbursementDate: "2022-07-01",
    emiAmount: "₹2,124.70",
    paidEmis: 28,
    totalEmis: 60,
    outstandingBalance: "₹67,990.40",
    multidisbursement: "Yes",
    branchId: "2", // Bangalore branch
  },
  {
    id: "3",
    loanNumber: "LN001236",
    memberName: "Surya",
    memberId: "ACC001236",
    loanType: "Personal Loan",
    loanAmount: "₹15,000.00",
    interestRate: 9.0,
    tenure: 12,
    status: "approved",
    applicationDate: "2024-12-10",
    disbursementDate: null,
    emiAmount: "₹1,304.17",
    paidEmis: 0,
    totalEmis: 12,
    outstandingBalance: "₹15,000.00",
    multidisbursement: "Yes",
    branchId: "1", // Chennai branch
  },
  {
    id: "4",
    loanNumber: "LN001237",
    memberName: "Sudarsan",
    memberId: "ACC001237",
    loanType: "Mortgage Loan",
    loanAmount: "₹250,000.00",
    interestRate: 8.5,
    tenure: 240,
    status: "active",
    applicationDate: "2020-04-05",
    disbursementDate: "2020-05-01",
    emiAmount: "₹1,921.38",
    paidEmis: 55,
    totalEmis: 240,
    outstandingBalance: "₹218,445.30",
    multidisbursement: "Yes",
    branchId: "1", // Chennai branch
  },
  {
    id: "5",
    loanNumber: "LN001238",
    memberName: "Muniyandi",
    memberId: "ACC001238",
    loanType: "Personal Loan",
    loanAmount: "₹10,000.00",
    interestRate: 9.0,
    tenure: 12,
    status: "overdue",
    applicationDate: "2023-12-15",
    disbursementDate: "2024-01-01",
    emiAmount: "₹869.44",
    paidEmis: 10,
    totalEmis: 12,
    outstandingBalance: "₹1,738.88",
    multidisbursement: "No",
    branchId: "2", // Bangalore branch
  },
]

type EMISchedule = {
  id: string
  emiNumber: number
  dueDate: string
  emiAmount: string
  principal: string
  interest: string
  balance: string
  status: "paid" | "pending" | "overdue"
}

const mockEMISchedule: EMISchedule[] = [
  {
    id: "1",
    emiNumber: 1,
    dueDate: "2023-02-20",
    emiAmount: "₹1,156.25",
    principal: "₹958.58",
    interest: "₹197.67",
    balance: "₹24,041.42",
    status: "paid",
  },
  {
    id: "2",
    emiNumber: 2,
    dueDate: "2023-03-20",
    emiAmount: "₹1,156.25",
    principal: "₹966.18",
    interest: "₹190.07",
    balance: "₹23,075.24",
    status: "paid",
  },
  {
    id: "3",
    emiNumber: 3,
    dueDate: "2023-04-20",
    emiAmount: "₹1,156.25",
    principal: "₹973.84",
    interest: "₹182.41",
    balance: "₹22,101.40",
    status: "paid",
  },
]

export default function LoansPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  const branchFilteredLoans =
    user?.role === "admin" ? mockLoans : mockLoans.filter((loan) => loan.branchId === user?.branchId)

  const filteredLoans = branchFilteredLoans.filter((loan) => {
    const matchesSearch =
      loan.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.memberId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || loan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalLoans = branchFilteredLoans.reduce(
    (sum, loan) => sum + Number.parseFloat(loan.loanAmount.replace(/[₹,]/g, "")),
    0,
  )
  const activeLoans = branchFilteredLoans.filter((loan) => loan.status === "active").length
  const pendingLoans = branchFilteredLoans.filter((loan) => loan.status === "pending").length
  const approvedLoans = branchFilteredLoans.filter((loan) => loan.status === "approved").length
  const pendingLoaAmts = branchFilteredLoans.reduce(
    (sum, loan) => (loan.status === "pending" ? sum + Number.parseFloat(loan.loanAmount.replace(/[₹,]/g, "")) : sum),
    0,
  )
  const overdueLoaAmts = branchFilteredLoans.reduce(
    (sum, loan) => (loan.status === "overdue" ? sum + Number.parseFloat(loan.loanAmount.replace(/[₹,]/g, "")) : sum),
    0,
  )
  const approvedLoaAmts = branchFilteredLoans.reduce(
    (sum, loan) => (loan.status === "approved" ? sum + Number.parseFloat(loan.loanAmount.replace(/[₹,]/g, "")) : sum),
    0,
  )
  const overdueLoans = branchFilteredLoans.filter((loan) => loan.status === "overdue").length

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Management</h1>
              <p className="text-muted-foreground">
                {user?.role === "admin"
                  ? "All branches - Process applications, track EMIs, and manage repayments"
                  : `${user?.branch.name} - Process applications, track EMIs, and manage repayments`}
              </p>
            </div>
            <Button onClick={() => setIsNewLoanOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Application
            </Button>
          </div>

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
                  <p className="mt-1 text-2xl font-bold text-foreground">₹{totalLoans.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {branchFilteredLoans.filter((loan) => loan.status === "active" || loan.status === "overdue").length}{" "}
                    Total Accounts
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-teal-50 p-3">
                    <CheckCircle className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Loans</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{activeLoans}</p>
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
                  <p className="mt-1 text-2xl font-bold text-foreground">{pendingLoans}</p>
                  <p className="mt-1 text-sm text-muted-foreground">₹{pendingLoaAmts.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-orange-50 p-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Sanctioned Applications</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{approvedLoans}</p>
                  <p className="mt-1 text-sm text-muted-foreground">₹{approvedLoaAmts.toLocaleString()}</p>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Overdue</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{overdueLoans}</p>
                  <p className="mt-1 text-sm text-muted-foreground">₹{overdueLoaAmts.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by loan number, member name, or ID..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Number</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>EMI</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => {
                    const progress = (loan.paidEmis / loan.totalEmis) * 100
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono font-medium">{loan.loanNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{loan.memberName}</div>
                            <div className="text-sm text-muted-foreground">{loan.memberId}</div>
                          </div>
                        </TableCell>
                        <TableCell>{loan.loanType}</TableCell>
                        <TableCell className="font-semibold">{loan.loanAmount}</TableCell>
                        <TableCell>{loan.emiAmount}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>
                                {loan.paidEmis}/{loan.totalEmis}
                              </span>
                              <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{loan.outstandingBalance}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedLoan(loan)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {loan.status === "pending" && (
                                <>
                                  <DropdownMenuItem>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                                </>
                              )}
                              {((loan.status === "active" && loan.multidisbursement === "Yes") ||
                                loan.status === "approved") && (
                                <DropdownMenuItem>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Disbursement
                                </DropdownMenuItem>
                              )}
                              {(loan.status === "active" || loan.status === "overdue") && (
                                <DropdownMenuItem>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Collection
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* New Loan Application Dialog */}
          <Dialog open={isNewLoanOpen} onOpenChange={setIsNewLoanOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Loan Application</DialogTitle>
                <DialogDescription>Process a new loan application for a member</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="loan-member">Select Member</Label>
                  <Select>
                    <SelectTrigger id="loan-member">
                      <SelectValue placeholder="Search and select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Vengatesh (ACC001234)</SelectItem>
                      <SelectItem value="2">Priya (ACC001235)</SelectItem>
                      <SelectItem value="3">Surya (ACC001236)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loan-type">Loan Type</Label>
                    <Select>
                      <SelectTrigger id="loan-type">
                        <SelectValue placeholder="Select loan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal Loan (9.0%)</SelectItem>
                        <SelectItem value="business">Business Loan (10.0%)</SelectItem>
                        <SelectItem value="mortgage">Mortgage Loan (8.5%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan-amount">Loan Amount</Label>
                    <Input id="loan-amount" type="number" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loan-tenure">Tenure (Months)</Label>
                    <Select>
                      <SelectTrigger id="loan-tenure">
                        <SelectValue placeholder="Select tenure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 months</SelectItem>
                        <SelectItem value="24">24 months</SelectItem>
                        <SelectItem value="36">36 months</SelectItem>
                        <SelectItem value="60">60 months</SelectItem>
                        <SelectItem value="120">120 months (10 years)</SelectItem>
                        <SelectItem value="240">240 months (20 years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan-purpose">Purpose</Label>
                    <Input id="loan-purpose" placeholder="e.g., Home renovation" />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4">
                  <h4 className="mb-2 font-semibold">EMI Calculation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loan Amount:</span>
                      <span className="font-medium">₹0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interest Rate:</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tenure:</span>
                      <span className="font-medium">0 months</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-semibold">Monthly EMI:</span>
                      <span className="font-semibold text-foreground">₹0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Payable:</span>
                      <span className="font-medium">₹0.00</span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewLoanOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsNewLoanOpen(false)}>Submit Application</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Loan Details Dialog */}
          <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Loan Details</DialogTitle>
                <DialogDescription>Complete loan information and repayment schedule</DialogDescription>
              </DialogHeader>
              {selectedLoan && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="schedule">EMI Schedule</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Loan Number</Label>
                          <p className="font-mono font-medium">{selectedLoan.loanNumber}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <div className="mt-1">
                            <Badge
                              variant="default"
                              className={
                                selectedLoan.status === "active"
                                  ? "bg-teal-100 text-teal-700"
                                  : selectedLoan.status === "pending"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700"
                              }
                            >
                              {selectedLoan.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Member Name</Label>
                          <p className="font-medium">{selectedLoan.memberName}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Member ID</Label>
                          <p className="font-mono font-medium">{selectedLoan.memberId}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Loan Type</Label>
                          <p className="font-medium">{selectedLoan.loanType}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Interest Rate</Label>
                          <p className="font-medium">{selectedLoan.interestRate}% per annum</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Loan Amount</Label>
                          <p className="text-2xl font-bold text-foreground">{selectedLoan.loanAmount}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Outstanding Balance</Label>
                          <p className="text-2xl font-bold text-orange-600">{selectedLoan.outstandingBalance}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Monthly EMI</Label>
                          <p className="text-xl font-semibold text-foreground">{selectedLoan.emiAmount}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Tenure</Label>
                          <p className="font-medium">{selectedLoan.tenure} months</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <Label className="text-muted-foreground">Repayment Progress</Label>
                          <span className="font-medium">
                            {selectedLoan.paidEmis}/{selectedLoan.totalEmis} EMIs paid
                          </span>
                        </div>
                        <Progress value={(selectedLoan.paidEmis / selectedLoan.totalEmis) * 100} className="h-3" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Application Date</Label>
                          <p className="font-medium">{selectedLoan.applicationDate}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Disbursement Date</Label>
                          <p className="font-medium">{selectedLoan.disbursementDate || "Pending"}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="schedule" className="space-y-4">
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
                        {mockEMISchedule.map((emi) => (
                          <TableRow key={emi.id}>
                            <TableCell className="font-medium">{emi.emiNumber}</TableCell>
                            <TableCell>{emi.dueDate}</TableCell>
                            <TableCell className="font-semibold">{emi.emiAmount}</TableCell>
                            <TableCell>{emi.principal}</TableCell>
                            <TableCell>{emi.interest}</TableCell>
                            <TableCell className="font-mono">{emi.balance}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  emi.status === "paid"
                                    ? "bg-teal-100 text-teal-700"
                                    : emi.status === "overdue"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-orange-100 text-orange-700"
                                }
                              >
                                {emi.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  <TabsContent value="documents" className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      Loan documents and agreements will appear here
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
