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
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ArrowLeft, Search, Loader2, CheckCircle2, User, Banknote, Calendar, Wallet, TrendingUp, TrendingDown, Shield, ShieldCheck, RefreshCw, Info, Users, X, Eye, MapPin, Camera, PenTool, BarChart3 } from "lucide-react"
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
  ledger_folio_number: string
}

type MemberProfile = {
  membership_no: string
  membership_class: string
  member_type: string
  status: string
  join_date: string
  ledger_folio_number: string
  board_resolution_number: string
  customer_code: string
  full_name: string
  father_name: string
  gender: string
  date_of_birth: string
  customer_type: string
  spouse_name: string
  marital_status: string
  occupation: string
  mobile_no: string
  customer_email: string
  house_no: string
  street: string
  village: string
  thaluk: string
  district: string
  state: string
  pincode: string
  address_phone: string
  aadhaar_no: string
  pan_no: string
  ration_no: string
  driving_license_no: string
}

type AccountAsset = {
  account_type: string
  account_number: string
  scheme_name: string
  balance: number
  status: string
  opening_date: string
  interest_rate: number
  close_date?: string
  extra: any
}

type LoanAccount = {
  loan_application_id: number
  scheme_name: string
  loan_type: string
  sanctioned_amount: number
  interest_rate: number
  loan_tenure_months: number
  emi_amount: number
  sanction_date: string
  outstanding_balance: number
  paid_installments: number
  total_installments: number
  overdue_installments: number
  application_status: string
  loan_account_no: string
}

type Scheme = {
  scheme_id: number
  scheme_name: string
  scheme_description: string
  deposit_type: string
  minimum_deposit: number
  maximum_deposit: number
  minimum_period_months: number
  maximum_period_months: number
  minimum_period_days: number
  maximum_period_days: number
  period_unit: string
  interest_rate: number
  interest_frequency: string
  interest_calculation_method: string
  premature_closure_allowed: boolean
  premature_penal_rate: number
  auto_renewal_allowed: boolean
  tds_applicable: boolean
  installment_frequency: string
  minimum_installment_amount: number
  maximum_installment_amount: number
  scheme_status: string
}

type SavingsAccount = {
  account_number: string
  available_balance: number
  clear_balance: number
  unclear_balance: number
  account_status: string
  opening_date: string
  interest_rate: number
  scheme_name: string
}

