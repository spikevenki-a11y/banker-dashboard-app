"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SundryCreditorsAccount {
  id: string;
  account_number: string;
  account_name: string;
  parent_account_number: string;
  current_balance: number;
  account_status: string;
  created_at: string;
}

export default function AccountsList({
  onViewAccount,
  refreshTrigger,
}: {
  onViewAccount: (id: string) => void;
  refreshTrigger: number;
}) {
  const [accounts, setAccounts] = useState<SundryCreditorsAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<
    SundryCreditorsAccount[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [refreshTrigger]);

  useEffect(() => {
    const filtered = accounts.filter(
      (account) =>
        account.account_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        account.account_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    setFilteredAccounts(filtered);
  }, [searchTerm, accounts]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sundry-creditors/accounts");
      const result = await response.json();

      if (result.data) {
        setAccounts(result.data);
        setFilteredAccounts(result.data);
      }
    } catch (err) {
      setError("Failed to fetch accounts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-red-100 text-red-800";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sundry Creditors Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm">
                      {account.account_number}
                    </TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {account.parent_account_number}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{account.current_balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(account.account_status)}>
                        {account.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewAccount(account.id)}
                      >
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
  );
}
