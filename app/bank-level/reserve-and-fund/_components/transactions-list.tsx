"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertCircle, CheckCircle2, Loader2, Plus, Search, Trash2,
  Banknote, ArrowUpRight, History, IndianRupee, Calendar, FileText,
} from "lucide-react"

interface Transaction {
  id: string
  transaction_date: string
  voucher_type: string
  voucher_no: number
  description: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference_no?: string
  batch_status?: string
  created_at: string
}

interface ReserveAccount {
  uuid: string
  account_number: string
  account_name: string
  parent_account_number: string
  ledger_balance: number
  account_status: string
}

interface TransactionEntry {
  id: string
  account_number: string
  account_name: string
  parent_account_number: string
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
  const [accounts, setAccounts] = useState<ReserveAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successData, setSuccessData] = useState<{
    batch_id?: number; voucher_no?: string | number; total_amount: number
    entries_count: number; transaction_type: string; voucher_type: string; transaction_date: string
  } | null>(null)

  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [loadingTxns, setLoadingTxns] = useState(false)
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0])
  const [transactionType, setTransactionType] = useState<"CREDIT" | "DEBIT">("CREDIT")
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [incompleteBatches, setIncompleteBatches] = useState<IncompleteBatch[]>([])
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [entries, setEntries] = useState<TransactionEntry[]>([])
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [accountSearchTerm, setAccountSearchTerm] = useState("")

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/reserve-and-fund/accounts")
        const data = await response.json()
        if (data.data) setAccounts(data.data)
      } catch { setError("Failed to fetch accounts") }
      finally { setLoading(false) }
    }
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) fetchTransactions(selectedAccount)
    else setTransactions([])
  }, [selectedAccount])

  const fetchTransactions = async (accountNumber: string) => {
    try {
      setLoadingTxns(true)
      const response = await fetch(`/api/reserve-and-fund/transactions?account_number=${accountNumber}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(Array.isArray(data) ? data : [])
      }
    } catch { /* silent */ }
    finally { setLoadingTxns(false) }
  }

  const fetchIncompleteBatches = async () => {
    try {
      const res = await fetch("/api/fas/incomplete-batches", { credentials: "include" })
      const data = await res.json()
      if (res.ok && data.data) setIncompleteBatches(data.data)
    } catch { /* silent */ }
  }

  const handleAddEntry = (account: ReserveAccount) => {
    if (entries.find((e) => e.account_number === account.account_number)) return
    setEntries((prev) => [...prev, {
      id: crypto.randomUUID(),
      account_number: account.account_number,
      account_name: account.account_name,
      parent_account_number: account.parent_account_number,
      amount: "",
      description: "",
    }])
    setShowAccountSelector(false)
    setAccountSearchTerm("")
  }

  const handleRemoveEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id))

  const handleEntryChange = (id: string, field: "amount" | "description", value: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))

  const getTotalAmount = () => entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      if (!voucherType) throw new Error("Please select a voucher type (Cash or Transfer)")
      if (entries.length === 0) throw new Error("Please add at least one account entry")
      if (entries.some((e) => !e.amount || parseFloat(e.amount) <= 0)) {
        throw new Error("All entries must have a valid positive amount")
      }

      const response = await fetch("/api/reserve-and-fund/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: entries.map((e) => ({
            account_number: e.account_number,
            amount: parseFloat(e.amount),
            description: e.description || `Reserve & Fund ${transactionType}`,
          })),
          transaction_date: transactionDate,
          transaction_type: transactionType,
          voucher_type: voucherType,
          selected_batch: selectedBatch,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create transaction")

      setSuccessData({
        batch_id: data.batch_id,
        voucher_no: data.voucher_no,
        total_amount: getTotalAmount(),
        entries_count: entries.length,
        transaction_type: transactionType,
        voucher_type: voucherType,
        transaction_date: transactionDate,
      })
      setShowSuccessDialog(true)
      setEntries([])
      setVoucherType("")
      setSelectedBatch(0)
      setShowForm(false)
      setMessage(null)
      if (selectedAccount) fetchTransactions(selectedAccount)
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create transaction" })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAccounts = accounts.filter((a) =>
    a.account_number.toLowerCase().includes(accountSearchTerm.toLowerCase()) ||
    a.account_name.toLowerCase().includes(accountSearchTerm.toLowerCase())
  )

  const formatCurrency = (val: number | string) =>
    `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Reserve & Fund Transactions
            </CardTitle>
            <CardDescription>
              Record reserve and fund transactions with cash or transfer voucher types
            </CardDescription>
          </div>
          <Button onClick={() => { setShowForm(!showForm); if (!showForm) fetchIncompleteBatches() }} className="gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </CardHeader>
      </Card>

      {showForm && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Record Reserve & Fund Transaction
            </CardTitle>
            <CardDescription>Add multiple accounts in a single batch transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <div className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-green-100 border border-green-300 text-green-800"
                    : "bg-red-100 border border-red-300 text-red-800"
                }`}>
                  {message.type === "success"
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5" />
                    : <AlertCircle className="h-4 w-4 mt-0.5" />}
                  <p>{message.text}</p>
                </div>
              )}

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Transaction Date</Label>
                  <Input type="date" value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)} disabled={submitting} />
                </div>

                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={transactionType} onValueChange={(v) => setTransactionType(v as "CREDIT" | "DEBIT")}>
                    <SelectTrigger disabled={submitting}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT">Credit (Fund Increase)</SelectItem>
                      <SelectItem value="DEBIT">Debit (Fund Disbursement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voucher Type *</Label>
                  <Select value={voucherType} onValueChange={(v) => {
                    setVoucherType(v as "CASH" | "TRANSFER")
                    if (v !== "TRANSFER") setSelectedBatch(0)
                  }}>
                    <SelectTrigger disabled={submitting}><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {voucherType === "TRANSFER" && (
                  <div className="space-y-2">
                    <Label>GL Batch ID</Label>
                    <div className="flex gap-2">
                      <Input value={selectedBatch && selectedBatch !== 0 ? selectedBatch : "New Batch"} readOnly />
                      <Button type="button" variant="outline" onClick={() => setIsBatchPopupOpen(true)} disabled={submitting}>
                        Select
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Account Entries</Label>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setShowAccountSelector(true)} disabled={submitting} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Account
                  </Button>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">
                      No accounts added. Click "Add Account" to select reserve & fund accounts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry, index) => (
                      <div key={entry.id} className="flex items-start gap-4 p-4 border rounded-lg bg-background">
                        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
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
                            <Input type="number" min="0" step="0.01" placeholder="0.00"
                              value={entry.amount}
                              onChange={(e) => handleEntryChange(entry.id, "amount", e.target.value)}
                              disabled={submitting} className="mt-1" />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Input placeholder="Transaction description..."
                              value={entry.description}
                              onChange={(e) => handleEntryChange(entry.id, "description", e.target.value)}
                              disabled={submitting} className="mt-1" />
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => handleRemoveEntry(entry.id)} disabled={submitting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-end p-4 border-t bg-muted/30 rounded-lg">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold text-violet-600">{formatCurrency(getTotalAmount())}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button type="submit" disabled={submitting || entries.length === 0}>
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : "Record Transaction"}
                </Button>
                <Button type="button" variant="outline" disabled={submitting}
                  onClick={() => { setShowForm(false); setEntries([]); setVoucherType(""); setSelectedBatch(0); setMessage(null) }}>
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
            <DialogTitle>Select Reserve & Fund Account</DialogTitle>
            <DialogDescription>Choose an account to add to the transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by account number or name..."
                value={accountSearchTerm} onChange={(e) => setAccountSearchTerm(e.target.value)} className="flex-1" />
            </div>
            <div className="max-h-[400px] overflow-y-auto border rounded-lg">
              {filteredAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No accounts found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow key={account.account_number}>
                        <TableCell className="font-mono">{account.account_number}</TableCell>
                        <TableCell>{account.account_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.ledger_balance)}</TableCell>
                        <TableCell>
                          <Badge variant={account.account_status === "ACTIVE" ? "default" : "secondary"}>
                            {account.account_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleAddEntry(account)}
                            disabled={entries.some((e) => e.account_number === account.account_number)}>
                            {entries.some((e) => e.account_number === account.account_number) ? "Added" : "Add"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Selector Dialog */}
      <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select GL Batch</DialogTitle>
            <DialogDescription>Choose an existing incomplete batch or create a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button className="w-full" variant="outline"
              onClick={() => { setSelectedBatch(0); setIsBatchPopupOpen(false) }}>
              Create New Batch
            </Button>
            {incompleteBatches.length > 0 && (
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Voucher ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incompleteBatches.map((batch) => (
                      <TableRow key={batch.batch_id}>
                        <TableCell className="font-mono">{batch.batch_id}</TableCell>
                        <TableCell>{batch.voucher_id}</TableCell>
                        <TableCell><Badge variant="outline">{batch.voucher_type}</Badge></TableCell>
                        <TableCell>{formatDate(batch.business_date)}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => { setSelectedBatch(batch.batch_id); setIsBatchPopupOpen(false) }}>
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>Select an account to view its transaction history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account to view transactions" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_number} value={account.account_number}>
                      {account.account_number} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAccount && (
              <Button variant="outline" size="sm"
                onClick={() => fetchTransactions(selectedAccount)} disabled={loadingTxns}>
                {loadingTxns ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            )}
          </div>

          {!selectedAccount ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-muted-foreground">Select an account above to view its transactions</p>
            </div>
          ) : loadingTxns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
              <p className="text-muted-foreground">No transactions found for this account</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Voucher Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{formatDate(txn.transaction_date)}</TableCell>
                      <TableCell className="font-mono text-xs">{txn.voucher_no || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{txn.voucher_type}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{txn.description}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(txn.running_balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.batch_status === "VERIFIED" ? "default" : "secondary"}>
                          {txn.batch_status || "PENDING"}
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Transaction Saved Successfully!</DialogTitle>
            <DialogDescription className="text-center">
              Your reserve & fund transaction has been recorded
            </DialogDescription>
          </DialogHeader>
          {successData && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />Voucher No
                  </span>
                  <span className="font-mono font-semibold">{successData.voucher_no || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />Batch ID
                  </span>
                  <span className="font-mono font-semibold">{successData.batch_id || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />Transaction Date
                  </span>
                  <span className="font-medium">{formatDate(successData.transaction_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Voucher Type</span>
                  <Badge variant="outline" className={
                    successData.voucher_type === "CASH"
                      ? "border-green-300 text-green-700 bg-green-50"
                      : "border-blue-300 text-blue-700 bg-blue-50"
                  }>{successData.voucher_type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transaction Type</span>
                  <Badge variant="outline" className={
                    successData.transaction_type === "CREDIT"
                      ? "border-green-300 text-green-700 bg-green-50"
                      : "border-red-300 text-red-700 bg-red-50"
                  }>{successData.transaction_type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accounts</span>
                  <span className="font-medium">{successData.entries_count} account(s)</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />Total Amount
                    </span>
                    <span className="text-xl font-bold text-violet-600">
                      {formatCurrency(successData.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
