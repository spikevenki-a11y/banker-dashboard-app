"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Eye, Loader2, Search } from "lucide-react"

interface IncomeAccount {
  id: string
  account_number: string
  account_name: string
  gl_account_code: number
  current_balance: number
  account_status: string
  opening_date: string
  description: string
}

interface AccountsListProps {
  onViewAccount: (accountNumber: string) => void
  refreshTrigger: number
}

export default function AccountsList({ onViewAccount, refreshTrigger }: AccountsListProps) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<IncomeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!user?.branch_id) {
          setError("Branch information not available")
          return
        }

        const response = await fetch(`/api/income/accounts?branch_id=${user.branch_id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch accounts")
        }

        const data = await response.json()
        setAccounts(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error fetching accounts:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch accounts")
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [user?.branch_id, refreshTrigger])

  const filteredAccounts = accounts.filter(account =>
    account.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading accounts...</span>
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
    <Card>
      <CardHeader>
        <CardTitle>Income Accounts</CardTitle>
        <CardDescription>
          Showing {filteredAccounts.length} of {accounts.length} account(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by account number or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {accounts.length === 0
                ? "No income accounts found. Create one to get started."
                : "No accounts match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opening Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map(account => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm">{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{account.current_balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                        {account.account_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(account.opening_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewAccount(account.account_number)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
