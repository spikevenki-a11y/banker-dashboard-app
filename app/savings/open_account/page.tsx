"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, Loader2, CheckCircle2, User, CreditCard, Banknote, Users, X } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type MemberInfo = {
  membership_no: string
  member_type: string
  membership_class: string
  status: string
  full_name: string
  father_name: string
  mobile_no: string
  date_of_birth: string
  aadhaar_no: string
  customer_code: string
  gender: string
}

type Scheme = {
  scheme_id: number
  scheme_name: string
  scheme_description: string
  interest_rate: number
  min_balance: number
  minimum_deposit: number
  maximum_deposit: number
  interest_frequency: string
  interest_calculation_method: string
  scheme_status: string
  minimum_age: number
  maximum_age: number
  is_staff_only: boolean
  savings_gl_account: number
}

export default function OpenSavingsAccountPage() {
  const router = useRouter()

  // Member lookup
  const [membershipNo, setMembershipNo] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberError, setMemberError] = useState("")

  // Member search popup
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchResults, setSearchResults] = useState<MemberInfo[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)

  // Schemes
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [selectedSchemeId, setSelectedSchemeId] = useState("")
  const [loadingSchemes, setLoadingSchemes] = useState(true)

  // Form fields
  const [openingDate, setOpeningDate] = useState("")
  const [initialDeposit, setInitialDeposit] = useState("")
  const [nomineeName, setNomineeName] = useState("")
  const [nomineeRelation, setNomineeRelation] = useState("")

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [createdAccountNo, setCreatedAccountNo] = useState("")

  // Fetch schemes on mount
  useEffect(() => {
    async function fetchSchemes() {
      try {
        const res = await fetch("/api/savings/schemes", { credentials: "include" })
        const data = await res.json()
        if (res.ok) {
          setSchemes(data.schemes || [])
        }
      } catch (e) {
        console.error("Failed to fetch schemes:", e)
      } finally {
        setLoadingSchemes(false)
      }
    }
    fetchSchemes()
    getLogindate()
  }, [])

  const selectedScheme = schemes.find((s) => String(s.scheme_id) === selectedSchemeId)

  const handleMemberSearch = async () => {
    if (!membershipNo.trim()) return

    setIsSearching(true)
    setMemberError("")
    setMemberInfo(null)

    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: membershipNo.trim() }),
      })

      const data = await res.json()
      if (res.ok && data.found) {
        setMemberInfo(data.member)
      } else {
        setMemberError("No active member found with this membership number.")
      }
    } catch (e) {
      setMemberError("Failed to search member. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-load member on blur (when user types membership no directly)
  const handleMemberBlur = () => {
    if (membershipNo.trim() && !memberInfo && !isSearching) {
      handleMemberSearch()
    }
  }

  // Popup advanced search
  const handlePopupSearch = async () => {
    if (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim()) return

    setIsPopupSearching(true)
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
          aadhaarNumber: searchAadhaar.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSearchResults(data.results || [])
      }
    } catch {
      // silent
    } finally {
      setIsPopupSearching(false)
    }
  }

  const handleSelectMember = (member: MemberInfo) => {
    setMemberInfo(member)
    setMembershipNo(member.membership_no)
    setMemberError("")
    setSearchDialogOpen(false)
    // Reset popup fields
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchAadhaar("")
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!memberInfo || !selectedSchemeId || !openingDate) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/savings/open-account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: memberInfo.membership_no,
          scheme_id: Number(selectedSchemeId),
          opening_date: openingDate,
          initial_deposit: initialDeposit ? Number(initialDeposit) : 0,
          nominee_name: nomineeName,
          nominee_relation: nomineeRelation,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCreatedAccountNo(data.account_number)
      setSuccessOpen(true)
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setMembershipNo("")
    setMemberInfo(null)
    setMemberError("")
    setSelectedSchemeId("")
    // setOpeningDate(new Date().toISOString().split("T")[0])
    setInitialDeposit("")
    setNomineeName("")
    setNomineeRelation("")
  }
  
