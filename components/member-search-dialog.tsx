"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, Loader2, Users, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

// Member search popup — same UI and behaviour as Savings → Open Account
export interface MemberSearchResult {
  membership_no: string
  full_name: string
  father_name?: string | null
  aadhaar_no?: string | null
  mobile_no?: string | null
  [key: string]: any
}

interface MemberSearchDialogProps<T extends MemberSearchResult> {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (member: T) => void
  // Membership number to leave out of the results (e.g. the loan applicant when picking a surety)
  excludeMembershipNo?: string
}

export function MemberSearchDialog<T extends MemberSearchResult>({ open, onOpenChange, onSelect, excludeMembershipNo }: MemberSearchDialogProps<T>) {
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchPhone, setSearchPhone] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchLedgerFolio, setSearchLedgerFolio] = useState("")
  const [searchResults, setSearchResults] = useState<T[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)
  const [hasPopupSearched, setHasPopupSearched] = useState(false)
  const [popupPage, setPopupPage] = useState(1)
  const [popupPageSize, setPopupPageSize] = useState(10)

  const hasCriteria =
    !!searchMemberNo.trim() || !!searchMemberName.trim() || !!searchFatherName.trim() ||
    !!searchPhone.trim() || !!searchAadhaar.trim() || !!searchLedgerFolio.trim()

  const handlePopupSearch = async () => {
    if (!hasCriteria) return

    setIsPopupSearching(true)
    setHasPopupSearched(true)
    setPopupPage(1)
    setSearchResults([])

    try {
      const res = await fetch("/api/savings/member-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNumber: searchMemberNo.trim(),
          memberName: searchMemberName.trim(),
          fatherName: searchFatherName.trim(),
          contactNo: searchPhone.trim(),
          aadhaarNumber: searchAadhaar.trim(),
          ledgerFolioNumber: searchLedgerFolio.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        const results: T[] = data.results || []
        setSearchResults(excludeMembershipNo ? results.filter((m) => m.membership_no !== excludeMembershipNo) : results)
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setIsPopupSearching(false)
    }
  }

  const popupTotalPages = Math.max(1, Math.ceil(searchResults.length / popupPageSize))
  const paginatedSearchResults = searchResults.slice((popupPage - 1) * popupPageSize, popupPage * popupPageSize)

  const resetPopupSearch = () => {
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchPhone("")
    setSearchAadhaar("")
    setSearchLedgerFolio("")
    setSearchResults([])
    setHasPopupSearched(false)
    setPopupPage(1)
  }

  const handleSelectMember = (member: T) => {
    onSelect(member)
    onOpenChange(false)
    resetPopupSearch()
  }

  const criteria: [string, string, string, (v: string) => void, string][] = [
    ["search-member-no", "Membership No.", searchMemberNo, setSearchMemberNo, "Enter membership no."],
    ["search-member-name", "Member Name", searchMemberName, setSearchMemberName, "Enter name"],
    ["search-father-name", "Father Name", searchFatherName, setSearchFatherName, "Enter father name"],
    ["search-phone", "Phone Number", searchPhone, setSearchPhone, "Enter phone"],
    ["search-aadhaar", "Aadhaar Number", searchAadhaar, setSearchAadhaar, "Enter Aadhaar"],
    ["search-ledger", "Ledger No.", searchLedgerFolio, setSearchLedgerFolio, "Enter ledger no."],
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Search Member
          </DialogTitle>
          <DialogDescription>
            Search for a member using one or more criteria below
          </DialogDescription>
        </DialogHeader>

        {/* Search Criteria */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 py-2">
          {criteria.map(([id, label, value, setter, placeholder]) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
              <Input
                id={id}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={resetPopupSearch}
            className="gap-1.5 bg-transparent text-xs"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handlePopupSearch}
            disabled={isPopupSearching || !hasCriteria}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isPopupSearching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Search
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto border rounded-lg min-h-0">
          {isPopupSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching members...</span>
            </div>
          ) : hasPopupSearched && searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No members found</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Try adjusting your search criteria</p>
            </div>
          ) : searchResults.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Member No</TableHead>
                  <TableHead className="text-xs">Full Name</TableHead>
                  <TableHead className="text-xs">Father Name</TableHead>
                  <TableHead className="text-xs">Aadhaar</TableHead>
                  <TableHead className="text-xs">Mobile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSearchResults.map((member) => (
                  <TableRow
                    key={member.membership_no}
                    className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                    onClick={() => handleSelectMember(member)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{member.membership_no}</TableCell>
                    <TableCell className="text-xs font-medium">{member.full_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{member.father_name || "---"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{member.aadhaar_no || "---"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{member.mobile_no || "---"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                Search by member number, name, father name, phone, Aadhaar, or ledger number
              </p>
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={String(popupPageSize)}
                onValueChange={(v) => {
                  setPopupPageSize(Number(v))
                  setPopupPage(1)
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2">
                {(popupPage - 1) * popupPageSize + 1}–{Math.min(popupPage * popupPageSize, searchResults.length)} of {searchResults.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage(1)} disabled={popupPage === 1}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage((p) => p - 1)} disabled={popupPage === 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="px-2 text-xs">Page {popupPage} of {popupTotalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage((p) => p + 1)} disabled={popupPage >= popupTotalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPopupPage(popupTotalPages)} disabled={popupPage >= popupTotalPages}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
