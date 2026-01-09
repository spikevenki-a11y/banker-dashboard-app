"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Search, Eye, FileText, TrendingUp, Calendar, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

type FixedDeposit = {
  id: string
  fdNumber: string
  memberName: string
  memberId: string
  principal: string
  interestRate: number
  tenure: number
  status: "active" | "matured" | "closed" | "premature"
  openedDate: string
  maturityDate: string
  maturityAmount: string
  interestEarned: string
}

const mockFDs: FixedDeposit[] = [
  {
    id: "1",
    fdNumber: "FD001234",
    memberName: "Vengatesh",
    memberId: "ACC001234",
    principal: "₹50,000.00",
    interestRate: 6.5,
    tenure: 12,
    status: "active",
    openedDate: "2024-01-15",
    maturityDate: "2025-01-15",
    maturityAmount: "₹53,250.00",
    interestEarned: "₹3,250.00",
  },
  {
    id: "2",
    fdNumber: "FD001235",
    memberName: "Priya",
    memberId: "ACC001235",
    principal: "₹100,000.00",
    interestRate: 7.0,
    tenure: 24,
    status: "active",
    openedDate: "2023-06-20",
    maturityDate: "2025-06-20",
    maturityAmount: "₹114,000.00",
    interestEarned: "₹14,000.00",
  },
  {
    id: "3",
    fdNumber: "FD001236",
    memberName: "Surya",
    memberId: "ACC001236",
    principal: "₹25,000.00",
    interestRate: 6.0,
    tenure: 6,
    status: "matured",
    openedDate: "2024-05-10",
    maturityDate: "2024-11-10",
    maturityAmount: "₹25,750.00",
    interestEarned: "₹750.00",
  },
  {
    id: "4",
    fdNumber: "FD001237",
    memberName: "Sudarsan",
    memberId: "ACC001237",
    principal: "₹75,000.00",
    interestRate: 6.75,
    tenure: 18,
    status: "active",
    openedDate: "2023-10-05",
    maturityDate: "2025-04-05",
    maturityAmount: "₹82,593.75",
    interestEarned: "₹7,593.75",
  },
]

