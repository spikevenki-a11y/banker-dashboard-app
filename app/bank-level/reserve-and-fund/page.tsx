"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import AccountOpeningForm from "./_components/account-opening-form"
import AccountsList from "./_components/accounts-list"
import ViewAccount from "./_components/view-account"
import TransactionsList from "./_components/transactions-list"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ReserveAndFundPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("list")
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleAccountCreated = () => {
    setRefreshTrigger((prev) => prev + 1)
    setActiveTab("list")
  }

  const handleViewAccount = (accountId: string) => {
    setSelectedAccountId(accountId)
    setActiveTab("view")
  }

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/bank-level")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Reserve & Funds
                </h1>
                <p className="text-muted-foreground">
                  Manage reserve and fund accounts and transactions
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Accounts</p>
                        <p className="text-2xl font-bold text-foreground">--</p>
                      </div>
                      <div className="rounded-lg bg-violet-50 p-3">
                        <Shield className="h-5 w-5 text-violet-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="text-2xl font-bold text-foreground">--</p>
                      </div>
                      <div className="rounded-lg bg-violet-50 p-3">
                        <Shield className="h-5 w-5 text-violet-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="list">List Accounts</TabsTrigger>
                  <TabsTrigger value="create">Account Opening</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="view">View Account</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                  <AccountsList onViewAccount={handleViewAccount} refreshTrigger={refreshTrigger} />
                </TabsContent>

                <TabsContent value="create" className="space-y-4">
                  <AccountOpeningForm onSuccess={handleAccountCreated} />
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                  <TransactionsList />
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
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
