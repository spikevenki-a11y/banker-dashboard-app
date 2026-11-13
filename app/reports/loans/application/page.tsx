"use client"

// Reports → Loan Reports → Loan Application
// Find a member, list all of their loan applications (pending and processed), pick one
// and print / download its application form. The form is produced by the same
// generator as the Loan Application screen (lib/print/print-loan-application), which
// picks the template from the application's saved security type — Land uses the
// existing LT/MT form. Read-only: nothing here changes an application.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/date-format"
import { formatCurrency as fmt } from "@/lib/number-format"
import { useAuth } from "@/lib/auth-context"
import { popup } from "@/lib/popup"
import { buildLoanApplicationDocument } from "@/lib/print/print-loan-application"
import { printHtml } from "@/lib/print/print-html"
import { downloadHtmlAsPdf } from "@/lib/print/html-to-pdf"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { MemberSearchDialog, type MemberSearchResult } from "@/components/member-search-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, FileDown, FileText, Loader2, Printer, Search, Users } from "lucide-react"

type LoanRow = {
  loan_application_id: number | string
  reference_no?: string | number | null
  scheme_name?: string | null
  loan_type?: string | null
  application_date?: string | null
  applied_loan_amount?: number | string | null
  application_status?: string | null
  member_name?: string | null
  mobile_no?: string | null
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "border-amber-300 text-amber-700",
  SANCTIONED: "border-blue-300 text-blue-700",
  APPROVED: "border-blue-300 text-blue-700",
  DISBURSED: "border-teal-300 text-teal-700",
  ACTIVE: "border-teal-300 text-teal-700",
  OVERDUE: "border-red-300 text-red-700",
  CLOSED: "border-slate-300 text-slate-700",
  REJECTED: "border-red-300 text-red-700",
}

const codeLabel = (v?: string | null) =>
  v ? String(v).toLowerCase().split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ") : "—"

