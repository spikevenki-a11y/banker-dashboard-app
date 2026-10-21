"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight, CreditCard, Loader2, Search, Users, X } from "lucide-react"

export type DepositSearchResult = {
  account_number: string
  deposit_type: string
  deposit_type_label: string
  balance: number
  account_status: string
  opening_date: string
  scheme_name: string
  membership_no: string
  full_name: string
  father_name: string
  spouse_name: string
  mobile_no: string
  aadhaar_no: string
}

function formatCurrency(val: number | string | null | undefined) {
  if (val == null) return "--"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(val))
}

/**
 * Advanced deposit account search popup (same criteria and API as the Deposit Interest Payment screen).
 * `filterResult` narrows the returned rows client-side (e.g. RD-only, Active/Matured only);
 * `zeroBalanceOnly` asks the API to return only accounts with clearbalance = 0.
 */
export function DepositAccountSearchDialog({
  open,
  onOpenChange,
  onSelect,
  idPrefix,
  title = "Search Deposit Account",
  filterResult,
  zeroBalanceOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (result: DepositSearchResult) => void
  idPrefix: string
  title?: string
  filterResult?: (result: DepositSearchResult) => boolean
  zeroBalanceOnly?: boolean
}) {
  const [searchAccountNumber, setSearchAccountNumber] = useState("")
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchSpouseName, setSearchSpouseName] = useState("")
  const [searchLedgerFolio, setSearchLedgerFolio] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchContact, setSearchContact] = useState("")
  const [searchResults, setSearchResults] = useState<DepositSearchResult[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)
  const [searchResultsPage, setSearchResultsPage] = useState(1)
  const searchResultsPageSize = 10

  const hasCriteria = !!(
    searchAccountNumber.trim() || searchMemberNo.trim() || searchMemberName.trim() || searchFatherName.trim() ||
    searchSpouseName.trim() || searchLedgerFolio.trim() || searchAadhaar.trim() || searchContact.trim()
  )

  const resetSearch = () => {
    setSearchAccountNumber("")
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchSpouseName("")
    setSearchLedgerFolio("")
    setSearchAadhaar("")
    setSearchContact("")
    setSearchResults([])
    setSearchResultsPage(1)
  }

  const handlePopupSearch = async () => {
    if (!hasCriteria) return

    setIsPopupSearching(true)
    setSearchResults([])
    setSearchResultsPage(1)

    try {
      const res = await fetch("/api/deposits/account-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: searchAccountNumber.trim(),
          memberNumber: searchMemberNo.trim(),
          memberName: searchMemberName.trim(),
          fatherName: searchFatherName.trim(),
          spouseName: searchSpouseName.trim(),
          ledgerFolioNumber: searchLedgerFolio.trim(),
          aadhaarNumber: searchAadhaar.trim(),
          contactNo: searchContact.trim(),
          zeroBalanceOnly,
        }),
      })

      const data = await res.json()
      if (data.success) {
        const results: DepositSearchResult[] = data.results || []
        setSearchResults(filterResult ? results.filter(filterResult) : results)
      }
    } catch {
      // silent
    } finally {
      setIsPopupSearching(false)
    }
  }

  const totalSearchResultPages = Math.max(1, Math.ceil(searchResults.length / searchResultsPageSize))
  const paginatedSearchResults = searchResults.slice(
    (searchResultsPage - 1) * searchResultsPageSize,
    searchResultsPage * searchResultsPageSize
  )

  const handleSelectSearchResult = (result: DepositSearchResult) => {
    onOpenChange(false)
    resetSearch()
    onSelect(result)
  }

  const fields: { key: string; label: string; placeholder: string; value: string; set: (v: string) => void }[] = [
    { key: "account-no", label: "Account Number", placeholder: "Enter account number", value: searchAccountNumber, set: setSearchAccountNumber },
    { key: "member-no", label: "Member Number", placeholder: "Enter member number", value: searchMemberNo, set: setSearchMemberNo },
    { key: "member-name", label: "Member Name", placeholder: "Enter member name", value: searchMemberName, set: setSearchMemberName },
    { key: "father-name", label: "Father's Name", placeholder: "Enter father's name", value: searchFatherName, set: setSearchFatherName },
    { key: "spouse-name", label: "Spouse's Name", placeholder: "Enter spouse's name", value: searchSpouseName, set: setSearchSpouseName },
    { key: "ledger-folio", label: "Ledger Folio Number", placeholder: "Enter ledger folio number", value: searchLedgerFolio, set: setSearchLedgerFolio },
    { key: "aadhaar", label: "Aadhaar Number", placeholder: "Enter Aadhaar number", value: searchAadhaar, set: setSearchAadhaar },
    { key: "contact", label: "Contact No", placeholder: "Enter contact number", value: searchContact, set: setSearchContact },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Search for a deposit account using one or more criteria below
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {fields.map((f, i) => (
            <div key={f.key} className={`space-y-1.5 ${i === fields.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
              <Label htmlFor={`${idPrefix}-${f.key}`} className="text-xs">{f.label}</Label>
              <Input
                id={`${idPrefix}-${f.key}`}
                placeholder={f.placeholder}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={resetSearch} className="gap-1.5 bg-transparent text-xs">
            <X className="h-3 w-3" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handlePopupSearch}
            disabled={isPopupSearching || !hasCriteria}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isPopupSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-lg min-h-0">
          {isPopupSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching deposit accounts...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Account No</TableHead>
                  <TableHead className="text-xs">Member Name</TableHead>
                  <TableHead className="text-xs">Member No</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Scheme</TableHead>
                  <TableHead className="text-xs">Balance</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSearchResults.map((result) => (
                  <TableRow
                    key={result.account_number}
                    className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{result.account_number}</TableCell>
                    <TableCell className="text-xs font-medium">{result.full_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{result.membership_no}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{result.deposit_type_label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{result.scheme_name}</TableCell>
                    <TableCell className="text-xs font-medium">{formatCurrency(result.balance)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${result.account_status === "Active" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                        {result.account_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                {hasCriteria
                  ? "No accounts found. Try different search criteria."
                  : "Enter search criteria and click Search to find accounts."}
              </p>
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Showing {(searchResultsPage - 1) * searchResultsPageSize + 1}
              {"–"}
              {Math.min(searchResultsPage * searchResultsPageSize, searchResults.length)} of {searchResults.length}
            </p>
            {totalSearchResultPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => setSearchResultsPage((p) => Math.max(1, p - 1))}
                  disabled={searchResultsPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: totalSearchResultPages }, (_, i) => i + 1).map((pn) => (
                  <Button
                    key={pn}
                    variant={pn === searchResultsPage ? "default" : "outline"}
                    size="icon"
                    className={`h-7 w-7 text-xs ${pn === searchResultsPage ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-transparent"}`}
                    onClick={() => setSearchResultsPage(pn)}
                  >
                    {pn}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => setSearchResultsPage((p) => Math.min(totalSearchResultPages, p + 1))}
                  disabled={searchResultsPage === totalSearchResultPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
