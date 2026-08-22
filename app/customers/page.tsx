"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Camera, PenTool, CheckCircle2, UserPlus, ArrowLeft,
  ChevronRight, ChevronLeft, Check, User, MapPin, ShieldCheck,
  Pencil, Phone, Mail, Building2,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  caste: string | number | readonly string[] | undefined
  customer_type: string | number | readonly string[] | undefined
  full_name: string
  father_name: string
  spouse_name: string
  gender: string
  marital_status: string
  // blood_group: string
  dob: string
  age: string
  religion: string
  caste_category: string
  occupation: string
  qualification: string
  qualification_details: string
  anual_income: string
  dccb_account_number: string
  dccb_Branch: string
  board_resolution_number: string
  board_resolution_date: string
  ledger_folio_number: string
  house_no: string
  street: string
  village: string
  taluk: string
  district: string
  state: string
  pin_code: string
  phone: string
  alt_phone: string
  email: string
  permanant_house_no: string
  permanant_street: string
  permanant_village: string
  permanant_taluk: string
  permanant_district: string
  permanant_state: string
  permanant_pin_code: string
  permanant_phone: string
  pan_card_number: string
  aadhar_id: string
  ration_no: string
  ration_card_type: string
  voter_id: string
  driving_license_no: string
}

const initialCustomer: Customer = {
  full_name: "", father_name: "", spouse_name: "",
  gender: "", marital_status: "", //blood_group: "A+",
  dob: "", age: "", religion: "", caste_category: "",
  occupation: "", qualification: "", qualification_details: "", 
  anual_income: "", dccb_account_number: "", dccb_Branch: "",
  board_resolution_number: "", board_resolution_date: "", ledger_folio_number: "",
  house_no: "", street: "", village: "", taluk: "", district: "", state: "", pin_code: "",
  phone: "", alt_phone: "", email: "",
  permanant_house_no: "", permanant_street: "", permanant_village: "",
  permanant_taluk: "", permanant_district: "", permanant_state: "",
  permanant_pin_code: "", permanant_phone: "",
  pan_card_number: "", aadhar_id: "", ration_no: "", ration_card_type: "", voter_id: "", driving_license_no: "",
  caste: undefined, customer_type: undefined,
}

interface CreatedCustomer {
  customer_code: string
  full_name: string
  father_name: string
  phone: string
  aadhar_id: string
  email: string
}

type TabKey = "personal" | "address" | "kycdetails"

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { label: "Personal Details", icon: User },
    { label: "Address",          icon: MapPin },
    { label: "KYC Details",      icon: ShieldCheck },
  ]
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done    = i < current
        const active  = i === current
        const Icon    = step.icon
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                done   ? "bg-amber-500 border-amber-500 text-white"
                       : active ? "bg-amber-50 border-amber-500 text-amber-600"
                       : "bg-background border-muted-foreground/30 text-muted-foreground",
              ].join(" ")}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={[
                "text-sm font-medium hidden sm:block",
                active ? "text-foreground" : done ? "text-amber-600" : "text-muted-foreground",
              ].join(" ")}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={[
                "mx-3 h-px flex-1 transition-colors",
                done ? "bg-amber-400" : "bg-border",
              ].join(" ")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          {title}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  )
}

function FormRow({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  const colMap: Record<number, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-5",
  }
  return (
    <div className={`grid gap-4 ${colMap[cols] ?? colMap[4]}`}>
      {children}
    </div>
  )
}

function Field({
  id, label, required, hint, children,
}: {
  id?: string; label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function UploadZone({
  preview, icon: Icon, label, sublabel, onChange,
}: {
  preview: string; icon: React.ElementType; label: string; sublabel: string; onChange: (f: File) => void
}) {
  return (
    <label className="group cursor-pointer">
      <input type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f) }} />
      <div className="relative flex flex-col items-center gap-2">
        <div className={[
          "relative h-24 w-24 overflow-hidden rounded-xl border-2 border-dashed transition-all",
          "group-hover:border-amber-400 group-hover:shadow-md",
          preview ? "border-amber-300 bg-amber-50/30" : "border-muted-foreground/25 bg-muted/30",
        ].join(" ")}>
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/50 group-hover:text-amber-500 transition-colors">
              <Icon className="h-7 w-7" />
              <span className="text-[9px] font-medium uppercase tracking-wide">{sublabel}</span>
            </div>
          )}
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      </div>
    </label>
  )
}

