"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Search,
  Loader2,
  User,
  CreditCard,
  Banknote,
  Calendar,
  Percent,
  ArrowDownRight,
  ArrowUpRight,
  Edit3,
  Save,
  X,
  CheckCircle2,
  History,
  Plus,
  Minus,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type AccountDetails = {
  id: string
  account_number: string
  membership_no: number
  scheme_id: number
  opening_date: string
  available_balance: number
  clear_balance: number
  unclear_balance: number
  interest_rate: number
  last_interest_calculated_date: string | null
  account_status: string
  account_closed_date: string | null
  created_at: string
  updated_at: string
  scheme_name: string
  scheme_description: string
  interest_frequency: string
  interest_calculation_method: string
  min_balance: number
  minimum_deposit: number
  maximum_deposit: number
  full_name: string
  father_name: string
  mobile_no: string
  date_of_birth: string
  aadhaar_no: string
  customer_code: string
  gender: string
  email: string
  address_line1: string
  village: string
  district: string
  state: string
  pincode: string
  member_type: string
  membership_class: string
  join_date: string
}

type Transaction = {
  id: string
  account_number: string
  transaction_type: string
  amount: number
  balance_after: number
  description: string
  reference_number: string | null
  performed_by: string
  transaction_date: string
  created_at: string
}

