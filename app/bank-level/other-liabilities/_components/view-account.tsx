"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface OtherLiabilityAccount {
  uuid: string
  account_number: string
  account_name: string
  parent_account_number: string
  account_description: string
  ledger_balance: number
  clear_balance: number
  unclear_balance: number
  account_status: string
  account_opened_date: string
  created_at: string
  branch_id: number
}

export default function ViewAccount({
  accountId,
  onBack,
}: {
  accountId: string
  onBack?: () => void
}) {
  const [account, setAccount] = useState<OtherLiabilityAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccountDetails()
  }, [accountId])

  const fetchAccountDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/other-liabilities/accounts/${accountId}`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Failed to fetch account details")
        return
      }

      setAccount(result.data)
    } catch (err) {
      setError("Failed to fetch account details")
    } finally {
      setLoading(false)
    }
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
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !account) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || "Account not found"}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl">{account.account_name}</CardTitle>
          <Badge className={getStatusBadgeClass(account.account_status)}>
            {account.account_status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Account Number</p>
              <p className="text-lg font-semibold font-mono">{account.account_number}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Parent Ledger Account</p>
              <p className="text-lg font-semibold font-mono">{account.parent_account_number}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Ledger Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(account.ledger_balance)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Clear Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(account.clear_balance)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Unclear Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(account.unclear_balance)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Account Opened Date</p>
              <p className="text-lg font-semibold">
                {account.account_opened_date
                  ? new Date(account.account_opened_date).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>

          {account.account_description && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{account.account_description}</p>
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Created on {new Date(account.created_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">Branch ID: {account.branch_id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
