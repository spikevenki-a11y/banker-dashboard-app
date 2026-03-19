"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Search, Loader2, CheckCircle2, User, Banknote, Calendar, Calculator, Shield, FileText, Users, X, IndianRupee, TrendingUp, Clock, ChevronRight } from "lucide-react"
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

type LoanScheme = {
  scheme_id: number
  scheme_name: string
  scheme_description: string
  loan_type: string
  interest_rate: number
  min_loan_amount: number
  max_loan_amount: number
  min_tenure_months: number
  max_tenure_months: number
  processing_fee_percent: number
  collateral_required: boolean
  scheme_status: string
}

type EMISchedule = {
  installment_no: number
  due_date: string
  emi_amount: number
  principal: number
  interest: number
  balance: number
}

export default function LoanApplicationPage() {
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
  const [schemes, setSchemes] = useState<LoanScheme[]>([])
  const [selectedSchemeId, setSelectedSchemeId] = useState("")
  const [loadingSchemes, setLoadingSchemes] = useState(true)

  // Form fields
  const [applicationDate, setApplicationDate] = useState("")
  const [loanAmount, setLoanAmount] = useState("")
  const [tenureMonths, setTenureMonths] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [loanPurpose, setLoanPurpose] = useState("")
  const [collateralDetails, setCollateralDetails] = useState("")
  const [guarantorName, setGuarantorName] = useState("")
  const [guarantorMembership, setGuarantorMembership] = useState("")
  const [remarks, setRemarks] = useState("")

  // EMI calculation
  const [emiSchedule, setEmiSchedule] = useState<EMISchedule[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [emiAmount, setEmiAmount] = useState<number | null>(null)
  const [totalInterest, setTotalInterest] = useState<number | null>(null)
  const [totalPayment, setTotalPayment] = useState<number | null>(null)

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [createdApplicationNo, setCreatedApplicationNo] = useState("")

  // Loan purposes
  const [purposes, setPurposes] = useState([]);
  const [selectedPurposeId, setSelectedPurposeId] = useState(""); 

  // Loan securities
  const [securities, setSecurities] = useState([]);
  const [selectedSecurityId, setSelectedSecurityId] = useState(""); 

  // Fetch schemes on mount
  useEffect(() => {
    async function fetchSchemes() {
      try {
        const res = await fetch("/api/loans/schemes", { credentials: "include" })
        const data = await res.json()
        if (res.ok) {
          setSchemes(data.schemes || [])
        }
      } catch (e) {
        console.error("Failed to fetch loan schemes:", e)
      } finally {
        setLoadingSchemes(false)
      }
    }
    fetchSchemes()
    getLoginDate()
  }, [])

  const selectedScheme = schemes.find((s) => String(s.scheme_id) === selectedSchemeId)

  const getLoginDate = async () => {
    try {
      const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
      const data = await res.json()
      if (data.businessDate) {
        setApplicationDate(data.businessDate)
      }
    } catch (err) {
      console.error("Failed to fetch date", err)
    }
  }

  // When scheme is selected, set default values
  useEffect(() => {
    if (selectedScheme) {
      setInterestRate(String(selectedScheme.interest_rate))
    }
  }, [selectedScheme])

  // Calculate EMI when amount, tenure, or rate changes
  useEffect(() => {
    if (loanAmount && tenureMonths && interestRate) {
      calculateEMI()
    } else {
      setEmiAmount(null)
      setTotalInterest(null)
      setTotalPayment(null)
      setEmiSchedule([])
    }
  }, [loanAmount, tenureMonths, interestRate])

  const calculateEMI = async () => {
    const principal = Number(loanAmount)
    const months = Number(tenureMonths)
    const rate = Number(interestRate)

    if (!principal || !months || !rate) return

    setIsCalculating(true)

    try {
      const res = await fetch("/api/loans/calculate-emi", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal,
          tenure_months: months,
          interest_rate: rate,
          start_date: applicationDate,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setEmiAmount(data.emi_amount)
        setTotalInterest(data.total_interest)
        setTotalPayment(data.total_payment)
        setEmiSchedule(data.schedule || [])
      }
    } catch (e) {
      console.error("Failed to calculate EMI:", e)
    } finally {
      setIsCalculating(false)
    }
  }

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
  

  const handleMemberBlur = () => {
    if (membershipNo.trim() && !memberInfo && !isSearching) {
      handleMemberSearch()
    }
  }

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
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchAadhaar("")
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!memberInfo || !selectedSchemeId || !applicationDate || !loanAmount || !tenureMonths) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/loans/applications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: memberInfo.membership_no,
          scheme_id: Number(selectedSchemeId),
          application_date: applicationDate,
          loan_amount: Number(loanAmount),
          tenure_months: Number(tenureMonths),
          interest_rate: Number(interestRate),
          loan_purpose: selectedPurposeId,
          collateral_details: collateralDetails,
          guarantor_name: guarantorName,
          guarantor_membership_no: guarantorMembership,
          remarks: remarks,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCreatedApplicationNo(data.application_no || data.loan_application_id)
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
    setLoanAmount("")
    setTenureMonths("")
    setInterestRate("")
    setLoanPurpose("")
    setCollateralDetails("")
    setGuarantorName("")
    setGuarantorMembership("")
    setRemarks("")
    setEmiAmount(null)
    setTotalInterest(null)
    setTotalPayment(null)
    setEmiSchedule([])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const loadpurpose = async (schemeId: string) => {
    try {      const res = await fetch(`/api/loans/aplication_settings/purpose?schemeId=${schemeId}`, {})
      const data = await res.json()
      console.log("Purposes for scheme", schemeId, data)
      setPurposes(data.schemes || []); // store purposes
    } catch (error) {
      console.error("Failed to load loan purposes:", error)
    }
  }

  const loadSecurity = async (schemeId: string) => {
    try {      const res = await fetch(`/api/loans/aplication_settings/security?schemeId=${schemeId}`, {})
      const data = await res.json()
      console.log("Securities for scheme", schemeId, data)
      setSecurities(data.security || []); // store securities
    } catch (error) {
      console.error("Failed to load loan securities:", error)
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
                onClick={() => router.push("/loans")}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">New Loan Application</h1>
                <p className="text-muted-foreground">Apply for a new loan for a member</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Member Lookup */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
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
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-700">Member Found</span>
                          <Badge variant="outline" className="ml-auto border-blue-300 text-blue-700">
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

                {/* Step 2: Loan Scheme Selection */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        2
                      </div>
                      <div>
                        <CardTitle className="text-lg">Loan Scheme & Amount</CardTitle>
                        <CardDescription>Select a loan scheme and enter loan details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheme">Loan Scheme *</Label>
                        <Select 
                          value={selectedSchemeId} 
                          
                          onValueChange={(value) => {
                            setSelectedSchemeId(value);
                            loadpurpose(value);
                            loadSecurity(value);
                          }}

                          disabled={loadingSchemes}
                          >
                          <SelectTrigger id="scheme">
                            <SelectValue placeholder={loadingSchemes ? "Loading schemes..." : "Select a loan scheme"} />
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
                        <Label htmlFor="application-date">Application Date</Label>
                        <Input
                          id="application-date"
                          type="date"
                          value={applicationDate}
                          disabled
                        />
                      </div>
                    </div>

                    {selectedScheme && (
                      <div className="rounded-lg border border-muted bg-muted/30 p-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Min Amount</p>
                            <p className="font-medium">{formatCurrency(selectedScheme.min_loan_amount || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Max Amount</p>
                            <p className="font-medium">{formatCurrency(selectedScheme.max_loan_amount || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Min Tenure</p>
                            <p className="font-medium">{selectedScheme.min_tenure_months || 1} months</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Max Tenure</p>
                            <p className="font-medium">{selectedScheme.max_tenure_months || 120} months</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="loan-amount">Loan Amount *</Label>
                        <Input
                          id="loan-amount"
                          type="number"
                          placeholder="Enter amount"
                          value={loanAmount}
                          onChange={(e) => setLoanAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tenure">Tenure (Months) *</Label>
                        <Input
                          id="tenure"
                          type="number"
                          placeholder="Enter months"
                          value={tenureMonths}
                          onChange={(e) => setTenureMonths(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interest-rate">Interest Rate (% p.a.)</Label>
                        <Input
                          id="interest-rate"
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loan-purpose">Loan Purpose</Label>
                      <Select
                        value={selectedPurposeId}
                        onValueChange={setSelectedPurposeId}
                        disabled={!purposes.length}
                      >
                        <SelectTrigger id="purpose">
                          <SelectValue placeholder="Select a purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          {purposes.map((purpose) => (
                            <SelectItem
                              key={purpose.purpose_id}
                              value={String(purpose.purpose_id)}
                            >
                              {purpose.purpose_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Collateral & Guarantor */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        3
                      </div>
                      <div>
                        <CardTitle className="text-lg">Collateral & Guarantor</CardTitle>
                        <CardDescription>Add security and guarantor details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loan-purpose">Security Type</Label>
                      <Select
                        value={selectedSecurityId}
                        onValueChange ={(value) => 
                          setSelectedSecurityId(value)

                        }
                        disabled={!securities.length}
                      >
                        <SelectTrigger id="purpose">
                          <SelectValue placeholder="Select a purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          {securities.map((sec) => (
                            <SelectItem
                              key={sec.security_id}
                              value={String(sec.security_id)}
                            >
                              {sec.security_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(Number(selectedSecurityId) === 6) && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="collateral">Collateral Details</Label>
                        <Textarea
                          id="collateral"
                          placeholder="Enter collateral/security details (if any)"
                          value={collateralDetails}
                          onChange={(e) => setCollateralDetails(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="guarantor-name">Guarantor Name</Label>
                          <Input
                            id="guarantor-name"
                            placeholder="Enter guarantor name"
                            value={guarantorName}
                            onChange={(e) => setGuarantorName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="guarantor-membership">Guarantor Membership No</Label>
                          <Input
                            id="guarantor-membership"
                            placeholder="Enter membership no"
                            value={guarantorMembership}
                            onChange={(e) => setGuarantorMembership(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                          id="remarks"
                          placeholder="Any additional remarks"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset} className="bg-transparent">
                    Reset
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/loans")} className="bg-transparent">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!memberInfo || !selectedSchemeId || !applicationDate || !loanAmount || !tenureMonths || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column - Summary & EMI */}
              <div className="space-y-6">
                {/* EMI Calculator Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      EMI Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isCalculating ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    ) : emiAmount ? (
                      <>
                        <div className="rounded-lg bg-blue-50 p-4 text-center">
                          <p className="text-sm text-muted-foreground">Monthly EMI</p>
                          <p className="text-3xl font-bold text-blue-700">{formatCurrency(emiAmount)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border p-3 text-center">
                            <p className="text-xs text-muted-foreground">Principal</p>
                            <p className="font-semibold">{formatCurrency(Number(loanAmount))}</p>
                          </div>
                          <div className="rounded-lg border p-3 text-center">
                            <p className="text-xs text-muted-foreground">Total Interest</p>
                            <p className="font-semibold text-amber-600">{formatCurrency(totalInterest || 0)}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Payment</p>
                          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalPayment || 0)}</p>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        <Calculator className="mx-auto mb-2 h-10 w-10 opacity-30" />
                        <p className="text-sm">Enter loan amount, tenure, and interest rate to calculate EMI</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Loan Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Application Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Member</span>
                      <span className="text-sm font-medium">{memberInfo?.full_name || "---"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Scheme</span>
                      <span className="text-sm font-medium">{selectedScheme?.scheme_name || "---"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Loan Amount</span>
                      <span className="text-sm font-medium">{loanAmount ? formatCurrency(Number(loanAmount)) : "---"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Tenure</span>
                      <span className="text-sm font-medium">{tenureMonths ? `${tenureMonths} months` : "---"}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Interest Rate</span>
                      <span className="text-sm font-medium">{interestRate ? `${interestRate}% p.a.` : "---"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Purpose</span>
                      <span className="text-sm font-medium">{loanPurpose || "---"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* EMI Schedule Preview */}
                {emiSchedule.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-blue-600" />
                        EMI Schedule (First 6)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">#</TableHead>
                              <TableHead className="text-xs">Due Date</TableHead>
                              <TableHead className="text-xs text-right">EMI</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emiSchedule.slice(0, 6).map((item) => (
                              <TableRow key={item.installment_no}>
                                <TableCell className="text-xs">{item.installment_no}</TableCell>
                                <TableCell className="text-xs">{item.due_date}</TableCell>
                                <TableCell className="text-xs text-right">{formatCurrency(item.emi_amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {emiSchedule.length > 6 && (
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            + {emiSchedule.length - 6} more installments
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Member Search Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Search Member
            </DialogTitle>
            <DialogDescription>Search by membership number, name, father name, or Aadhaar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Membership No</Label>
                <Input
                  placeholder="Enter membership no"
                  value={searchMemberNo}
                  onChange={(e) => setSearchMemberNo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Member Name</Label>
                <Input
                  placeholder="Enter name"
                  value={searchMemberName}
                  onChange={(e) => setSearchMemberName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Father Name</Label>
                <Input
                  placeholder="Enter father name"
                  value={searchFatherName}
                  onChange={(e) => setSearchFatherName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input
                  placeholder="Enter Aadhaar"
                  value={searchAadhaar}
                  onChange={(e) => setSearchAadhaar(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handlePopupSearch} disabled={isPopupSearching} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isPopupSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membership No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((member) => (
                      <TableRow key={member.membership_no}>
                        <TableCell className="font-mono">{member.membership_no}</TableCell>
                        <TableCell>{member.full_name}</TableCell>
                        <TableCell>{member.father_name || "---"}</TableCell>
                        <TableCell>{member.mobile_no || "---"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectMember(member)}
                            className="bg-transparent"
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {searchResults.length === 0 && !isPopupSearching && (searchMemberNo || searchMemberName || searchFatherName || searchAadhaar) && (
              <p className="text-center text-sm text-muted-foreground">No members found. Try different search criteria.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-6 w-6" />
              Application Submitted Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Loan application has been created successfully.</p>
                <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Application Number</p>
                  <p className="text-2xl font-bold text-green-700">{createdApplicationNo}</p>
                </div>
                <p className="mt-4 text-sm">
                  The application is now pending for sanction approval. You can proceed to sanction or return to the Loans dashboard.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogAction
              onClick={() => {
                setSuccessOpen(false)
                router.push("/loans")
              }}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              Go to Loans
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setSuccessOpen(false)
                router.push(`/loans/sanction?appId=${createdApplicationNo}`)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Proceed to Sanction
              <ChevronRight className="ml-1 h-4 w-4" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
