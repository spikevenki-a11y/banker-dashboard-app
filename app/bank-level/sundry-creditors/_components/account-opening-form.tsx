"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LedgerAccount {
  accountcode: number;
  accountname: string;
}

export default function AccountOpeningForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [loadingLedgers, setLoadingLedgers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    account_number: "",
    account_name: "",
    parent_account_number: "",
    opening_balance: "0",
    description: "",
  });

  useEffect(() => {
    fetchLedgerAccounts();
  }, []);

  const fetchLedgerAccounts = async () => {
    try {
      setLoadingLedgers(true);
      const response = await fetch("/api/sundry-creditors/ledger-accounts");
      const result = await response.json();

      if (result.data) {
        setLedgerAccounts(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch ledger accounts:", err);
      setError("Failed to load ledger accounts");
    } finally {
      setLoadingLedgers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (
      !formData.account_number ||
      !formData.account_name ||
      !formData.parent_account_number
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/sundry-creditors/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          opening_balance: parseFloat(formData.opening_balance) || 0,
          branch_id: 1, // Default branch - can be made dynamic
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create account");
        return;
      }

      setSuccessMessage("Account created successfully!");
      setFormData({
        account_number: "",
        account_name: "",
        parent_account_number: "",
        opening_balance: "0",
        description: "",
      });

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError("An error occurred while creating the account");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Opening - Sundry Creditors</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                placeholder="e.g., CR001"
                value={formData.account_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    account_number: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                placeholder="e.g., Supplier A"
                value={formData.account_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_account">Ledger Selection *</Label>
              <Select
                value={formData.parent_account_number}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_account_number: value })
                }
              >
                <SelectTrigger id="parent_account">
                  {loadingLedgers ? (
                    <SelectValue placeholder="Loading ledger accounts..." />
                  ) : (
                    <SelectValue placeholder="Select a ledger account" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {ledgerAccounts.map((account) => (
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

            <div className="space-y-2">
              <Label htmlFor="opening_balance">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                placeholder="0.00"
                value={formData.opening_balance}
                onChange={(e) =>
                  setFormData({ ...formData, opening_balance: e.target.value })
                }
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add account details or notes..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || loadingLedgers}
            className="w-full md:w-auto"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
