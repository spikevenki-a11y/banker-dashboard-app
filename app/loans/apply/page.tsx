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
import {
  ArrowLeft, Search, Loader2, CheckCircle2, Calculator,
  FileText, Users, IndianRupee, Clock, ChevronRight,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

// ── Types ────────────────────────────────────────────────────────────────────

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

type MemberDepositAccount = {
  accountNumber: string
  depositType: string        // T | R | P
  depositTypeLabel: string   // FD | RD | Pigmy
  depositTypeCode: string    // FD | RD | OTHER
  schemeName: string
  balance: number
  depositAmount: number
  openDate: string
  maturityDate: string | null
  maturityAmount: number | null
  interestRate: number
  periodMonths: number | null
}

type GoldItem = {
  ornament_name: string
  gold_form: string
  purity_karat: string
  number_of_pieces: string
  gross_weight_grams: string
  stone_weight_grams: string
  net_weight_grams: string
}

const emptyGoldItem: GoldItem = {
  ornament_name: "",
  gold_form: "ORNAMENTS",
  purity_karat: "22",
  number_of_pieces: "1",
  gross_weight_grams: "",
  stone_weight_grams: "0",
  net_weight_grams: "",
}

type SecurityForm = {
  // Common
  description: string
  assessed_value: string
  valuation_date: string
  is_primary_security: boolean
  // Gold
  gold_form: string
  purity_karat: string
  number_of_items: string
  gross_weight_grams: string
  stone_weight_grams: string
  net_weight_grams: string
  packet_no: string
  appraiser_name: string
  appraiser_license_no: string
  appraisal_date: string
  gold_rate_per_gram: string
  gold_rate_date: string
  market_value: string
  storage_location: string
  // Property (Land / Building)
  property_type: string
  ownership_type: string
  survey_no: string
  owner_name: string
  address_line1: string
  city: string
  district: string
  state_name: string
  pincode: string
  land_area_sqft: string
  land_area_acres: string
  built_up_area_sqft: string
  registration_no: string
  registration_date: string
  document_type: string
  guideline_value: string
  encumbrance_cert_date: string
  title_clear: boolean
  legal_opinion_by: string
  legal_opinion_date: string
  // Vehicle
  vehicle_type: string
  vehicle_registration_no: string
  chassis_no: string
  engine_no: string
  manufacturer: string
  model: string
  year_of_manufacture: string
  vehicle_registration_date: string
  rc_book_held: boolean
  insurance_policy_no: string
  insurance_expiry: string
  purchase_price: string
  current_market_value: string
  // Deposit (FD / RD / NSC / KVP)
  deposit_type: string
  deposit_account_no: string
  certificate_no: string
  institution_name: string
  deposit_amount: string
  deposit_date: string
  maturity_date: string
  maturity_amount: string
  deposit_interest_rate: string
  lien_amount: string
  // Insurance
  policy_no: string
  policy_type: string
  insurer_name: string
  insured_name: string
  sum_assured: string
  surrender_value: string
  surrender_value_date: string
  premium_amount: string
  premium_frequency: string
  policy_start_date: string
  policy_maturity_date: string
  assignment_done: boolean
  assignee_name: string
}

const emptySecurityForm: SecurityForm = {
  description: "", assessed_value: "", valuation_date: "", is_primary_security: true,
  gold_form: "ORNAMENTS", purity_karat: "22", number_of_items: "", gross_weight_grams: "",
  stone_weight_grams: "0", net_weight_grams: "", packet_no: "", appraiser_name: "",
  appraiser_license_no: "", appraisal_date: "", gold_rate_per_gram: "", gold_rate_date: "",
  market_value: "", storage_location: "",
  property_type: "", ownership_type: "OWNED", survey_no: "", owner_name: "", address_line1: "",
  city: "", district: "", state_name: "", pincode: "", land_area_sqft: "", land_area_acres: "",
  built_up_area_sqft: "", registration_no: "", registration_date: "", document_type: "",
  guideline_value: "", encumbrance_cert_date: "", title_clear: false,
  legal_opinion_by: "", legal_opinion_date: "",
  vehicle_type: "FOUR_WHEELER", vehicle_registration_no: "", chassis_no: "", engine_no: "",
  manufacturer: "", model: "", year_of_manufacture: "", vehicle_registration_date: "",
  rc_book_held: false, insurance_policy_no: "", insurance_expiry: "", purchase_price: "",
  current_market_value: "",
  deposit_type: "FD", deposit_account_no: "", certificate_no: "", institution_name: "",
  deposit_amount: "", deposit_date: "", maturity_date: "", maturity_amount: "",
  deposit_interest_rate: "", lien_amount: "",
  policy_no: "", policy_type: "LIFE", insurer_name: "", insured_name: "", sum_assured: "",
  surrender_value: "", surrender_value_date: "", premium_amount: "", premium_frequency: "ANNUAL",
  policy_start_date: "", policy_maturity_date: "", assignment_done: false, assignee_name: "",
}

// ── Component ────────────────────────────────────────────────────────────────

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
  const [purposes, setPurposes] = useState<any[]>([])
  const [selectedPurposeId, setSelectedPurposeId] = useState("")

  // Loan securities
  const [securities, setSecurities] = useState<any[]>([])
  const [selectedSecurityId, setSelectedSecurityId] = useState("")
  const [securityForm, setSecurityForm] = useState<SecurityForm>(emptySecurityForm)
  const [memberDepositAccounts, setMemberDepositAccounts] = useState<MemberDepositAccount[]>([])
  const [loadingDepositAccounts, setLoadingDepositAccounts] = useState(false)

  // Gold item-by-item tracking
  const [goldItems, setGoldItems] = useState<GoldItem[]>([])
  const [goldItemDraft, setGoldItemDraft] = useState<GoldItem>(emptyGoldItem)

  const sf = (key: keyof SecurityForm, value: any) =>
    setSecurityForm((prev) => ({ ...prev, [key]: value }))

  const sfDraft = (key: keyof GoldItem, value: string) =>
    setGoldItemDraft((prev) => ({ ...prev, [key]: value }))

  const handleAddGoldItem = () => {
    if (!goldItemDraft.ornament_name.trim() || !goldItemDraft.gross_weight_grams) return
    const gross = parseFloat(goldItemDraft.gross_weight_grams) || 0
    const stone = parseFloat(goldItemDraft.stone_weight_grams) || 0
    const net = Math.max(0, gross - stone)
    setGoldItems((prev) => [...prev, { ...goldItemDraft, net_weight_grams: net.toFixed(3) }])
    setGoldItemDraft(emptyGoldItem)
  }

  const handleRemoveGoldItem = (idx: number) =>
    setGoldItems((prev) => prev.filter((_, i) => i !== idx))

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSchemes()
    getLoginDate()
  }, [])

  const selectedScheme = schemes.find((s) => String(s.scheme_id) === selectedSchemeId)

  useEffect(() => {
    if (selectedScheme) setInterestRate(String(selectedScheme.interest_rate))
  }, [selectedScheme])

  useEffect(() => {
    if (loanAmount && tenureMonths && interestRate) calculateEMI()
    else { setEmiAmount(null); setTotalInterest(null); setTotalPayment(null); setEmiSchedule([]) }
  }, [loanAmount, tenureMonths, interestRate])

  // Gold item totals → propagate to securityForm summary fields
  useEffect(() => {
    if (selectedSecurityId !== "6" || goldItems.length === 0) return
    const totalGross = goldItems.reduce((s, i) => s + (parseFloat(i.gross_weight_grams) || 0), 0)
    const totalStone = goldItems.reduce((s, i) => s + (parseFloat(i.stone_weight_grams) || 0), 0)
    const totalNet = Math.max(0, totalGross - totalStone)
    const totalPieces = goldItems.reduce((s, i) => s + (parseInt(i.number_of_pieces) || 1), 0)
    const rate = parseFloat(securityForm.gold_rate_per_gram) || 0
    const mv = +(totalNet * rate).toFixed(2)
    setSecurityForm((prev) => ({
      ...prev,
      gross_weight_grams: totalGross.toFixed(3),
      stone_weight_grams: totalStone.toFixed(3),
      net_weight_grams: totalNet.toFixed(3),
      number_of_items: String(totalPieces),
      market_value: mv > 0 ? String(mv) : prev.market_value,
      assessed_value: mv > 0 ? String(mv) : prev.assessed_value,
    }))
  }, [goldItems, securityForm.gold_rate_per_gram, selectedSecurityId])

  // Fetch member's deposit accounts when security type is Deposit (8) and member is known
  useEffect(() => {
    if (Number(selectedSecurityId) !== 8 || !memberInfo) {
      setMemberDepositAccounts([])
      return
    }
    setLoadingDepositAccounts(true)
    fetch(`/api/deposits/by-member?membership_no=${memberInfo.membership_no}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setMemberDepositAccounts(data.deposits ?? []))
      .catch(() => setMemberDepositAccounts([]))
      .finally(() => setLoadingDepositAccounts(false))
  }, [selectedSecurityId, memberInfo])

  // ── Data fetchers ──────────────────────────────────────────────────────────

  async function fetchSchemes() {
    try {
      const res = await fetch("/api/loans/schemes", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setSchemes(data.schemes || [])
    } catch (e) {
      console.error("Failed to fetch loan schemes:", e)
    } finally {
      setLoadingSchemes(false)
    }
  }

  async function getLoginDate() {
    try {
      const res = await fetch("/api/fas/get-login-date", { credentials: "include" })
      const data = await res.json()
      if (data.businessDate) setApplicationDate(data.businessDate)
    } catch { /* silent */ }
  }

  async function calculateEMI() {
    const principal = Number(loanAmount)
    const months = Number(tenureMonths)
    const rate = Number(interestRate)
    if (!principal || !months || !rate) return
    setIsCalculating(true)
    try {
      const res = await fetch("/api/loans/calculate-emi", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principal, tenure_months: months, interest_rate: rate, start_date: applicationDate }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmiAmount(data.emi_amount)
        setTotalInterest(data.total_interest)
        setTotalPayment(data.total_payment)
        setEmiSchedule(data.schedule || [])
      }
    } catch { /* silent */ }
    finally { setIsCalculating(false) }
  }

  const handleDepositAccountSelect = (accountNumber: string) => {
    const acc = memberDepositAccounts.find((a) => a.accountNumber === accountNumber)
    if (!acc) return
    setSecurityForm((prev) => ({
      ...prev,
      deposit_account_no: acc.accountNumber,
      deposit_type: acc.depositTypeCode,
      institution_name: "Own Branch",
      deposit_amount: String(acc.depositAmount),
      deposit_date: acc.openDate ?? "",
      maturity_date: acc.maturityDate ?? "",
      maturity_amount: acc.maturityAmount != null ? String(acc.maturityAmount) : "",
      deposit_interest_rate: String(acc.interestRate),
      assessed_value: String(acc.depositAmount),
    }))
  }

  async function loadpurpose(schemeId: string) {
    try {
      const res = await fetch(`/api/loans/aplication_settings/purpose?schemeId=${schemeId}`)
      const data = await res.json()
      setPurposes(data.schemes || [])
    } catch { /* silent */ }
  }

  async function loadSecurity(schemeId: string) {
    try {
      const res = await fetch(`/api/loans/aplication_settings/security?schemeId=${schemeId}`)
      const data = await res.json()
      setSecurities(data.security || [])
    } catch { /* silent */ }
  }

  // ── Member handlers ────────────────────────────────────────────────────────

  const handleMemberSearch = async () => {
    if (!membershipNo.trim()) return
    setIsSearching(true); setMemberError(""); setMemberInfo(null)
    try {
      const res = await fetch("/api/savings/member-lookup", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_no: membershipNo.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.found) setMemberInfo(data.member)
      else setMemberError("No active member found with this membership number.")
    } catch { setMemberError("Failed to search member. Please try again.") }
    finally { setIsSearching(false) }
  }

  const handleMemberBlur = () => {
    if (membershipNo.trim() && !memberInfo && !isSearching) handleMemberSearch()
  }

  const handlePopupSearch = async () => {
    if (!searchMemberNo && !searchMemberName && !searchFatherName && !searchAadhaar) return
    setIsPopupSearching(true); setSearchResults([])
    try {
      const res = await fetch("/api/savings/member-search", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNumber: searchMemberNo, memberName: searchMemberName,
          fatherName: searchFatherName, aadhaarNumber: searchAadhaar,
        }),
      })
      const data = await res.json()
      if (data.success) setSearchResults(data.results || [])
    } catch { /* silent */ }
    finally { setIsPopupSearching(false) }
  }

  const handleSelectMember = (member: MemberInfo) => {
    setMemberInfo(member); setMembershipNo(member.membership_no)
    setMemberError(""); setSearchDialogOpen(false)
    setSearchMemberNo(""); setSearchMemberName(""); setSearchFatherName(""); setSearchAadhaar("")
    setSearchResults([])
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!memberInfo || !selectedSchemeId || !applicationDate || !loanAmount || !tenureMonths) return
    setIsSubmitting(true)

    // Build security payload
    const typeId = Number(selectedSecurityId)
    let securityPayload: any = null
    if (typeId) {
      securityPayload = {
        security_type_id: typeId,
        is_primary_security: securityForm.is_primary_security,
        description: securityForm.description,
        assessed_value: securityForm.assessed_value ? Number(securityForm.assessed_value) : null,
        valuation_date: securityForm.valuation_date || null,
      }
      if (typeId === 6) {
        const firstItem = goldItems[0]
        const totalGross = goldItems.reduce((s, i) => s + (parseFloat(i.gross_weight_grams) || 0), 0)
        const totalStone = goldItems.reduce((s, i) => s + (parseFloat(i.stone_weight_grams) || 0), 0)
        const totalNet = Math.max(0, totalGross - totalStone)
        const totalPieces = goldItems.reduce((s, i) => s + (parseInt(i.number_of_pieces) || 1), 0)
        Object.assign(securityPayload, {
          gold_form: firstItem?.gold_form || "ORNAMENTS",
          purity_karat: Number(firstItem?.purity_karat || 22),
          number_of_items: goldItems.length > 0 ? totalPieces : null,
          gross_weight_grams: goldItems.length > 0 ? totalGross : (Number(securityForm.gross_weight_grams) || 0),
          stone_weight_grams: goldItems.length > 0 ? totalStone : (Number(securityForm.stone_weight_grams) || 0),
          net_weight_grams: goldItems.length > 0 ? totalNet : (Number(securityForm.net_weight_grams) || 0),
          packet_no: securityForm.packet_no || null,
          appraiser_name: securityForm.appraiser_name || null,
          appraiser_license_no: securityForm.appraiser_license_no || null,
          appraisal_date: securityForm.appraisal_date || null,
          gold_rate_per_gram: securityForm.gold_rate_per_gram ? Number(securityForm.gold_rate_per_gram) : null,
          gold_rate_date: securityForm.gold_rate_date || null,
          market_value: securityForm.market_value ? Number(securityForm.market_value) : null,
          storage_location: securityForm.storage_location || null,
          gold_items: goldItems.map((item, idx) => ({
            item_seq: idx + 1,
            ornament_name: item.ornament_name,
            gold_form: item.gold_form,
            purity_karat: Number(item.purity_karat),
            number_of_pieces: Number(item.number_of_pieces) || 1,
            gross_weight_grams: Number(item.gross_weight_grams) || 0,
            stone_weight_grams: Number(item.stone_weight_grams) || 0,
            net_weight_grams: Number(item.net_weight_grams) || 0,
          })),
        })
      } else if ([1, 2].includes(typeId)) {
        Object.assign(securityPayload, {
          property_type: securityForm.property_type || null,
          ownership_type: securityForm.ownership_type || null,
          survey_no: securityForm.survey_no || null,
          owner_name: securityForm.owner_name || null,
          address_line1: securityForm.address_line1 || null,
          city: securityForm.city || null,
          district: securityForm.district || null,
          state_name: securityForm.state_name || null,
          pincode: securityForm.pincode || null,
          land_area_sqft: securityForm.land_area_sqft ? Number(securityForm.land_area_sqft) : null,
          land_area_acres: securityForm.land_area_acres ? Number(securityForm.land_area_acres) : null,
          built_up_area_sqft: securityForm.built_up_area_sqft ? Number(securityForm.built_up_area_sqft) : null,
          registration_no: securityForm.registration_no || null,
          registration_date: securityForm.registration_date || null,
          document_type: securityForm.document_type || null,
          guideline_value: securityForm.guideline_value ? Number(securityForm.guideline_value) : null,
          market_value: securityForm.market_value ? Number(securityForm.market_value) : null,
          encumbrance_cert_date: securityForm.encumbrance_cert_date || null,
          title_clear: securityForm.title_clear,
          legal_opinion_by: securityForm.legal_opinion_by || null,
          legal_opinion_date: securityForm.legal_opinion_date || null,
        })
      } else if (typeId === 7) {
        Object.assign(securityPayload, {
          vehicle_type: securityForm.vehicle_type,
          vehicle_registration_no: securityForm.vehicle_registration_no || null,
          chassis_no: securityForm.chassis_no || null,
          engine_no: securityForm.engine_no || null,
          manufacturer: securityForm.manufacturer || null,
          model: securityForm.model || null,
          year_of_manufacture: securityForm.year_of_manufacture ? Number(securityForm.year_of_manufacture) : null,
          vehicle_registration_date: securityForm.vehicle_registration_date || null,
          rc_book_held: securityForm.rc_book_held,
          insurance_policy_no: securityForm.insurance_policy_no || null,
          insurance_expiry: securityForm.insurance_expiry || null,
          purchase_price: securityForm.purchase_price ? Number(securityForm.purchase_price) : null,
          current_market_value: securityForm.current_market_value ? Number(securityForm.current_market_value) : null,
        })
      } else if ([8, 12].includes(typeId)) {
        Object.assign(securityPayload, {
          deposit_type: securityForm.deposit_type,
          deposit_account_no: securityForm.deposit_account_no || null,
          certificate_no: securityForm.certificate_no || null,
          institution_name: securityForm.institution_name || null,
          deposit_amount: securityForm.deposit_amount ? Number(securityForm.deposit_amount) : 0,
          deposit_date: securityForm.deposit_date || null,
          maturity_date: securityForm.maturity_date || null,
          maturity_amount: securityForm.maturity_amount ? Number(securityForm.maturity_amount) : null,
          deposit_interest_rate: securityForm.deposit_interest_rate ? Number(securityForm.deposit_interest_rate) : null,
          lien_amount: securityForm.lien_amount ? Number(securityForm.lien_amount) : null,
        })
      } else if (typeId === 10) {
        Object.assign(securityPayload, {
          policy_no: securityForm.policy_no || null,
          policy_type: securityForm.policy_type || null,
          insurer_name: securityForm.insurer_name || null,
          insured_name: securityForm.insured_name || null,
          sum_assured: securityForm.sum_assured ? Number(securityForm.sum_assured) : null,
          surrender_value: securityForm.surrender_value ? Number(securityForm.surrender_value) : null,
          surrender_value_date: securityForm.surrender_value_date || null,
          premium_amount: securityForm.premium_amount ? Number(securityForm.premium_amount) : null,
          premium_frequency: securityForm.premium_frequency || null,
          policy_start_date: securityForm.policy_start_date || null,
          policy_maturity_date: securityForm.policy_maturity_date || null,
          assignment_done: securityForm.assignment_done,
          assignee_name: securityForm.assignment_done ? securityForm.assignee_name : null,
        })
      }
    }

    try {
      const res = await fetch("/api/loans/applications", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_no: memberInfo.membership_no,
          scheme_id: Number(selectedSchemeId),
          application_date: applicationDate,
          loan_amount: Number(loanAmount),
          tenure_months: Number(tenureMonths),
          interest_rate: Number(interestRate),
          loan_purpose: selectedPurposeId,
          guarantor_name: guarantorName,
          guarantor_membership_no: guarantorMembership,
          remarks,
          security: securityPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreatedApplicationNo(data.loan_application_id || data.reference_no)
      setSuccessOpen(true)
    } catch (e: any) {
      alert("Error: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setMembershipNo(""); setMemberInfo(null); setMemberError("")
    setSelectedSchemeId(""); setLoanAmount(""); setTenureMonths(""); setInterestRate("")
    setSelectedPurposeId(""); setSelectedSecurityId(""); setSecurityForm(emptySecurityForm)
    setGoldItems([]); setGoldItemDraft(emptyGoldItem)
    setGuarantorName(""); setGuarantorMembership(""); setRemarks("")
    setEmiAmount(null); setTotalInterest(null); setTotalPayment(null); setEmiSchedule([])
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)

  // ── Security type classification ───────────────────────────────────────────

  const secTypeId = Number(selectedSecurityId)
  const isGold = secTypeId === 6
  const isProperty = [1, 2].includes(secTypeId)
  const isVehicle = secTypeId === 7
  const isDeposit = [8, 12].includes(secTypeId)
  const isInsurance = secTypeId === 10
  const isGeneral = secTypeId > 0 && !isGold && !isProperty && !isVehicle && !isDeposit && !isInsurance

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push("/loans")} className="h-10 w-10 bg-transparent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">New Loan Application</h1>
                <p className="text-muted-foreground">Apply for a new loan for a member</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* ── Left Column ─────────────────────────────────────────────── */}
              <div className="space-y-6 lg:col-span-2">

                {/* Step 1: Member */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">1</div>
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
                          onChange={(e) => { setMembershipNo(e.target.value); if (memberInfo) { setMemberInfo(null); setMemberError("") } }}
                          onBlur={handleMemberBlur}
                          onKeyDown={(e) => e.key === "Enter" && handleMemberSearch()}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={() => setSearchDialogOpen(true)} className="gap-2 bg-transparent">
                          <Search className="h-4 w-4" /> Search
                        </Button>
                      </div>
                      {isSearching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading member details...</div>}
                      {memberError && <p className="text-sm text-red-500">{memberError}</p>}
                    </div>

                    {memberInfo && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-700">Member Found</span>
                          <Badge variant="outline" className="ml-auto border-blue-300 text-blue-700">{memberInfo.member_type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {[
                            ["Full Name", memberInfo.full_name],
                            ["Father Name", memberInfo.father_name || "---"],
                            ["Mobile", memberInfo.mobile_no || "---"],
                            ["Date of Birth", memberInfo.date_of_birth || "---"],
                            ["Gender", memberInfo.gender || "---"],
                            ["Customer Code", memberInfo.customer_code?.trim()],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="text-sm font-medium">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 2: Scheme & Amount */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">2</div>
                      <div>
                        <CardTitle className="text-lg">Loan Scheme & Amount</CardTitle>
                        <CardDescription>Select a loan scheme and enter loan details</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Loan Scheme *</Label>
                        <Select value={selectedSchemeId} disabled={loadingSchemes}
                          onValueChange={(v) => { setSelectedSchemeId(v); loadpurpose(v); loadSecurity(v); setSelectedSecurityId(""); setSecurityForm(emptySecurityForm) }}>
                          <SelectTrigger><SelectValue placeholder={loadingSchemes ? "Loading..." : "Select a loan scheme"} /></SelectTrigger>
                          <SelectContent>
                            {schemes.map((s) => <SelectItem key={s.scheme_id} value={String(s.scheme_id)}>{s.scheme_name} ({s.interest_rate}%)</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Application Date</Label>
                        <Input type="date" value={applicationDate} disabled />
                      </div>
                    </div>

                    {selectedScheme && (
                      <div className="rounded-lg border border-muted bg-muted/30 p-3">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          {[
                            ["Min Amount", formatCurrency(selectedScheme.min_loan_amount || 0)],
                            ["Max Amount", formatCurrency(selectedScheme.max_loan_amount || 0)],
                            ["Min Tenure", `${selectedScheme.min_tenure_months || 1} months`],
                            ["Max Tenure", `${selectedScheme.max_tenure_months || 120} months`],
                          ].map(([label, value]) => (
                            <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Loan Amount *</Label>
                        <Input type="number" placeholder="Enter amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tenure (Months) *</Label>
                        <Input type="number" placeholder="Enter months" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Interest Rate (% p.a.)</Label>
                        <Input type="number" step="0.01" placeholder="Rate" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Loan Purpose</Label>
                      <Select value={selectedPurposeId} onValueChange={setSelectedPurposeId} disabled={!purposes.length}>
                        <SelectTrigger><SelectValue placeholder="Select a purpose" /></SelectTrigger>
                        <SelectContent>
                          {purposes.map((p: any) => <SelectItem key={p.purpose_id} value={String(p.purpose_id)}>{p.purpose_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Security Details */}
                <Card className={!memberInfo ? "pointer-events-none opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">3</div>
                      <div>
                        <CardTitle className="text-lg">Security & Guarantor</CardTitle>
                        <CardDescription>Add collateral security details and guarantor information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">

                    {/* Security type + primary flag */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Security Type</Label>
                        <Select value={selectedSecurityId} onValueChange={(v) => { setSelectedSecurityId(v); setSecurityForm(emptySecurityForm); setGoldItems([]); setGoldItemDraft(emptyGoldItem) }} disabled={!securities.length}>
                          <SelectTrigger><SelectValue placeholder={securities.length ? "Select security type" : "No securities for this scheme"} /></SelectTrigger>
                          <SelectContent>
                            {securities.map((s: any) => <SelectItem key={s.security_id} value={String(s.security_id)}>{s.security_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedSecurityId && (
                        <div className="space-y-2">
                          <Label>&nbsp;</Label>
                          <label className="flex items-center gap-2 pt-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                              checked={securityForm.is_primary_security}
                              onChange={(e) => sf("is_primary_security", e.target.checked)} />
                            <span className="text-sm font-medium">Primary Security</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* ── Gold Security ──────────────────────────────────────── */}
                    {isGold && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50/30 p-4 space-y-4">
                        <p className="text-sm font-semibold text-yellow-800">Gold Details</p>

                        {/* Add ornament item form */}
                        <div className="rounded-md border border-yellow-300 bg-white p-3 space-y-3">
                          <p className="text-xs font-medium text-yellow-700">Add Ornament Item</p>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">Ornament Name *</Label>
                              <Input className="h-8 text-xs" placeholder="e.g. Necklace, Bangle, Ring"
                                value={goldItemDraft.ornament_name}
                                onChange={(e) => sfDraft("ornament_name", e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddGoldItem()} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Gold Form</Label>
                              <Select value={goldItemDraft.gold_form} onValueChange={(v) => sfDraft("gold_form", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["ORNAMENTS", "COIN", "BAR", "BISCUIT"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Purity (K)</Label>
                              <Select value={goldItemDraft.purity_karat} onValueChange={(v) => sfDraft("purity_karat", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["18", "20", "22", "24"].map((k) => <SelectItem key={k} value={k}>{k}K</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Pieces</Label>
                              <Input className="h-8 text-xs" type="number" min="1" placeholder="1"
                                value={goldItemDraft.number_of_pieces}
                                onChange={(e) => sfDraft("number_of_pieces", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Gross Wt (g) *</Label>
                              <Input className="h-8 text-xs" type="number" step="0.001" placeholder="0.000"
                                value={goldItemDraft.gross_weight_grams}
                                onChange={(e) => sfDraft("gross_weight_grams", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Stone Wt (g)</Label>
                              <Input className="h-8 text-xs" type="number" step="0.001" placeholder="0.000"
                                value={goldItemDraft.stone_weight_grams}
                                onChange={(e) => sfDraft("stone_weight_grams", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Net Wt (g)</Label>
                              <Input className="h-8 text-xs bg-muted" readOnly placeholder="Auto"
                                value={(() => {
                                  const g = parseFloat(goldItemDraft.gross_weight_grams) || 0
                                  const s = parseFloat(goldItemDraft.stone_weight_grams) || 0
                                  return g > 0 ? Math.max(0, g - s).toFixed(3) : ""
                                })()} />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button size="sm"
                              disabled={!goldItemDraft.ornament_name.trim() || !goldItemDraft.gross_weight_grams}
                              onClick={handleAddGoldItem}
                              className="h-7 text-xs bg-yellow-600 hover:bg-yellow-700 text-white">
                              + Add Item
                            </Button>
                          </div>
                        </div>

                        {/* Items table */}
                        {goldItems.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-yellow-700">Items Added ({goldItems.length})</p>
                            <div className="rounded-md border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-yellow-50 h-7">
                                    <TableHead className="text-xs py-1 w-8">#</TableHead>
                                    <TableHead className="text-xs py-1">Ornament</TableHead>
                                    <TableHead className="text-xs py-1">Form</TableHead>
                                    <TableHead className="text-xs py-1">Karat</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Pcs</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Gross (g)</TableHead>
                                    <TableHead className="text-xs py-1 text-right">Net (g)</TableHead>
                                    <TableHead className="w-6"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {goldItems.map((item, idx) => (
                                    <TableRow key={idx} className="h-7">
                                      <TableCell className="text-xs py-1">{idx + 1}</TableCell>
                                      <TableCell className="text-xs py-1 font-medium">{item.ornament_name}</TableCell>
                                      <TableCell className="text-xs py-1">{item.gold_form}</TableCell>
                                      <TableCell className="text-xs py-1">{item.purity_karat}K</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{item.number_of_pieces}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{parseFloat(item.gross_weight_grams).toFixed(3)}</TableCell>
                                      <TableCell className="text-xs py-1 text-right">{item.net_weight_grams}</TableCell>
                                      <TableCell className="py-1 text-center">
                                        <button onClick={() => handleRemoveGoldItem(idx)}
                                          className="text-red-400 hover:text-red-600 font-bold text-base leading-none px-1">×</button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow className="bg-yellow-50/80 font-semibold h-7">
                                    <TableCell className="text-xs py-1" colSpan={4}>Totals</TableCell>
                                    <TableCell className="text-xs py-1 text-right">
                                      {goldItems.reduce((s, i) => s + (parseInt(i.number_of_pieces) || 1), 0)}
                                    </TableCell>
                                    <TableCell className="text-xs py-1 text-right">
                                      {goldItems.reduce((s, i) => s + (parseFloat(i.gross_weight_grams) || 0), 0).toFixed(3)}
                                    </TableCell>
                                    <TableCell className="text-xs py-1 text-right">
                                      {goldItems.reduce((s, i) => s + (parseFloat(i.net_weight_grams) || 0), 0).toFixed(3)}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Rate & appraisal details */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Gold Rate / Gram (₹)</Label>
                            <Input className="h-8 text-xs" type="number" step="0.01" placeholder="0.00" value={securityForm.gold_rate_per_gram} onChange={(e) => sf("gold_rate_per_gram", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rate Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.gold_rate_date} onChange={(e) => sf("gold_rate_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Market Value (₹)</Label>
                            <Input className="h-8 text-xs bg-muted" readOnly value={securityForm.market_value} placeholder="Auto-calculated" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Packet No</Label>
                            <Input className="h-8 text-xs" placeholder="Packet / seal no" value={securityForm.packet_no} onChange={(e) => sf("packet_no", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Appraiser Name</Label>
                            <Input className="h-8 text-xs" placeholder="Appraiser name" value={securityForm.appraiser_name} onChange={(e) => sf("appraiser_name", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Appraiser License No</Label>
                            <Input className="h-8 text-xs" placeholder="License no" value={securityForm.appraiser_license_no} onChange={(e) => sf("appraiser_license_no", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Appraisal Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.appraisal_date} onChange={(e) => sf("appraisal_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Storage Location</Label>
                            <Input className="h-8 text-xs" placeholder="Vault / locker reference" value={securityForm.storage_location} onChange={(e) => sf("storage_location", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Property Security ──────────────────────────────────── */}
                    {isProperty && (
                      <div className="rounded-lg border border-green-200 bg-green-50/30 p-4 space-y-4">
                        <p className="text-sm font-semibold text-green-800">Property Details</p>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Property Type *</Label>
                            <Select value={securityForm.property_type} onValueChange={(v) => sf("property_type", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                {["RESIDENTIAL", "COMMERCIAL", "AGRICULTURAL", "INDUSTRIAL", "PLOT"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Ownership Type</Label>
                            <Select value={securityForm.ownership_type} onValueChange={(v) => sf("ownership_type", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["OWNED", "CO_OWNED", "LEASEHOLD"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Survey No</Label>
                            <Input className="h-8 text-xs" placeholder="Survey / plot number" value={securityForm.survey_no} onChange={(e) => sf("survey_no", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Owner Name</Label>
                            <Input className="h-8 text-xs" placeholder="Property owner name" value={securityForm.owner_name} onChange={(e) => sf("owner_name", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Address</Label>
                            <Input className="h-8 text-xs" placeholder="Street / door no" value={securityForm.address_line1} onChange={(e) => sf("address_line1", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">City</Label>
                            <Input className="h-8 text-xs" value={securityForm.city} onChange={(e) => sf("city", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">District</Label>
                            <Input className="h-8 text-xs" value={securityForm.district} onChange={(e) => sf("district", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">State</Label>
                            <Input className="h-8 text-xs" value={securityForm.state_name} onChange={(e) => sf("state_name", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Pincode</Label>
                            <Input className="h-8 text-xs" maxLength={6} value={securityForm.pincode} onChange={(e) => sf("pincode", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Land Area (Sqft)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.land_area_sqft} onChange={(e) => sf("land_area_sqft", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Land Area (Acres)</Label>
                            <Input className="h-8 text-xs" type="number" step="0.0001" value={securityForm.land_area_acres} onChange={(e) => sf("land_area_acres", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Built-up Area (Sqft)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.built_up_area_sqft} onChange={(e) => sf("built_up_area_sqft", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Registration No</Label>
                            <Input className="h-8 text-xs" placeholder="Deed / doc number" value={securityForm.registration_no} onChange={(e) => sf("registration_no", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Registration Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.registration_date} onChange={(e) => sf("registration_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Document Type</Label>
                            <Select value={securityForm.document_type} onValueChange={(v) => sf("document_type", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {["SALE_DEED", "GIFT_DEED", "PARTITION_DEED", "LEASE_DEED"].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Guideline Value (₹)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.guideline_value} onChange={(e) => sf("guideline_value", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">EC Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.encumbrance_cert_date} onChange={(e) => sf("encumbrance_cert_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Legal Opinion By</Label>
                            <Input className="h-8 text-xs" placeholder="Advocate name" value={securityForm.legal_opinion_by} onChange={(e) => sf("legal_opinion_by", e.target.value)} />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                            checked={securityForm.title_clear} onChange={(e) => sf("title_clear", e.target.checked)} />
                          <span className="text-xs font-medium">Title Clear (verified by legal team)</span>
                        </label>
                      </div>
                    )}

                    {/* ── Vehicle Security ───────────────────────────────────── */}
                    {isVehicle && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-4">
                        <p className="text-sm font-semibold text-blue-800">Vehicle Details</p>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Vehicle Type *</Label>
                            <Select value={securityForm.vehicle_type} onValueChange={(v) => sf("vehicle_type", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["TWO_WHEELER", "FOUR_WHEELER", "COMMERCIAL", "TRACTOR", "OTHER"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Registration No *</Label>
                            <Input className="h-8 text-xs" placeholder="TN XX XX XXXX" value={securityForm.vehicle_registration_no} onChange={(e) => sf("vehicle_registration_no", e.target.value.toUpperCase())} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Year of Manufacture</Label>
                            <Input className="h-8 text-xs" type="number" placeholder="YYYY" maxLength={4} value={securityForm.year_of_manufacture} onChange={(e) => sf("year_of_manufacture", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Chassis No</Label>
                            <Input className="h-8 text-xs" placeholder="VIN / Chassis number" value={securityForm.chassis_no} onChange={(e) => sf("chassis_no", e.target.value.toUpperCase())} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Engine No</Label>
                            <Input className="h-8 text-xs" placeholder="Engine number" value={securityForm.engine_no} onChange={(e) => sf("engine_no", e.target.value.toUpperCase())} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Registration Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.vehicle_registration_date} onChange={(e) => sf("vehicle_registration_date", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Manufacturer</Label>
                            <Input className="h-8 text-xs" placeholder="e.g. Maruti, Honda" value={securityForm.manufacturer} onChange={(e) => sf("manufacturer", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Model</Label>
                            <Input className="h-8 text-xs" placeholder="e.g. Swift, Activa" value={securityForm.model} onChange={(e) => sf("model", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Insurance Policy No</Label>
                            <Input className="h-8 text-xs" value={securityForm.insurance_policy_no} onChange={(e) => sf("insurance_policy_no", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Insurance Expiry</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.insurance_expiry} onChange={(e) => sf("insurance_expiry", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Purchase Price (₹)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.purchase_price} onChange={(e) => sf("purchase_price", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Current Market Value (₹)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.current_market_value} onChange={(e) => { sf("current_market_value", e.target.value); sf("assessed_value", e.target.value) }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">&nbsp;</Label>
                            <label className="flex items-center gap-2 pt-2 cursor-pointer">
                              <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                                checked={securityForm.rc_book_held} onChange={(e) => sf("rc_book_held", e.target.checked)} />
                              <span className="text-xs font-medium">RC Book Held by Branch</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Deposit Security ───────────────────────────────────── */}
                    {isDeposit && (
                      <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 space-y-4">
                        <p className="text-sm font-semibold text-purple-800">Deposit / Certificate Details</p>

                        {/* Row 1: deposit type + account */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Deposit Type *</Label>
                            <Select value={securityForm.deposit_type} onValueChange={(v) => sf("deposit_type", v)}
                              disabled={secTypeId === 8 && !!securityForm.deposit_account_no}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["FD", "RD", "NSC", "KVP", "POST_OFFICE_SAVINGS", "OTHER"].map((t) => (
                                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">
                              {secTypeId === 8 ? "Deposit Account" : "Deposit / Account No"}
                              {secTypeId === 8 && memberDepositAccounts.length > 0 && (
                                <span className="ml-1 font-normal text-purple-600">— member&apos;s active accounts</span>
                              )}
                            </Label>
                            {secTypeId === 8 ? (
                              loadingDepositAccounts ? (
                                <div className="flex h-8 items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Loading accounts…
                                </div>
                              ) : memberDepositAccounts.length > 0 ? (
                                <Select value={securityForm.deposit_account_no} onValueChange={handleDepositAccountSelect}>
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select deposit account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {memberDepositAccounts.map((acc) => (
                                      <SelectItem key={acc.accountNumber} value={acc.accountNumber}>
                                        <span className="font-mono">{acc.accountNumber}</span>
                                        <span className="ml-2 text-muted-foreground">
                                          {acc.depositTypeLabel} · {acc.schemeName} · ₹{acc.depositAmount.toLocaleString("en-IN")}
                                          {acc.maturityDate ? ` · Matures ${acc.maturityDate}` : ""}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : !loadingDepositAccounts && memberInfo ? (
                                <div className="flex h-8 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
                                  No active deposit accounts found for this member
                                </div>
                              ) : null
                            ) : (
                              <Input className="h-8 text-xs" placeholder="Account or folio number"
                                value={securityForm.deposit_account_no}
                                onChange={(e) => sf("deposit_account_no", e.target.value)} />
                            )}
                          </div>
                        </div>

                        {/* Certificate No — relevant for NSC / KVP / external certificates */}
                        {secTypeId === 12 && (
                          <div className="space-y-1">
                            <Label className="text-xs">Certificate No</Label>
                            <Input className="h-8 text-xs" placeholder="Certificate number"
                              value={securityForm.certificate_no}
                              onChange={(e) => sf("certificate_no", e.target.value)} />
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-xs">Institution Name *</Label>
                          <Input className="h-8 text-xs"
                            placeholder={secTypeId === 8 ? "Auto-filled from account selection" : "Bank or post office name"}
                            value={securityForm.institution_name}
                            onChange={(e) => sf("institution_name", e.target.value)} />
                        </div>

                        {/* Auto-filled badge when account is pre-populated from dropdown */}
                        {secTypeId === 8 && securityForm.deposit_account_no && (
                          <div className="flex items-center gap-2 rounded-md bg-purple-100 px-3 py-1.5 text-xs text-purple-700">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            Fields below are auto-filled from the selected account. Adjust lien amount as needed.
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Deposit Amount (₹) *</Label>
                            <Input className={`h-8 text-xs ${secTypeId === 8 && securityForm.deposit_account_no ? "bg-muted" : ""}`}
                              type="number" value={securityForm.deposit_amount}
                              readOnly={secTypeId === 8 && !!securityForm.deposit_account_no}
                              onChange={(e) => { sf("deposit_amount", e.target.value); sf("assessed_value", e.target.value) }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Deposit Date *</Label>
                            <Input className={`h-8 text-xs ${secTypeId === 8 && securityForm.deposit_account_no ? "bg-muted" : ""}`}
                              type="date" value={securityForm.deposit_date}
                              readOnly={secTypeId === 8 && !!securityForm.deposit_account_no}
                              onChange={(e) => sf("deposit_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Interest Rate (%)</Label>
                            <Input className={`h-8 text-xs ${secTypeId === 8 && securityForm.deposit_account_no ? "bg-muted" : ""}`}
                              type="number" step="0.01" value={securityForm.deposit_interest_rate}
                              readOnly={secTypeId === 8 && !!securityForm.deposit_account_no}
                              onChange={(e) => sf("deposit_interest_rate", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Maturity Date</Label>
                            <Input className={`h-8 text-xs ${secTypeId === 8 && securityForm.deposit_account_no ? "bg-muted" : ""}`}
                              type="date" value={securityForm.maturity_date}
                              readOnly={secTypeId === 8 && !!securityForm.deposit_account_no}
                              onChange={(e) => sf("maturity_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Maturity Amount (₹)</Label>
                            <Input className={`h-8 text-xs ${secTypeId === 8 && securityForm.deposit_account_no ? "bg-muted" : ""}`}
                              type="number" value={securityForm.maturity_amount}
                              readOnly={secTypeId === 8 && !!securityForm.deposit_account_no}
                              onChange={(e) => sf("maturity_amount", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Lien Amount (₹)</Label>
                            <Input className="h-8 text-xs" type="number" placeholder="Amount under lien"
                              value={securityForm.lien_amount}
                              onChange={(e) => sf("lien_amount", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Insurance Security ─────────────────────────────────── */}
                    {isInsurance && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50/30 p-4 space-y-4">
                        <p className="text-sm font-semibold text-orange-800">Insurance Policy Details</p>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Policy No *</Label>
                            <Input className="h-8 text-xs" placeholder="Policy number" value={securityForm.policy_no} onChange={(e) => sf("policy_no", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Policy Type *</Label>
                            <Select value={securityForm.policy_type} onValueChange={(v) => sf("policy_type", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["LIFE", "ENDOWMENT", "MONEY_BACK", "ULIP", "GENERAL"].map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Premium Frequency</Label>
                            <Select value={securityForm.premium_frequency} onValueChange={(v) => sf("premium_frequency", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL", "SINGLE"].map((f) => <SelectItem key={f} value={f}>{f.replace("_", " ")}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Insurer Name *</Label>
                            <Input className="h-8 text-xs" placeholder="Insurance company name" value={securityForm.insurer_name} onChange={(e) => sf("insurer_name", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Insured Name</Label>
                            <Input className="h-8 text-xs" placeholder="Name of insured person" value={securityForm.insured_name} onChange={(e) => sf("insured_name", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sum Assured (₹)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.sum_assured} onChange={(e) => sf("sum_assured", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Surrender Value (₹)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.surrender_value} onChange={(e) => { sf("surrender_value", e.target.value); sf("assessed_value", e.target.value) }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Surrender Value Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.surrender_value_date} onChange={(e) => sf("surrender_value_date", e.target.value)} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Policy Start Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.policy_start_date} onChange={(e) => sf("policy_start_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Policy Maturity Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.policy_maturity_date} onChange={(e) => sf("policy_maturity_date", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Premium Amount (₹)</Label>
                            <Input className="h-8 text-xs" type="number" value={securityForm.premium_amount} onChange={(e) => sf("premium_amount", e.target.value)} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                              checked={securityForm.assignment_done} onChange={(e) => sf("assignment_done", e.target.checked)} />
                            <span className="text-xs font-medium">Assignment of Policy Done</span>
                          </label>
                          {securityForm.assignment_done && (
                            <div className="space-y-1">
                              <Label className="text-xs">Assignee Name</Label>
                              <Input className="h-8 text-xs" placeholder="Assignee / bank name" value={securityForm.assignee_name} onChange={(e) => sf("assignee_name", e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── General Security (Machinery / Inventory / Shares etc.) ── */}
                    {isGeneral && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50/30 p-4 space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Security Details</p>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea className="text-xs" rows={3} placeholder="Describe the security (e.g. machinery model, inventory list, share certificate details)" value={securityForm.description} onChange={(e) => sf("description", e.target.value)} />
                        </div>
                      </div>
                    )}

                    {/* ── Common fields shown for all security types ──────────── */}
                    {selectedSecurityId && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">Assessed Value (₹)</Label>
                            <Input className="h-8 text-xs" type="number" placeholder="Current assessed value" value={securityForm.assessed_value} onChange={(e) => sf("assessed_value", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Valuation Date</Label>
                            <Input className="h-8 text-xs" type="date" value={securityForm.valuation_date} onChange={(e) => sf("valuation_date", e.target.value)} />
                          </div>
                        </div>

                        {!isGeneral && (
                          <div className="space-y-1">
                            <Label className="text-xs">Additional Remarks on Security</Label>
                            <Textarea className="text-xs" rows={2} placeholder="Any additional remarks about this security" value={securityForm.description} onChange={(e) => sf("description", e.target.value)} />
                          </div>
                        )}
                      </>
                    )}

                    {/* ── Guarantor ──────────────────────────────────────────── */}
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">Guarantor (Optional)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Guarantor Name</Label>
                          <Input className="h-8 text-xs" placeholder="Enter guarantor name" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Guarantor Membership No</Label>
                          <Input className="h-8 text-xs" placeholder="Enter membership no" value={guarantorMembership} onChange={(e) => setGuarantorMembership(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Remarks</Label>
                        <Textarea className="text-xs" rows={2} placeholder="Any additional remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleReset} className="bg-transparent">Reset</Button>
                  <Button variant="outline" onClick={() => router.push("/loans")} className="bg-transparent">Cancel</Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!memberInfo || !selectedSchemeId || !applicationDate || !loanAmount || !tenureMonths || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Application"}
                  </Button>
                </div>
              </div>

              {/* ── Right Column ─────────────────────────────────────────────── */}
              <div className="space-y-6">
                {/* EMI Calculator */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calculator className="h-5 w-5 text-blue-600" />EMI Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isCalculating ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
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

                {/* Application Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5 text-blue-600" />Application Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      ["Member", memberInfo?.full_name || "---"],
                      ["Scheme", selectedScheme?.scheme_name || "---"],
                      ["Loan Amount", loanAmount ? formatCurrency(Number(loanAmount)) : "---"],
                      ["Tenure", tenureMonths ? `${tenureMonths} months` : "---"],
                      ["Interest Rate", interestRate ? `${interestRate}% p.a.` : "---"],
                      ["Security", selectedSecurityId ? securities.find((s: any) => String(s.security_id) === selectedSecurityId)?.security_name || "---" : "None"],
                    ].map(([label, value], i, arr) => (
                      <div key={label} className={`flex items-center justify-between ${i < arr.length - 1 ? "border-b pb-2" : ""}`}>
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* EMI Schedule Preview */}
                {emiSchedule.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-blue-600" />EMI Schedule (First 6)
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
                          <p className="mt-2 text-center text-xs text-muted-foreground">+ {emiSchedule.length - 6} more installments</p>
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
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Search Member</DialogTitle>
            <DialogDescription>Search by membership number, name, father name, or Aadhaar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Membership No", searchMemberNo, setSearchMemberNo, "Enter membership no"],
                ["Member Name", searchMemberName, setSearchMemberName, "Enter name"],
                ["Father Name", searchFatherName, setSearchFatherName, "Enter father name"],
                ["Aadhaar Number", searchAadhaar, setSearchAadhaar, "Enter Aadhaar"],
              ].map(([label, value, setter, ph]: any) => (
                <div key={label} className="space-y-2">
                  <Label>{label}</Label>
                  <Input placeholder={ph} value={value} onChange={(e) => setter(e.target.value)} />
                </div>
              ))}
            </div>
            <Button onClick={handlePopupSearch} disabled={isPopupSearching} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isPopupSearching ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Searching...</> : <><Search className="mr-2 h-4 w-4" />Search</>}
            </Button>

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membership No</TableHead><TableHead>Name</TableHead>
                      <TableHead>Father Name</TableHead><TableHead>Mobile</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((m) => (
                      <TableRow key={m.membership_no}>
                        <TableCell className="font-mono">{m.membership_no}</TableCell>
                        <TableCell>{m.full_name}</TableCell>
                        <TableCell>{m.father_name || "---"}</TableCell>
                        <TableCell>{m.mobile_no || "---"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleSelectMember(m)} className="bg-transparent">Select</Button>
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
              <CheckCircle2 className="h-6 w-6" />Application Submitted Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Loan application has been created successfully.</p>
                <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Application Number</p>
                  <p className="text-2xl font-bold text-green-700">{createdApplicationNo}</p>
                </div>
                <p className="mt-4 text-sm">The application is now pending for sanction approval.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogAction onClick={() => { setSuccessOpen(false); router.push("/loans") }} className="bg-muted text-foreground hover:bg-muted/80">
              Go to Loans
            </AlertDialogAction>
            <AlertDialogAction onClick={() => { setSuccessOpen(false); router.push(`/loans/sanction?appId=${createdApplicationNo}`) }} className="bg-blue-600 hover:bg-blue-700 text-white">
              Proceed to Sanction <ChevronRight className="ml-1 h-4 w-4" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
