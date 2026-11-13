"use client"

// Member Management → Member Closure
// 1. Find the member  2. Check every module for open / active / pending accounts
// 3. If any: warning popup listing them; closure blocked
// 4. If none: confirmation popup → POST /api/members/closure (which re-checks everything
//    in a transaction) → member status CLOSED with date, reason and closing user.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, Loader2, Users, XCircle, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { MemberSearchDialog, type MemberSearchResult } from "@/components/member-search-dialog"
import { formatCurrency } from "@/lib/number-format"
import { formatDate } from "@/lib/date-format"
import { popup } from "@/lib/popup"
import {
  MEMBER_CLOSURE_BLOCKED_MSG,
  MEMBER_CLOSURE_REASONS,
  memberClosureReasonLabel,
  type ClosureBlocker,
} from "@/lib/member-closure-shared"

type ClosureMember = {
  membership_no: string
  member_type: string | null
  membership_class: string | null
  status: string | null
  branch_id: string | number
  join_date: string | null
  close_date: string | null
  closure_reason: string | null
  closure_remarks: string | null
  closed_by_name: string | null
  full_name: string | null
  father_name: string | null
  mobile_no: string | null
}

type CheckResponse = { member: ClosureMember; blockers: ClosureBlocker[]; can_close: boolean }

