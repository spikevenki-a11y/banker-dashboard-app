"use client"

import { DashboardWrapper } from "@/app/_components/dashboard-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { UserPlus, Banknote, TrendingUp, ClipboardList, XCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FixedDepositsDashboardPage() {
  const { user } = useAuth()
  const router = useRouter();

  return (
    <DashboardWrapper>
      <div className="">
        <div className="">
          <main className="flex-1 overflow-y-auto bg-background p-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Fixed Deposits</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches - Manage fixed deposit accounts and operations"
                    : `${user?.branch || "Your branch"} - Manage fixed deposit accounts and operations`}
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/fixed-deposits/create-deposit")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Open Deposit Account</CardTitle>
                  <CardDescription className="mt-1">Create/open a new Fixed Deposit account</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/fixed-deposits/accounts?action=transactions")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Banknote className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Transactions</CardTitle>
                  <CardDescription className="mt-1">Fixed Deposit-related transactions</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="relative flex flex-row transition-all"
              >
                <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">Coming Soon</Badge>
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Interest Payment</CardTitle>
                  <CardDescription className="mt-1">Calculate and process interest payments for Fixed Deposit accounts</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="relative flex flex-row transition-all"
              >
                <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">Coming Soon</Badge>
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Application Status</CardTitle>
                  <CardDescription className="mt-1">View pending/approved/rejected Fixed Deposit applications</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/fixed-deposits/accounts?action=closure")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <XCircle className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Closure</CardTitle>
                  <CardDescription className="mt-1">Close an existing Fixed Deposit account</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                onClick={() => router.push("/fixed-deposits/accounts?action=renew")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Renewal</CardTitle>
                  <CardDescription className="mt-1">Renew eligible Fixed Deposit accounts</CardDescription>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  );
}
