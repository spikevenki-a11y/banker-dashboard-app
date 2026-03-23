"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  Banknote,
  ArrowUpRight,
  History,
} from "lucide-react"

interface Transaction {
  id: string
  transaction_date: string
  voucher_type: string
  description: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference_no?: string
  gl_batch_id?: number
  batch_status?: string
  created_at: string
}

interface IncomeAccount {
  id: string
  account_number: string
  account_name: string
  gl_account_code: number
  current_balance: number
  account_status: string
}

interface TransactionEntry {
  id: string
  account_number: string
  account_name: string
  gl_account_code: number
  amount: string
  description: string
}

interface IncompleteBatch {
  batch_id: number
  voucher_id: number
  voucher_type: string
  business_date: string
  status: string
}

export default function TransactionsList() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<IncomeAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Selected account for viewing transactions
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [loadingTxns, setLoadingTxns] = useState(false)

  // Transaction form state
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [transactionType, setTransactionType] = useState<"CREDIT" | "DEBIT">("CREDIT")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [incompleteBatches, setIncompleteBatches] = useState<IncompleteBatch[]>([])
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)

  // Multiple account entries
  const [entries, setEntries] = useState<TransactionEntry[]>([])
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [accountSearchTerm, setAccountSearchTerm] = useState("")

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/income/accounts`)
        const data = await response.json()
        if (data.data) {
          setAccounts(data.data)
        }
      } catch (err) {
        console.error("Error fetching accounts:", err)
        setError("Failed to fetch accounts")
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  // Fetch transactions when account is selected
  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions(selectedAccount)
    } else {
      setTransactions([])
    }
  }, [selectedAccount])

  const fetchTransactions = async (accountNumber: string) => {
    try {
      setLoadingTxns(true)
      const response = await fetch(`/api/income/transactions?account_number=${accountNumber}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error("Error fetching transactions:", err)
    } finally {
      setLoadingTxns(false)
    }
  }

  const fetchIncompleteBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) {
        setIncompleteBatches(data.data)
      }
    } catch {
      // silent
    }
  }

  const handleAddEntry = (account: IncomeAccount) => {
    // Check if already added
    if (entries.find(e => e.account_number === account.account_number)) {
      return
    }
    setEntries(prev => [...prev, {
      id: crypto.randomUUID(),
      account_number: account.account_number,
      account_name: account.account_name,
      gl_account_code: account.gl_account_code,
      amount: "",
      description: ""
    }])
    setShowAccountSelector(false)
    setAccountSearchTerm("")
  }

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleEntryChange = (id: string, field: "amount" | "description", value: string) => {
    setEntries(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ))
  }

  const getTotalAmount = () => {
    return entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      if (!voucherType) {
        throw new Error("Please select a voucher type (Cash or Transfer)")
      }

      if (entries.length === 0) {
        throw new Error("Please add at least one account entry")
      }

      const invalidEntries = entries.filter(e => !e.amount || parseFloat(e.amount) <= 0)
      if (invalidEntries.length > 0) {
        throw new Error("All entries must have a valid positive amount")
      }

      const response = await fetch("/api/income/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: entries.map(e => ({
            account_number: e.account_number,
            amount: parseFloat(e.amount),
            description: e.description || `Income ${transactionType}`
          })),
          transaction_date: transactionDate,
          transaction_type: transactionType,
          voucher_type: voucherType,
          selected_batch: selectedBatch,
          branch_id: user?.branch_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create transaction")
      }

      setMessage({
        type: "success",
        text: data.message || `Transaction recorded successfully! Batch: ${data.batch_id}, Voucher: ${data.voucher_no}`,
      })

      // Reset form
      setEntries([])
      setVoucherType("")
      setSelectedBatch(0)
      setShowForm(false)

      // Refresh transactions if an account is selected
      if (selectedAccount) {
        fetchTransactions(selectedAccount)
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create transaction",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAccounts = accounts.filter(account =>
    account.account_number.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
    account.account_name.toLowerCase().includes(accountSearchTerm.toLowerCase())
  )

  const formatCurrency = (val: number | string) => {
    return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (d: string) => {
    if (!d) return "---"
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with New Transaction Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Income Transactions
            </CardTitle>
            <CardDescription>
              Record income transactions with cash or transfer voucher types
            </CardDescription>
          </div>
          <Button onClick={() => {
            setShowForm(!showForm)
            if (!showForm) {
              fetchIncompleteBatches()
            }
          }} className="gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </CardHeader>
      </Card>

      {/* Transaction Form */}
      {showForm && (
        <Card className="border-teal-200 bg-teal-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Record Income Transaction
            </CardTitle>
            <CardDescription>
              Add multiple accounts in a single batch transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <div className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-100 border border-green-300 text-green-800"
                    : "bg-red-100 border border-red-300 text-red-800"
                }`}>
                  {message.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                  )}
                  <p>{message.text}</p>
                </div>
              )}

              {/* Transaction Details Row */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Transaction Date</Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionType">Transaction Type</Label>
                  <Select 
                    value={transactionType} 
                    onValueChange={(v) => setTransactionType(v as "CREDIT" | "DEBIT")}
                  >
                    <SelectTrigger disabled={submitting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT">Credit (Income In)</SelectItem>
                      <SelectItem value="DEBIT">Debit (Income Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voucherType">Voucher Type *</Label>
                  <Select 
                    value={voucherType} 
                    onValueChange={(v) => {
                      setVoucherType(v as "CASH" | "TRANSFER")
                      if (v !== "TRANSFER") {
                        setSelectedBatch(0)
                      }
                    }}
                  >
                    <SelectTrigger disabled={submitting}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* GL Batch Selection - only for TRANSFER */}
                {voucherType === "TRANSFER" && (
                  <div className="space-y-2">
                    <Label>GL Batch ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedBatch && selectedBatch !== 0 ? selectedBatch : "New Batch"}
                        readOnly
                        placeholder="Select or create batch"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsBatchPopupOpen(true)}
                        disabled={submitting}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Account Entries</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAccountSelector(true)}
                    disabled={submitting}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Account
                  </Button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">
                      No accounts added. Click "Add Account" to select income accounts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry, index) => (
                      <div key={entry.id} className="flex items-start gap-4 p-4 border rounded-lg bg-background">
                        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                          {index + 1}
                        </div>
                        <div className="flex-1 grid md:grid-cols-4 gap-4">
                          <div className="md:col-span-1">
                            <Label className="text-xs text-muted-foreground">Account</Label>
                            <p className="font-mono text-sm font-medium">{entry.account_number}</p>
                            <p className="text-xs text-muted-foreground truncate">{entry.account_name}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Amount (INR) *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={entry.amount}
                              onChange={(e) => handleEntryChange(entry.id, "amount", e.target.value)}
                              disabled={submitting}
                              className="mt-1"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Input
                              placeholder="Transaction description..."
                              value={entry.description}
                              onChange={(e) => handleEntryChange(entry.id, "description", e.target.value)}
                              disabled={submitting}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEntry(entry.id)}
                          disabled={submitting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex justify-end p-4 border-t bg-muted/30 rounded-lg">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold text-teal-600">{formatCurrency(getTotalAmount())}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button type="submit" disabled={submitting || entries.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Record Transaction"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEntries([])
                    setVoucherType("")
                    setSelectedBatch(0)
                    setMessage(null)
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account Selector Dialog */}
      <Dialog open={showAccountSelector} onOpenChange={setShowAccountSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Income Account</DialogTitle>
            <DialogDescription>
              Choose an account to add to the transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by account number or name..."
                value={accountSearchTerm}
                onChange={(e) => setAccountSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              {filteredAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No accounts found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map(account => {
                      const isAdded = entries.some(e => e.account_number === account.account_number)
                      return (
                        <TableRow key={account.id} className={isAdded ? "opacity-50" : ""}>
                          <TableCell className="font-mono text-sm">{account.account_number}</TableCell>
                          <TableCell>{account.account_name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(account.current_balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={isAdded ? "ghost" : "outline"}
                              onClick={() => handleAddEntry(account)}
                              disabled={isAdded}
                            >
                              {isAdded ? "Added" : "Select"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Selector Dialog */}
      <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select GL Batch</DialogTitle>
            <DialogDescription>
              Choose an existing incomplete batch or create a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => {
                setSelectedBatch(0)
                setIsBatchPopupOpen(false)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Batch
            </Button>
            
            {incompleteBatches.length > 0 && (
              <>
                <div className="text-sm font-medium text-muted-foreground">Or select existing batch:</div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {incompleteBatches.map(batch => (
                    <Button
                      key={batch.batch_id}
                      className="w-full justify-between"
                      variant={selectedBatch === batch.batch_id ? "secondary" : "outline"}
                      onClick={() => {
                        setSelectedBatch(batch.batch_id)
                        setIsBatchPopupOpen(false)
                      }}
                    >
                      <span>Batch #{batch.batch_id} - Voucher #{batch.voucher_id}</span>
                      <Badge variant="outline">{batch.voucher_type}</Badge>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle className="text-lg">Transaction History</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="viewAccount" className="text-sm whitespace-nowrap">View Account:</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select account to view" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.account_number}>
                      {account.account_number} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedAccount ? (
            <div className="text-center py-8 text-muted-foreground">
              Select an account above to view its transaction history
            </div>
          ) : loadingTxns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions recorded for this account yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher Type</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {formatDate(transaction.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          transaction.voucher_type === "CASH" 
                            ? "border-green-300 text-green-700 bg-green-50" 
                            : "border-blue-300 text-blue-700 bg-blue-50"
                        }>
                          {transaction.voucher_type || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.gl_batch_id || "---"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(transaction.running_balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          transaction.batch_status === "VERIFIED" 
                            ? "border-green-300 text-green-700" 
                            : "border-amber-300 text-amber-700"
                        }>
                          {transaction.batch_status || "PENDING"}
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
    </div>
  )
}
