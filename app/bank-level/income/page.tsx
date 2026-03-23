"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"
import AccountOpeningForm from "./_components/account-opening-form"
import AccountsList from "./_components/accounts-list"
import ViewAccount from "./_components/view-account"
import TransactionsList from "./_components/transactions-list"
import { Plus, List, Eye, CreditCard } from "lucide-react"

export default function IncomePage() {
  const [activeTab, setActiveTab] = useState("list")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleAccountCreated = () => {
    setRefreshTrigger(prev => prev + 1)
    setActiveTab("list")
  }

  const handleViewAccount = (accountNumber: string) => {
    setSelectedAccount(accountNumber)
    setActiveTab("view")
  }

  const handleBackToList = () => {
    setSelectedAccount(null)
    setActiveTab("list")
  }

  return (
    <DashboardWrapper>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Income Module</h1>
          <p className="text-muted-foreground">Manage income accounts and transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Income Accounts Management</CardTitle>
            <CardDescription>
              Create and manage income accounts based on the Chart of Accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List Accounts</span>
                </TabsTrigger>
                <TabsTrigger value="open" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Open Account</span>
                </TabsTrigger>
                <TabsTrigger value="view" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">View Account</span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Transactions</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-6">
                <AccountsList
                  onViewAccount={handleViewAccount}
                  refreshTrigger={refreshTrigger}
                />
              </TabsContent>

              <TabsContent value="open" className="mt-6">
                <AccountOpeningForm onAccountCreated={handleAccountCreated} />
              </TabsContent>

              <TabsContent value="view" className="mt-6">
                {selectedAccount ? (
                  <ViewAccount
                    accountNumber={selectedAccount}
                    onBack={handleBackToList}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select an account from the list to view details
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transactions" className="mt-6">
                {selectedAccount ? (
                  <TransactionsList accountNumber={selectedAccount} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select an account from the list to view transactions
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardWrapper>
  )
}
