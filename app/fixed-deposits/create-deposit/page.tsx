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
import { ArrowLeft, Search, Loader2, CheckCircle2, User, Banknote, Calendar, TrendingUp, Shield, RefreshCw, Info } from "lucide-react"
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
  deposit_type: string
  minimum_deposit: number
  maximum_deposit: number
  minimum_period_months: number
  maximum_period_months: number
  minimum_period_days: number
  maximum_period_days: number
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

export default function CreateDepositPage() {
  const router = useRouter()

  const [memberSearch, setMemberSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null)
  const [memberError, setMemberError] = useState("")

  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)

  const [depositType, setDepositType] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [periodMonths, setPeriodMonths] = useState("")
  const [periodDays, setPeriodDays] = useState("")
  const [rateOfInterest, setRateOfInterest] = useState("")
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0])
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

  useEffect(() => {
    fetchSchemes()
  }, [])

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

  const searchMember = async () => {
    if (!memberSearch.trim()) return
    setIsSearching(true)
    setMemberError("")
    setMemberInfo(null)

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
      } else {
        setMemberError(data.error || "Member not found")
      }
    } catch {
      setMemberError("Failed to search member")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSchemeSelect = (schemeId: string) => {
    const scheme = schemes.find((s) => String(s.scheme_id) === schemeId)
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
      if (scheme.deposit_type === "R" && scheme.installment_frequency) {
        setInstallmentFrequency(scheme.installment_frequency)
        setRdPenalRate(String(scheme.penal_rate || 0))
      }
    }
  }

  // Calculate maturity
  const calculateMaturity = () => {
    const amt = Number(depositAmount) || 0
    const months = Number(periodMonths) || 0
    const days = Number(periodDays) || 0
    const rate = Number(rateOfInterest) || 0

    if (amt <= 0 || rate <= 0 || (months <= 0 && days <= 0)) return null

    const totalDays = months * 30 + days
    const interest = (amt * rate * totalDays) / (365 * 100)
    const maturity = amt + interest

    const matDate = new Date(openingDate)
    matDate.setMonth(matDate.getMonth() + months)
    matDate.setDate(matDate.getDate() + days)

    return {
      interest: Math.round(interest * 100) / 100,
      maturityAmount: Math.round(maturity * 100) / 100,
      maturityDate: matDate.toISOString().split("T")[0],
    }
  }

  const maturityCalc = depositType === "T" ? calculateMaturity() : null

  // Compute total days for display
  const totalDays = (Number(periodMonths) || 0) * 30 + (Number(periodDays) || 0)

  // Compute maturity date for RD too
  const rdMaturityDate = (() => {
    if (depositType !== "R") return null
    const months = Number(periodMonths) || 0
    const days = Number(periodDays) || 0
    if (months <= 0 && days <= 0) return null
    const d = new Date(openingDate)
    d.setMonth(d.getMonth() + months)
    d.setDate(d.getDate() + days)
    return d.toISOString().split("T")[0]
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

      if (depositType === "R") {
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
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
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
                      Step 1: Select Member
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
                          onChange={(e) => setMemberSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") searchMember()
                          }}
                        />
                      </div>
                      <Button onClick={searchMember} disabled={isSearching || !memberSearch.trim()}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                      </Button>
                    </div>

                    {memberError && (
                      <p className="text-sm text-destructive">{memberError}</p>
                    )}

                    {memberInfo && (
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
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Select Scheme */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Banknote className="h-5 w-5" />
                      Step 2: Select Deposit Scheme
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
                              {s.scheme_name} - {depositTypeLabel(s.deposit_type)} ({s.interest_rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedScheme && (
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
                    )}
                  </CardContent>
                </Card>

                {/* Step 3: Deposit Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      Step 3: Deposit Details
                    </CardTitle>
                    <CardDescription>Enter the deposit amount, period, and configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Common fields for all deposit types */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="opening-date">Opening Date</Label>
                          <Input
                            id="opening-date"
                            type="date"
                            value={openingDate}
                            onChange={(e) => setOpeningDate(e.target.value)}
                            disabled={!selectedScheme}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                          <Input
                            id="interest-rate"
                            type="number"
                            step="0.01"
                            value={rateOfInterest}
                            onChange={(e) => setRateOfInterest(e.target.value)}
                            disabled={!selectedScheme}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ========= TERM DEPOSIT (FD) ========= */}
                    {depositType === "T" && (
                      <>
                        {/* Amount */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deposit Amount</h4>
                          <div className="space-y-2">
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

                        {/* Period */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Deposit Period</h4>
                          <div className="grid grid-cols-3 gap-4">
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
                              Scheme period: {selectedScheme.minimum_period_months}m {selectedScheme.minimum_period_days}d to {selectedScheme.maximum_period_months}m {selectedScheme.maximum_period_days}d
                            </p>
                          )}
                          {maturityCalc && (
                            <div className="mt-2 flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm dark:border-teal-800 dark:bg-teal-950">
                              <Info className="h-4 w-4 text-teal-600" />
                              <span className="text-teal-700 dark:text-teal-300">
                                Maturity Date: <span className="font-semibold">{maturityCalc.maturityDate}</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Interest Configuration */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interest Configuration</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Interest Payout Frequency</Label>
                              <Select value={interestPayoutFrequency} onValueChange={setInterestPayoutFrequency}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                  <SelectItem value="ON_MATURITY">On Maturity</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
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
                            </div>
                          </div>
                        </div>

                        {/* Auto Renewal */}
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Auto Renewal Options
                          </h4>
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
                        </div>

                        {/* Premature & TDS */}
                        <div>
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
                    {depositType === "R" && (
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
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4">
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
                              <Select value={interestPayoutFrequency} onValueChange={setInterestPayoutFrequency}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                  <SelectItem value="ON_MATURITY">On Maturity</SelectItem>
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
                    {depositType === "P" && (
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
                {/* Maturity Calculator (Term Deposit only) */}
                {(depositType === "T" || depositType === "R") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5" />
                        {depositType === "T" ? "Maturity Calculation" : "RD Summary"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {depositType === "T" && (
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
                      {depositType === "R" && (
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

                {/* Quick Info */}
                <Card>
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
                </Card>
              </div>
            </div>

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
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => router.push("/fixed-deposits")}>
                    Back to Deposits
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