export default function CreateDepositPage() {
  const router = useRouter()

  const [memberSearch, setMemberSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberError, setMemberError] = useState("")
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([])
  const [isFetchingSavings, setIsFetchingSavings] = useState(false)

  // View member profile modal
  const [viewMemberOpen, setViewMemberOpen] = useState(false)
  const [viewMemberTab, setViewMemberTab] = useState("personal")
  const [viewMemberProfile, setViewMemberProfile] = useState<MemberProfile | null>(null)
  const [viewMemberAssets, setViewMemberAssets] = useState<AccountAsset[]>([])
  const [viewMemberSummary, setViewMemberSummary] = useState<any>(null)
  const [viewMemberLoans, setViewMemberLoans] = useState<LoanAccount[]>([])
  const [viewMemberLoading, setViewMemberLoading] = useState(false)
  const [viewMemberError, setViewMemberError] = useState("")

  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)

  const [depositType, setDepositType] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [periodMonths, setPeriodMonths] = useState("")
  const [periodDays, setPeriodDays] = useState("")
  const [rateOfInterest, setRateOfInterest] = useState("")
  const [openingDate, setOpeningDate] = useState("")
  const [autoRenewal, setAutoRenewal] = useState(false)
  const [renewalPeriodMonths, setRenewalPeriodMonths] = useState("")
  const [renewalPeriodDays, setRenewalPeriodDays] = useState("")
  const [renewalWithInterest, setRenewalWithInterest] = useState(false)
  const [interestPayoutFrequency, setInterestPayoutFrequency] = useState("ON_MATURITY")
  const [interestCalcMethod, setInterestCalcMethod] = useState("SIMPLE")
  const [prematureClosureAllowed, setPrematureClosureAllowed] = useState(true)
  const [prematurePenalRate, setPrematurePenalRate] = useState("")
  const [tdsApplicable, setTdsApplicable] = useState(false)
  const [nomineeFullName, setNomineeFullName] = useState("")
  const [nomineeRelation, setNomineeRelation] = useState("")

  // RD specific
  const [installmentAmount, setInstallmentAmount] = useState("")
  const [installmentFrequency, setInstallmentFrequency] = useState("MONTHLY")
  const [numberOfInstallments, setNumberOfInstallments] = useState("")
  const [rdPenalRate, setRdPenalRate] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{ account_number: string; maturity_date?: string; maturity_amount?: number } | null>(null)
  const [interestChartOpen, setInterestChartOpen] = useState(false)

  // Member search popup state
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [searchMemberNo, setSearchMemberNo] = useState("")
  const [searchMemberName, setSearchMemberName] = useState("")
  const [searchFatherName, setSearchFatherName] = useState("")
  const [searchAadhaar, setSearchAadhaar] = useState("")
  const [searchContact, setSearchContact] = useState("")
  const [popupSearchResults, setPopupSearchResults] = useState<MemberInfo[]>([])
  const [isPopupSearching, setIsPopupSearching] = useState(false)


  useEffect(() => {
  fetchSchemes()
  getLogindate()
}, [])

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

  const fetchSchemes = async () => {
    try {
      const res = await fetch("/api/deposits/schemes", { credentials: "include" })
      const data = await res.json()
      if (data.success) {
        setSchemes(data.schemes || [])
      }
    } catch {
      console.error("Failed to fetch deposit schemes")
    }
  }

  const fetchSavingsAccounts = async (membershipNo: string) => {
    setIsFetchingSavings(true)
    try {
      const res = await fetch(`/api/savings/by-member?membership_no=${encodeURIComponent(membershipNo)}`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setSavingsAccounts(data.accounts || [])
      } else {
        setSavingsAccounts([])
      }
    } catch {
      setSavingsAccounts([])
    } finally {
      setIsFetchingSavings(false)
    }
  }

  const searchMember = async () => {
    if (!memberSearch.trim()) return
    setIsSearching(true)
    setMemberError("")
    setMemberInfo(null)
    setSavingsAccounts([])

    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: memberSearch.trim() }),
      })

      const data = await res.json()
      if (res.ok && data.member) {
        setMemberInfo(data.member)
        fetchSavingsAccounts(data.member.membership_no)
      } else {
        setMemberError(data.error || "Member not found")
      }
    } catch {
      setMemberError("Failed to search member")
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-load member on blur
  const handleMemberBlur = () => {
    if (memberSearch.trim() && !memberInfo && !isSearching) {
      searchMember()
    }
  }

  const fmt = (n: number) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

  const handleViewMember = async () => {
    if (!memberInfo) return
    setViewMemberOpen(true)
    setViewMemberTab("personal")
    setViewMemberLoading(true)
    setViewMemberError("")
    setViewMemberProfile(null)
    setViewMemberAssets([])
    setViewMemberSummary(null)
    setViewMemberLoans([])

    try {
      const no = memberInfo.membership_no
      const [profileRes, accountsRes, loansRes] = await Promise.all([
        fetch(`/api/members/profile?membership_no=${no}`, { credentials: "include" }),
        fetch(`/api/members/accounts?membership_no=${no}`, { credentials: "include" }),
        fetch(`/api/loans/accounts?membershipNo=${no}`, { credentials: "include" }),
      ])
      const [profileData, accountsData, loansData] = await Promise.all([
        profileRes.json(),
        accountsRes.json(),
        loansRes.json(),
      ])
      if (profileData.found) setViewMemberProfile(profileData.profile)
      if (accountsData.success) {
        setViewMemberAssets(accountsData.assets || [])
        setViewMemberSummary(accountsData.summary)
      }
      if (loansData.accounts) setViewMemberLoans(loansData.accounts)
    } catch {
      setViewMemberError("Failed to load member details. Please try again.")
    } finally {
      setViewMemberLoading(false)
    }
  }

  // Popup advanced search
  const handlePopupSearch = async () => {
    if (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim() && !searchContact.trim()) return

    setIsPopupSearching(true)
    setPopupSearchResults([])

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
          contactNo: searchContact.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPopupSearchResults(data.results || [])
      }
    } catch {
      // silent
    } finally {
      setIsPopupSearching(false)
    }
  }

  const handleSelectMember = (member: MemberInfo) => {
    setMemberInfo(member)
    setMemberSearch(member.membership_no)
    setMemberError("")
    setSearchDialogOpen(false)
    // Reset popup fields
    setSearchMemberNo("")
    setSearchMemberName("")
    setSearchFatherName("")
    setSearchAadhaar("")
    setSearchContact("")
    setPopupSearchResults([])
    // Load savings accounts for the selected member
    fetchSavingsAccounts(member.membership_no)
  }

  const handleSchemeSelect = (schemeId: string) => {
    const scheme = schemes.find((s) => String(s.scheme_id) === schemeId)
    console.log("the scheme",scheme)
    if (scheme) {
      setSelectedScheme(scheme)
      setDepositType(scheme.deposit_type)
      setRateOfInterest(String(scheme.interest_rate))
      setInterestPayoutFrequency(scheme.interest_frequency || "ON_MATURITY")
      setInterestCalcMethod(scheme.interest_calculation_method || "SIMPLE")
      setPrematureClosureAllowed(scheme.premature_closure_allowed ?? true)
      setPrematurePenalRate(String(scheme.premature_penal_rate || 0))
      setTdsApplicable(scheme.tds_applicable ?? false)
      setAutoRenewal(false)
      setRenewalPeriodMonths("")
      setRenewalPeriodDays("")
      setRenewalWithInterest(false)
      // Deposit Period is driven by the scheme's period_unit — clear the field that no longer applies
      setPeriodMonths("")
      setPeriodDays("")
      if (scheme.deposit_type === "R" && scheme.installment_frequency) {
        setInstallmentFrequency(scheme.installment_frequency)
        setRdPenalRate(String(scheme.penal_rate || 0))
      }
    }
  }

  // Resolve the deposit period against the opening date using real calendar month lengths
  // (28/29/30/31 days), rather than assuming every month is 30 days.
  const getPeriodEndInfo = (months: number, days: number) => {
    const base = openingDate ? new Date(openingDate) : new Date()
    const start = new Date(base)
    const end = new Date(base)
    end.setMonth(end.getMonth() + months)
    end.setDate(end.getDate() + days)
    const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return { endDate: end, totalDays }
  }

  // Calculate maturity
  const calculateMaturity = () => {
    const amt = Number(depositAmount) || 0
    const months = Number(periodMonths) || 0
    const days = Number(periodDays) || 0
    const rate = Number(rateOfInterest) || 0

    if (amt <= 0 || rate <= 0 || (months <= 0 && days <= 0)) return null

    const { endDate: matDate, totalDays } = getPeriodEndInfo(months, days)
    const interest = Math.round((amt * rate * totalDays) / (365 * 100))
    const maturity = amt + interest

    return {
      interest: Math.round(interest * 100) / 100,
      // Nearest rounding: round to the nearest whole number (0.50 and above rounds up)
      maturityAmount: Math.round(maturity),
      maturityDate: matDate.toISOString().split("T")[0],
    }
  }
  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  // Breaks the deposit term into payout intervals (per the selected Payout Frequency)
  // and computes the simple-interest amount payable at each interval, using real
  // calendar days per interval rather than a flat 30-day assumption.
  const getInterestPayableSeries = () => {
    const amt = Number(depositAmount) || 0
    const months = Number(periodMonths) || 0
    const days = Number(periodDays) || 0
    const rate = Number(rateOfInterest) || 0

    if (amt <= 0 || rate <= 0 || (months <= 0 && days <= 0)) return []

    const base = openingDate ? new Date(openingDate) : new Date()
    const start = new Date(base)
    const { endDate: end } = getPeriodEndInfo(months, days)

    const stepMonths: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6 }
    const step = stepMonths[interestPayoutFrequency]

    // ON_MATURITY (or an unrecognized value) pays out once, at the end of the term
    const boundaries: Date[] = [new Date(start)]
    if (!step) {
      boundaries.push(new Date(end))
    } else {
      let cursor = new Date(start)
      while (true) {
        const next = new Date(cursor)
        next.setMonth(next.getMonth() + step)
        if (next >= end) {
          boundaries.push(new Date(end))
          break
        }
        boundaries.push(next)
        cursor = next
      }
    }

    return boundaries.slice(1).map((periodEnd, idx) => {
      const periodStart = boundaries[idx]
      const periodDaysCount = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
      const interestPayable = Math.round((amt * rate * periodDaysCount) / (365 * 100))
      return {
        period: `Period ${idx + 1}`,
        date: periodEnd.toISOString().split("T")[0],
        dateLabel: formatDate(periodEnd),
        days: periodDaysCount,
        interestPayable,
      }
    })
  }

  const maturityCalc = depositType === "TERM" ? calculateMaturity() : null
  const interestPayableSeries = depositType === "TERM" && maturityCalc ? getInterestPayableSeries() : []

  // Compute total days for display using actual calendar days in the selected period
  const totalDays = getPeriodEndInfo(Number(periodMonths) || 0, Number(periodDays) || 0).totalDays

  // Deposit Period unit as configured on the selected scheme (defaults to MONTHS when no scheme is selected)
  const periodUnit = selectedScheme?.period_unit || "MONTHS"

  // Payout Frequency options depend on period_unit and, for MONTHS, on the selected term
  const getPayoutFrequencyOptions = (): { value: string; label: string }[] => {
    if (periodUnit === "DAYS") {
      return [{ value: "ON_MATURITY", label: "On Maturity" }]
    }
    const months = Number(periodMonths) || 0
    if (months > 0 && months % 3 === 0) {
      return [
        { value: "HALF_YEARLY", label: "Half Yearly" },
        { value: "QUARTERLY", label: "Quarterly" },
        { value: "MONTHLY", label: "Monthly" },
        { value: "ON_MATURITY", label: "On Maturity" },
      ]
    }
    return [
      { value: "MONTHLY", label: "Monthly" },
      { value: "ON_MATURITY", label: "On Maturity" },
    ]
  }
  const payoutFrequencyOptions = getPayoutFrequencyOptions()

  // Reset the selected Payout Frequency if it is no longer valid for the current period_unit/term
  useEffect(() => {
    const validValues = payoutFrequencyOptions.map((o) => o.value)
    if (!validValues.includes(interestPayoutFrequency)) {
      setInterestPayoutFrequency("ON_MATURITY")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodUnit, periodMonths])

  // Compute maturity date for RD too
  const rdMaturityDate = (() => {
    if (depositType !== "RECURRING") return null
    const months = Number(periodMonths) || 0
    const days = Number(periodDays) || 0
    if (months <= 0 && days <= 0) return null
    const d = new Date(openingDate)
    d.setMonth(d.getMonth() + months)
    d.setDate(d.getDate() + days)
    return d.toISOString().split("TERM")[0]
  })()

  const handleSubmit = async () => {
    if (!memberInfo || !selectedScheme) return
    setIsSubmitting(true)

    try {
      const body: any = {
        membership_no: memberInfo.membership_no,
        scheme_id: selectedScheme.scheme_id,
        deposit_type: depositType,
        deposit_amount: Number(depositAmount) || 0,
        period_months: Number(periodMonths) || 0,
        period_days: Number(periodDays) || 0,
        account_open_date: openingDate,
        rate_of_interest: Number(rateOfInterest) || selectedScheme.interest_rate,
        auto_renewal: autoRenewal,
        renewal_period_months: Number(renewalPeriodMonths) || 0,
        renewal_period_days: Number(renewalPeriodDays) || 0,
        renewal_with_interest: renewalWithInterest,
        interest_payout_frequency: interestPayoutFrequency,
        interest_calc_method: interestCalcMethod,
        premature_penal_rate: Number(prematurePenalRate) || 0,
        tds_applicable: tdsApplicable,
        nominee_name: nomineeFullName,
        nominee_relation: nomineeRelation,
      }

      if (depositType === "RECURRING") {
        body.installment_amount = Number(installmentAmount) || 0
        body.installment_frequency = installmentFrequency
        body.number_of_installments = Number(numberOfInstallments) || 0
        body.penal_rate = Number(rdPenalRate) || 0
      }

      const res = await fetch("/api/deposits/open-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessInfo({
          account_number: data.account_number,
          maturity_date: data.maturity_date,
          maturity_amount: data.maturity_amount,
        })
      } else {
        alert(data.error || "Failed to create deposit account")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const depositTypeLabel = (type: string) => {
    switch (type) {
      case "T": return "Term Deposit (FD)"
      case "R": return "Recurring Deposit (RD)"
      case "P": return "Pigmy Deposit"
      default: return type
    }
  }

  return (
    <DashboardWrapper>
      <div className="">
        <div className="">
          <main className="flex-1 overflow-y-auto bg-background p-2">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/fixed-deposits")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Deposit</h1>
                <p className="text-muted-foreground">Open a new deposit account for a member</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Form */}
              <div className="space-y-6 lg:col-span-2">
                {/* Step 1: Member Search */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="h-5 w-5" />
                      Select Member
                    </CardTitle>
                    <CardDescription>Search by membership number</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Enter membership number..."
                          className="pl-10"
                          value={memberSearch}
                          onChange={(e) => {
                            setMemberSearch(e.target.value)
                            if (memberInfo) {
                              setMemberInfo(null)
                              setMemberError("")
                              setSavingsAccounts([])
                            }
                          }}
                          onBlur={handleMemberBlur}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") searchMember()
                          }}
                        />
                      </div>
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

                    {memberError && (
                      <p className="text-sm text-destructive">{memberError}</p>
                    )}

                    {/* {memberInfo && (
                      <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <p className="font-medium">{memberInfo.full_name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Membership No:</span>
                            <p className="font-mono font-medium">{memberInfo.membership_no}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Father Name:</span>
                            <p className="font-medium">{memberInfo.father_name || "---"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mobile:</span>
                            <p className="font-medium">{memberInfo.mobile_no || "---"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">DOB:</span>
                            <p className="font-medium">{memberInfo.date_of_birth || "---"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <Badge
                              variant={memberInfo.status?.toUpperCase() === "ACTIVE" ? "default" : "secondary"}
                              className={memberInfo.status?.toUpperCase() === "ACTIVE" ? "bg-teal-100 text-teal-700" : ""}
                            >
                              {memberInfo.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )} */}
                  </CardContent>
                </Card>

                {/* Step 2: Select Scheme */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5" />
                      Select Deposit Scheme
                    </CardTitle>
                    <CardDescription>Choose the deposit scheme for this account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Deposit Scheme</Label>
                      <Select onValueChange={handleSchemeSelect} disabled={!memberInfo}>
                        <SelectTrigger>
                          <SelectValue placeholder={!memberInfo ? "Search a member first" : "Select a deposit scheme"} />
                        </SelectTrigger>
                        <SelectContent>
                          {schemes.map((s) => (
                            <SelectItem key={s.scheme_id} value={String(s.scheme_id)}>
                              {s.scheme_name} - {depositTypeLabel(s.deposit_type)}
                              {/* {s.scheme_name} - {depositTypeLabel(s.deposit_type)} ({s.interest_rate}%) */}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* {selectedScheme && (
                      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold">{selectedScheme.scheme_name}</span>
                          <Badge variant="outline">{depositTypeLabel(selectedScheme.deposit_type)}</Badge>
                        </div>
                        {selectedScheme.scheme_description && (
                          <p className="mb-2 text-muted-foreground">{selectedScheme.scheme_description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className="ml-1 font-medium">{selectedScheme.interest_rate}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Min Deposit:</span>
                            <span className="ml-1 font-medium">
                              {Number(selectedScheme.minimum_deposit).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </span>
                          </div>
                          {selectedScheme.maximum_deposit > 0 && (
                            <div>
                              <span className="text-muted-foreground">Max Deposit:</span>
                              <span className="ml-1 font-medium">
                                {Number(selectedScheme.maximum_deposit).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Interest Freq:</span>
                            <span className="ml-1 font-medium">{selectedScheme.interest_frequency}</span>
                          </div>
                        </div>
                      </div>
                    )} */}
                  </CardContent>
                </Card>

                {/* Step 3: Deposit Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      Deposit Details
                    </CardTitle>
                    <CardDescription>Enter the deposit amount, period, and configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Common fields for all deposit types */}
                    <div>
                      {/* <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Details</h4> */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="opening-date">Effective Date</Label>
                          <Input
                            id="opening-date"
                            type="date"
                            value={openingDate}
                            onChange={(e) => setOpeningDate(e.target.value)}
                            disabled
                            // disabled={!selectedScheme}
                          />
                        </div>
                        {/* <div className="space-y-2">
                          <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                          <Input
                            id="interest-rate"
                            type="number"
                            step="0.01"
                            value={rateOfInterest}
                            onChange={(e) => setRateOfInterest(e.target.value)}
                            disabled
                            // disabled={!selectedScheme}
                          />
                        </div> */}
                      </div>
                    </div>

                    {/* ========= TERM DEPOSIT (FD) ========= */}
                    {depositType === "TERM" && (
                      <>
                        {/* Amount */}
                        <div>
                          {/* <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deposit Amount</h4> */}
                          <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 ">
                            <Label htmlFor="deposit-amount">Amount</Label>
                            <Input
                              id="deposit-amount"
                              type="number"
                              placeholder={`Min: ${Number(selectedScheme?.minimum_deposit || 0).toLocaleString("en-IN")} | Max: ${Number(selectedScheme?.maximum_deposit || 0).toLocaleString("en-IN")}`}
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                            />
                            {selectedScheme && (Number(depositAmount) < Number(selectedScheme.minimum_deposit) || (Number(selectedScheme.maximum_deposit) > 0 && Number(depositAmount) > Number(selectedScheme.maximum_deposit))) && depositAmount && (
                              <p className="text-xs text-destructive">
                                Amount must be between {Number(selectedScheme.minimum_deposit).toLocaleString("en-IN")} and {Number(selectedScheme.maximum_deposit).toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>
                          </div>
                        </div>

                        {/* Period */}
                        <div>
                          {/* <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deposit Period</h4> */}
                          <div className="grid grid-cols-2 gap-4">
                            {periodUnit === "DAYS" ? (
                              <div className="space-y-2">
                                <Label htmlFor="period-days">Period (Days)</Label>
                                <Input
                                  id="period-days"
                                  type="number"
                                  placeholder="0"
                                  value={periodDays}
                                  onChange={(e) => setPeriodDays(e.target.value)}
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label htmlFor="period-months">Period (Months)</Label>
                                <Input
                                  id="period-months"
                                  type="number"
                                  placeholder="0"
                                  value={periodMonths}
                                  onChange={(e) => setPeriodMonths(e.target.value)}
                                />
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Total Days</Label>
                              <Input
                                value={totalDays > 0 ? String(totalDays) : ""}
                                readOnly
                                className="bg-muted"
                                placeholder="--"
                              />
                            </div>
                          </div>
                          {selectedScheme && totalDays > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Scheme period: {periodUnit === "DAYS"
                                ? `${selectedScheme.minimum_period_days}d to ${selectedScheme.maximum_period_days}d`
                                : `${selectedScheme.minimum_period_months}m to ${selectedScheme.maximum_period_months}m`}
                            </p>
                          )}
                          {maturityCalc && (
                            <div className="mt-2 flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm dark:border-teal-800 dark:bg-teal-950">
                              <Info className="h-4 w-4 text-teal-600" />
                              <span className="text-teal-700 dark:text-teal-300">
                                Maturity Date: <span className="font-semibold">{formatDate(maturityCalc.maturityDate)}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Interest Configuration */}
                        <div>
                          {/* <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interest Configuration</h4> */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Interest Payout Frequency</Label>
                              <Select
                                value={interestPayoutFrequency}
                                onValueChange={setInterestPayoutFrequency}
                                disabled={payoutFrequencyOptions.length <= 1}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {payoutFrequencyOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {/* <div className="space-y-2">
                              <Label>Calculation Method</Label>
                              <Select value={interestCalcMethod} onValueChange={setInterestCalcMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SIMPLE">Simple Interest</SelectItem>
                                  <SelectItem value="COMPOUND">Compound Interest</SelectItem>
                                  <SelectItem value="DAILY_PRODUCT">Daily Product</SelectItem>
                                </SelectContent>
                              </Select>
                            </div> */}
                          </div>
                        </div>

                        {/* Auto Renewal */}
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Auto Renewal Options
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg border border-border p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label htmlFor="auto-renewal" className="cursor-pointer">Auto Renewal on Maturity</Label>
                                  <p className="text-xs text-muted-foreground">
                                    {selectedScheme?.auto_renewal_allowed ? "Allowed by scheme" : "Not allowed by scheme"}
                                  </p>
                                </div>
                                <Switch
                                  id="auto-renewal"
                                  checked={autoRenewal}
                                  onCheckedChange={setAutoRenewal}
                                  disabled={!selectedScheme?.auto_renewal_allowed}
                                />
                              </div>
                              {autoRenewal && (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="renewal-months">Renewal Period (Months)</Label>
                                      <Input
                                        id="renewal-months"
                                        type="number"
                                        placeholder="Same as original"
                                        value={renewalPeriodMonths}
                                        onChange={(e) => setRenewalPeriodMonths(e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="renewal-days">Renewal Period (Days)</Label>
                                      <Input
                                        id="renewal-days"
                                        type="number"
                                        placeholder="Same as original"
                                        value={renewalPeriodDays}
                                        onChange={(e) => setRenewalPeriodDays(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <Label htmlFor="renewal-interest" className="cursor-pointer">Renew with Interest</Label>
                                      <p className="text-xs text-muted-foreground">Include accrued interest in renewal amount</p>
                                    </div>
                                    <Switch
                                      id="renewal-interest"
                                      checked={renewalWithInterest}
                                      onCheckedChange={setRenewalWithInterest}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="rounded-lg border border-border p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>TDS Applicable</Label>
                                <Switch
                                  checked={tdsApplicable}
                                  onCheckedChange={setTdsApplicable}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {tdsApplicable ? "TDS will be deducted as per applicable rates" : "No TDS deduction"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Premature & TDS */}
                        {/* <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            <Shield className="h-3.5 w-3.5" />
                            Closure & Tax
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg border border-border p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Premature Closure</Label>
                                <Badge variant={prematureClosureAllowed ? "default" : "secondary"}
                                  className={prematureClosureAllowed ? "bg-teal-100 text-teal-700" : ""}>
                                  {prematureClosureAllowed ? "Allowed" : "Not Allowed"}
                                </Badge>
                              </div>
                              {prematureClosureAllowed && (
                                <div className="space-y-1">
                                  <Label htmlFor="penal-rate" className="text-xs">Penal Rate (%)</Label>
                                  <Input
                                    id="penal-rate"
                                    type="number"
                                    step="0.01"
                                    value={prematurePenalRate}
                                    onChange={(e) => setPrematurePenalRate(e.target.value)}
                                    className="h-8"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div> */}

                        {/* Nominee */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nominee Details (Optional)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nominee-name">Nominee Name</Label>
                              <Input
                                id="nominee-name"
                                placeholder="Enter nominee full name"
                                value={nomineeFullName}
                                onChange={(e) => setNomineeFullName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nominee-relation">Relationship</Label>
                              <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                                <SelectTrigger id="nominee-relation">
                                  <SelectValue placeholder="Select relation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SPOUSE">Spouse</SelectItem>
                                  <SelectItem value="SON">Son</SelectItem>
                                  <SelectItem value="DAUGHTER">Daughter</SelectItem>
                                  <SelectItem value="FATHER">Father</SelectItem>
                                  <SelectItem value="MOTHER">Mother</SelectItem>
                                  <SelectItem value="BROTHER">Brother</SelectItem>
                                  <SelectItem value="SISTER">Sister</SelectItem>
                                  <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ========= RECURRING DEPOSIT (RD) ========= */}
                    {depositType === "RECURRING" && (
                      <>
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Installment Details</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="installment-amount">Installment Amount</Label>
                              <Input
                                id="installment-amount"
                                type="number"
                                placeholder={`Min: ${Number(selectedScheme?.minimum_installment_amount || 0).toLocaleString("en-IN")}`}
                                value={installmentAmount}
                                onChange={(e) => setInstallmentAmount(e.target.value)}
                              />
                              {selectedScheme && installmentAmount && (Number(installmentAmount) < Number(selectedScheme.minimum_installment_amount) || (Number(selectedScheme.maximum_installment_amount) > 0 && Number(installmentAmount) > Number(selectedScheme.maximum_installment_amount))) && (
                                <p className="text-xs text-destructive">
                                  Amount must be between {Number(selectedScheme.minimum_installment_amount).toLocaleString("en-IN")} and {Number(selectedScheme.maximum_installment_amount).toLocaleString("en-IN")}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="installment-freq">Frequency</Label>
                              <Select value={installmentFrequency} onValueChange={setInstallmentFrequency}>
                                <SelectTrigger id="installment-freq">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Period & Schedule</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="num-installments">Number of Installments</Label>
                              <Input
                                id="num-installments"
                                type="number"
                                placeholder="Enter number"
                                value={numberOfInstallments}
                                onChange={(e) => setNumberOfInstallments(e.target.value)}
                              />
                            </div>
                            {periodUnit === "DAYS" ? (
                              <div className="space-y-2">
                                <Label htmlFor="period-days-rd">Period (Days)</Label>
                                <Input
                                  id="period-days-rd"
                                  type="number"
                                  placeholder="0"
                                  value={periodDays}
                                  onChange={(e) => setPeriodDays(e.target.value)}
                                />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label htmlFor="period-months-rd">Period (Months)</Label>
                                <Input
                                  id="period-months-rd"
                                  type="number"
                                  placeholder="0"
                                  value={periodMonths}
                                  onChange={(e) => setPeriodMonths(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Total Days</Label>
                              <Input
                                value={totalDays > 0 ? String(totalDays) : ""}
                                readOnly
                                className="bg-muted"
                                placeholder="--"
                              />
                            </div>
                          </div>
                          {rdMaturityDate && (
                            <div className="mt-2 flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm dark:border-teal-800 dark:bg-teal-950">
                              <Info className="h-4 w-4 text-teal-600" />
                              <span className="text-teal-700 dark:text-teal-300">
                                Maturity Date: <span className="font-semibold">{rdMaturityDate}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Interest & Penalties */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interest & Penalties</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Interest Payout</Label>
                              <Select
                                value={interestPayoutFrequency}
                                onValueChange={setInterestPayoutFrequency}
                                disabled={payoutFrequencyOptions.length <= 1}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {payoutFrequencyOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="rd-penal-rate">Delayed Installment Penal Rate (%)</Label>
                              <Input
                                id="rd-penal-rate"
                                type="number"
                                step="0.01"
                                value={rdPenalRate}
                                onChange={(e) => setRdPenalRate(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Nominee for RD */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nominee Details (Optional)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nominee-name-rd">Nominee Name</Label>
                              <Input
                                id="nominee-name-rd"
                                placeholder="Enter nominee full name"
                                value={nomineeFullName}
                                onChange={(e) => setNomineeFullName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nominee-relation-rd">Relationship</Label>
                              <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                                <SelectTrigger id="nominee-relation-rd">
                                  <SelectValue placeholder="Select relation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SPOUSE">Spouse</SelectItem>
                                  <SelectItem value="SON">Son</SelectItem>
                                  <SelectItem value="DAUGHTER">Daughter</SelectItem>
                                  <SelectItem value="FATHER">Father</SelectItem>
                                  <SelectItem value="MOTHER">Mother</SelectItem>
                                  <SelectItem value="BROTHER">Brother</SelectItem>
                                  <SelectItem value="SISTER">Sister</SelectItem>
                                  <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* ========= PIGMY DEPOSIT ========= */}
                    {depositType === "PIGMY" && (
                      <>
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Collection Details</h4>
                          <div className="space-y-2">
                            <Label htmlFor="daily-amount">Minimum Daily Collection Amount</Label>
                            <Input
                              id="daily-amount"
                              type="number"
                              placeholder="Enter minimum daily amount"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nominee Details (Optional)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="nominee-name-p">Nominee Name</Label>
                              <Input
                                id="nominee-name-p"
                                placeholder="Enter nominee full name"
                                value={nomineeFullName}
                                onChange={(e) => setNomineeFullName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="nominee-relation-p">Relationship</Label>
                              <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                                <SelectTrigger id="nominee-relation-p">
                                  <SelectValue placeholder="Select relation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SPOUSE">Spouse</SelectItem>
                                  <SelectItem value="SON">Son</SelectItem>
                                  <SelectItem value="DAUGHTER">Daughter</SelectItem>
                                  <SelectItem value="FATHER">Father</SelectItem>
                                  <SelectItem value="MOTHER">Mother</SelectItem>
                                  <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {!selectedScheme && (
                      <p className="text-center text-sm text-muted-foreground">Select a scheme above to enter deposit details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push("/fixed-deposits")}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!memberInfo || !selectedScheme || isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Creating..." : "Create Deposit Account"}
                  </Button>
                </div>
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-6">

                {/* Member Summary */}
                <Card>
                  <CardHeader className="">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">Member Summary</CardTitle>
                      </div>
                      {memberInfo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewMember}
                          className="h-7 gap-1.5 text-xs bg-transparent"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Member Details
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {memberInfo ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 space-y-3">
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
                          <div>
                            <p className="text-xs text-muted-foreground">Father's Name</p>
                            <p className="text-sm font-semibold">{memberInfo.father_name || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Aadhaar Number</p>
                            <p className="text-sm font-mono font-semibold">{memberInfo.aadhaar_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone Number</p>
                            <p className="text-sm font-semibold">{memberInfo.mobile_no || "---"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ledger Number</p>
                            <p className="text-sm font-mono font-semibold">{memberInfo.ledger_folio_number || "---"}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-4 sm:flex-col sm:items-end">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                              <Camera className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">Photo</span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30">
                              <PenTool className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">Signature</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Search a member to see details</p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Info */}
                {/* <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deposit Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-lg border border-border p-3">
                      <p className="font-medium">Term Deposit (FD)</p>
                      <p className="text-muted-foreground">Lump sum deposit for a fixed period with guaranteed returns.</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="font-medium">Recurring Deposit (RD)</p>
                      <p className="text-muted-foreground">Regular monthly installments for a fixed period.</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="font-medium">Pigmy Deposit</p>
                      <p className="text-muted-foreground">Daily collection based deposit scheme.</p>
                    </div>
                  </CardContent>
                </Card> */}
                {selectedScheme && (
                  <Card>
                    <CardHeader className="">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Wallet className="h-5 w-5" />
                        {selectedScheme.scheme_name}
                      </CardTitle>
                      <CardDescription>
                        ({depositTypeLabel(selectedScheme.deposit_type)})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
                        {/* <div className="mb-2 flex items-center justify-between">
                          <span className="font-semibold">{selectedScheme.scheme_name}</span>
                          <Badge variant="outline">{depositTypeLabel(selectedScheme.deposit_type)}</Badge>
                        </div> */}
                        {selectedScheme.scheme_description && (
                          <p className="mb-2 text-muted-foreground">{selectedScheme.scheme_description}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className="ml-1 font-medium">{selectedScheme.interest_rate}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Min Deposit:</span>
                            <span className="ml-1 font-medium">
                              {Number(selectedScheme.minimum_deposit).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </span>
                          </div>
                          {selectedScheme.maximum_deposit > 0 && (
                            <div>
                              <span className="text-muted-foreground">Max Deposit:</span>
                              <span className="ml-1 font-medium">
                                {Number(selectedScheme.maximum_deposit).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Interest Freq:</span>
                            <span className="ml-1 font-medium">{selectedScheme.interest_frequency}</span>
                          </div>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                    )
                    }
                

                {memberInfo && (
                  <Card>
                    <CardHeader className="">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Wallet className="h-5 w-5" />
                        Savings Accounts
                      </CardTitle>
                      <CardDescription>
                        {memberInfo.full_name} ({memberInfo.membership_no})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                      {isFetchingSavings && (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
                        </div>
                      )}

                      {!isFetchingSavings && savingsAccounts.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center">
                          <Wallet className="mx-auto h-8 w-8 text-muted-foreground/50" />
                          <p className="mt-2 text-sm text-muted-foreground">No savings accounts found</p>
                        </div>
                      )}

                      {!isFetchingSavings && savingsAccounts.length > 0 && (
                        <>
                          {/* Total Balance Summary */}
                          <div className="rounded-lg bg-muted/50 border border-border p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Balance</span>
                              <span className="text-sm font-semibold text-teal-600">
                                {savingsAccounts
                                  .filter((a) => a.account_status === "ACTIVE")
                                  .reduce((sum, a) => sum + (Number(a.available_balance) || 0), 0)
                                  .toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {savingsAccounts.filter((a) => a.account_status === "ACTIVE").length} active account(s)
                            </p>
                          </div>

                          {/* Individual Accounts */}
                          {savingsAccounts.map((acc) => (
                            <div
                              key={acc.account_number}
                              className="rounded-lg border border-border p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-muted-foreground">{acc.account_number}</span>
                                <Badge
                                  variant={acc.account_status === "ACTIVE" ? "default" : "secondary"}
                                  className={acc.account_status === "ACTIVE" ? "bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0" : "text-[10px] px-1.5 py-0"}
                                >
                                  {acc.account_status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{acc.scheme_name}</p>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted-foreground">Balance</span>
                                <span className="text-sm font-semibold text-foreground">
                                  {Number(acc.available_balance || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Maturity Calculator (Term Deposit only) */}
                {(depositType === "TERM" || depositType === "RECURRING") && (
                  
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <TrendingUp className="h-5 w-5" />
                          {depositType === "TERM" ? "Maturity Calculation" : "RD Summary"}
                        </CardTitle>
                        {depositType === "TERM" && maturityCalc && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInterestChartOpen(true)}
                            className="h-7 gap-1.5 text-xs bg-transparent"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Interest Payable Chart
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {depositType === "TERM" && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deposit Amount:</span>
                            <span className="font-medium">
                              {Number(depositAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className="font-medium">{rateOfInterest || 0}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Period:</span>
                            <span className="font-medium">
                              {periodMonths || 0}m {periodDays || 0}d ({totalDays} days)
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Calc Method:</span>
                            <span className="font-medium">{interestCalcMethod}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Interest Payout:</span>
                            <span className="font-medium">{interestPayoutFrequency.replace("_", " ")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Auto Renewal:</span>
                            <Badge variant={autoRenewal ? "default" : "secondary"} className={autoRenewal ? "bg-teal-100 text-teal-700" : ""}>
                              {autoRenewal ? "Yes" : "No"}
                            </Badge>
                          </div>
                          {maturityCalc && (
                            <>
                              <div className="border-t border-border pt-3">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Interest Earned:</span>
                                  <span className="font-semibold text-teal-600">
                                    {maturityCalc.interest.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Maturity Date:</span>
                                <span className="font-medium">{maturityCalc.maturityDate}</span>
                              </div>
                              <div className="flex justify-between border-t border-border pt-3">
                                <span className="font-semibold">Maturity Amount:</span>
                                <span className="text-lg font-bold text-teal-600">
                                  {maturityCalc.maturityAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </span>
                              </div>
                            </>
                          )}
                          {!maturityCalc && (
                            <p className="text-center text-xs text-muted-foreground">
                              Enter amount and period to see calculation
                            </p>
                          )}
                        </>
                      )}
                      {depositType === "RECURRING" && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Installment:</span>
                            <span className="font-medium">
                              {Number(installmentAmount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frequency:</span>
                            <span className="font-medium">{installmentFrequency}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Installments:</span>
                            <span className="font-medium">{numberOfInstallments || "--"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Period:</span>
                            <span className="font-medium">
                              {periodMonths || 0}m {periodDays || 0}d ({totalDays} days)
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className="font-medium">{rateOfInterest || 0}%</span>
                          </div>
                          {rdMaturityDate && (
                            <div className="flex justify-between border-t border-border pt-3 text-sm">
                              <span className="text-muted-foreground">Maturity Date:</span>
                              <span className="font-semibold text-teal-600">{rdMaturityDate}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Interest Payable Chart Dialog */}
            <Dialog open={interestChartOpen} onOpenChange={setInterestChartOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-teal-700 text-lg">
                    <BarChart3 className="h-5 w-5" />
                    Interest Payable Chart
                  </DialogTitle>
                  <DialogDescription>
                    {interestPayableSeries.length > 1
                      ? `Interest payable at each ${interestPayoutFrequency.replace("_", " ").toLowerCase()} payout across the deposit term.`
                      : "Interest is paid out once, in full, at maturity."}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2">
                  {interestPayableSeries.length > 1 ? (
                    <>
                      {/* <ChartContainer
                        config={{
                          interestPayable: {
                            label: "Interest Payable",
                            color: "hsl(var(--chart-2))",
                          },
                        }}
                        className="h-[280px] w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={interestPayableSeries} margin={{ left: 8, right: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                            <XAxis
                              dataKey="dateLabel"
                              className="text-xs text-muted-foreground"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              className="text-xs text-muted-foreground"
                              tickLine={false}
                              axisLine={false}
                              width={64}
                              tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  labelFormatter={(label) => `Payout on ${label}`}
                                  formatter={(value) => [
                                    Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR" }),
                                    "Interest Payable",
                                  ]}
                                />
                              }
                            />
                            <Bar dataKey="interestPayable" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer> */}

                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-xs">Payout Period</TableHead>
                              <TableHead className="text-xs">Payout Date</TableHead>
                              <TableHead className="text-xs text-right">Days</TableHead>
                              <TableHead className="text-xs text-right">Interest Payable</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {interestPayableSeries.map((p) => (
                              <TableRow key={p.period}>
                                <TableCell className="text-xs">{p.period}</TableCell>
                                <TableCell className="text-xs">{p.dateLabel}</TableCell>
                                <TableCell className="text-xs text-right">{p.days}</TableCell>
                                <TableCell className="text-xs text-right font-semibold text-teal-600">
                                  {p.interestPayable.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={3} className="text-xs font-semibold">Total Interest Payable</TableCell>
                              <TableCell className="text-xs text-right font-bold text-teal-600">
                                {interestPayableSeries
                                  .reduce((sum, p) => sum + p.interestPayable, 0)
                                  .toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                              </TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    </>
                  ) : interestPayableSeries.length === 1 ? (
                    <div className="rounded-lg border border-teal-200 bg-teal-50 p-6 text-center dark:border-teal-800 dark:bg-teal-950">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Interest Payable at Maturity
                      </p>
                      <p className="mt-2 text-3xl font-bold text-teal-600">
                        {interestPayableSeries[0].interestPayable.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Payable on {interestPayableSeries[0].dateLabel}
                      </p>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Enter deposit amount, interest rate, and period to see the interest payable chart.
                    </p>
                  )}
                </div>

                <div className="flex justify-end border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => setInterestChartOpen(false)} className="bg-transparent">
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Member Profile Modal */}
            <Dialog open={viewMemberOpen} onOpenChange={setViewMemberOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                {/* Fixed header */}
                <div className="px-6 pt-6 pb-4 border-b shrink-0">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-teal-700 text-lg">
                      <User className="h-5 w-5" />
                      Member Profile
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {memberInfo?.membership_no}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm">{memberInfo?.full_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            memberInfo?.status === "ACTIVE"
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-red-300 bg-red-50 text-red-700"
                          }
                        >
                          {memberInfo?.status}
                        </Badge>
                        {memberInfo?.member_type && (
                          <Badge variant="outline" className="border-teal-300 text-teal-700">
                            {memberInfo.member_type}
                          </Badge>
                        )}
                        {memberInfo?.membership_class && (
                          <Badge variant="secondary">{memberInfo.membership_class}</Badge>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Loading / error */}
                {viewMemberLoading && (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
                    <span className="ml-3 text-sm text-muted-foreground">Loading member details…</span>
                  </div>
                )}
                {viewMemberError && !viewMemberLoading && (
                  <div className="flex flex-1 items-center justify-center py-16">
                    <p className="text-sm text-red-500">{viewMemberError}</p>
                  </div>
                )}

                {/* Tabbed content */}
                {!viewMemberLoading && !viewMemberError && (
                  <Tabs value={viewMemberTab} onValueChange={setViewMemberTab} className="flex flex-col flex-1 min-h-0">
                    <TabsList className="mx-6 mt-3 shrink-0 grid grid-cols-4 w-auto">
                      <TabsTrigger value="personal" className="gap-1.5 text-xs">
                        <User className="h-3.5 w-3.5" />Personal
                      </TabsTrigger>
                      <TabsTrigger value="address" className="gap-1.5 text-xs">
                        <MapPin className="h-3.5 w-3.5" />Address & KYC
                      </TabsTrigger>
                      <TabsTrigger value="assets" className="gap-1.5 text-xs">
                        <TrendingUp className="h-3.5 w-3.5" />Assets
                      </TabsTrigger>
                      <TabsTrigger value="liabilities" className="gap-1.5 text-xs">
                        <TrendingDown className="h-3.5 w-3.5" />Liabilities
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Personal ─────────────────────────────────────── */}
                    <TabsContent value="personal" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {viewMemberProfile ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Personal Information</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Full Name",       viewMemberProfile.full_name],
                                ["Father Name",     viewMemberProfile.father_name || "---"],
                                ["Date of Birth",   viewMemberProfile.date_of_birth || "---"],
                                ["Gender",          viewMemberProfile.gender ? viewMemberProfile.gender.charAt(0).toUpperCase() + viewMemberProfile.gender.slice(1) : "---"],
                                ["Mobile",          viewMemberProfile.mobile_no || "---"],
                                ["Email",           viewMemberProfile.customer_email || "---"],
                                ["Marital Status",  viewMemberProfile.marital_status || "---"],
                                ["Spouse Name",     viewMemberProfile.spouse_name || "---"],
                                ["Occupation",      viewMemberProfile.occupation || "---"],
                                ["Customer Type",   viewMemberProfile.customer_type || "---"],
                                ["Customer Code",   viewMemberProfile.customer_code?.trim() || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium break-all">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Membership Information</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Membership No",          viewMemberProfile.membership_no],
                                ["Member Type",            viewMemberProfile.member_type || "---"],
                                ["Membership Class",       viewMemberProfile.membership_class || "---"],
                                ["Status",                 viewMemberProfile.status || "---"],
                                ["Join Date",              viewMemberProfile.join_date || "---"],
                                ["Ledger Folio No",        viewMemberProfile.ledger_folio_number || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No personal data available.</p>
                      )}
                    </TabsContent>

                    {/* ── Address & KYC ────────────────────────────────── */}
                    <TabsContent value="address" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                      {viewMemberProfile ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Current Address</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["House No",    viewMemberProfile.house_no || "---"],
                                ["Street",      viewMemberProfile.street || "---"],
                                ["Village",     viewMemberProfile.village || "---"],
                                ["Taluk",       viewMemberProfile.thaluk || "---"],
                                ["District",    viewMemberProfile.district || "---"],
                                ["State",       viewMemberProfile.state || "---"],
                                ["Pincode",     viewMemberProfile.pincode || "---"],
                                ["Phone",       viewMemberProfile.address_phone || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />KYC Documents
                            </p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                              {[
                                ["Aadhaar No",         viewMemberProfile.aadhaar_no || "---"],
                                ["PAN No",             viewMemberProfile.pan_no || "---"],
                                ["Ration No",          viewMemberProfile.ration_no || "---"],
                                ["Driving License",    viewMemberProfile.driving_license_no || "---"],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-0.5 text-sm font-medium font-mono">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No address data available.</p>
                      )}
                    </TabsContent>

                    {/* ── Assets ───────────────────────────────────────── */}
                    <TabsContent value="assets" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {viewMemberSummary && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Total Assets",      value: fmt(viewMemberSummary.total_assets),      color: "text-teal-700 bg-teal-50 border-teal-200" },
                            { label: "Total Accounts",    value: String(viewMemberAssets.length),          color: "text-blue-700 bg-blue-50 border-blue-200" },
                            { label: "Net Worth",         value: fmt(viewMemberSummary.net_worth),         color: "text-green-700 bg-green-50 border-green-200" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                              <p className="text-xs opacity-70">{label}</p>
                              <p className="text-base font-bold mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {viewMemberAssets.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Account No</TableHead>
                                <TableHead className="text-xs">Scheme</TableHead>
                                <TableHead className="text-xs">Rate</TableHead>
                                <TableHead className="text-xs text-right">Balance</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewMemberAssets.map((a, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-xs">
                                    <Badge variant="secondary" className="text-xs font-normal">{a.account_type}</Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{a.account_number}</TableCell>
                                  <TableCell className="text-xs">{a.scheme_name}</TableCell>
                                  <TableCell className="text-xs">{a.interest_rate ? `${a.interest_rate}%` : "---"}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{fmt(a.balance)}</TableCell>
                                  <TableCell className="text-xs">
                                    <span className={`font-medium ${a.status === "ACTIVE" ? "text-green-600" : "text-muted-foreground"}`}>
                                      {a.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                          <TrendingUp className="h-8 w-8 opacity-20 mb-2" />
                          <p className="text-sm">No assets found for this member.</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* ── Liabilities ──────────────────────────────────── */}
                    <TabsContent value="liabilities" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {viewMemberLoans.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            {(() => {
                              const activeLoans = viewMemberLoans.filter(l => l.application_status === "ACTIVE")
                              const totalOutstanding = viewMemberLoans.reduce((s, l) => s + Number(l.outstanding_balance || 0), 0)
                              const totalOverdue = viewMemberLoans.reduce((s, l) => s + Number(l.overdue_installments || 0), 0)
                              return [
                                { label: "Active Loans",       value: String(activeLoans.length),  color: "text-orange-700 bg-orange-50 border-orange-200" },
                                { label: "Total Outstanding",  value: fmt(totalOutstanding),        color: "text-red-700 bg-red-50 border-red-200" },
                                { label: "Overdue EMIs",       value: String(totalOverdue),         color: totalOverdue > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-green-700 bg-green-50 border-green-200" },
                              ].map(({ label, value, color }) => (
                                <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                                  <p className="text-xs opacity-70">{label}</p>
                                  <p className="text-base font-bold mt-0.5">{value}</p>
                                </div>
                              ))
                            })()}
                          </div>

                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-xs">Loan Scheme</TableHead>
                                  <TableHead className="text-xs text-right">Sanctioned</TableHead>
                                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                                  <TableHead className="text-xs text-right">EMI</TableHead>
                                  <TableHead className="text-xs">EMIs Paid</TableHead>
                                  <TableHead className="text-xs">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {viewMemberLoans.map((loan, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs">
                                      <p className="font-medium">{loan.scheme_name}</p>
                                      {loan.sanction_date && <p className="text-muted-foreground text-xs">{loan.sanction_date}</p>}
                                    </TableCell>
                                    <TableCell className="text-xs text-right">{fmt(loan.sanctioned_amount)}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold text-red-600">{fmt(loan.outstanding_balance)}</TableCell>
                                    <TableCell className="text-xs text-right">{fmt(loan.emi_amount)}</TableCell>
                                    <TableCell className="text-xs">
                                      {loan.paid_installments}/{loan.total_installments}
                                      {Number(loan.overdue_installments) > 0 && (
                                        <span className="ml-1 text-red-500">({loan.overdue_installments} overdue)</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <span className={`font-medium ${loan.application_status === "ACTIVE" ? "text-green-600" : loan.application_status === "OVERDUE" ? "text-red-600" : "text-muted-foreground"}`}>
                                        {loan.application_status}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                          <TrendingDown className="h-8 w-8 opacity-20 mb-2" />
                          <p className="text-sm">No loan accounts found for this member.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* Footer */}
                {!viewMemberLoading && (
                  <div className="px-6 py-3 border-t shrink-0 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewMemberOpen(false)} className="bg-transparent">
                      Close
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

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

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fd-search-member-no" className="text-xs">Member Number</Label>
                    <Input id="fd-search-member-no" placeholder="Enter member number" value={searchMemberNo} onChange={(e) => setSearchMemberNo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fd-search-member-name" className="text-xs">Member Name</Label>
                    <Input id="fd-search-member-name" placeholder="Enter member name" value={searchMemberName} onChange={(e) => setSearchMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fd-search-father-name" className="text-xs">Father{"'"}s Name</Label>
                    <Input id="fd-search-father-name" placeholder="Enter father's name" value={searchFatherName} onChange={(e) => setSearchFatherName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fd-search-aadhaar" className="text-xs">Aadhaar Number</Label>
                    <Input id="fd-search-aadhaar" placeholder="Enter Aadhaar number" value={searchAadhaar} onChange={(e) => setSearchAadhaar(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="fd-search-contact" className="text-xs">Contact No</Label>
                    <Input id="fd-search-contact" placeholder="Enter contact number" value={searchContact} onChange={(e) => setSearchContact(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePopupSearch()} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => { setSearchMemberNo(""); setSearchMemberName(""); setSearchFatherName(""); setSearchAadhaar(""); setSearchContact(""); setPopupSearchResults([]) }} className="gap-1.5 bg-transparent text-xs">
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                  <Button size="sm" onClick={handlePopupSearch} disabled={isPopupSearching || (!searchMemberNo.trim() && !searchMemberName.trim() && !searchFatherName.trim() && !searchAadhaar.trim() && !searchContact.trim())} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                    {isPopupSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    Search
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg min-h-0">
                  {isPopupSearching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching members...</span>
                    </div>
                  ) : popupSearchResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Member No</TableHead>
                          <TableHead className="text-xs">Full Name</TableHead>
                          <TableHead className="text-xs">Father Name</TableHead>
                          <TableHead className="text-xs">Aadhaar</TableHead>
                          <TableHead className="text-xs">Mobile</TableHead>
                          {/* <TableHead className="text-xs w-20">Action</TableHead> */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {popupSearchResults.map((member) => (
                          <TableRow key={member.membership_no} className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20" onClick={() => handleSelectMember(member)}>
                            <TableCell className="font-mono text-xs font-medium">{member.membership_no}</TableCell>
                            <TableCell className="text-xs font-medium">{member.full_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{member.father_name || "---"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{member.aadhaar_no || "---"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{member.mobile_no || "---"}</TableCell>
                            {/* <TableCell>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={(e) => { e.stopPropagation(); handleSelectMember(member) }}>
                                Select
                              </Button>
                            </TableCell> */}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchMemberNo || searchMemberName || searchFatherName || searchAadhaar || searchContact
                          ? "No members found. Try different search criteria."
                          : "Enter search criteria and click Search to find members."}
                      </p>
                    </div>
                  )}
                </div>

                {popupSearchResults.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {popupSearchResults.length} result{popupSearchResults.length !== 1 ? "s" : ""} found
                  </p>
                )}
              </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <AlertDialog open={!!successInfo}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                    <CheckCircle2 className="h-6 w-6" />
                    Deposit Account Created
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 pt-2">
                      <p>The deposit account has been successfully created.</p>
                      <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account Number:</span>
                          <span className="font-mono font-semibold text-foreground">{successInfo?.account_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Member:</span>
                          <span className="font-medium text-foreground">{memberInfo?.full_name}</span>
                        </div>
                        {successInfo?.maturity_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Maturity Date:</span>
                            <span className="font-medium text-foreground">{successInfo.maturity_date}</span>
                          </div>
                        )}
                        {successInfo?.maturity_amount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Maturity Amount:</span>
                            <span className="font-semibold text-teal-600">
                              {Number(successInfo.maturity_amount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
  <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
  <AlertDialogAction
    onClick={() => router.push("/fixed-deposits")}
    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
  >
    Back to Deposits
  </AlertDialogAction>
  <AlertDialogAction
    onClick={() => router.push(`/fixed-deposits/transactions?account=${successInfo?.account_number}`)}
    className="bg-teal-600 text-white hover:bg-teal-700"
  >
    Go to Transactions
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
