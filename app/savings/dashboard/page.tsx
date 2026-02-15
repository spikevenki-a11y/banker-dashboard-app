"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Search, ArrowUpRight, ArrowDownRight, Eye, TrendingUp, Wallet, LockKeyhole, UserX } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

type SavingsAccount = {
  id: string
  accountNumber: string
  memberName: string
  memberId: string
  accountType: string
  balance: string
  interestRate: number
  status: "active" | "dormant" | "closed"
  openedDate: string
  lastTransaction: string
}

const mockAccounts: SavingsAccount[] = [
  {
    id: "1",
    accountNumber: "SAV001234",
    memberName: "Vengatesh",
    memberId: "ACC001234",
    accountType: "Regular Savings",
    balance: "₹25,430.00",
    interestRate: 3.5,
    status: "active",
    openedDate: "2023-01-15",
    lastTransaction: "2024-12-10",
  },
  {
    id: "2",
    accountNumber: "SAV001235",
    memberName: "Priya",
    memberId: "ACC001235",
    accountType: "Premium Savings",
    balance: "₹85,250.00",
    interestRate: 4.5,
    status: "active",
    openedDate: "2023-02-20",
    lastTransaction: "2024-12-12",
  },
  {
    id: "3",
    accountNumber: "SAV001236",
    memberName: "Surya",
    memberId: "ACC001236",
    accountType: "Regular Savings",
    balance: "₹12,100.00",
    interestRate: 3.5,
    status: "dormant",
    openedDate: "2023-03-10",
    lastTransaction: "2024-12-08",
  },
  {
    id: "4",
    accountNumber: "SAV001237",
    memberName: "Sudarsan",
    memberId: "ACC001237",
    accountType: "High Yield Savings",
    balance: "₹45,890.00",
    interestRate: 5.0,
    status: "active",
    openedDate: "2023-04-05",
    lastTransaction: "2024-12-11",
  },
]

type Transaction = {
  id: string
  type: "deposit" | "withdrawal"
  amount: string
  date: string
  description: string
  balance: string
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "deposit",
    amount: "₹5,000.00",
    date: "2024-12-10",
    description: "Cash Deposit",
    balance: "₹25,430.00",
  },
  {
    id: "2",
    type: "withdrawal",
    amount: "₹1,200.00",
    date: "2024-12-08",
    description: "ATM Withdrawal",
    balance: "₹20,430.00",
  },
  {
    id: "3",
    type: "deposit",
    amount: "₹3,500.00",
    date: "2024-12-05",
    description: "Check Deposit",
    balance: "₹21,630.00",
  },
  {
    id: "4",
    type: "deposit",
    amount: "₹2,800.00",
    date: "2024-12-01",
    description: "Transfer In",
    balance: "₹18,130.00",
  },
]

