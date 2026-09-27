"use client"

import { DashboardWrapper } from "@/app/_components/dashboard-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { BadgeCheck, FilePlus, FileSearch, HandCoins, Wallet, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const loanOptions: { title: string; description: string; href: string; icon: LucideIcon }[] = [
  { title: "Loan Application", description: "Create new Loan Application", href: "/loans/apply", icon: FilePlus },
  { title: "Loan Sanction", description: "Approve / Sanction pending Loan Applications", href: "/loans/sanction", icon: BadgeCheck },
  { title: "Loan Disbursement", description: "Disburse sanctioned Loan amount", href: "/loans/disbursement", icon: Wallet },
  { title: "Loan Collection", description: "Collect EMI / Loan repayments", href: "/loans/collection", icon: HandCoins },
  { title: "View / Reject Application", description: "View or Reject existing Loan Applications", href: "/loans/applications", icon: FileSearch },
]

export default function LoansDashboardPage() {

  const { user } = useAuth()
  const router = useRouter();

  return (
    <DashboardWrapper>
      <div className="">
        <div className="">
          <main className="flex-1 overflow-y-auto bg-background p-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Loan Management</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches - Process applications, track EMIs, and manage repayments"
                    : `${user?.branch?.name || "Your branch"} - Process applications, track EMIs, and manage repayments`}
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              {loanOptions.map(({ title, description, href, icon: Icon }) => (
                <Card
                  key={href}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row"
                  onClick={() => router.push(href)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="mt-1">{description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  );
}