export default function ViewModifyAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountFromParams = searchParams.get("account")
  const tabFromParams = searchParams.get("tab")
  const txnTypeFromParams = searchParams.get("txnType")

  const [accountNumber, setAccountNumber] = useState(accountFromParams || "")
  const [activeTab, setActiveTab] = useState(tabFromParams || "overview")
  const [isSearching, setIsSearching] = useState(false)
  const [account, setAccount] = useState<AccountDetails | null>(null)
  const [searchError, setSearchError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editStatus, setEditStatus] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTxns, setIsLoadingTxns] = useState(false)
  const [txnType, setTxnType] = useState<"deposit" | "withdrawal">((txnTypeFromParams as "deposit" | "withdrawal") || "deposit")
  const [txnAmount, setTxnAmount] = useState("")
  const [txnDescription, setTxnDescription] = useState("")
  const [txnReference, setTxnReference] = useState("")
  const [isSubmittingTxn, setIsSubmittingTxn] = useState(false)
  const [txnError, setTxnError] = useState("")

  useEffect(() => {
    if (accountFromParams) {
      handleSearch(accountFromParams)
    }
  }, [accountFromParams])

  const handleSearch = async (accNo?: string) => {
    const searchNo = accNo || accountNumber.trim()
    if (!searchNo) return

    setIsSearching(true)
    setSearchError("")
    setAccount(null)
    setIsEditing(false)

    try {
      const res = await fetch(`/api/savings/account-details?account_number=${encodeURIComponent(searchNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      console.log("account details ",data)

      if (res.ok && data.account) {
        setAccount(data.account)
        setEditStatus(data.account.account_status)
        fetchTransactions(data.account.account_number)
      } else {
        setSearchError(data.error || "Account not found.")
      }
    } catch {
      setSearchError("Failed to fetch account. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSave = async () => {
    if (!account) return

    setIsSaving(true)
    try {
      const res = await fetch("/api/savings/account-details", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: account.account_number,
          account_status: editStatus,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAccount({ ...account, account_status: editStatus })
      setIsEditing(false)
      setSuccessMessage(`The account ${account.account_number} has been updated successfully.`)
      setSuccessOpen(true)
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const fetchTransactions = async (accNo: string) => {
    setIsLoadingTxns(true)
    try {
      const res = await fetch(`/api/savings/transactions?account=${encodeURIComponent(accNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      console.log("account transaction data",data)
      if (res.ok) {
        setTransactions(data.transactions || [])
      }
    } catch {
      // silently fail; user can retry
    } finally {
      setIsLoadingTxns(false)
    }
  }

  const handleSubmitTransaction = async () => {
    if (!account) return
    const amt = parseFloat(txnAmount)
    if (isNaN(amt) || amt <= 0) {
      setTxnError("Enter a valid positive amount.")
      return
    }

    setIsSubmittingTxn(true)
    setTxnError("")

    try {
      const res = await fetch("/api/savings/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: account.account_number,
          transactionType: txnType,
          amount: amt,
          description: txnDescription || undefined,
          referenceNumber: txnReference || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update local balance
      setAccount({ ...account, available_balance: data.newBalance, clear_balance: data.newBalance })

      // Reset form
      setTxnAmount("")
      setTxnDescription("")
      setTxnReference("")
      setSuccessMessage(data.message)
      setSuccessOpen(true)

      // Refresh transactions
      fetchTransactions(account.account_number)
    } catch (e: any) {
      setTxnError(e.message || "Transaction failed. Please try again.")
    } finally {
      setIsSubmittingTxn(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-teal-100 text-teal-700"
      case "dormant":
        return "bg-amber-100 text-amber-700"
      case "closed":
        return "bg-red-100 text-red-700"
      case "frozen":
        return "bg-blue-100 text-blue-700"
      default:
        return ""
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return "---"
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "---"
    return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
  }

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/savings")}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">View / Modify Account</h1>
                <p className="text-muted-foreground">Search and manage savings account details</p>
              </div>
            </div>

            {/* Search Card */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="account-search">Account Number</Label>
                    <Input
                      id="account-search"
                      placeholder="Enter savings account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <Button onClick={() => handleSearch()} disabled={isSearching || !accountNumber.trim()}>
                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                  </Button>
                </div>
                {searchError && <p className="mt-3 text-sm text-red-500">{searchError}</p>}
              </CardContent>
            </Card>

            {/* Account Details */}
            {account && (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column - Main Content */}
                <div className="space-y-6 lg:col-span-2">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Account Overview</TabsTrigger>
                      <TabsTrigger value="transactions">Transactions</TabsTrigger>
                      <TabsTrigger value="member">Member Details</TabsTrigger>
                      <TabsTrigger value="scheme">Scheme Details</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4 pt-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Account Information</CardTitle>
                            <CardDescription>Core account details and balances</CardDescription>
                          </div>
                          {!isEditing ? (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="bg-transparent">
                              <Edit3 className="mr-2 h-4 w-4" />
                              Modify
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsEditing(false)
                                  setEditStatus(account.account_status)
                                }}
                                className="bg-transparent"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                              </Button>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-6">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                              <div>
                                <Label className="text-xs text-muted-foreground">Account Number</Label>
                                <p className="mt-1 font-mono text-sm font-semibold">{account.account_number}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Membership Number</Label>
                                <p className="mt-1 font-mono text-sm font-semibold">{account.membership_no}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Opening Date</Label>
                                <p className="mt-1 text-sm font-medium">{formatDate(account.opening_date)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Account Status</Label>
                                {isEditing ? (
                                  <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger className="mt-1 h-8 w-50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Active">Active</SelectItem>
                                      <SelectItem value="Dormant">Dormant</SelectItem>
                                      <SelectItem value="Frozen">Frozen</SelectItem>
                                      <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="mt-1">
                                    <Badge className={getStatusColor(account.account_status)}>
                                      {account.account_status}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Interest Rate</Label>
                                <p className="mt-1 text-sm font-semibold text-teal-600">{account.interest_rate}% p.a.</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Last Interest Calculated</Label>
                                <p className="mt-1 text-sm font-medium">{formatDate(account.last_interest_calculated_date)}</p>
                              </div>
                            </div>

                            {/* Balances */}
                            <div className="rounded-lg border bg-muted/30 p-4">
                              <h4 className="mb-3 text-sm font-semibold text-foreground">Balance Summary</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-md border bg-background p-3 text-center">
                                  <p className="text-xs text-muted-foreground">Available Balance</p>
                                  <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(account.available_balance)}</p>
                                </div>
                                <div className="rounded-md border bg-background p-3 text-center">
                                  <p className="text-xs text-muted-foreground">Clear Balance</p>
                                  <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(account.clear_balance)}</p>
                                </div>
                                <div className="rounded-md border bg-background p-3 text-center">
                                  <p className="text-xs text-muted-foreground">Unclear Balance</p>
                                  <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(account.unclear_balance)}</p>
                                </div>
                              </div>
                            </div>

                            {account.account_closed_date && (
                              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-700">
                                    Account Closed on {formatDate(account.account_closed_date)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions" className="space-y-4 pt-4">
                      {/* Transaction Form */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">New Transaction</CardTitle>
                          <CardDescription>Process a deposit or withdrawal on this account</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {account.account_status?.toLowerCase() !== "active" ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                              Transactions are only allowed on active accounts. Current status: <strong>{account.account_status}</strong>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <Button
                                  variant={txnType === "deposit" ? "default" : "outline"}
                                  onClick={() => setTxnType("deposit")}
                                  className={txnType === "deposit" ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-transparent"}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Deposit
                                </Button>
                                <Button
                                  variant={txnType === "withdrawal" ? "default" : "outline"}
                                  onClick={() => setTxnType("withdrawal")}
                                  className={txnType === "withdrawal" ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-transparent"}
                                >
                                  <Minus className="mr-2 h-4 w-4" />
                                  Withdrawal
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="txn-amount">Amount (INR)</Label>
                                  <Input
                                    id="txn-amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter amount"
                                    value={txnAmount}
                                    onChange={(e) => setTxnAmount(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="txn-ref">Reference Number (Optional)</Label>
                                  <Input
                                    id="txn-ref"
                                    placeholder="e.g. Receipt No."
                                    value={txnReference}
                                    onChange={(e) => setTxnReference(e.target.value)}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="txn-desc">Description (Optional)</Label>
                                <Textarea
                                  id="txn-desc"
                                  placeholder="Transaction description"
                                  rows={2}
                                  value={txnDescription}
                                  onChange={(e) => setTxnDescription(e.target.value)}
                                />
                              </div>

                              {txnError && <p className="text-sm text-red-500">{txnError}</p>}

                              <Button
                                onClick={handleSubmitTransaction}
                                disabled={isSubmittingTxn || !txnAmount}
                                className={txnType === "deposit" ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"}
                              >
                                {isSubmittingTxn ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : txnType === "deposit" ? (
                                  <ArrowDownRight className="mr-2 h-4 w-4" />
                                ) : (
                                  <ArrowUpRight className="mr-2 h-4 w-4" />
                                )}
                                {txnType === "deposit" ? "Process Deposit" : "Process Withdrawal"}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Transaction History */}
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Transaction History</CardTitle>
                            <CardDescription>Recent transactions on this account</CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchTransactions(account.account_number)}
                            disabled={isLoadingTxns}
                            className="bg-transparent"
                          >
                            {isLoadingTxns ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                            Refresh
                          </Button>
                        </CardHeader>
                        <CardContent>
                          {isLoadingTxns ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <History className="h-10 w-10 text-muted-foreground" />
                              <p className="mt-3 text-sm text-muted-foreground">No transactions found for this account.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead>By</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {transactions.map((txn) => (
                                    <TableRow key={txn.id}>
                                      <TableCell className="whitespace-nowrap text-sm">
                                        {formatDate(txn.transaction_date)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          className={
                                            txn.transaction_type === "DEPOSIT"
                                              ? "bg-teal-100 text-teal-700"
                                              : txn.transaction_type === "withdrawal"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-blue-100 text-blue-700"
                                          }
                                        >
                                          {txn.transaction_type === "DEPOSIT" ? (
                                            <ArrowDownRight className="mr-1 h-3 w-3" />
                                          ) : (
                                            <ArrowUpRight className="mr-1 h-3 w-3" />
                                          )}
                                          {txn.transaction_type}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="max-w-[200px] truncate text-sm">
                                        {txn.description || "---"}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        <span className={txn.transaction_type === "DEPOSIT" ? "text-teal-600" : "text-orange-600"}>
                                          {txn.transaction_type === "DEPOSIT" ? "+" : "-"}
                                          {formatCurrency(txn.credit_amount || txn.debit_amount)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm">
                                        {formatCurrency(txn.running_balance)}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{txn.performed_by}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Member Tab */}
                    <TabsContent value="member" className="space-y-4 pt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Member Information</CardTitle>
                          <CardDescription>Details of the account holder</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                              <Label className="text-xs text-muted-foreground">Full Name</Label>
                              <p className="mt-1 text-sm font-semibold">{account.full_name}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Father Name</Label>
                              <p className="mt-1 text-sm font-medium">{account.father_name || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Customer Code</Label>
                              <p className="mt-1 font-mono text-sm font-medium">{account.customer_code?.trim()}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Membership Number</Label>
                              <p className="mt-1 font-mono text-sm font-medium">{account.membership_no}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Member Type</Label>
                              <Badge variant="outline" className="mt-1">{account.member_type}</Badge>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Membership Class</Label>
                              <p className="mt-1 text-sm font-medium">{account.membership_class?.trim() || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Gender</Label>
                              <p className="mt-1 text-sm font-medium">{account.gender || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                              <p className="mt-1 text-sm font-medium">{formatDate(account.date_of_birth)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Mobile Number</Label>
                              <p className="mt-1 text-sm font-medium">{account.mobile_no || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Email</Label>
                              <p className="mt-1 text-sm font-medium">{account.email || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Aadhaar Number</Label>
                              <p className="mt-1 font-mono text-sm font-medium">{account.aadhaar_no?.trim() || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Join Date</Label>
                              <p className="mt-1 text-sm font-medium">{formatDate(account.join_date)}</p>
                            </div>
                          </div>

                          {/* Address */}
                          <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                            <h4 className="mb-3 text-sm font-semibold text-foreground">Address</h4>
                            <p className="text-sm text-foreground leading-relaxed">
                              {[account.address_line1, account.village, account.district, account.state, account.pincode]
                                .filter(Boolean)
                                .join(", ") || "---"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Scheme Tab */}
                    <TabsContent value="scheme" className="space-y-4 pt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Scheme Information</CardTitle>
                          <CardDescription>Details of the savings scheme linked to this account</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                              <Label className="text-xs text-muted-foreground">Scheme Name</Label>
                              <p className="mt-1 text-sm font-semibold">{account.scheme_name}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Scheme ID</Label>
                              <p className="mt-1 font-mono text-sm font-medium">{account.scheme_id}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Interest Rate</Label>
                              <p className="mt-1 text-sm font-semibold text-teal-600">{account.interest_rate}% per annum</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Interest Frequency</Label>
                              <p className="mt-1 text-sm font-medium">{account.interest_frequency || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Interest Calculation Method</Label>
                              <p className="mt-1 text-sm font-medium">{account.interest_calculation_method || "---"}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Minimum Balance</Label>
                              <p className="mt-1 text-sm font-medium">{formatCurrency(account.min_balance)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Minimum Deposit</Label>
                              <p className="mt-1 text-sm font-medium">{formatCurrency(account.minimum_deposit)}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Maximum Deposit</Label>
                              <p className="mt-1 text-sm font-medium">{formatCurrency(account.maximum_deposit)}</p>
                            </div>
                          </div>

                          {account.scheme_description && (
                            <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                              <h4 className="mb-2 text-sm font-semibold text-foreground">Scheme Description</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{account.scheme_description}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Right Column - Quick Info Sidebar */}
                <div className="space-y-6">
                  {/* Account Quick Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">Account Quick Info</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Account Number</p>
                        <p className="font-mono text-sm font-bold">{account.account_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge className={`mt-1 ${getStatusColor(account.account_status)}`}>{account.account_status}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available Balance</p>
                        <p className="text-xl font-bold text-foreground">{formatCurrency(account.available_balance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interest Rate</p>
                        <p className="text-sm font-semibold text-teal-600">{account.interest_rate}% p.a.</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Member Quick Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">Member Info</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-semibold">{account.full_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Membership No</p>
                        <p className="font-mono text-sm font-semibold">{account.membership_no}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <Badge variant="outline">{account.member_type}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mobile</p>
                        <p className="text-sm font-medium">{account.mobile_no || "---"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scheme Quick Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">Scheme Info</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Scheme</p>
                        <p className="text-sm font-semibold">{account.scheme_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Min Balance</p>
                        <p className="text-sm font-medium">{formatCurrency(account.min_balance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interest Frequency</p>
                        <p className="text-sm font-medium">{account.interest_frequency || "---"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Empty State when no account is searched */}
            {!account && !isSearching && !searchError && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-6">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Search for an Account</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Enter a savings account number above to view and modify account details, member information, and scheme configuration.
                </p>
              </div>
            )}

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Account Updated Successfully
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {successMessage || `The account ${account?.account_number} has been updated successfully.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setSuccessOpen(false)}>Close</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
