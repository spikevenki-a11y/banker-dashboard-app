"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AccountOpeningForm from "./_components/account-opening-form";
import AccountsList from "./_components/accounts-list";
import ViewAccount from "./_components/view-account";

export default function SundryCreditorsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAccountCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab("list");
  };

  const handleViewAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab("view");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sundry Creditors Management</CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">List Accounts</TabsTrigger>
          <TabsTrigger value="create">Account Opening</TabsTrigger>
          <TabsTrigger value="view">View Account</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <AccountsList
            onViewAccount={handleViewAccount}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <AccountOpeningForm onSuccess={handleAccountCreated} />
        </TabsContent>

        <TabsContent value="view" className="space-y-4">
          {selectedAccountId ? (
            <ViewAccount accountId={selectedAccountId} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Please select an account from the list to view details
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
