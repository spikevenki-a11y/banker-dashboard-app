"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, ShieldCheck } from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

export default function FASPage() {
  const router = useRouter()

  return (
    <DashboardWrapper>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">FAS</h1>
          <p className="text-muted-foreground">Financial Accounting System</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-lg border-blue-200 hover:border-blue-400"
            onClick={() => router.push("/fas/verify-vouchers")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verify Vouchers</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {"Verify Vouchers & Cancel Vouchers"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">DayEnd</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Close the current Financial Day
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Record financial transactions
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Trial Balance</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">View account balances</p>
            </CardContent>
          </Card>

          <Card className="hidden cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Financial Reports</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Generate financial statements
              </p>
            </CardContent>
          </Card>

          <Card className="hidden cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Budget Management</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Plan and track budgets</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Audit</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Audit Module</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardWrapper>
  )
}
