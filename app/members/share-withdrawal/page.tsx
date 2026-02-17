"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Search } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type Member = {
  aadhaar_no: string
  customer_code?: string
  full_name: string
  father_name?: string
  gender: string
  customer_type?: string
  house_no?: string
  street?: string
  village?: string
  thaluk?: string
  district?: string
  state?: string
  pincode?: string
  email: string
  phone: string
  address: string
  member_type: string
  date_of_birth: string
  dob?: string
  pan_no?: string
  ration_no?: string
  driving_license_no?: string
  id_type: string
  id_number: string
  spouse_Name?: string
  board_resolution_number?: string
  boardResolutionDate?: string
  ledger_folio_number?: string
  status: string
  joined_date: string
  branch_id: number
  membership_no?: string
  phone_no?: string
  member_id?: string
}

type SearchMemberData = {
  member_name: string
  father_name: string
  phone_number: string
  aadhaar_number: string
  ledger_folio_number: string
}

export default function ShareWithdrawalPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [shareDepositMemberNo, setShareDepositMemberNo] = useState("")
  const [selectedShareDepositMember, setSelectedShareDepositMember] = useState<Member | null>(null)
  const [currentShareBalance, setCurrentShareBalance] = useState<number | null>(null)
  const [isFetchingMember, setIsFetchingMember] = useState(false)
  const [memberFetchError, setMemberFetchError] = useState<string | null>(null)
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [shareAmount, setShareAmount] = useState("")
  const [particulars, setParticulars] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<number>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])
  const [identity, setIdentity] = useState<{ businessDate?: string } | null>(null)
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [newSearchMember, setNewSearchMember] = useState<SearchMemberData>({
    member_name: "",
    father_name: "",
    phone_number: "",
    aadhaar_number: "",
    ledger_folio_number: "",
  })

  useEffect(() => {
    fetch("/api/auth/identity", { credentials: "include" })
      .then((r) => r.json())
      .then(setIdentity)
  }, [])

  useEffect(() => {
    if (!user) return
    const loadMembers = async () => {
      try {
        const response = await fetch("/api/memberships/loadmember", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        })
        const data = await response.json()
        if (response.ok && data.success) {
          setMembers(data.data ?? [])
        }
      } catch (error) {
        console.error("Load members failed:", error)
      }
    }
    loadMembers()
  }, [user])

  const handleMembershipBlur = async (memberNo?: string) => {
    const no = memberNo || shareDepositMemberNo
    if (!no) return

    setIsFetchingMember(true)
    setMemberFetchError(null)

    try {
      const res = await fetch(
        `/api/memberships/share_details?membership_no=${no}`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch member details")

      setSelectedShareDepositMember({
        id: data.membership_id,
        member_id: data.membership_no,
        full_name: data.full_name,
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        member_type: data.membership_class,
        account_balance: data.account_balance || 0,
        status: data.status || "active",
        joined_date: data.joined_date || "",
        branch_id: data.branch_id || 0,
      } as any)

      setCurrentShareBalance(data.share_balance)
    } catch (err: any) {
      setSelectedShareDepositMember(null)
      setCurrentShareBalance(null)
      setMemberFetchError(err.message)
    } finally {
      setIsFetchingMember(false)
    }
  }

  const handleShareWithdrawalSave = async () => {
    if (!shareDepositMemberNo || !voucherType || !shareAmount) {
      setFormError("Please fill in all required fields")
      return
    }
    if (!shareAmount || Number(shareAmount) <= 0) {
      setFormError("Enter a valid amount")
      return
    }
    if (!selectedShareDepositMember) {
      setFormError("Invalid membership")
      return
    }

    setIsSaving(true)
    setFormError(null)

    try {
      const res = await fetch("/api/share/withdraw", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: shareDepositMemberNo,
          voucher_type: voucherType,
          amount: Number(shareAmount),
          narration: particulars || "Share withdrawal",
          selectedBatch: selectedBatch,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Share withdrawal failed")

      alert(`Share withdrawal saved successfully.\nVoucher No: ${data.voucher_no}\nStatus: ${data.status}`)
      resetForm()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setSelectedBatch(0)
    setShareDepositMemberNo("")
    setSelectedShareDepositMember(null)
    setCurrentShareBalance(null)
    setVoucherType("")
    setShareAmount("")
    setParticulars("")
    setFormError(null)
  }

  const loadIncompleteBatches = async () => {
    setIsBatchPopupOpen(true)
    try {
      const res = await fetch("/api/fas/incomplete-batches", {
        method: "GET",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load batches")
      setIncompleteBatches(data.data || [])
    } catch (err: any) {
      console.error("Load incomplete batches error:", err)
      setIncompleteBatches([])
    }
  }

  const viewMemberSearch = async () => {
    try {
      const res = await fetch("/api/memberships/view_member", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSearchMember),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.found && data.memberData) {
        setMembers(data.memberData ?? [])
      }
    } catch (err: any) {
      console.error("Member search error:", err)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/members")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Share Withdrawal</h1>
            <p className="text-sm text-muted-foreground">Withdraw shares from a member account</p>
          </div>
        </div>

        {formError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {formError}
          </div>
        )}

        {/* Transaction Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Row 1: Transaction Type + Date */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transaction Type</Label>
                  <div className="rounded-md border border-input bg-orange-50 px-3 py-2 text-sm text-orange-700 font-medium">
                    Share Withdrawal
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Transaction Date</Label>
                  <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {identity?.businessDate || "Loading..."}
                  </div>
                </div>
              </div>

              {/* Row 2: Membership Number */}
              <div className="space-y-2">
                <Label htmlFor="membership-number" className="text-sm font-medium">
                  Membership Number *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="membership-number"
                    placeholder="Enter membership number"
                    value={shareDepositMemberNo}
                    onChange={(e) => setShareDepositMemberNo(e.target.value)}
                    onBlur={() => handleMembershipBlur()}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMemberSearchOpen(true)}
                    className="shrink-0"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Row 3: Member Name + Type */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Member Name</Label>
                  <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {selectedShareDepositMember?.full_name || "---"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Member Type</Label>
                  <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {selectedShareDepositMember?.member_type || "---"}
                  </div>
                </div>
              </div>

              {/* Row 4: Share Balance + Voucher Type */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Share Balance</Label>
                  <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {isFetchingMember
                      ? "Loading..."
                      : currentShareBalance !== null
                        ? `Rs. ${currentShareBalance.toFixed(2)}`
                        : "---"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher-type" className="text-sm font-medium">
                    Voucher Type *
                  </Label>
                  <Select
                    value={voucherType || ""}
                    onValueChange={(value) =>
                      setVoucherType(value === "CASH" ? "CASH" : value === "TRANSFER" ? "TRANSFER" : "")
                    }
                  >
                    <SelectTrigger id="voucher-type" className="w-full">
                      <SelectValue placeholder="Select voucher type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Conditional: GL Batch for Transfer */}
              {voucherType === "TRANSFER" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">GL Batch ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedBatch && selectedBatch !== 0 ? String(selectedBatch) : "New Batch"}
                      readOnly
                      placeholder="Select or create batch"
                    />
                    <Button type="button" variant="outline" onClick={() => loadIncompleteBatches()}>
                      Select Batch
                    </Button>
                  </div>
                </div>
              )}

              {/* Row 5: Particulars + Amount */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="particulars" className="text-sm font-medium">
                    Particulars
                  </Label>
                  <Input
                    id="particulars"
                    placeholder="Enter particulars"
                    value={particulars}
                    onChange={(e) => setParticulars(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">
                    Amount *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={shareAmount}
                    onChange={(e) => setShareAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button variant="outline" onClick={() => router.push("/members")}>
            Cancel
          </Button>
          <Button
            onClick={handleShareWithdrawalSave}
            disabled={isSaving || !selectedShareDepositMember}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSaving ? "Saving..." : "Process Withdrawal"}
          </Button>
        </div>
      </div>

      {/* Batch Selection Dialog */}
      <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select GL Batch</DialogTitle>
            <DialogDescription>Choose an incomplete batch or create a new one</DialogDescription>
          </DialogHeader>
          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedBatch(0)
                setIsBatchPopupOpen(false)
              }}
            >
              + Create New Batch
            </Button>
            <Button variant="outline" onClick={() => setIsBatchPopupOpen(false)}>
              Cancel
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Debit</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incompleteBatches.map((b) => (
                <TableRow key={b.batch_id}>
                  <TableCell>{b.batch_id}</TableCell>
                  <TableCell>{b.total_debit}</TableCell>
                  <TableCell>{b.total_credit}</TableCell>
                  <TableCell className="text-red-600">{b.difference}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBatch(b.batch_id)
                        setIsBatchPopupOpen(false)
                      }}
                    >
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Member Search Dialog */}
      <Dialog open={isMemberSearchOpen} onOpenChange={setIsMemberSearchOpen}>
        <DialogContent className="w-[80vw] max-w-none max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Search Member</DialogTitle>
            <DialogDescription>Search and select a member for share withdrawal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Member Name</Label>
                <Input
                  placeholder="Search by name"
                  value={newSearchMember.member_name}
                  onChange={(e) => setNewSearchMember({ ...newSearchMember, member_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Father Name</Label>
                <Input
                  placeholder="Search by father"
                  value={newSearchMember.father_name}
                  onChange={(e) => setNewSearchMember({ ...newSearchMember, father_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone Number</Label>
                <Input
                  placeholder="Search by phone"
                  value={newSearchMember.phone_number}
                  onChange={(e) => setNewSearchMember({ ...newSearchMember, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Aadhaar Number</Label>
                <Input
                  placeholder="Search by Aadhaar"
                  value={newSearchMember.aadhaar_number}
                  onChange={(e) => setNewSearchMember({ ...newSearchMember, aadhaar_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ledger Number</Label>
                <Input
                  placeholder="Search by ledger"
                  value={newSearchMember.ledger_folio_number}
                  onChange={(e) => setNewSearchMember({ ...newSearchMember, ledger_folio_number: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => viewMemberSearch()} className="w-full">
                  Search
                </Button>
              </div>
            </div>

            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Father Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members
                    .filter((member) => {
                      const query = memberSearchQuery.toLowerCase()
                      return (
                        !query ||
                        member.full_name?.toLowerCase().includes(query) ||
                        member.membership_no?.toLowerCase().includes(query) ||
                        member.phone_no?.toLowerCase().includes(query)
                      )
                    })
                    .map((member) => (
                      <TableRow key={member.membership_no} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{member.membership_no}</TableCell>
                        <TableCell>{member.full_name}</TableCell>
                        <TableCell>{member.father_name}</TableCell>
                        <TableCell>{member.phone_no || "---"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.member_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setShareDepositMemberNo(member.membership_no || "")
                              setIsMemberSearchOpen(false)
                              setMemberSearchQuery("")
                              handleMembershipBlur(member.membership_no)
                            }}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMemberSearchOpen(false)
                setMemberSearchQuery("")
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