const getLogindate = async () => {
  try {
    const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
    const data = await res.json()

    console.log("logindate =", data)

    if (data.businessDate) {
      setOpeningDate(data.businessDate)
      console.log("Updated openingDate-----:", openingDate)
    }
    console.log("Updated openingDate:", openingDate)

  } catch (err) {
    console.error("Failed to fetch date", err)
  }
}

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/savings")}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Open Savings Account</h1>
                <p className="text-muted-foreground">Create a new savings account for a member</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Member Lookup */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        1
                      </div>
                      <div>
                        <CardTitle className="text-lg">Member Information</CardTitle>
                        <CardDescription>Search for the member by membership number</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="membership-no">Membership Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="membership-no"
                          placeholder="Enter membership number"
                          value={membershipNo}
                          onChange={(e) => {
                            setMembershipNo(e.target.value)
                            if (memberInfo) {
                              setMemberInfo(null)
                              setMemberError("")
                            }
                          }}
                          onBlur={handleMemberBlur}
                          onKeyDown={(e) => e.key === "Enter" && handleMemberSearch()}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setSearchDialogOpen(true)}
                          className="gap-2 bg-transparent"
                        >
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                      </div>
                      {isSearching && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading member details...
                        </div>
                      )}
                      {memberError && <p className="text-sm text-red-500">{memberError}</p>}
                    </div>

                    {memberInfo && (
                      <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-teal-600" />
                          <span className="font-medium text-teal-700">Member Found</span>
                          <Badge variant="outline" className="ml-auto border-teal-300 text-teal-700">
                            {memberInfo.member_type}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Full Name</p>
                            <p className="text-sm font-medium">{memberInfo.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Father Name</p>
                            <p className="text-sm font-medium">{memberInfo.father_name || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Mobile</p>
                            <p className="text-sm font-medium">{memberInfo.mobile_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Date of Birth</p>
                            <p className="text-sm font-medium">{memberInfo.date_of_birth || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Gender</p>
                            <p className="text-sm font-medium">{memberInfo.gender || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Customer Code</p>
                            <p className="text-sm font-mono font-medium">{memberInfo.customer_code?.trim()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Scheme Selection */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-lg">Scheme & Account Details</CardTitle>
                        <CardDescription>Select a savings scheme and enter account details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheme">Savings Scheme *</Label>
                        <Select value={selectedSchemeId} onValueChange={setSelectedSchemeId} disabled={loadingSchemes}>
                          <SelectTrigger id="scheme">
                            <SelectValue placeholder={loadingSchemes ? "Loading schemes..." : "Select a scheme"} />
                          </SelectTrigger>
                          <SelectContent>
                            {schemes.map((scheme) => (
                              <SelectItem key={scheme.scheme_id} value={String(scheme.scheme_id)}>
                                {scheme.scheme_name} ({scheme.interest_rate}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="opening-date">Opening Date</Label>
                        <Input
                          id="opening-date"
                          type="date"
                          value={openingDate}
                          // onChange={(e) => setOpeningDate(e.target.value)}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="initial-deposit">Initial Deposit Amount</Label>
                        <Input
                          id="initial-deposit"
                          type="number"
                          placeholder="0.00"
                          value={initialDeposit}
                          // onChange={(e) => setInitialDeposit(e.target.value)}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Interest Rate</Label>
                        <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          {selectedScheme ? `${selectedScheme.interest_rate}% per annum` : "---"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Nominee Details */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                        3
                      </div>
                      <div>
                        <CardTitle className="text-lg">Nominee Details</CardTitle>
                        <CardDescription>Add nominee information for the account</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nominee-name">Nominee Name</Label>
                        <Input
                          id="nominee-name"
                          placeholder="Enter nominee name"
                          value={nomineeName}
                          onChange={(e) => setNomineeName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nominee-relation">Relationship</Label>
                        <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                          <SelectTrigger id="nominee-relation">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Spouse">Spouse</SelectItem>
                            <SelectItem value="Son">Son</SelectItem>
                            <SelectItem value="Daughter">Daughter</SelectItem>
                            <SelectItem value="Brother">Brother</SelectItem>
                            <SelectItem value="Sister">Sister</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset} className="bg-transparent">
                    Reset
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/savings")} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!memberInfo || !selectedSchemeId || !openingDate || isSubmitting}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      "Open Account"
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column - Summary Sidebar */}
              <div className="space-y-6">
                {/* Member Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Member Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memberInfo ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm font-semibold">{memberInfo.full_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Membership No</p>
                          <p className="text-sm font-mono font-semibold">{memberInfo.membership_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Type</p>
                          <Badge variant="outline">{memberInfo.member_type}</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Search a member to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Scheme Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Scheme Details</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedScheme ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Scheme</p>
                          <p className="text-sm font-semibold">{selectedScheme.scheme_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                          <p className="text-sm font-semibold text-teal-600">{selectedScheme.interest_rate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Min Balance</p>
                          <p className="text-sm font-semibold">
                            {selectedScheme.min_balance ? `₹${Number(selectedScheme.min_balance).toLocaleString()}` : "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest Frequency</p>
                          <p className="text-sm font-semibold capitalize">{selectedScheme.interest_frequency || "---"}</p>
                        </div>
                        {selectedScheme.scheme_description && (
                          <div>
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{selectedScheme.scheme_description}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a scheme to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Deposit Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-sm font-medium">Account Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Opening Date</p>
                        <p className="text-sm font-semibold">{openingDate || "---"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Initial Deposit</p>
                        <p className="text-sm font-semibold">
                          {initialDeposit ? `₹${Number(initialDeposit).toLocaleString()}` : "₹0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Nominee</p>
                        <p className="text-sm font-semibold">
                          {nomineeName ? `${nomineeName} (${nomineeRelation || "---"})` : "Not provided"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Member Search Dialog */}
            <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
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
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="search-member-no" className="text-xs">Member Number</Label>
                    <Input
                      id="search-member-no"
                      placeholder="Enter member number"
                      value={searchMemberNo}
                      onChange={(e) => setSearchMemberNo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-member-name" className="text-xs">Member Name</Label>
                    <Input
                      id="search-member-name"
                      placeholder="Enter member name"
                      value={searchMemberName}
                      onChange={(e) => setSearchMemberName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-father-name" className="text-xs">Father{"'"}s Name</Label>
                    <Input
                      id="search-father-name"
                      placeholder="Enter father's name"
                      value={searchFatherName}
                      onChange={(e) => setSearchFatherName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-aadhaar" className="text-xs">Aadhaar Number</Label>
                    <Input
                      id="search-aadhaar"
                      placeholder="Enter Aadhaar number"
                      value={searchAadhaar}
                      onChange={(e) => setSearchAadhaar(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchMemberNo("")
                      setSearchMemberName("")
                      setSearchFatherName("")
                      setSearchAadhaar("")
                      setSearchResults([])
                    }}
                    className="gap-1.5 bg-transparent text-xs"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePopupSearch}
                    disabled={isPopupSearching || (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim())}
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
                  ) : searchResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Member No</TableHead>
                          <TableHead className="text-xs">Full Name</TableHead>
                          <TableHead className="text-xs">Father Name</TableHead>
                          <TableHead className="text-xs">Aadhaar</TableHead>
                          <TableHead className="text-xs">Mobile</TableHead>
                          <TableHead className="text-xs w-20">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((member) => (
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
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectMember(member)
                                }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchMemberNo || searchMemberName || searchFatherName || searchAadhaar
                          ? "No members found. Try different search criteria."
                          : "Enter search criteria and click Search to find members."}
                      </p>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Account Opened Successfully!
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4">
                      <p className="text-sm text-teal-700">The savings account has been created with the following details:</p>
                      <p className="mt-2 text-lg font-semibold text-teal-800">
                        Account No: <span className="font-mono">{createdAccountNo}</span>
                      </p>
                      {memberInfo && (
                        <p className="mt-1 text-sm text-teal-700">
                          Member: {memberInfo.full_name} ({memberInfo.membership_no})
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:justify-end">
                  <AlertDialogAction
                    onClick={() => {
                      setSuccessOpen(false)
                      handleReset()
                    }}
                    className="bg-transparent border border-input hover:bg-accent text-foreground"
                  >
                    Open Another
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => router.push("/savings")}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Go to Savings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
