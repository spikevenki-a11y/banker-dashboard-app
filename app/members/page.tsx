"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Eye,
  Edit,
  Ban,
  Wallet,
  FileText,
  CreditCard,
  UserPlus,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  XCircle,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Member = {
  id: string
  name: string
  email: string
  phone: string
  accountNumber: string
  kycStatus: "verified" | "pending" | "rejected"
  status: "active" | "inactive"
  joinDate: string
  totalBalance: string
  savingsAccounts: number
  fixedDeposits: number
  loans: number
}

const mockMembers: Member[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    accountNumber: "ACC001234",
    kycStatus: "verified",
    status: "active",
    joinDate: "2023-01-15",
    totalBalance: "₹45,230",
    savingsAccounts: 2,
    fixedDeposits: 1,
    loans: 0,
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael.chen@email.com",
    phone: "+1 (555) 234-5678",
    accountNumber: "ACC001235",
    kycStatus: "verified",
    status: "active",
    joinDate: "2023-02-20",
    totalBalance: "₹128,450",
    savingsAccounts: 3,
    fixedDeposits: 2,
    loans: 1,
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily.davis@email.com",
    phone: "+1 (555) 345-6789",
    accountNumber: "ACC001236",
    kycStatus: "pending",
    status: "active",
    joinDate: "2023-03-10",
    totalBalance: "₹22,100",
    savingsAccounts: 1,
    fixedDeposits: 0,
    loans: 0,
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james.wilson@email.com",
    phone: "+1 (555) 456-7890",
    accountNumber: "ACC001237",
    kycStatus: "verified",
    status: "active",
    joinDate: "2023-04-05",
    totalBalance: "₹67,890",
    savingsAccounts: 2,
    fixedDeposits: 3,
    loans: 2,
  },
  {
    id: "5",
    name: "Lisa Anderson",
    email: "lisa.anderson@email.com",
    phone: "+1 (555) 567-8901",
    accountNumber: "ACC001238",
    kycStatus: "verified",
    status: "inactive",
    joinDate: "2022-12-15",
    totalBalance: "₹8,450",
    savingsAccounts: 1,
    fixedDeposits: 0,
    loans: 0,
  },
]

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  const filteredMembers = mockMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.accountNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || member.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Member Management</h1>
            <p className="text-muted-foreground">Manage customer accounts and member operations</p>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <CardHeader className="pb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">Enroll Member</CardTitle>
                <CardDescription className="mt-1">Register new customer</CardDescription>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-teal-500"
              onClick={() => setActiveAction("share-deposit")}
            >
              <CardHeader className="pb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50">
                  <ArrowUpCircle className="h-6 w-6 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">Share Deposit</CardTitle>
                <CardDescription className="mt-1">Add member shares</CardDescription>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-500"
              onClick={() => setActiveAction("share-withdrawal")}
            >
              <CardHeader className="pb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50">
                  <ArrowDownCircle className="h-6 w-6 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">Share Withdrawal</CardTitle>
                <CardDescription className="mt-1">Withdraw member shares</CardDescription>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-emerald-500"
              onClick={() => setActiveAction("dividend")}
            >
              <CardHeader className="pb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                  <PiggyBank className="h-6 w-6 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">Dividend</CardTitle>
                <CardDescription className="mt-1">Process dividend payments</CardDescription>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-red-500"
              onClick={() => setActiveAction("membership-closure")}
            >
              <CardHeader className="pb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg">Membership Closure</CardTitle>
                <CardDescription className="mt-1">Close member account</CardDescription>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or account number..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Balance</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{member.accountNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant={member.kycStatus === "verified" ? "default" : "secondary"}
                          className={
                            member.kycStatus === "verified"
                              ? "bg-teal-100 text-teal-700"
                              : member.kycStatus === "pending"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                          }
                        >
                          {member.kycStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{member.totalBalance}</TableCell>
                      <TableCell>
                        <div className="flex gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {member.savingsAccounts}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {member.fixedDeposits}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {member.loans}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Ban className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>Enter customer details to create a new account</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Vengatesh" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john.doe@email.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="123 Main St, City, State ZIP" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id-type">ID Type</Label>
                    <Select>
                      <SelectTrigger id="id-type">
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers-license">Driver's License</SelectItem>
                        <SelectItem value="national-id">National ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id-number">ID Number</Label>
                    <Input id="id-number" placeholder="123456789" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Create Member</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Member Details</DialogTitle>
                <DialogDescription>Comprehensive customer profile and account overview</DialogDescription>
              </DialogHeader>
              {selectedMember && (
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="accounts">Accounts</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Full Name</Label>
                          <p className="font-medium">{selectedMember.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Account Number</Label>
                          <p className="font-mono font-medium">{selectedMember.accountNumber}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{selectedMember.email}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Phone</Label>
                          <p className="font-medium">{selectedMember.phone}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">KYC Status</Label>
                          <div className="mt-1">
                            <Badge
                              variant={selectedMember.kycStatus === "verified" ? "default" : "secondary"}
                              className={
                                selectedMember.kycStatus === "verified"
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-orange-100 text-orange-700"
                              }
                            >
                              {selectedMember.kycStatus}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Member Since</Label>
                          <p className="font-medium">{selectedMember.joinDate}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Balance</Label>
                        <p className="text-2xl font-bold text-foreground">{selectedMember.totalBalance}</p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="accounts" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Account Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Wallet className="h-4 w-4" />
                            Savings Accounts
                          </span>
                          <span className="font-semibold">{selectedMember.savingsAccounts}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Fixed Deposits
                          </span>
                          <span className="font-semibold">{selectedMember.fixedDeposits}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-4 w-4" />
                            Active Loans
                          </span>
                          <span className="font-semibold">{selectedMember.loans}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="activity" className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      Recent transactions and activities will appear here
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={activeAction === "share-deposit"} onOpenChange={() => setActiveAction(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share Deposit</DialogTitle>
                <DialogDescription>Add shares for a member account</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="share-member">Select Member</Label>
                  <Select>
                    <SelectTrigger id="share-member">
                      <SelectValue placeholder="Choose member" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-amount">Number of Shares</Label>
                  <Input id="share-amount" type="number" placeholder="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-value">Share Value</Label>
                  <Input id="share-value" type="number" placeholder="10.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-total">Total Amount</Label>
                  <Input id="share-total" type="text" placeholder="₹1,000.00" disabled />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveAction(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setActiveAction(null)}>Process Deposit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={activeAction === "share-withdrawal"} onOpenChange={() => setActiveAction(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share Withdrawal</DialogTitle>
                <DialogDescription>Withdraw shares from a member account</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-member">Select Member</Label>
                  <Select>
                    <SelectTrigger id="withdraw-member">
                      <SelectValue placeholder="Choose member" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Available Shares</Label>
                  <p className="text-2xl font-bold text-foreground">250 shares</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-shares">Number of Shares to Withdraw</Label>
                  <Input id="withdraw-shares" type="number" placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
                  <Input id="withdraw-amount" type="text" placeholder="₹500.00" disabled />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveAction(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setActiveAction(null)}>Process Withdrawal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={activeAction === "dividend"} onOpenChange={() => setActiveAction(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Dividend Distribution</DialogTitle>
                <DialogDescription>Process dividend payments for members</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dividend-period">Dividend Period</Label>
                  <Select>
                    <SelectTrigger id="dividend-period">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="q1-2024">Q1 2024</SelectItem>
                      <SelectItem value="q2-2024">Q2 2024</SelectItem>
                      <SelectItem value="q3-2024">Q3 2024</SelectItem>
                      <SelectItem value="q4-2024">Q4 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dividend-rate">Dividend Rate (%)</Label>
                  <Input id="dividend-rate" type="number" placeholder="5.0" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dividend-member">Select Member (Optional - Leave empty for all)</Label>
                  <Select>
                    <SelectTrigger id="dividend-member">
                      <SelectValue placeholder="All members" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      {mockMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Estimated Total Dividend</p>
                  <p className="text-2xl font-bold text-foreground">₹12,450.00</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveAction(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setActiveAction(null)}>Process Dividend</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={activeAction === "membership-closure"} onOpenChange={() => setActiveAction(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Membership Closure</DialogTitle>
                <DialogDescription>Close a member account permanently</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="closure-member">Select Member</Label>
                  <Select>
                    <SelectTrigger id="closure-member">
                      <SelectValue placeholder="Choose member" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm font-medium text-orange-800">Account Summary</p>
                  <div className="mt-2 space-y-1 text-sm text-orange-700">
                    <p>Outstanding Balance: ₹0.00</p>
                    <p>Share Value: ₹2,500.00</p>
                    <p>Pending Dividends: ₹125.00</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closure-reason">Closure Reason</Label>
                  <Select>
                    <SelectTrigger id="closure-reason">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member-request">Member Request</SelectItem>
                      <SelectItem value="relocation">Relocation</SelectItem>
                      <SelectItem value="inactive">Inactive Account</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closure-notes">Additional Notes</Label>
                  <Input id="closure-notes" placeholder="Optional closure notes..." />
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">Warning</p>
                  <p className="mt-1 text-sm text-red-700">
                    This action cannot be undone. All pending amounts will be settled.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveAction(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => setActiveAction(null)}>
                  Close Membership
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}
