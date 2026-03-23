"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"

interface IncomeAccount {
  id: string
  account_number: string
  account_name: string
  gl_account_code: number
  current_balance: number
  opening_balance: number
  account_status: string
  opening_date: string
  closing_date: string | null
  description: string
  branch_id: number
  created_at: string
  gl_account?: {
    accountname: string
    accountcode: number
  }
}

interface ViewAccountProps {
  accountNumber: string
  onBack: () => void
}

export default function ViewAccount({ accountNumber, onBack }: ViewAccountProps) {
  const [account, setAccount] = useState<IncomeAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/income/accounts/${accountNumber}`)

        if (!response.ok) {
          throw new Error("Failed to fetch account details")
        }

        const data = await response.json()
        setAccount(data)
      } catch (err) {
        console.error("Error fetching account:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch account details")
      } finally {
        setLoading(false)
      }
    }

    fetchAccount()
  }, [accountNumber])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading account details...</span>
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
            <Button onClick={onBack} variant="outline" size="sm" className="mt-3 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!account) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Account not found</p>
          <div className="flex justify-center mt-4">
            <Button onClick={onBack} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const balance = account.current_balance || 0
  const changeFromOpening = balance - (account.opening_balance || 0)
  const changePercent = account.opening_balance 
    ? ((changeFromOpening / account.opening_balance) * 100).toFixed(2)
    : "0.00"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{account.account_name}</CardTitle>
              <CardDescription>Account: {account.account_number}</CardDescription>
            </div>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-800">
              {account.account_status}
            </span>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{balance.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opening Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(account.opening_balance || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Change Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${changeFromOpening >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{changeFromOpening.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Change %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(changePercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changePercent}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">GL Account Code</p>
              <p className="text-lg font-mono">{account.gl_account_code}</p>
              {account.gl_account && (
                <p className="text-sm text-muted-foreground">{account.gl_account.accountname}</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Opening Date</p>
              <p className="text-lg">
                {new Date(account.opening_date).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Created Date</p>
              <p className="text-lg">
                {new Date(account.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {account.closing_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Closing Date</p>
                <p className="text-lg">
                  {new Date(account.closing_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {account.description && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
              <p className="text-base">{account.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