function AddressSection({
  prefix, title, values, onChange, sideAction, disabled,
}: {
  prefix: string
  title: string
  values: Record<string, string>
  onChange: (k: string, v: string) => void
  sideAction?: React.ReactNode
  disabled?: boolean
}) {
  const f = (key: string) => ({
    value: values[key] ?? "",
    disabled,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value),
  })
  return (
    <div className="space-y-5">
      <div className="flex min-h-[1.75rem] items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {sideAction}
      </div>
      <FormRow cols={2}>
        <Field id={`${prefix}house_no`} label="House / Door No.">
          <Input id={`${prefix}house_no`} placeholder="e.g. 12A" {...f("house_no")} />
        </Field>
        <Field id={`${prefix}street`} label="Street / Area">
          <Input id={`${prefix}street`} placeholder="e.g. Gandhi Nagar" {...f("street")} />
        </Field>
        <Field id={`${prefix}village`} label="Village / Town">
          <Input id={`${prefix}village`} placeholder="e.g. Coimbatore" {...f("village")} />
        </Field>
        <Field id={`${prefix}taluk`} label="Taluk">
          <Input id={`${prefix}taluk`} placeholder="e.g. Coimbatore North" {...f("taluk")} />
        </Field>
        <Field id={`${prefix}district`} label="District">
          <Input id={`${prefix}district`} placeholder="e.g. Coimbatore" {...f("district")} />
        </Field>
        <Field id={`${prefix}state`} label="State">
          <Input id={`${prefix}state`} placeholder="e.g. Tamil Nadu" {...f("state")} />
        </Field>
        <Field id={`${prefix}pin_code`} label="PIN Code">
          <Input id={`${prefix}pin_code`} placeholder="6-digit PIN" maxLength={6}
            disabled={disabled}
            value={values["pin_code"] ?? ""}
            onChange={(e) => onChange("pin_code", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field id={`${prefix}phone`} label="Phone">
          <Input id={`${prefix}phone`} placeholder="10-digit mobile" maxLength={10}
            disabled={disabled}
            value={values["phone"] ?? ""}
            onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))} />
        </Field>
      </FormRow>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerPage() {
  const router = useRouter()
  const [c, setC] = useState<Customer>(initialCustomer)
  // const [castes, setCastes] = useState<{ serial_no: string; caste_name: string }[]>([])

  useEffect(() => {
    fetch("/api/customers/caste", { credentials: "include" })
      .then((r) => r.json())
      // .then((d) => { if (d.success) setCastes(d.castes) })
      .catch(console.error)
  }, [])

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState("")
  const [signature, setSignature] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState("")
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("personal")
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [createdCustomer, setCreatedCustomer] = useState<CreatedCustomer | null>(null)

  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState({
    member_type: "member",
    board_resolution_number: "",
    board_resolution_date: "",
    ledger_folio_number: "",
  })
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrolledMembership, setEnrolledMembership] = useState<{ membership_no: string } | null>(null)

  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  useEffect(() => {
    if (!signature) return
    const url = URL.createObjectURL(signature)
    setSignaturePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [signature])

  const up = (patch: Partial<Customer>) => setC((prev) => ({ ...prev, ...patch }))

  const computedAge = c.dob
  ? (() => {
      const today = new Date();
      const dob = new Date(c.dob);

      let age = today.getFullYear() - dob.getFullYear();

      const hasHadBirthdayThisYear =
        today.getMonth() > dob.getMonth() ||
        (today.getMonth() === dob.getMonth() &&
          today.getDate() >= dob.getDate());

      if (!hasHadBirthdayThisYear) {
        age--;
      }

      return age;
    })()
  : null;


  const formatAadhar = (v: string) => v.replace(/(\d{4})(?=\d)/g, "$1 ").slice(0, 14)

  const TAB_ORDER: TabKey[] = ["personal", "address", "kycdetails"]
  const tabIndex = TAB_ORDER.indexOf(activeTab)

  // Completion score (informational only)
  const completionPct = useMemo(() => {
    const tracked = [
      c.full_name, c.father_name, c.gender, c.dob,
      c.phone, c.village, c.district, c.state,
      c.aadhar_id,
    ]
    return Math.round((tracked.filter(Boolean).length / tracked.length) * 100)
  }, [c])

  const altPhoneError =
    c.alt_phone.length > 0 && c.alt_phone.length !== 10
      ? "Must be 10 digits"
      : c.alt_phone.length === 10 && c.alt_phone === c.phone
      ? "Must differ from primary number"
      : null

  const canSubmit = !isSubmitting && !altPhoneError && c.full_name.trim().length > 0

  const handleCreateCustomer = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/customers/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreatedCustomer({
        customer_code: data.customer_code,
        full_name: c.full_name,
        father_name: c.father_name,
        phone: c.phone,
        aadhar_id: c.aadhar_id,
        email: c.email,
      })
      setIsSuccessOpen(true)
      setSameAsPermanent(false)
      setC(initialCustomer)
      setPhotoPreview("")
      setSignaturePreview("")
    } catch (e: any) {
      alert("Failed to create customer: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEnroll = () => {
    if (!createdCustomer) return
    setEnrollForm({
      member_type: "member",
      board_resolution_number: "",
      board_resolution_date: "",
      ledger_folio_number: "",
    })
    setEnrolledMembership(null)
    setEnrollError(null)
    setIsSuccessOpen(false)
    setIsEnrollOpen(true)
  }

  const canEnrollSubmit = !isEnrolling && enrollForm.member_type.length > 0

  const handleEnrollSubmit = async () => {
    if (!createdCustomer?.customer_code) return
    setIsEnrolling(true)
    setEnrollError(null)
    try {
      const res = await fetch("/api/memberships/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_code: createdCustomer.customer_code,
          member_type: enrollForm.member_type,
          board_resolution_number: enrollForm.board_resolution_number || null,
          board_resolution_date: enrollForm.board_resolution_date || null,
          ledger_folio_number: enrollForm.ledger_folio_number || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to enroll member")
      setEnrolledMembership({ membership_no: data.membership_no })
    } catch (e: any) {
      setEnrollError(e.message)
    } finally {
      setIsEnrolling(false)
    }
  }

  // ─── Permanent address from current ──────────────────────────────────────

  const copyCurrent = () => up({
    permanant_house_no: c.house_no,
    permanant_street:   c.street,
    permanant_village:  c.village,
    permanant_taluk:    c.taluk,
    permanant_district: c.district,
    permanant_state:    c.state,
    permanant_pin_code: c.pin_code,
    permanant_phone:    c.phone,
  })

  // Keep Permanent Address synchronized while the user edits Current Address
  useEffect(() => {
    if (!sameAsPermanent) return
    setC((prev) => ({
      ...prev,
      permanant_house_no: prev.house_no,
      permanant_street:   prev.street,
      permanant_village:  prev.village,
      permanant_taluk:    prev.taluk,
      permanant_district: prev.district,
      permanant_state:    prev.state,
      permanant_pin_code: prev.pin_code,
      permanant_phone:    prev.phone,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsPermanent, c.house_no, c.street, c.village, c.taluk, c.district, c.state, c.pin_code, c.phone])

  return (
    <DashboardWrapper>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">Create Customer</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Register a new customer in the banking system
            </p>
          </div>
          {/* Completion ring */}
          <div className="shrink-0 flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5">
            <div className="relative h-5 w-5">
              <svg className="rotate-[-90deg]" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
                <circle
                  cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeDasharray={`${(completionPct / 100) * 50.3} 50.3`}
                  className="text-amber-500 transition-all duration-500"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{completionPct}% done</span>
          </div>
        </div>

        {/* ── Identity card ── */}
        <Card className="overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          <CardContent className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">


              {/* Identity fields */}
              <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field id="customer_type" label="Customer Type">
                  <Select
                    value={c.customer_type as string}
                    onValueChange={(v) => up({ customer_type: v })}
                  >
                    <SelectTrigger id="customer_type">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="full_name" label="Full Name" required>
                  <Input
                    id="full_name"
                    placeholder="e.g. Ravi Kumar"
                    value={c.full_name}
                    onChange={(e) => up({ full_name: e.target.value })}
                  />
                </Field>

                <Field id="father_name" label="Father's Name" required>
                  <Input
                    id="father_name"
                    placeholder="e.g. Suresh Kumar"
                    value={c.father_name}
                    onChange={(e) => up({ father_name: e.target.value })}
                  />
                </Field>
              </div>
              
              {/* Upload zones */}
              <div className="flex gap-5 sm:gap-4 shrink-0 space-y-2">
                <UploadZone
                  preview={photoPreview}
                  icon={Camera}
                  label="Photo"
                  sublabel="Upload"
                  onChange={(f) => setPhoto(f)}
                />
                <UploadZone
                  preview={signaturePreview}
                  icon={PenTool}
                  label="Signature"
                  sublabel="Upload"
                  onChange={(f) => setSignature(f)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Step indicator ── */}
        <div className="px-1">
          <StepIndicator current={tabIndex} />
        </div>

        {/* ── Main form card ── */}
        <Card>
          <CardContent className="p-0">

            {/* ───────── PERSONAL DETAILS ───────── */}
            {activeTab === "personal" && (
              <div className="p-6 space-y-8">

                <FieldGroup title="Basic Information">
                  <FormRow cols={5}>
                    <Field id="dob" label="Date of Birth">
                      <Input
                        id="dob" type="date"
                        value={c.dob}
                        onChange={(e) => up({ dob: e.target.value })}
                      />
                    </Field>
                    <Field id="age" label="Age">
                      <Input
                        id="age" readOnly
                        value={computedAge !== null ? String(computedAge) : ""}
                        placeholder="—"
                        className="bg-muted/50 cursor-default text-muted-foreground"
                      />
                    </Field>
                    <Field id="gender" label="Gender">
                      <Select value={c.gender} onValueChange={(v) => up({ gender: v })}>
                        <SelectTrigger id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="marital_status" label="Marital Status">
                      <Select value={c.marital_status} onValueChange={(v) => up({ marital_status: v })}>
                        <SelectTrigger id="marital_status"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {/* <Field id="blood_group" label="Blood Group">
                      <Select value={c.blood_group} onValueChange={(v) => up({ blood_group: v })}>
                        <SelectTrigger id="blood_group"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["A+","A−","B+","B−","AB+","AB−","O+","O−"].map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field> */}
                  </FormRow>
                </FieldGroup>

                <FieldGroup title="Socio-Economic Details">
                  <FormRow cols={5}>
                    <Field id="spouse_name" label="Spouse Name">
                      <Input
                        id="spouse_name" placeholder="If applicable"
                        value={c.spouse_name}
                        onChange={(e) => up({ spouse_name: e.target.value })}
                      />
                    </Field>
                    <Field id="religion" label="Religion">
                      <Select value={c.religion} onValueChange={(v) => up({ religion: v })}>
                        <SelectTrigger id="religion"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hinduism">Hinduism</SelectItem>
                          <SelectItem value="Christianity">Christianity</SelectItem>
                          <SelectItem value="Islam">Islam</SelectItem>
                          <SelectItem value="Buddhism">Buddhism</SelectItem>
                          <SelectItem value="Sikhism">Sikhism</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="caste_category" label="Caste Category">
                      <Select value={c.caste_category} onValueChange={(v) => up({ caste_category: v })}>
                        <SelectTrigger id="caste_category"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="BC">BC</SelectItem>
                          <SelectItem value="DNC">DNC</SelectItem>
                          <SelectItem value="MBC">MBC</SelectItem>
                          <SelectItem value="OC">OC</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="ST">ST</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {/* <Field id="caste" label="Caste">
                      <Select value={c.caste as string} onValueChange={(v) => up({ caste: v })}>
                        <SelectTrigger id="caste"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {castes.map((ct) => (
                            <SelectItem key={ct.serial_no} value={ct.caste_name}>{ct.caste_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field> */}
                    <Field id="occupation" label="Occupation">
                      {/* <Input
                        id="occupation" placeholder="e.g. Farmer"
                        value={c.occupation}
                        onChange={(e) => up({ occupation: e.target.value })}
                      /> */}
                      <Select value={c.occupation} onValueChange={(v) => up({ occupation: v })}>
                        <SelectTrigger id="occupation"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Farmer">Farmer</SelectItem>
                          <SelectItem value="Cooperative">Cooperative</SelectItem>
                          <SelectItem value="Goverment/Public Sector">Goverment/Public Sector</SelectItem>
                          <SelectItem value="Private Sector Job">Private Sector Job</SelectItem>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Self Employed / Business">Self Employed / Business</SelectItem>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FormRow>
                </FieldGroup>

                <FieldGroup title="Education & Income">
                  <FormRow cols={3}>
                    <Field id="qualification" label="Qualification">
                      <Select value={c.qualification} onValueChange={(v) => up({ qualification: v })}>
                        <SelectTrigger id="qualification"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No Formal Education">No Formal Education</SelectItem>
                          <SelectItem value="Higher Secondery">Higher Secondery</SelectItem>
                          <SelectItem value="SSLC">SSLC</SelectItem>
                          <SelectItem value="Diploma /ITI">Diploma /ITI</SelectItem>
                          <SelectItem value="Graduate">Graduate</SelectItem>
                          <SelectItem value="Post graduate">Post graduate</SelectItem>
                          <SelectItem value="Professional / Doctoral">Professional / Doctoral</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="qualification_details" label="Qualification Details">
                      <Input
                        id="qualification_details" placeholder="e.g. Computer Science"
                        value={c.qualification_details}
                        onChange={(e) => up({ qualification_details: e.target.value })}
                      />
                    </Field>
                    <Field id="anual_income" label="Annual Income (₹)">
                      <Input
                        id="anual_income" type="number" min="0" placeholder="e.g. 120000"
                        value={c.anual_income}
                        onChange={(e) => up({ anual_income: e.target.value })}
                      />
                    </Field>
                  </FormRow>
                </FieldGroup>

                <FieldGroup title="Bank Account Details">
                  <FormRow cols={3}>
                    <Field id="dccb_account_number" label="DCCB Account Number">
                      <Input
                        id="dccb_account_number" placeholder="Enter DCCB Account Number"
                        value={c.dccb_account_number}
                        maxLength={9}
                        onChange={(e) => up({ dccb_account_number: e.target.value })}
                      />
                    </Field>
                    
                    <Field id="dccb_Branch" label="DCCB Branch">
                      <Input
                        id="dccb_Branch" placeholder="Enter DCCB Branch"
                        value={c.dccb_Branch}
                        onChange={(e) => up({ dccb_Branch: e.target.value })}
                      />
                    </Field>
                  </FormRow>
                </FieldGroup>

              </div>
            )}

            {/* ───────── ADDRESS ───────── */}
            {activeTab === "address" && (
              <div className="p-6">
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5 min-[1200px]:gap-6 items-start">

                  {/* Current address card */}
                  <Card className="border shadow-sm">
                    <CardContent className="p-4 sm:p-5 lg:p-6 space-y-6">
                      <AddressSection
                        prefix="cur_"
                        title="Current Address"
                        values={{
                          house_no: c.house_no, street: c.street, village: c.village,
                          taluk: c.taluk, district: c.district, state: c.state,
                          pin_code: c.pin_code, phone: c.phone,
                        }}
                        onChange={(k, v) => up({ [k]: v } as any)}
                      />

                      <div className="h-px bg-border" />

                      {/* Contact details */}
                      <FormRow cols={2}>
                        <Field id="phone" label="Mobile Number" required>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              id="phone" className="pl-8" placeholder="10-digit mobile"
                              maxLength={10} value={c.phone}
                              onChange={(e) => up({ phone: e.target.value.replace(/\D/g, "") })}
                            />
                          </div>
                        </Field>
                        <Field id="alt_phone" label="Alternate Mobile" hint={altPhoneError ?? undefined}>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              id="alt_phone"
                              className={["pl-8", altPhoneError ? "border-destructive focus-visible:ring-destructive" : ""].join(" ")}
                              placeholder="Optional"
                              maxLength={10} value={c.alt_phone}
                              onChange={(e) => up({ alt_phone: e.target.value.replace(/\D/g, "") })}
                            />
                          </div>
                        </Field>
                        <Field id="email" label="Email Address">
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              id="nc_email" type="email" className="pl-8"
                              placeholder="john.doe@email.com"
                              value={c.email}
                              onChange={(e) => up({ email: e.target.value })}
                            />
                          </div>
                        </Field>
                      </FormRow>
                    </CardContent>
                  </Card>

                  {/* Permanent address card */}
                  <Card className="border shadow-sm">
                    <CardContent className="p-4 sm:p-5 lg:p-6 space-y-6">
                      <AddressSection
                        prefix="perm_"
                        title="Permanent Address"
                        disabled={sameAsPermanent}
                        values={{
                          house_no: c.permanant_house_no, street: c.permanant_street,
                          village: c.permanant_village, taluk: c.permanant_taluk,
                          district: c.permanant_district, state: c.permanant_state,
                          pin_code: c.permanant_pin_code, phone: c.permanant_phone,
                        }}
                        onChange={(k, v) => up({ [`permanant_${k}`]: v } as any)}
                        sideAction={
                          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5">
                            <Checkbox
                              id="same_as_permanent"
                              checked={sameAsPermanent}
                              onCheckedChange={(checked: boolean) => setSameAsPermanent(checked)}
                            />
                            <Label htmlFor="same_as_permanent" className="cursor-pointer text-xs font-medium text-amber-800">
                              Same as Current Address
                            </Label>
                          </div>
                        }
                      />
                    </CardContent>
                  </Card>

                </div>
              </div>
            )}

            {/* ───────── KYC DETAILS ───────── */}
            {activeTab === "kycdetails" && (
              <div className="p-6">
                <div className="rounded-xl border overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_2fr_90px] gap-4 bg-muted/60 px-5 py-3 border-b">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Document</span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Number</span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">Status</span>
                  </div>

                  {[
                    {
                      label: "Aadhaar",
                      icon: ShieldCheck,
                      value: c.aadhar_id,
                      placeholder: "1234 5678 9123",
                      display: formatAadhar(c.aadhar_id),
                      onChange: (v: string) => up({ aadhar_id: v.replace(/\D/g, "").slice(0, 12) }),
                      maxLength: 14,
                      required: true,
                    },
                    {
                      label: "PAN Card",
                      icon: Building2,
                      value: c.pan_card_number,
                      placeholder: "ABCDE1234F",
                      onChange: (v: string) => up({ pan_card_number: v.toUpperCase() }),
                      required: false,
                    },
                    {
                      label: "Ration Card",
                      icon: Building2,
                      value: c.ration_no,
                      placeholder: "Enter ration number",
                      onChange: (v: string) => up({ ration_no: v }),
                      required: false,
                    },
                    {
                      label: "Ration Card Type",
                      icon: Building2,
                      type: "select" as const,
                      value: c.ration_card_type,
                      placeholder: "Select One",
                      options: ["PHH", "NPHH", "NPHH-S", "NPHH-NC", "PHH AAY", "Others"],
                      onChange: (v: string) => up({ ration_card_type: v }),
                      required: false,
                    },
                    {
                      label: "Voter ID",
                      icon: Building2,
                      value: c.voter_id,
                      placeholder: "e.g. ABC1234567",
                      onChange: (v: string) => up({ voter_id: v.toUpperCase() }),
                      required: false,
                    },
                    {
                      label: "Driving License",
                      icon: Building2,
                      value: c.driving_license_no,
                      placeholder: "e.g. TN0120230012345",
                      onChange: (v: string) => up({ driving_license_no: v.toUpperCase() }),
                      required: false,
                    },
                  ].map(({ label, value, placeholder, display, onChange, maxLength, required, type, options }, i, arr) => {
                    const entered = (value ?? "").trim().length > 0
                    return (
                      <div
                        key={label}
                        className={[
                          "grid grid-cols-[1fr_2fr_90px] gap-4 items-center px-5 py-3.5 transition-colors",
                          "hover:bg-muted/20",
                          i < arr.length - 1 ? "border-b" : "",
                        ].join(" ")}
                      >
                        <span className="text-sm font-medium">{label}</span>
                        {type === "select" ? (
                          <Select value={value ?? ""} onValueChange={(v) => onChange(v)}>
                            <SelectTrigger className="h-8 text-sm max-w-xs">
                              <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {options?.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder={placeholder}
                            value={display ?? value ?? ""}
                            maxLength={maxLength}
                            onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
                            className="h-8 text-sm max-w-xs"
                          />
                        )}
                        <div className="flex justify-center">
                          {entered ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[10px] font-semibold">
                              <Check className="h-2.5 w-2.5 mr-1" /> Entered
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                              {required ? "Required" : "Optional"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Footer nav ── */}
            <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
              <div>
                {tabIndex > 0 && (
                  <Button variant="ghost" className="gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveTab(TAB_ORDER[tabIndex - 1])}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Step {tabIndex + 1} of {TAB_ORDER.length}
                </span>
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                {tabIndex < TAB_ORDER.length - 1 ? (
                  <Button
                    className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => setActiveTab(TAB_ORDER[tabIndex + 1])}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateCustomer}
                    disabled={!canSubmit}
                    className="gap-2 bg-amber-600 hover:bg-amber-700 text-white min-w-[150px]"
                  >
                    {isSubmitting
                      ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</>
                      : <><Check className="h-3.5 w-3.5" /> Create Customer</>
                    }
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Success dialog ── */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="pt-0.5">
                <DialogTitle className="text-lg">Customer Created!</DialogTitle>
                <DialogDescription className="mt-0.5">
                  The customer has been registered in the system.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {createdCustomer && (
            <div className="mt-1 rounded-xl border overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 border-b">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Customer Information
                </p>
              </div>
              <div className="divide-y text-sm">
                {[
                  ["Customer Code", createdCustomer.customer_code],
                  ["Full Name",     createdCustomer.full_name],
                  ["Father's Name", createdCustomer.father_name],
                  ...(createdCustomer.phone     ? [["Mobile",  createdCustomer.phone]]    : []),
                  ...(createdCustomer.aadhar_id ? [["Aadhaar", formatAadhar(createdCustomer.aadhar_id)]] : []),
                  ...(createdCustomer.email     ? [["Email",   createdCustomer.email]]    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:justify-between">
            <Button variant="outline"
              onClick={() => { setIsSuccessOpen(false); setCreatedCustomer(null) }}>
              Close
            </Button>
            <Button
              onClick={handleOpenEnroll}
              disabled={!createdCustomer?.customer_code}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <UserPlus className="h-4 w-4" />
              Enroll as Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Enroll as Member dialog ── */}
      <Dialog
        open={isEnrollOpen}
        onOpenChange={(open) => {
          setIsEnrollOpen(open)
          if (!open) {
            setEnrolledMembership(null)
            setEnrollError(null)
            setCreatedCustomer(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {!enrolledMembership ? (
            <>
              <DialogHeader>
                <DialogTitle>Enroll as Member</DialogTitle>
                <DialogDescription>
                  Create a membership for {createdCustomer?.full_name} using the customer just registered.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-1">
                <Field id="enroll_member_type" label="Account Type" required>
                  <Select
                    value={enrollForm.member_type}
                    onValueChange={(v) => setEnrollForm((p) => ({ ...p, member_type: v }))}
                  >
                    <SelectTrigger id="enroll_member_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="associate">Nominal Member</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <FormRow cols={2}>
                  <Field id="enroll_board_resolution_number" label="Board Resolution Number">
                    <Input
                      id="enroll_board_resolution_number"
                      placeholder="e.g. BR/2026/014"
                      value={enrollForm.board_resolution_number}
                      onChange={(e) => setEnrollForm((p) => ({ ...p, board_resolution_number: e.target.value }))}
                    />
                  </Field>
                  <Field id="enroll_board_resolution_date" label="Board Resolution Date">
                    <Input
                      id="enroll_board_resolution_date"
                      type="date"
                      value={enrollForm.board_resolution_date}
                      onChange={(e) => setEnrollForm((p) => ({ ...p, board_resolution_date: e.target.value }))}
                    />
                  </Field>
                </FormRow>

                <Field id="enroll_ledger_folio_number" label="Ledger Folio Number">
                  <Input
                    id="enroll_ledger_folio_number"
                    placeholder="e.g. LF-1029"
                    value={enrollForm.ledger_folio_number}
                    onChange={(e) => setEnrollForm((p) => ({ ...p, ledger_folio_number: e.target.value }))}
                  />
                </Field>

                {enrollError && (
                  <p className="text-sm text-destructive">{enrollError}</p>
                )}
              </div>

              <DialogFooter className="mt-2 gap-2 sm:justify-between">
                <Button variant="outline" onClick={() => setIsEnrollOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleEnrollSubmit}
                  disabled={!canEnrollSubmit}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white min-w-[150px]"
                >
                  {isEnrolling
                    ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Enrolling…</>
                    : <><Check className="h-3.5 w-3.5" /> Create Member</>
                  }
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="pt-0.5">
                    <DialogTitle className="text-lg">Member Enrolled!</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      Membership number{" "}
                      <span className="font-semibold text-foreground">{enrolledMembership.membership_no}</span>{" "}
                      has been created.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <DialogFooter className="mt-4 gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEnrollOpen(false)
                    setEnrolledMembership(null)
                    setCreatedCustomer(null)
                    router.push("/members")
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => router.push(`/members/share-deposit?memberNo=${enrolledMembership.membership_no}`)}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Share Deposit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  )
}
