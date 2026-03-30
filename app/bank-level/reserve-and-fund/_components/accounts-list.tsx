"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Eye, Search, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ReserveAccount {
  uuid: string
  account_number: string
  account_name: string
  parent_account_number: string
  ledger_balance: number
  account_status: string
  created_at: string
}

export default function AccountsList({
  onViewAccount,
  refreshTrigger,
}: {
  onViewAccount: (id: string) => void
  refreshTrigger: number
}) {
  const [accounts, setAccounts] = useState<ReserveAccount[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<ReserveAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchAccounts() }, [refreshTrigger])

  useEffect(() => {
    setFilteredAccounts(
      accounts.filter((a) =>
        a.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.account_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [searchTerm, accounts])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/reserve-and-fund/accounts")
      const result = await response.json()
      if (result.data) { setAccounts(result.data); setFilteredAccounts(result.data) }
    } catch { setError("Failed to fetch accounts") }
    finally { setLoading(false) }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800"
      case "CLOSED": return "bg-red-100 text-red-800"
      case "INACTIVE": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const formatCurrency = (val: number | string) =>
    `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserve & Fund Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by account name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Parent Ledger</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.uuid}>
                    <TableCell className="font-mono text-sm">{account.account_number}</TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell className="font-mono text-sm">{account.parent_account_number}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(account.ledger_balance)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(account.account_status)}>
                        {account.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => onViewAccount(account.uuid)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </div>
      </CardContent>
    </Card>
  )
}
