"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
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
import { Camera, PenTool, ArrowLeft, ArrowUpCircle } from "lucide-react"
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

export default function EnrollMemberPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)
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

  const handleAadhaarSearch = async () => {
    if (!newMember.aadhaar_no || newMember.aadhaar_no.length < 12) {
      alert("Please enter a valid 12-digit Aadhaar number")
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch("/api/customers/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar_no: newMember.aadhaar_no }),
      })

      const data = await response.json()

      if (data.found && data.customer) {
        const customer = data.customer
        setNewMember({
          ...newMember,
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
        })
        setFieldsReadOnly(true)
        setMemberFieldsReadOnly(false)
      } else {
        setIsCustomerNotFoundOpen(true)
      }
    } catch (error) {
      console.error("Aadhaar lookup error:", error)
      alert("Failed to lookup customer. Please try again.")
    } finally {
      setIsSearching(false)
    }
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
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/members")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Enroll New Member</h1>
            <p className="text-sm text-muted-foreground">
              Search by Aadhaar to enroll an existing customer as a member
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Customer Lookup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="customer_type_select">Category</Label>
                <select
                  id="customer_type_select"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select Category</option>
                  <option value="individual">Individual</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="aadhaar">Aadhaar Card Number *</Label>
                <div className="flex gap-2">
                  <Input
                    id="aadhaar"
                    placeholder="Enter 12-digit Aadhaar number"
                    maxLength={12}
                    value={newMember.aadhaar_no}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "")
                      setNewMember({ ...newMember, aadhaar_no: value })
                    }}
                  />
                  <Button
                    onClick={handleAadhaarSearch}
                    disabled={isSearching || newMember.aadhaar_no.length !== 12}
                    className="shrink-0"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Member Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Left: Type and Account */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <select
                    id="customer_type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newMember.customer_type}
                    onChange={(e) => setNewMember({ ...newMember, customer_type: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    <option value="individual">Individual</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select
                    value={newMember.member_type}
                    onValueChange={(value) => setNewMember({ ...newMember, member_type: value })}
                  >
                    <SelectTrigger className={`${memberFieldsReadOnly ? "bg-muted" : ""} w-full`}>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="associate">Nominal Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Middle: Name fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Full Name"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="father_name">Father Name *</Label>
                  <Input
                    id="father_name"
                    placeholder="Father's Name"
                    value={newMember.father_name}
                    onChange={(e) => setNewMember({ ...newMember, father_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Right: Photo & Signature */}
              <div className="flex gap-6 items-start justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  />
                  <div className="h-28 w-28 border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-muted transition overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Photo Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Camera className="h-6 w-6" />
                        <span className="text-xs">Photo</span>
                      </div>
                    )}
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => setSignature(e.target.files?.[0] || null)}
                  />
                  <div className="h-28 w-28 border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-muted transition overflow-hidden bg-card">
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature Preview" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <PenTool className="h-6 w-6" />
                        <span className="text-xs">Signature</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="personal">Personal Details</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="kyc">KYC Details</TabsTrigger>
              </TabsList>

              {/* PERSONAL DETAILS TAB */}
              <TabsContent value="personal">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        value={newMember.date_of_birth}
                        type="date"
                        onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
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
                    </div>
                    <div className="space-y-2">
                      <Label>Spouse Name</Label>
                      <Input
                        value={newMember.spouseName}
                        onChange={(e) => setNewMember({ ...newMember, spouseName: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Board Resolution Number</Label>
                      <Input
                        value={newMember.boardResolutionNumber}
                        onChange={(e) => setNewMember({ ...newMember, boardResolutionNumber: e.target.value })}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Board Resolution Date</Label>
                      <Input
                        type="date"
                        value={newMember.boardResolutionDate}
                        onChange={(e) => setNewMember({ ...newMember, boardResolutionDate: e.target.value })}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ledger Folio Number</Label>
                      <Input
                        value={newMember.ledgerFolioNumber}
                        onChange={(e) => setNewMember({ ...newMember, ledgerFolioNumber: e.target.value })}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ADDRESS TAB */}
              <TabsContent value="address">
                <div className="py-4 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, State ZIP"
                    value={newMember.address}
                    onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                    readOnly={fieldsReadOnly}
                    className={fieldsReadOnly ? "bg-muted" : ""}
                  />
                </div>
              </TabsContent>

              {/* KYC TAB */}
              <TabsContent value="kyc">
                <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>ID Type</Label>
                    <Input
                      value={newMember.id_type}
                      onChange={(e) => setNewMember({ ...newMember, id_type: e.target.value })}
                      readOnly={fieldsReadOnly}
                      className={fieldsReadOnly ? "bg-muted" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ID Number</Label>
                    <Input
                      value={newMember.id_number}
                      onChange={(e) => setNewMember({ ...newMember, id_number: e.target.value })}
                      readOnly={fieldsReadOnly}
                      className={fieldsReadOnly ? "bg-muted" : ""}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer Actions */}
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
          >
            {isSubmitting ? "Creating..." : "Create Member"}
          </Button>
        </div>
      </div>

      {/* Customer Not Found Dialog */}
      <AlertDialog open={isCustomerNotFoundOpen} onOpenChange={setIsCustomerNotFoundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Customer Not Found</AlertDialogTitle>
            <AlertDialogDescription>
              This member is not a registered customer yet. Please create a customer and try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsCustomerNotFoundOpen(false)}>Close</AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setIsCustomerNotFoundOpen(false)
                router.push("/customers")
              }}
              className="bg-primary"
            >
              Create Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Member Created Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-700">New member has been enrolled with the following details:</p>
                <p className="mt-2 text-lg font-semibold text-green-800">
                  {"Member No: "}<span className="font-mono">{createdMemberNo}</span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:justify-end">
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Share Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardWrapper>
  )
}