export default function SavingsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isOpenAccountOpen, setIsOpenAccountOpen] = useState(false)
  const [isTransactionOpen, setIsTransactionOpen] = useState(false)

  const [isAccountClosure, setIsAccountClosure] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null)
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit")

  const filteredAccounts = mockAccounts.filter((account) => {
    const matchesSearch =
      account.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.memberId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || account.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalBalance = mockAccounts.reduce((sum, acc) => sum + Number.parseFloat(acc.balance.replace(/[₹,]/g, "")), 0)
  const activeAccounts = mockAccounts.filter((acc) => acc.status === "active").length
  const inactiveAccounts = mockAccounts.filter((acc) => acc.status === "dormant").length
  const activeAccountsBalance = mockAccounts
    .filter((acc) => acc.status === "active")
    .reduce((sum, acc) => sum + Number.parseFloat(acc.balance.replace(/[₹,]/g, "")), 0)
  const inactiveAccountsBalance = mockAccounts
    .filter((acc) => acc.status === "dormant")
    .reduce((sum, acc) => sum + Number.parseFloat(acc.balance.replace(/[₹,]/g, "")), 0)

  return (
    <DashboardWrapper>
    <div className="flex h-screen overflow-hidden">
      {/*<DashboardSidebar />*/}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/*<DashboardHeader />*/}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Savings Accounts</h1>
              <p className="text-muted-foreground">Manage deposits, withdrawals, and account balances</p>
            </div>
            <Link href="/savings/open_account">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Open Account
              </Button>
            </Link>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="text-teal-600">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    +8.5%
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Balance</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">₹{totalBalance.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{mockAccounts.length} Total Accounts</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-teal-50 p-3">
                    <Wallet className="h-6 w-6 text-teal-600" />
                  </div>
                  <Badge variant="secondary" className="text-teal-600">
                    Active
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Accounts</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{activeAccounts}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ₹{activeAccountsBalance.toLocaleString()} Balance
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-purple-50 p-3">
                    <LockKeyhole className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge variant="secondary" className="text-teal-600">
                    Inactive
                  </Badge>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Inactive Accounts</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{inactiveAccounts}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ₹{inactiveAccountsBalance.toLocaleString()} Balance
                  </p>
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
                    placeholder="Search by account number, member name, or ID..."
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono font-medium">{account.accountNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{account.memberName}</div>
                          <div className="text-sm text-muted-foreground">{account.memberId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{account.accountType}</TableCell>
                      <TableCell className="font-semibold">{account.balance}</TableCell>
                      <TableCell>{account.interestRate}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={account.status === "active" ? "default" : "secondary"}
                          className={account.status === "active" ? "bg-teal-100 text-teal-700" : ""}
                        >
                          {account.status}
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
                            <DropdownMenuItem onClick={() => router.push(`/savings/view_account?account=${account.accountNumber}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View / Modify
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAccount(account)
                                setTransactionType("deposit")
                                setIsTransactionOpen(true)
                              }}
                            >
                              <ArrowDownRight className="mr-2 h-4 w-4" />
                              Deposit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAccount(account)
                                setTransactionType("withdrawal")
                                setIsTransactionOpen(true)
                              }}
                            >
                              <ArrowUpRight className="mr-2 h-4 w-4" />
                              Withdraw
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAccount(account)
                                setIsAccountClosure(true)
                              }}
                            >
                              <UserX className="mr-2 h-4 w-4 text-red-500" />
                              Closure
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Open Account Dialog */}
          <Dialog open={isOpenAccountOpen} onOpenChange={setIsOpenAccountOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Open Savings Account</DialogTitle>
                <DialogDescription>Create a new savings account for a member</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="member">Select Member</Label>
                  <Select>
                    <SelectTrigger id="member">
                      <SelectValue placeholder="Search and select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Vengatesh (ACC001234)</SelectItem>
                      <SelectItem value="2">Priya (ACC001235)</SelectItem>
                      <SelectItem value="3">Surya (ACC001236)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-type">Account Type</Label>
                  <Select>
                    <SelectTrigger id="account-type">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular Savings (3.5%)</SelectItem>
                      <SelectItem value="premium">Premium Savings (4.5%)</SelectItem>
                      <SelectItem value="high-yield">High Yield Savings (5.0%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial-deposit">Initial Deposit</Label>
                  <Input id="initial-deposit" type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input id="notes" placeholder="Add any additional notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpenAccountOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsOpenAccountOpen(false)}>Open Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transaction Dialog */}
          <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{transactionType === "deposit" ? "Make Deposit" : "Make Withdrawal"}</DialogTitle>
                <DialogDescription>
                  {transactionType === "deposit"
                    ? "Add funds to the savings account"
                    : "Withdraw funds from the savings account"}
                </DialogDescription>
              </DialogHeader>
              {selectedAccount && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <div className="rounded-lg border border-border bg-muted p-3">
                      <p className="font-mono font-medium">{selectedAccount.accountNumber}</p>
                      <p className="text-sm text-muted-foreground">{selectedAccount.memberName}</p>
                      <p className="mt-2 text-lg font-semibold">Current Balance: {selectedAccount.balance}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder={transactionType === "deposit" ? "Cash Deposit" : "ATM Withdrawal"}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTransactionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsTransactionOpen(false)}>
                  {transactionType === "deposit" ? "Deposit" : "Withdraw"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


        </main>
      </div>
    </div>
    </DashboardWrapper>
  )
}
