"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
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
  UserPlus,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  XCircle,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Member = {
  id: string
  member_id: string
  full_name: string
  email: string
  phone: string
  address: string
  account_type: string
  account_balance: number
  status: string
  joined_date: string
  branch_id: number
}

type NewMemberForm = {
  full_name: string
  email: string
  phone: string
  address: string
  account_type: string
  dob: string
  id_type: string
  id_number: string
}

export default function MembersPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [newMember, setNewMember] = useState<NewMemberForm>({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    account_type: "Savings",
    dob: "",
    id_type: "",
    id_number: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadMembers = async () => {
      setIsLoading(true)
      const supabase = createClient()

      try {
        let query = supabase.from("members").select("*")

        if (user?.role !== "admin" && user?.branch_id) {
          const branchId = typeof user.branch_id === "string" ? Number.parseInt(user.branch_id) : user.branch_id
          if (!isNaN(branchId)) {
            query = query.eq("branch_id", branchId)
          }
        }

        const { data, error } = await query

        if (error) {
          console.error("[v0] Error loading members:", error)
        } else {
          console.log("[v0] Fetched members:", data)
          setMembers(data || [])
        }
      } catch (error) {
        console.error("[v0] Failed to load members:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadMembers()
    }
  }, [user])

  const generateMemberId = () => {
    const maxId = members.reduce((max, member) => {
      const numPart = Number.parseInt(member.member_id.replace("MEM", ""))
      return numPart > max ? numPart : max
    }, 0)
    return `MEM${String(maxId + 1).padStart(3, "0")}`
  }

  const handleEnrollMember = async () => {
    if (!newMember.full_name || !newMember.phone) {
      alert("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const branchId = user?.branch_id
        ? typeof user.branch_id === "string"
          ? Number.parseInt(user.branch_id)
          : user.branch_id
        : 1

      const memberData = {
        member_id: generateMemberId(),
        full_name: newMember.full_name,
        email: newMember.email || null,
        phone: newMember.phone,
        address: newMember.address || null,
        account_type: newMember.account_type,
        account_balance: 0,
        branch_id: branchId,
        status: "Active",
        joined_date: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("members").insert([memberData]).select()

      if (error) {
        console.error("[v0] Error creating member:", error)
        alert("Failed to create member: " + error.message)
      } else {
        console.log("[v0] Member created:", data)
        // Add new member to the list
        if (data && data[0]) {
          setMembers([...members, data[0]])
        }
        // Reset form and close dialog
        setNewMember({
          full_name: "",
          email: "",
          phone: "",
          address: "",
          account_type: "Savings",
          dob: "",
          id_type: "",
          id_number: "",
        })
        setIsAddDialogOpen(false)
        alert("Member enrolled successfully!")
      }
    } catch (error) {
      console.error("[v0] Failed to create member:", error)
      alert("Failed to create member")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.member_id?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || member.status?.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Member Management</h1>
            <p className="text-muted-foreground">
              {user?.role === "admin"
                ? "All branches - Manage customer accounts and member operations"
                : `${user?.branch || "Your branch"} - Manage customer accounts and member operations`}
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
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
              {isLoading ? (
                <p>Loading members...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Account Number</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.full_name}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{member.member_id}</TableCell>
                        <TableCell>
                          <Badge variant={member.kyc_completed === "Yes" ? "default" : "secondary"}>
                            {member.kyc_completed === "Yes" ? "Completed" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{member.account_balance}</TableCell>
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
              )}
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
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={newMember.full_name}
                      onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@email.com"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+1 (555) 123-4567"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={newMember.dob}
                      onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State ZIP"
                    value={newMember.address}
                    onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-type">Account Type</Label>
                    <Select
                      value={newMember.account_type}
                      onValueChange={(value) => setNewMember({ ...newMember, account_type: value })}
                    >
                      <SelectTrigger id="account-type">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Fixed Deposit">Fixed Deposit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="id-type">ID Type</Label>
                    <Select
                      value={newMember.id_type}
                      onValueChange={(value) => setNewMember({ ...newMember, id_type: value })}
                    >
                      <SelectTrigger id="id-type">
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="drivers-license">Driver's License</SelectItem>
                        <SelectItem value="national-id">National ID</SelectItem>
                        <SelectItem value="aadhar">Aadhar Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id-number">ID Number</Label>
                  <Input
                    id="id-number"
                    placeholder="123456789"
                    value={newMember.id_number}
                    onChange={(e) => setNewMember({ ...newMember, id_number: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleEnrollMember} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Member"}
                </Button>
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
                          <p className="font-medium">{selectedMember.full_name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Account Number</Label>
                          <p className="font-mono font-medium">{selectedMember.member_id}</p>
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
                          <Label className="text-muted-foreground">Address</Label>
                          <p className="font-medium">{selectedMember.address}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Member Since</Label>
                          <p className="font-medium">{selectedMember.joined_date}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Balance</Label>
                        <p className="text-2xl font-bold text-foreground">{selectedMember.account_balance}</p>
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
                            Account Type
                          </span>
                          <span className="font-semibold">{selectedMember.account_type}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Status
                          </span>
                          <span className="font-semibold">{selectedMember.status}</span>
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
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name} - {member.member_id}
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
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name} - {member.member_id}
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
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name} - {member.member_id}
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
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name} - {member.member_id}
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
