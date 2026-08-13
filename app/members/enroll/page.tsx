"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Camera, PenTool, ArrowLeft, ArrowUpCircle, Search, User, MapPin,
  ShieldCheck, Building2, CheckCircle2, AlertCircle, Pencil, Phone,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"

type NewMemberForm = {
  spouse_name: string | number | readonly string[] | undefined
  boardresolutiondate: string | number | readonly string[] | undefined
  board_resolution_number: string | number | readonly string[] | undefined
  ledger_folio_number: string | number | readonly string[] | undefined
  aadhaar_no: string
  customer_code?: string
  full_name: string
  father_name?: string
  gender: string
  customer_type?: string
  house_no?: string
  street?: string
  village?: string
  thaluk?: string
  district?: string
  state?: string
  pincode?: string
  email: string
  phone: string
  address: string
  member_type: string
  date_of_birth: string
  dob?: string
  pan_no?: string
  ration_no?: string
  driving_license_no?: string
  id_type: string
  id_number: string
  spouseName?: string
  boardResolutionNumber?: string
  boardResolutionDate?: string
  ledgerFolioNumber?: string
}

// ─── Sub-components (match the visual language of the Create Customer screen) ──

function FieldGroup({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-3.5 w-3.5 text-amber-500" />}
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
  id, label, required, hint, className, children,
}: {
  id?: string; label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
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
  preview: string | null; icon: React.ElementType; label: string; sublabel: string; onChange: (f: File) => void
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

export default function EnrollMemberPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSearching, setIsSearching] = useState(false)
  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  const [fieldsReadOnly, setFieldsReadOnly] = useState(true)
  const [memberFieldsReadOnly, setMemberFieldsReadOnly] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCustomerNotFoundOpen, setIsCustomerNotFoundOpen] = useState(false)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [createdMemberNo, setCreatedMemberNo] = useState<string>("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [signature, setSignature] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  const [newMember, setNewMember] = useState<NewMemberForm>({
    aadhaar_no: "",
    customer_code: "",
    full_name: "",
    father_name: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    member_type: "member",
    date_of_birth: "",
    id_type: "",
    id_number: "",
    spouseName: "",
    boardResolutionNumber: "",
    spouse_name: "",
    boardresolutiondate: "",
    board_resolution_number: "",
    ledger_folio_number: "",
  })

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

  // Function to search by Aadhaar
  const searchByAadhaar = useCallback(async (aadhaarNo: string) => {
    if (!aadhaarNo || aadhaarNo.length < 12) {
      return false
    }

    setIsSearching(true)
    try {
      const response = await fetch("/api/customers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar_no: aadhaarNo }),
      })

      const data = await response.json()
      console.log("Aadhaar lookup response:", data)

      if (data.found && data.customer) {
        const customer = data.customer
        setNewMember(prev => ({
          ...prev,
          aadhaar_no: aadhaarNo,
          customer_code: customer.customer_code,
          customer_type: customer.customer_type || "",
          full_name: customer.full_name || "",
          father_name: customer.father_name || "",
          gender: customer.gender || "",
          email: customer.email || "",
          phone: customer.mobile_no || "",
          date_of_birth: customer.date_of_birth || "",
          spouseName: customer.spouse_name || "",
          house_no: customer.house_no || "",
          street: customer.street || "",
          village: customer.village || "",
          thaluk: customer.taluk || "",
          district: customer.district || "",
          state: customer.state || "",
          pincode: customer.pincode || "",
          pan_no: customer.pan_no || "",
          ration_no: customer.ration_no || "",
          driving_license_no: customer.driving_license_no || "",
          address: `${customer.house_no || ""}, ${customer.street || ""} ,${customer.village || ""} ,${customer.thaluk || ""} ,${customer.district || ""} ,${customer.state || ""} - ${customer.pincode || ""}`,
        }))
        setFieldsReadOnly(true)
        setMemberFieldsReadOnly(false)
        return true
      } else {
        setIsCustomerNotFoundOpen(true)
        return false
      }
    } catch (error) {
      console.error("Aadhaar lookup error:", error)
      alert("Failed to lookup customer. Please try again.")
      return false
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Auto-search when aadhaar param is present in URL (from Create Customer flow)
  useEffect(() => {
    const aadhaarFromUrl = searchParams.get("aadhaar")
    if (aadhaarFromUrl && !hasAutoSearched) {
      setHasAutoSearched(true)
      setNewMember(prev => ({ ...prev, aadhaar_no: aadhaarFromUrl }))
      searchByAadhaar(aadhaarFromUrl)
    }
  }, [searchParams, hasAutoSearched, searchByAadhaar])

  const handleAadhaarSearch = async () => {
    if (!newMember.aadhaar_no || newMember.aadhaar_no.length < 12) {
      alert("Please enter a valid 12-digit Aadhaar number")
      return
    }
    await searchByAadhaar(newMember.aadhaar_no)
  }

  const handleEnrollMember = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/memberships/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCreatedMemberNo(data.membership_no)
      setIsSuccessDialogOpen(true)

      // Reset form
      setNewMember({
        aadhaar_no: "",
        customer_code: "",
        full_name: "",
        father_name: "",
        gender: "",
        email: "",
        phone: "",
        address: "",
        member_type: "member",
        date_of_birth: "",
        dob: "",
        id_type: "",
        id_number: "",
        spouse_name: "",
        boardresolutiondate: "",
        board_resolution_number: "",
        ledger_folio_number: "",
      })
      setFieldsReadOnly(true)
      setMemberFieldsReadOnly(true)
    } catch (e: any) {
      alert("Failed to create member: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardWrapper>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/members")} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight leading-tight"> Register a new Membership details</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Search by Aadhaar to enroll an existing customer as a member
            </p>
          </div>
        </div>

        {/* ── Customer Lookup ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-amber-500" />
              Customer Lookup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <Field id="customer_type_select" label="Operation Type" className="md:col-span-1">
                <select
                  id="customer_type_select"
                  className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                >
                  <option value="">Select Category</option>
                  <option value="individual">Individual</option>
                  <option value="organization">Organization</option>
                </select>
              </Field>
              <Field id="aadhaar" label="Aadhaar Card Number" required className="md:col-span-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="aadhaar"
                      className="pl-8"
                      placeholder="Enter 12-digit Aadhaar number"
                      maxLength={12}
                      value={newMember.aadhaar_no}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        setNewMember({ ...newMember, aadhaar_no: value })
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleAadhaarSearch}
                    disabled={isSearching || newMember.aadhaar_no.length !== 12}
                    className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isSearching
                      ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Searching…</>
                      : <><Search className="h-3.5 w-3.5" /> Search</>
                    }
                  </Button>
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* ── Member snapshot ── */}
        <Card className="overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
          <CardContent className="p-5">
            <div className="flex flex-col grid gap-5 sm:flex-row sm:items-start sm:gap-6 lg:grid-cols-3">


              {/* Identity fields */}
              <div className="flex-1 grid grid-cols-2 col-span-2 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                <Field id="customer_type" label="Customer Type">
                  <Select
                    value={newMember.customer_type}
                    disabled={true}
                    onValueChange={(value) => setNewMember({ ...newMember, customer_type: value })}
                  >
                    <SelectTrigger id="customer_type" className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                
                <Field id="name" label="Full Name" required>
                  <Input
                    id="name"
                    placeholder="Full Name"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  />
                </Field>
                <Field label="Account Type">
                  <Select
                    value={newMember.member_type}
                    onValueChange={(value) => setNewMember({ ...newMember, member_type: value })}
                  >
                    <SelectTrigger className={`${memberFieldsReadOnly ? "bg-muted" : ""} w-full`} defaultValue={0}>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" >Select Account Type</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="associate">Nominal Member</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>


                <Field id="father_name" label="Father's Name" required>
                  <Input
                    id="father_name"
                    placeholder="Father's Name"
                    value={newMember.father_name}
                    onChange={(e) => setNewMember({ ...newMember, father_name: e.target.value })}
                  />
                </Field>
              </div>
              
              {/* Upload zones */}
              <div className="flex justify-end gap-5 sm:gap-4 shrink-0 space-y-2 col-span-1">
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

        {/* ── Tabs ── */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="personal" className="w-full">
              <div className="border-b px-6 pt-5">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-5">
                  <TabsTrigger value="personal" className="gap-1.5 data-[state=active]:text-amber-700">
                    <User className="h-3.5 w-3.5" /> Personal Details
                  </TabsTrigger>
                  <TabsTrigger value="address" className="gap-1.5 data-[state=active]:text-amber-700">
                    <MapPin className="h-3.5 w-3.5" /> Address
                  </TabsTrigger>
                  <TabsTrigger value="kyc" className="gap-1.5 data-[state=active]:text-amber-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> KYC Details
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* PERSONAL DETAILS TAB */}
              <TabsContent value="personal" className="p-6 space-y-8 mt-0">
                <FieldGroup title="Basic Information" icon={User}>
                  <FormRow cols={3}>
                    <Field label="Date of Birth">
                      <Input
                        value={newMember.date_of_birth}
                        type="date"
                        onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </Field>
                    <Field label="Gender">
                      <Select
                        value={newMember.gender}
                        onValueChange={(value) => setNewMember({ ...newMember, gender: value })}
                      >
                        <SelectTrigger className={`w-full ${fieldsReadOnly ? "bg-muted" : ""}`}>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Spouse Name">
                      <Input
                        value={newMember.spouseName}
                        onChange={(e) => setNewMember({ ...newMember, spouseName: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </Field>
                  </FormRow>
                </FieldGroup>

                <FieldGroup title="Board Resolution & Ledger">
                  <FormRow cols={3}>
                    <Field label="Board Resolution Number">
                      <Input
                        value={newMember.boardResolutionNumber}
                        onChange={(e) => setNewMember({ ...newMember, boardResolutionNumber: e.target.value })}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </Field>
                    <Field label="Board Resolution Date">
                      <Input
                        type="date"
                        value={newMember.boardResolutionDate}
                        onChange={(e) => setNewMember({ ...newMember, boardResolutionDate: e.target.value })}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </Field>
                    <Field label="Ledger Folio Number">
                      <Input
                        value={newMember.ledgerFolioNumber}
                        onChange={(e) => setNewMember({ ...newMember, ledgerFolioNumber: e.target.value })}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </Field>
                  </FormRow>
                </FieldGroup>
              </TabsContent>

              {/* ADDRESS TAB */}
              <TabsContent value="address" className="p-6 mt-0">
                <FieldGroup title="Address & Contact" icon={MapPin}>
                  <FormRow cols={3}>
                    <Field id="address" label="Address" className="sm:col-span-2">
                      <Input
                        id="address"
                        placeholder="123 Main St, City, State ZIP"
                        value={newMember.address}
                        onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </Field>
                    <Field label="Mobile Number">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className={`pl-8 ${fieldsReadOnly ? "bg-muted" : ""}`}
                          value={newMember.phone}
                          readOnly={fieldsReadOnly}
                        />
                      </div>
                    </Field>
                  </FormRow>
                </FieldGroup>
              </TabsContent>

              {/* KYC TAB */}
              <TabsContent value="kyc" className="p-6 mt-0">
                <FieldGroup title="KYC Documents" icon={ShieldCheck}>
                  <FormRow cols={4}>
                    <Field label="Aadhaar Number">
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className={`pl-8 ${fieldsReadOnly ? "bg-muted" : ""}`}
                          value={newMember.aadhaar_no}
                          onChange={(e) => setNewMember({ ...newMember, id_type: e.target.value })}
                          readOnly={fieldsReadOnly}
                        />
                      </div>
                    </Field>
                    <Field label="PAN Number">
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className={`pl-8 ${fieldsReadOnly ? "bg-muted" : ""}`}
                          value={newMember.pan_no}
                          onChange={(e) => setNewMember({ ...newMember, id_number: e.target.value })}
                          readOnly={fieldsReadOnly}
                        />
                      </div>
                    </Field>
                    <Field label="Driving License Number">
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className={`pl-8 ${fieldsReadOnly ? "bg-muted" : ""}`}
                          value={newMember.driving_license_no}
                          onChange={(e) => setNewMember({ ...newMember, id_number: e.target.value })}
                          readOnly={fieldsReadOnly}
                        />
                      </div>
                    </Field>
                    <Field label="Ration Card Number">
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className={`pl-8 ${fieldsReadOnly ? "bg-muted" : ""}`}
                          value={newMember.ration_no}
                          onChange={(e) => setNewMember({ ...newMember, id_number: e.target.value })}
                          readOnly={fieldsReadOnly}
                        />
                      </div>
                    </Field>
                  </FormRow>
                </FieldGroup>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/members")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnrollMember}
            disabled={isSubmitting || memberFieldsReadOnly || !newMember.full_name}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white min-w-[150px]"
          >
            {isSubmitting
              ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</>
              : "Create Member"
            }
          </Button>
        </div>
      </div>

      {/* Customer Not Found Dialog */}
      <AlertDialog open={isCustomerNotFoundOpen} onOpenChange={setIsCustomerNotFoundOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="pt-0.5">
                <AlertDialogTitle className="text-lg">Customer Not Found</AlertDialogTitle>
                <AlertDialogDescription className="mt-0.5">
                  This member is not a registered customer yet. Please create a customer and try again.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2 sm:justify-between">
            <AlertDialogAction
              onClick={() => setIsCustomerNotFoundOpen(false)}
              className="bg-transparent border border-input hover:bg-accent hover:text-accent-foreground text-foreground"
            >
              Close
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setIsCustomerNotFoundOpen(false)
                router.push("/customers")
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Create Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="pt-0.5">
                <AlertDialogTitle className="text-lg">Member Created Successfully!</AlertDialogTitle>
                <AlertDialogDescription className="mt-0.5">
                  New member has been enrolled in the system.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Membership Information
              </p>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Member No</span>
              <span className="font-mono font-semibold">{createdMemberNo}</span>
            </div>
          </div>

          <AlertDialogFooter className="mt-2 gap-2 sm:justify-between">
            <AlertDialogAction
              onClick={() => {
                setIsSuccessDialogOpen(false)
                router.push("/members")
              }}
              className="bg-transparent border border-input hover:bg-accent hover:text-accent-foreground text-foreground"
            >
              Close
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setIsSuccessDialogOpen(false)
                router.push(`/members/share-deposit?memberNo=${createdMemberNo}`)
              }}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Share Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