export default function FixedDepositsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateFDOpen, setIsCreateFDOpen] = useState(false)
  const [selectedFD, setSelectedFD] = useState<FixedDeposit | null>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"renew" | "premature" | "close" | null>(null)

  const filteredFDs = mockFDs.filter((fd) => {
    const matchesSearch =
      fd.fdNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fd.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fd.memberId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || fd.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPrincipal = mockFDs.reduce((sum, fd) => sum + Number.parseFloat(fd.principal.replace(/[₹,]/g, "")), 0)
  const activeFDs = mockFDs.filter((fd) => fd.status === "active").length
  const maturedFDs = mockFDs.filter((fd) => fd.status === "matured").length

  return (
    <DashboardWrapper>
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Fixed Deposits</h1>
              <p className="text-muted-foreground">Manage fixed deposit accounts and maturity tracking</p>
            </div>
            <Button onClick={() => setIsCreateFDOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create FD
            </Button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Principal</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">₹{totalPrincipal.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-teal-50 p-3">
                    <TrendingUp className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Active FDs</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{activeFDs}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-orange-50 p-3">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Matured FDs</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">{maturedFDs}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-purple-50 p-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Avg. Interest</h3>
                  <p className="mt-1 text-2xl font-bold text-foreground">6.6%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by FD number, member name, or ID..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="matured">Matured</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="premature">Premature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FD Number</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Tenure</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead>Maturity Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFDs.map((fd) => (
                    <TableRow key={fd.id}>
                      <TableCell className="font-mono font-medium">{fd.fdNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{fd.memberName}</div>
                          <div className="text-sm text-muted-foreground">{fd.memberId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{fd.principal}</TableCell>
                      <TableCell>{fd.interestRate}%</TableCell>
                      <TableCell>{fd.tenure} months</TableCell>
                      <TableCell>{fd.maturityDate}</TableCell>
                      <TableCell className="font-semibold text-teal-600">{fd.maturityAmount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={fd.status === "active" ? "default" : "secondary"}
                          className={
                            fd.status === "active"
                              ? "bg-teal-100 text-teal-700"
                              : fd.status === "matured"
                                ? "bg-orange-100 text-orange-700"
                                : fd.status === "closed"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-red-100 text-red-700"
                          }
                        >
                          {fd.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedFD(fd)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {fd.status === "matured" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedFD(fd)
                                  setActionType("renew")
                                  setIsActionDialogOpen(true)
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Renew FD
                              </DropdownMenuItem>
                            )}
                            {fd.status === "matured" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedFD(fd)
                                  setActionType("close")
                                  setIsActionDialogOpen(true)
                                }}
                                className="text-red-600"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Closure
                              </DropdownMenuItem>
                            )}
                            {fd.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedFD(fd)
                                  setActionType("premature")
                                  setIsActionDialogOpen(true)
                                }}
                                className="text-blue-600"
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Interest Withdrawal
                              </DropdownMenuItem>
                            )}
                            {fd.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedFD(fd)
                                  setActionType("premature")
                                  setIsActionDialogOpen(true)
                                }}
                                className="text-orange-600"
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Premature Withdrawal
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Create FD Dialog */}
          <Dialog open={isCreateFDOpen} onOpenChange={setIsCreateFDOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Fixed Deposit</DialogTitle>
                <DialogDescription>Open a new fixed deposit account for a member</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fd-member">Select Member</Label>
                  <Select>
                    <SelectTrigger id="fd-member">
                      <SelectValue placeholder="Search and select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Vengatesh (ACC001234)</SelectItem>
                      <SelectItem value="2">Priya (ACC001235)</SelectItem>
                      <SelectItem value="3">Surya (ACC001236)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="principal">Principal Amount</Label>
                    <Input id="principal" type="number" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenure">Tenure (Months)</Label>
                    <Select>
                      <SelectTrigger id="tenure">
                        <SelectValue placeholder="Select tenure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 months (5.5%)</SelectItem>
                        <SelectItem value="12">12 months (6.5%)</SelectItem>
                        <SelectItem value="18">18 months (6.75%)</SelectItem>
                        <SelectItem value="24">24 months (7.0%)</SelectItem>
                        <SelectItem value="36">36 months (7.5%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4">
                  <h4 className="mb-2 font-semibold">Calculation Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Principal Amount:</span>
                      <span className="font-medium">₹0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interest Rate:</span>
                      <span className="font-medium">0%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interest Earned:</span>
                      <span className="font-medium">₹0.00</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="font-semibold">Maturity Amount:</span>
                      <span className="font-semibold text-teal-600">₹0.00</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fd-notes">Notes (Optional)</Label>
                  <Input id="fd-notes" placeholder="Add any additional notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateFDOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateFDOpen(false)}>Create Fixed Deposit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Action Dialog (Renew/Premature) */}
          <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{actionType === "renew" ? "Renew Fixed Deposit" : "Premature Withdrawal"}</DialogTitle>
                <DialogDescription>
                  {actionType === "renew"
                    ? "Renew the matured fixed deposit with new terms"
                    : "Process premature withdrawal with penalty"}
                </DialogDescription>
              </DialogHeader>
              {selectedFD && (
                <div className="grid gap-4 py-4">
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <p className="font-mono font-medium">{selectedFD.fdNumber}</p>
                    <p className="text-sm text-muted-foreground">{selectedFD.memberName}</p>
                    <p className="mt-2 text-lg font-semibold">Principal: {selectedFD.principal}</p>
                  </div>
                  {actionType === "renew" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="new-tenure">New Tenure</Label>
                        <Select>
                          <SelectTrigger id="new-tenure">
                            <SelectValue placeholder="Select tenure" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6 months (5.5%)</SelectItem>
                            <SelectItem value="12">12 months (6.5%)</SelectItem>
                            <SelectItem value="18">18 months (6.75%)</SelectItem>
                            <SelectItem value="24">24 months (7.0%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="renew-amount">Renewal Amount</Label>
                        <Input id="renew-amount" type="number" placeholder={selectedFD.maturityAmount} />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                        <p className="text-sm font-medium text-orange-800">Penalty Notice</p>
                        <p className="mt-1 text-sm text-orange-700">
                          Premature withdrawal will incur a penalty of 2% on the interest earned.
                        </p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Earned:</span>
                          <span className="font-medium">{selectedFD.interestEarned}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Penalty (2%):</span>
                          <span className="font-medium text-orange-600">
                            -$
                            {(Number.parseFloat(selectedFD.interestEarned.replace(/[$,]/g, "")) * 0.02).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="font-semibold">Amount Payable:</span>
                          <span className="font-semibold text-foreground">
                            $
                            {(
                              Number.parseFloat(selectedFD.principal.replace(/[₹,]/g, "")) +
                              Number.parseFloat(selectedFD.interestEarned.replace(/[₹,]/g, "")) * 0.98
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setIsActionDialogOpen(false)}
                  variant={actionType === "premature" ? "destructive" : "default"}
                >
                  {actionType === "renew" ? "Renew FD" : "Process Withdrawal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View FD Details Dialog */}
          <Dialog open={!!selectedFD && !isActionDialogOpen} onOpenChange={() => setSelectedFD(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Fixed Deposit Details</DialogTitle>
                <DialogDescription>Complete information about the fixed deposit</DialogDescription>
              </DialogHeader>
              {selectedFD && (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="calculation">Calculation</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">FD Number</Label>
                          <p className="font-mono font-medium">{selectedFD.fdNumber}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <div className="mt-1">
                            <Badge
                              variant="default"
                              className={
                                selectedFD.status === "active"
                                  ? "bg-teal-100 text-teal-700"
                                  : "bg-orange-100 text-orange-700"
                              }
                            >
                              {selectedFD.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Member Name</Label>
                          <p className="font-medium">{selectedFD.memberName}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Member ID</Label>
                          <p className="font-mono font-medium">{selectedFD.memberId}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Principal Amount</Label>
                          <p className="text-2xl font-bold text-foreground">{selectedFD.principal}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Maturity Amount</Label>
                          <p className="text-2xl font-bold text-teal-600">{selectedFD.maturityAmount}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Interest Rate</Label>
                          <p className="font-medium">{selectedFD.interestRate}% per annum</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Tenure</Label>
                          <p className="font-medium">{selectedFD.tenure} months</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Opened Date</Label>
                          <p className="font-medium">{selectedFD.openedDate}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Maturity Date</Label>
                          <p className="font-medium">{selectedFD.maturityDate}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="calculation" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Interest Calculation Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Principal Amount</span>
                          <span className="font-semibold">{selectedFD.principal}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Interest Rate (Annual)</span>
                          <span className="font-semibold">{selectedFD.interestRate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tenure</span>
                          <span className="font-semibold">{selectedFD.tenure} months</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-3">
                          <span className="text-muted-foreground">Interest Earned</span>
                          <span className="font-semibold text-teal-600">{selectedFD.interestEarned}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-3">
                          <span className="text-lg font-semibold">Maturity Amount</span>
                          <span className="text-lg font-bold text-teal-600">{selectedFD.maturityAmount}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
    </DashboardWrapper>
  )
}
