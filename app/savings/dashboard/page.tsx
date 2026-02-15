"use client"

import { DashboardWrapper } from "@/app/_components/dashboard-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Plus, UserPlus, Eye, ArrowDownRight, ArrowUpRight, Calculator, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type SavingsAccount = {
  id: string
  accountNumber: string
  memberName: string
  memberId: string
  accountType: string
  balance: string
  interestRate: number
  status: "active" | "dormant" | "closed"
  openedDate: string
  lastTransaction: string
}

const mockAccounts: SavingsAccount[] = [
  {
    id: "1",
    accountNumber: "SAV001234",
    memberName: "Vengatesh",
    memberId: "ACC001234",
    accountType: "Regular Savings",
    balance: "₹25,430.00",
    interestRate: 3.5,
    status: "active",
    openedDate: "2023-01-15",
    lastTransaction: "2024-12-10",
  },
  {
    id: "2",
    accountNumber: "SAV001235",
    memberName: "Priya",
    memberId: "ACC001235",
    accountType: "Premium Savings",
    balance: "₹85,250.00",
    interestRate: 4.5,
    status: "active",
    openedDate: "2023-02-20",
    lastTransaction: "2024-12-12",
  },
  {
    id: "3",
    accountNumber: "SAV001236",
    memberName: "Surya",
    memberId: "ACC001236",
    accountType: "Regular Savings",
    balance: "₹12,100.00",
    interestRate: 3.5,
    status: "dormant",
    openedDate: "2023-03-10",
    lastTransaction: "2024-12-08",
  },
  {
    id: "4",
    accountNumber: "SAV001237",
    memberName: "Sudarsan",
    memberId: "ACC001237",
    accountType: "High Yield Savings",
    balance: "₹45,890.00",
    interestRate: 5.0,
    status: "active",
    openedDate: "2023-04-05",
    lastTransaction: "2024-12-11",
  },
]

type Transaction = {
  id: string
  type: "deposit" | "withdrawal"
  amount: string
  date: string
  description: string
  balance: string
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "deposit",
    amount: "₹5,000.00",
    date: "2024-12-10",
    description: "Cash Deposit",
    balance: "₹25,430.00",
  },
  {
    id: "2",
    type: "withdrawal",
    amount: "₹1,200.00",
    date: "2024-12-08",
    description: "ATM Withdrawal",
    balance: "₹20,430.00",
  },
  {
    id: "3",
    type: "deposit",
    amount: "₹3,500.00",
    date: "2024-12-05",
    description: "Check Deposit",
    balance: "₹21,630.00",
  },
  {
    id: "4",
    type: "deposit",
    amount: "₹2,800.00",
    date: "2024-12-01",
    description: "Transfer In",
    balance: "₹18,130.00",
  },
]

export default function SavingsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isOpenAccountOpen, setIsOpenAccountOpen] = useState(false)
  const [isTransactionOpen, setIsTransactionOpen] = useState(false)

  const [isAccountClosure, setIsAccountClosure] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null)
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit")

  const filteredAccounts = mockAccounts.filter((account) => {
    const matchesSearch =
      account.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.memberId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || account.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalBalance = mockAccounts.reduce((sum, acc) => sum + Number.parseFloat(acc.balance.replace(/[₹,]/g, "")), 0)
  const activeAccounts = mockAccounts.filter((acc) => acc.status === "active").length
  const inactiveAccounts = mockAccounts.filter((acc) => acc.status === "dormant").length
  const activeAccountsBalance = mockAccounts
    .filter((acc) => acc.status === "active")
    .reduce((sum, acc) => sum + Number.parseFloat(acc.balance.replace(/[₹,]/g, "")), 0)
  const inactiveAccountsBalance = mockAccounts
    .filter((acc) => acc.status === "dormant")
    .reduce((sum, acc) => sum + Number.parseFloat(acc.balance.replace(/[₹,]/g, "")), 0)

  return (
    <DashboardWrapper>
    <div className="flex h-screen overflow-hidden">
      {/*<DashboardSidebar />*/}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/*<DashboardHeader />*/}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Savings Accounts</h1>
              <p className="text-muted-foreground">Manage deposits, withdrawals, and account balances</p>
            </div>
            <Link href="/savings/open_account">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Open Account
              </Button>
            </Link>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                    <Eye className="h-6 w-6 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">View / Modify Account</CardTitle>
                  <CardDescription className="mt-1">View / Modify existing Savings Account details</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-teal-500 flex flex-row"
                onClick={() => router.push("/savings/deposit")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-500/10">
                    <ArrowDownRight className="h-6 w-6 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Deposit</CardTitle>
                  <CardDescription className="mt-1">Add Deposit to Savings Account</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-500 flex flex-row"
                onClick={() => router.push("/savings/withdraw")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                    <ArrowUpRight className="h-6 w-6 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Withdraw</CardTitle>
                  <CardDescription className="mt-1">Withdraw from Savings Account</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row opacity-60"
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                    <Calculator className="h-6 w-6 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Interest Calculation</CardTitle>
                  <CardDescription className="mt-1">Calculate interest for Savings Accounts</CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary flex flex-row opacity-60"
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTransactionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsTransactionOpen(false)}>
                  {transactionType === "deposit" ? "Deposit" : "Withdraw"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


        </main>
      </div>
    </div>
    </DashboardWrapper>
  );
}