export default function LoanApplicationReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const branchName = (user as any)?.branch_name as string | undefined

  const [membershipNo, setMembershipNo] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState<{ membershipNo: string; name: string; mobile: string } | null>(null)
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<"generate" | "pdf" | null>(null)
  // The generated form (same document for preview, print and PDF)
  const [generated, setGenerated] = useState<{ id: string; html: string; fileName: string; securityName: string } | null>(null)

  const selected = loans.find((l) => String(l.loan_application_id) === selectedId) ?? null

  async function loadMember(no: string) {
    const memberNo = no.trim()
    if (!memberNo) {
      setError("Please enter a membership number.")
      return
    }
    setLoading(true)
    setError("")
    setLoaded(null)
    setLoans([])
    setSelectedId(null)
    setGenerated(null)
    try {
      // Every application of the member in this branch, whatever its status
      const res = await fetch(
        `/api/loans/applications?membershipNo=${encodeURIComponent(memberNo)}&status=all&limit=500`,
        { credentials: "include" }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load loan applications")
      const rows: LoanRow[] = data.applications ?? []

      let name = rows[0]?.member_name ?? ""
      let mobile = rows[0]?.mobile_no ?? ""
      if (rows.length === 0) {
        // No applications: confirm the member exists so the message is accurate
        const mRes = await fetch("/api/savings/member-lookup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membership_no: memberNo }),
        })
        const mData = await mRes.json().catch(() => ({}))
        if (!mRes.ok || !mData.found) {
          setError(`No member or loan application found for membership number ${memberNo}.`)
          return
        }
        name = mData.member?.full_name ?? ""
        mobile = mData.member?.mobile_no ?? ""
      }

      setMembershipNo(memberNo)
      setLoaded({ membershipNo: memberNo, name, mobile })
      setLoans(rows)
      if (rows.length === 1) setSelectedId(String(rows[0].loan_application_id))
    } catch (e: any) {
      setError(e?.message || "Failed to load loan applications")
    } finally {
      setLoading(false)
    }
  }

  const selectLoan = (id: string) => {
    setSelectedId(id)
    if (generated?.id !== id) setGenerated(null)
  }

  async function generate() {
    if (!selected) return
    setBusy("generate")
    try {
      const doc = await buildLoanApplicationDocument({ loanApplicationId: selected.loan_application_id, branchName })
      setGenerated({ id: String(selected.loan_application_id), ...doc })
    } catch (e: any) {
      popup.error(e?.message || "Failed to generate the application form")
    } finally {
      setBusy(null)
    }
  }

  async function downloadPdf() {
    if (!generated) return
    setBusy("pdf")
    try {
      await downloadHtmlAsPdf(generated.html, generated.fileName)
    } catch (e: any) {
      popup.error(e?.message || "Failed to download the PDF")
    } finally {
      setBusy(null)
    }
  }

  return (
    <DashboardWrapper>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/reports")} className="h-10 w-10 bg-transparent">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loan Application</h1>
            <p className="text-muted-foreground">Generate the application form of any member&apos;s loan</p>
          </div>
        </div>

        {/* Member */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Member</CardTitle>
            <CardDescription>Enter the membership number or search for the member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-xs space-y-2">
                <Label htmlFor="la-membership-no">Membership Number</Label>
                <Input
                  id="la-membership-no"
                  placeholder="Enter membership number"
                  value={membershipNo}
                  onChange={(e) => setMembershipNo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadMember(membershipNo)}
                />
              </div>
              <Button onClick={() => loadMember(membershipNo)} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Load
              </Button>
              <Button variant="outline" onClick={() => setSearchOpen(true)} disabled={loading}>
                <Users className="mr-2 h-4 w-4" />
                Search Member
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {loaded && (
              <div className="flex flex-wrap gap-x-8 gap-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <div><span className="text-muted-foreground">Membership No: </span><span className="font-semibold">{loaded.membershipNo}</span></div>
                <div><span className="text-muted-foreground">Name: </span><span className="font-semibold">{loaded.name || "—"}</span></div>
                <div><span className="text-muted-foreground">Mobile: </span><span className="font-semibold">{loaded.mobile || "—"}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loans */}
        {loaded && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loan Applications</CardTitle>
              <CardDescription>
                {loans.length === 0
                  ? "This member has no loan applications."
                  : "Select a loan application, then click Generate."}
              </CardDescription>
            </CardHeader>
            {loans.length > 0 && (
              <CardContent className="space-y-4">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Loan Account No</TableHead>
                        <TableHead>Loan Scheme</TableHead>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Application Date</TableHead>
                        <TableHead className="text-right">Applied Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map((l) => {
                        const id = String(l.loan_application_id)
                        const isSel = id === selectedId
                        const status = String(l.application_status ?? "").toUpperCase()
                        return (
                          <TableRow
                            key={id}
                            onClick={() => selectLoan(id)}
                            className={`cursor-pointer ${isSel ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                            aria-selected={isSel}
                          >
                            <TableCell>
                              <input
                                type="radio"
                                name="loan-application"
                                aria-label={`Select loan ${l.reference_no ?? id}`}
                                checked={isSel}
                                onChange={() => selectLoan(id)}
                                className="h-4 w-4 accent-blue-600"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{l.reference_no ?? id}</TableCell>
                            <TableCell>{l.scheme_name || "—"}</TableCell>
                            <TableCell>{codeLabel(l.loan_type)}</TableCell>
                            <TableCell>{l.application_date ? formatDate(l.application_date) : "—"}</TableCell>
                            <TableCell className="text-right">{fmt(Number(l.applied_loan_amount) || 0)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLOR[status] ?? ""}>{status || "—"}</Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <Button onClick={generate} disabled={!selected || busy !== null}>
                    {busy === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Generate
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Generated form */}
        {generated && selected && generated.id === String(selected.loan_application_id) && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg">Application Form — Loan {selected.reference_no ?? selected.loan_application_id}</CardTitle>
                <CardDescription>
                  {generated.securityName ? `${generated.securityName} security` : "No security recorded"} · preview
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadPdf} disabled={busy !== null}>
                  {busy === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  Download PDF
                </Button>
                <Button onClick={() => printHtml(generated.html)} disabled={busy !== null}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <iframe
                title="Loan application form preview"
                srcDoc={generated.html}
                sandbox="allow-same-origin"
                className="h-[75vh] w-full rounded-md border bg-white"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <MemberSearchDialog<MemberSearchResult>
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(m) => {
          setSearchOpen(false)
          setMembershipNo(String(m.membership_no))
          loadMember(String(m.membership_no))
        }}
      />
    </DashboardWrapper>
  )
}