/** Accounts that prevent closure — used on the page and inside the warning popup. */
function BlockersTable({ blockers }: { blockers: ClosureBlocker[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs">Module</TableHead>
            <TableHead className="text-xs">Account No.</TableHead>
            <TableHead className="text-xs">Account Type</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Outstanding / Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {blockers.map((b, i) => (
            <TableRow key={`${b.module}-${b.account_number}-${i}`}>
              <TableCell className="text-sm font-medium">{b.module}</TableCell>
              <TableCell className="font-mono text-sm">{b.account_number}</TableCell>
              <TableCell className="text-sm">{b.account_type}</TableCell>
              <TableCell>
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                  {b.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">
                {b.outstanding === null ? "—" : formatCurrency(b.outstanding)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

const showBlockedPopup = (blockers: ClosureBlocker[]) =>
  popup.warning(MEMBER_CLOSURE_BLOCKED_MSG, {
    title: "Member Closure Blocked",
    size: "wide",
    content: <BlockersTable blockers={blockers} />,
  })

export default function MemberClosurePage() {
  const router = useRouter()
  const [membershipNoInput, setMembershipNoInput] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [member, setMember] = useState<ClosureMember | null>(null)
  const [blockers, setBlockers] = useState<ClosureBlocker[]>([])

  const [reason, setReason] = useState("")
  const [remarks, setRemarks] = useState("")
  const [formError, setFormError] = useState("")
  const [isClosing, setIsClosing] = useState(false)

  const isClosed = String(member?.status || "").toUpperCase() === "CLOSED"

  const fetchCheck = async (no: string): Promise<CheckResponse> => {
    const res = await fetch(`/api/members/closure?membership_no=${encodeURIComponent(no)}`, { credentials: "include" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Failed to load the member")
    return data as CheckResponse
  }

  const loadMember = async (no: string) => {
    const trimmed = no.trim()
    if (!trimmed) {
      setLoadError("Please enter a membership number")
      return
    }
    setIsLoading(true)
    setLoadError("")
    setFormError("")
    try {
      const data = await fetchCheck(trimmed)
      setMember(data.member)
      setBlockers(data.blockers || [])
      setMembershipNoInput(trimmed)
      setReason("")
      setRemarks("")
    } catch (e: any) {
      setMember(null)
      setBlockers([])
      setLoadError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = async () => {
    if (!member || isClosing) return
    setFormError("")
    if (!reason) {
      setFormError("Please select a closure reason")
      return
    }
    if (reason === "OTHER" && !remarks.trim()) {
      setFormError("Please enter remarks for the closure reason 'Other'")
      return
    }

    setIsClosing(true)
    try {
      // Re-check right now — accounts may have changed since the member was loaded
      let fresh: CheckResponse
      try {
        fresh = await fetchCheck(member.membership_no)
      } catch (e: any) {
        await popup.error(e.message)
        return
      }
      setMember(fresh.member)
      setBlockers(fresh.blockers || [])
      if (String(fresh.member.status || "").toUpperCase() === "CLOSED") {
        await popup.info(`Member ${member.membership_no} is already closed.`)
        return
      }
      if (fresh.blockers.length > 0) {
        await showBlockedPopup(fresh.blockers)
        return
      }

      // The server re-validates inside its transaction; if something was opened in the
      // meantime it refuses with the list of blocking accounts
      // Set inside onConfirm (TS can't see that assignment, hence the cast)
      let serverBlockers = null as ClosureBlocker[] | null
      const confirmed = await popup.confirm({
        title: "Confirm Member Closure",
        message:
          `Close membership ${member.membership_no} (${member.full_name || "—"})?\n` +
          `Reason: ${memberClosureReasonLabel(reason)}\n\n` +
          "No open accounts were found. The member will be marked Closed and can no longer be used " +
          "for new accounts or transactions. Existing accounts and transaction history are kept.",
        confirmText: "Close Membership",
        cancelText: "Cancel",
        destructive: true,
        onConfirm: async () => {
          const res = await fetch("/api/members/closure", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              membership_no: member.membership_no,
              closure_reason: reason,
              closure_remarks: remarks.trim(),
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok) return
          if (Array.isArray(data.blockers)) {
            serverBlockers = data.blockers
            return // close the confirmation; the blocked popup is shown below
          }
          throw new Error(data.error || "Failed to close the member")
        },
      })

      if (serverBlockers) {
        setBlockers(serverBlockers)
        await showBlockedPopup(serverBlockers)
        return
      }
      if (!confirmed) return

      await loadMember(member.membership_no)
      await popup.success(`Member ${member.membership_no} has been closed successfully.`)
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <DashboardWrapper>
      <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/members")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Member Closure</h1>
            <p className="text-muted-foreground">Close a membership after all its accounts are closed</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Find member */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Member</CardTitle>
              <CardDescription>Enter the membership number or search for the member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="closure-membership-no">Membership Number</Label>
                  <Input
                    id="closure-membership-no"
                    placeholder="Enter membership number"
                    value={membershipNoInput}
                    onChange={(e) => setMembershipNoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadMember(membershipNoInput)
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => loadMember(membershipNoInput)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Load
                  </Button>
                  <Button variant="outline" onClick={() => setSearchOpen(true)} className="bg-transparent">
                    <Users className="mr-2 h-4 w-4" />
                    Search Member
                  </Button>
                </div>
              </div>
              {loadError && <p className="mt-2 text-sm text-destructive">{loadError}</p>}
            </CardContent>
          </Card>

          {member && (
            <>
              {/* Member details */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-lg">Member Details</CardTitle>
                    <CardDescription>Membership {member.membership_no}</CardDescription>
                  </div>
                  <Badge
                    className={
                      isClosed
                        ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                        : "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                    }
                  >
                    {String(member.status || "").toUpperCase() || "—"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Member Name", member.full_name],
                      ["Father / Spouse Name", member.father_name],
                      ["Mobile No.", member.mobile_no],
                      ["Member Type", member.member_type],
                      ["Membership Class", member.membership_class],
                      ["Join Date", member.join_date ? formatDate(member.join_date) : null],
                    ].map(([label, value]) => (
                      <div key={label as string}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium">{value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {isClosed && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/20">
                      <p className="font-medium text-red-800 dark:text-red-300">This membership is closed</p>
                      <div className="mt-2 grid gap-2 text-red-700 dark:text-red-400 sm:grid-cols-3">
                        <p>Closure Date: {member.close_date ? formatDate(member.close_date) : "—"}</p>
                        <p>Reason: {memberClosureReasonLabel(member.closure_reason) || "—"}</p>
                        <p>Closed By: {member.closed_by_name || "—"}</p>
                      </div>
                      {member.closure_remarks && <p className="mt-2 text-red-700 dark:text-red-400">Remarks: {member.closure_remarks}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {!isClosed && (
                <>
                  {/* Account check */}
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="text-lg">Account Check</CardTitle>
                        <CardDescription>
                          Savings, deposits, loans, share capital, lockers and loan sureties across all branches
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadMember(member.membership_no)}
                        disabled={isLoading}
                        className="bg-transparent"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Re-check
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {blockers.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>
                              {blockers.length} open / pending account{blockers.length === 1 ? "" : "s"} found. {MEMBER_CLOSURE_BLOCKED_MSG}
                            </p>
                          </div>
                          <BlockersTable blockers={blockers} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          No open, active or pending accounts. The member can be closed.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Closure details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Closure Details</CardTitle>
                      <CardDescription>Recorded with the closure date and your user name</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="closure-reason">Closure Reason *</Label>
                          <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="closure-reason">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {MEMBER_CLOSURE_REASONS.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closure-remarks">Remarks{reason === "OTHER" ? " *" : ""}</Label>
                        <Textarea
                          id="closure-remarks"
                          placeholder="Closure remarks (optional)"
                          maxLength={500}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/20">
                        <p className="font-medium text-red-800 dark:text-red-300">Before you close</p>
                        <p className="mt-1 text-red-700 dark:text-red-400">
                          A closed member can't be used for new accounts or transactions. Linked accounts are not closed
                          or changed, and all history is kept.
                        </p>
                      </div>
                      {formError && <p className="text-sm text-destructive">{formError}</p>}
                      <div className="flex justify-end">
                        <Button variant="destructive" onClick={handleClose} disabled={isClosing || isLoading}>
                          {isClosing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Close Membership
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <MemberSearchDialog<MemberSearchResult>
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(m) => {
          setSearchOpen(false)
          loadMember(String(m.membership_no))
        }}
      />
    </DashboardWrapper>
  )
}
