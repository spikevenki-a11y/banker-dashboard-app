"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface GLAccount {
  accountcode: number
  accountname: string
}

export default function AccountOpeningForm({ onAccountCreated }: { onAccountCreated: () => void }) {
  const [formData, setFormData] = useState({
    accountName: "",
    glAccountCode: "",
    description: "",
  })

  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [fetchingGL, setFetchingGL] = useState(true)

  useEffect(() => {
    const fetchGLAccounts = async () => {
      try {
        const response = await fetch(`/api/income/ledger-accounts`)
        const accounts = await response.json()
        if (!accounts.success) throw new Error("Failed to fetch GL accounts")
        setGlAccounts(accounts.accounts)
      } catch (error) {
        console.error("Error fetching GL accounts:", error)
        setMessage({
          type: "error",
          text: "Failed to load ledger accounts. Please try again.",
        })
      } finally {
        setFetchingGL(false)
      }
    }

    fetchGLAccounts()
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (!formData.accountName.trim()) {
        throw new Error("Account name is required")
      }
      if (!formData.glAccountCode) {
        throw new Error("Ledger account is required")
      }

      const response = await fetch("/api/income/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_name: formData.accountName,
          gl_account_code: parseInt(formData.glAccountCode),
          description: formData.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      setMessage({
        type: "success",
        text: "Account created successfully!",
      })

      setFormData({ accountName: "", glAccountCode: "", description: "" })

      setTimeout(onAccountCreated, 1500)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create account",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open New Income Account</CardTitle>
        <CardDescription>
          Create a new income account linked to a Chart of Accounts ledger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}>
              {message.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <p className={message.type === "success" ? "text-green-800" : "text-red-800"}>
                {message.text}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                name="accountName"
                placeholder="e.g., Interest Income"
                value={formData.accountName}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="glAccountCode">Ledger Account (Income Head) *</Label>
              <Select value={formData.glAccountCode} onValueChange={(value) => setFormData(prev => ({ ...prev, glAccountCode: value }))}>
                <SelectTrigger disabled={loading || fetchingGL}>
                  <SelectValue placeholder={fetchingGL ? "Loading accounts..." : "Select a ledger account"} />
                </SelectTrigger>
                <SelectContent>
                  {glAccounts.map((account) => (
                    <SelectItem
                      key={account.accountcode}
                      value={account.accountcode.toString()}
                    >
                      {account.accountcode} - {account.accountname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Maps to parent ledger account from Chart of Accounts
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter any additional details about this account..."
              value={formData.description}
              onChange={handleInputChange}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || fetchingGL}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
