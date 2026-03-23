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
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react"

interface Transaction {
  id: string
  transaction_date: string
  voucher_type: string
  description: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference_no?: string
  created_at: string
}

interface TransactionsListProps {
  accountNumber: string
}

export default function TransactionsList({ accountNumber }: TransactionsListProps) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [formData, setFormData] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    voucherType: "CREDIT",
    description: "",
    debitAmount: "0",
    creditAmount: "0",
    referenceNo: "",
  })

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `/api/income/transactions?account_number=${accountNumber}`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const data = await response.json()
        setTransactions(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error fetching transactions:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [accountNumber])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleVoucherTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      voucherType: value,
      debitAmount: "0",
      creditAmount: "0",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      if (!formData.transactionDate) {
        throw new Error("Transaction date is required")
      }
      if (!formData.description.trim()) {
        throw new Error("Description is required")
      }

      const debit = formData.voucherType === "DEBIT" ? parseFloat(formData.debitAmount) || 0 : 0
      const credit = formData.voucherType === "CREDIT" ? parseFloat(formData.creditAmount) || 0 : 0

      if (debit === 0 && credit === 0) {
        throw new Error("Enter an amount for the transaction")
      }

      const response = await fetch("/api/income/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_number: accountNumber,
          transaction_date: formData.transactionDate,
          voucher_type: formData.voucherType,
          description: formData.description,
          debit_amount: debit,
          credit_amount: credit,
          reference_no: formData.referenceNo || null,
          branch_id: user?.branch_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create transaction")
      }

      setMessage({
        type: "success",
        text: "Transaction recorded successfully!",
      })

      setFormData({
        transactionDate: new Date().toISOString().split('T')[0],
        voucherType: "CREDIT",
        description: "",
        debitAmount: "0",
        creditAmount: "0",
        referenceNo: "",
      })

      setShowForm(false)

      // Refresh transactions
      const refreshResponse = await fetch(
        `/api/income/transactions?account_number=${accountNumber}`
      )
      if (refreshResponse.ok) {
        const updatedTransactions = await refreshResponse.json()
        setTransactions(updatedTransactions)
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading transactions...</span>
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
            <CardTitle>Transactions - {accountNumber}</CardTitle>
            <CardDescription>
              Showing {transactions.length} transaction(s)
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </CardHeader>
      </Card>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Record New Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Transaction Date</Label>
                  <Input
                    id="transactionDate"
                    name="transactionDate"
                    type="date"
                    value={formData.transactionDate}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voucherType">Transaction Type</Label>
                  <Select value={formData.voucherType} onValueChange={handleVoucherTypeChange}>
                    <SelectTrigger disabled={submitting}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT">Credit (Income In)</SelectItem>
                      <SelectItem value="DEBIT">Debit (Income Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter transaction details..."
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={submitting}
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {formData.voucherType === "CREDIT" ? (
                  <div className="space-y-2">
                    <Label htmlFor="creditAmount">Amount (Credit)</Label>
                    <Input
                      id="creditAmount"
                      name="creditAmount"
                      type="number"
                      placeholder="0.00"
                      value={formData.creditAmount}
                      onChange={handleInputChange}
                      disabled={submitting}
                      step="0.01"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="debitAmount">Amount (Debit)</Label>
                    <Input
                      id="debitAmount"
                      name="debitAmount"
                      type="number"
                      placeholder="0.00"
                      value={formData.debitAmount}
                      onChange={handleInputChange}
                      disabled={submitting}
                      step="0.01"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="referenceNo">Reference No. (Optional)</Label>
                  <Input
                    id="referenceNo"
                    name="referenceNo"
                    placeholder="e.g., CHQ-001"
                    value={formData.referenceNo}
                    onChange={handleInputChange}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    "Record Transaction"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No transactions recorded for this account yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.voucher_type === "CREDIT"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {transaction.voucher_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{transaction.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {transaction.debit_amount > 0 ? `₹${transaction.debit_amount.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {transaction.credit_amount > 0 ? `₹${transaction.credit_amount.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ₹{transaction.running_balance.toFixed(2)}
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
