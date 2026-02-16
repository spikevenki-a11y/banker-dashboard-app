"use client"

import { DashboardWrapper } from "@/app/_components/dashboard-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";


export default function SavingsDashboardPage() {
  
    const { user } = useAuth()
    const router = useRouter();

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Savings Management</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches - Manage customer accounts and member operations"
                    : `${user?.branch || "Your branch"} - Manage Savings accounts and Savings operations`}
                </p>
              </div>
              {/* <Button onClick={() => router.push("/customers")}
                className="gap-2">
                <Plus className="h-4 w-4" />
                Create Customer
              </Button> */}
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/savings/open_account")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Open Account</CardTitle>
                  <CardDescription className="mt-1">Create new Savings Account</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/savings/view_account")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">View / Modify Account</CardTitle>
                  <CardDescription className="mt-1">View / Modify existing Savings Account details</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/savings/deposit")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Deposit</CardTitle>
                  <CardDescription className="mt-1">Add Deposit to Savings Account</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/savings/withdraw")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Withdraw</CardTitle>
                  <CardDescription className="mt-1">Withdraw from Savings Account</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                // onClick={() => router.push("/savings/open_account")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Interest Calculation</CardTitle>
                  <CardDescription className="mt-1">Calculate interest for Savings Accounts</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                // onClick={() => router.push("/savings/open_account")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Close Account</CardTitle>
                  <CardDescription className="mt-1">Close existing Savings Account</CardDescription>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  );
}
