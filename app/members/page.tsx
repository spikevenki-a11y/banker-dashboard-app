"use client"

import { Badge } from "@/components/ui/badge"

import { TableCell } from "@/components/ui/table"

import { TableBody } from "@/components/ui/table"

import { TableHead } from "@/components/ui/table"

import { TableRow } from "@/components/ui/table"

import { TableHeader } from "@/components/ui/table"

import { Table } from "@/components/ui/table"

import { Camera, PenTool } from "lucide-react"


import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Wallet,
  FileText,
  UserPlus,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  XCircle,
  Plus,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation";
// import router, { useRouter } from "next/router"




type Member = {
  id: string
  member_id: string
  full_name: string
  email: string
  phone: string
  address: string
  member_type: string
  account_balance: number
  status: string
  joined_date: string
  branch_id: number
}

type NewMemberForm = {
  aadhaar_no: string
  customer_code?: string
  full_name: string
  father_name?: string
  gender : string
  customer_type? : string 
  house_no? : string 
  street? : string 
  village? : string 
  thaluk? : string 
  district? : string 
  state? : string 
  pincode? : string
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

type NewCustomerForm = {
  customer_type: string | number | readonly string[] | undefined
  permanant_phone: string | number | readonly string[] | undefined
  permanant_state: string | number | readonly string[] | undefined
  permanant_pin_code: string | number | readonly string[] | undefined
  permanant_district: string | number | readonly string[] | undefined
  permanant_taluk: string | number | readonly string[] | undefined
  permanant_village: string | number | readonly string[] | undefined
  permanant_street: string | number | readonly string[] | undefined
  permanant_house_no: string | number | readonly string[] | undefined
  ledger_folio_number: string | number | readonly string[] | undefined
  board_resolution_number: string | number | readonly string[] | undefined
  board_resolution_date: string | number | readonly string[] | undefined
  anual_income: string | number | readonly string[] | undefined
  qualification_details: string | number | readonly string[] | undefined
  qualification: string | number | readonly string[] | undefined
  occupation: string | number | readonly string[] | undefined
  caste_category: string | number | readonly string[] | undefined
  caste: string | number | readonly string[] | undefined
  religion: string | number | readonly string[] | undefined
  spouse_name: string | number | readonly string[] | undefined
  blood_group: string | undefined
  marital_status: string | undefined
  pin_code: string | number | readonly string[] | undefined
  street: string | number | readonly string[] | undefined
  house_no: string | number | readonly string[] | undefined
  ration_no: string | number | readonly string[] | undefined
  driving_license_no: string | number | readonly string[] | undefined
  voter_id: string | number | readonly string[] | undefined
  gender: string | undefined
  state: string | number | readonly string[] | undefined
  district: string | number | readonly string[] | undefined
  taluk: string | number | readonly string[] | undefined
  village: string | number | readonly string[] | undefined
  address2: string | number | readonly string[] | undefined
  address1: string | number | readonly string[] | undefined
  aadhar_id: string | number | readonly string[] | undefined
  pan_card_number: string | number | readonly string[] | undefined
  full_name: string
  father_name?: string
  email: string
  phone: string
  dob: string
  age: string
}
const emptyCustomer = {
  full_name: "",
  father_name: "",
  gender: "M",
  dob: "",
  aadhar_id: "",
  pan_card_number: "",
  phone: "",
  email: "",
  address1: "",
  address2: "",
  village: "",
  taluk: "",
  district: "",
  state: "Tamil Nadu",
  pin_code: "",
religion: "",
caste_category: "",
caste: "",
occupation: "",
qualification: "",
qualification_details: "",
anual_income: "",
board_resolution_number: "",
board_resolution_date: "",
ledger_folio_number: "",
marital_status: "single",
blood_group: "",
house_no: "",
street: "",
ration_no: "",
driving_license_no: "",
voter_id: "",
age: ""
}

export default function MembersPage() {
  // const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCustomerAddDialogOpen, setIsCustomerAddDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isCustomerNotFoundOpen, setIsCustomerNotFoundOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [fieldsReadOnly, setFieldsReadOnly] = useState(true)
  const [memberFieldsReadOnly, setMemberFieldsReadOnly] = useState(true)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const [createdMemberNo, setCreatedMemberNo] = useState<string>("")
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [selectedShareDepositMember, setSelectedShareDepositMember] = useState<Member | null>(null)
  const [shareDepositMemberNo, setShareDepositMemberNo] = useState("")
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    dob: "",
    aadhar_id: "",
    pan_card_number: "",
    district: "",
    state: "",
    taluk: "",
    village: "",
    gender: "",
    ledger_folio_number: "",
    board_resolution_number: "",
    board_resolution_date: "",
    anual_income: "",
    qualification_details: "",
    qualification: "",
    occupation: "",
    caste_category: "",
    caste: "",
    religion: "",
    spouse_name: "",
    blood_group: "",
    marital_status: "",
    pin_code: "",
    street: "",
    house_no: "",
    ration_no: "",
    driving_license_no: "",
    voter_id: "",
    age: "",
    permanant_phone: "",
    permanant_state: "",
    permanant_pin_code: "",
    permanant_district: "",
    permanant_taluk: "",
    permanant_village: "",
    permanant_street: "",
    permanant_house_no: "",
  })

  const [newMember, setNewMember] = useState<NewMemberForm>({
    aadhaar_no: "",
    customer_code: "",
    full_name: "",
    father_name: "",
    gender : "",
    email: "",
    phone: "",
    address: "",
    member_type: "Nominal",
    date_of_birth: "",
    id_type: "",
    id_number: "",
    spouseName: "",
    boardResolutionNumber: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentShareBalance, setCurrentShareBalance] = useState<number | null>(null)
  const [isFetchingMember, setIsFetchingMember] = useState(false)
  const [memberFetchError, setMemberFetchError] = useState<string | null>(null)
  const [voucherType, setVoucherType] = useState<"CASH" | "TRANSFER" | "">("")
  const [shareAmount, setShareAmount] = useState("")
  const [particulars, setParticulars] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [transactionType, setTransactionType] = useState("Share Deposit")
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState< number | 0>(0)
  const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false)
  const [incompleteBatches, setIncompleteBatches] = useState<any[]>([])
  const [identity, setIdentity] = useState<{ businessDate?: string } | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [signature, setSignature] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [memberPreview, setMemberPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const router = useRouter();


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



  useEffect(() => {
    fetch("/api/auth/identity", { credentials: "include" })
      .then(r => r.json())
      .then(setIdentity)
  }, [])


  // useEffect(
  //   ()=> {
  // const resData = fetch("/api/configs")
  // .then(res => res.json())
  // .then(setMembers);
  // console.log("Fetched members data:", resData);
  //   }, []
  // )
  useEffect(() => {
    if (!user) return

    let isActive = true // prevent state update after unmount

    const loadMembers = async () => {
      setIsLoading(true)

      try {
        console.log("Loading members...")
        const response = await fetch("/api/memberships/loadmember", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load members")
        }

        if (isActive) {
          setMembers(data.data ?? [])
        }
      } catch (error) {
        console.error("[Members] Load failed:", error)
        if (isActive) {
          setMembers([])
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadMembers()

    return () => {
      isActive = false
    }
  }, [user])


  const generateMemberId = () => {
    const maxId = members.reduce((max, member) => {
      const numPart = Number.parseInt(member.member_id.replace("MEM", ""))
      return numPart > max ? numPart : max
    }, 0)
    return `MEM${String(maxId + 1).padStart(3, "0")}`
  }

  const handleEnrollMember = async () => {
    setIsSubmitting(true)
    console.log(JSON.stringify(newCustomer))
    try {
      const res = await fetch("/api/memberships/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Close the add member dialog and open success dialog
      setIsAddDialogOpen(false)
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
        member_type: "Nominal",
        date_of_birth: "",
        dob: "",
        id_type: "",
        id_number: "",
      })
      setFieldsReadOnly(true)
      setMemberFieldsReadOnly(true)
    } catch (e: any) {
      console.log(e.message)
      alert("Failed to create member: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  const handleCreateCustomer = async () => {
    setIsSubmitting(true)
    console.log(JSON.stringify(newCustomer))
    try {
      const res = await fetch("/api/customers/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      alert("Customer created : " + data.customer_code)
      setNewCustomer(emptyCustomer)
      setIsCustomerAddDialogOpen(false)
    } catch (e: any) {
      console.log(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

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
          full_name: customer.full_name || "",
          father_name: customer.father_name || "",
          email: customer.email || "",
          phone: customer.mobile_no || "",
          date_of_birth: customer.date_of_birth || "",
          house_no: customer.house_no || "",
          street: customer.street || "",
          village: customer.village || "",
          thaluk: customer.taluk || "",
          district: customer.district || "",
          state: customer.state || "",
          pincode: customer.pincode || "",
          pan_no: customer.pan_no || "",
          ration_no: customer.ration_no || "",
          driving_license_no: customer.driving_license_no || ""
        })
        setFieldsReadOnly(true)
        setMemberFieldsReadOnly(false)
      } else {
        setIsCustomerNotFoundOpen(true)
      }
    } catch (error) {
      console.error("[v0] Aadhaar lookup error:", error)
      alert("Failed to lookup customer. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }
  const handleMembershipBlur = async () => {
    if (!shareDepositMemberNo) return

    setIsFetchingMember(true)
    setMemberFetchError(null)

    try {
      const res = await fetch(
        `/api/memberships/share_details?membership_no=${shareDepositMemberNo}`,
        { credentials: "include" }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch member details")
      }

      setSelectedShareDepositMember({
        id: data.membership_id,
        member_id: data.membership_no,
        full_name: data.full_name,
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        member_type: data.membership_class,
        account_balance: data.account_balance || 0,
        status: data.status || "active",
        joined_date: data.joined_date || "",
        branch_id: data.branch_id || 0
      })

      setCurrentShareBalance(data.share_balance)

    } catch (err: any) {
      setSelectedShareDepositMember(null)
      setCurrentShareBalance(null)
      setMemberFetchError(err.message)
    } finally {
      setIsFetchingMember(false)
    }
  }


  const handleShareDepositSave = async () => {
    console.log("Submitting share deposit...")
    if(!shareDepositMemberNo || !voucherType || !shareAmount) {
      setFormError("Please fill in all required fields")
      alert("Please fill in all required fields")
    }
    if (!shareDepositMemberNo) {
      setFormError("Membership number is required")
      return
    }

    if (!voucherType) {
      setFormError("Please select voucher type")
      return
    }

    if (!shareAmount || Number(shareAmount) <= 0) {
      setFormError("Enter a valid amount")
      return
    }

    if (!selectedShareDepositMember) {
      setFormError("Invalid membership")
      return
    }

    setIsSaving(true)
    setFormError(null)
    
    console.log("Processing share deposit...")
    try {
      if(transactionType=="Share Deposit"){
        console.log("Calling share deposit API...")
        console.log("Membership No:", shareDepositMemberNo, "Voucher Type:", voucherType, "Amount:", shareAmount, "Particulars:", particulars)
        const res = await fetch("/api/share/deposit", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            membership_no: shareDepositMemberNo,
            voucher_type: voucherType,
            amount: Number(shareAmount),
            narration: particulars || "Share deposit",
            selectedBatch: selectedBatch,
          }), 
        })

        const data = await res.json()

        if (!res.ok) {
          console.error("Share deposit error:", data.error)
          throw new Error(data.error || "Share deposit failed")
        }

        /* ---------- SUCCESS ---------- */
        alert(
          `Share deposit saved successfully.\nVoucher No: ${data.voucher_no}\nStatus: ${data.status}`
        )
      }else if(transactionType=="Share Withdrawal"){
        console.log("Calling share withdrawal API...")
        const res = await fetch("/api/share/withdraw", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            membership_no: shareDepositMemberNo,
            voucher_type: voucherType,
            amount: Number(shareAmount),
            narration: particulars || "Share deposit",
            selectedBatch: selectedBatch,
          }), 
        })

        const data = await res.json()

        if (!res.ok) {
          console.error("Share deposit error:", data.error)
          throw new Error(data.error || "Share deposit failed")
        }

        /* ---------- SUCCESS ---------- */
        alert(
          `Share deposit saved successfully.\nVoucher No: ${data.voucher_no}\nStatus: ${data.status}`
        )

      }
      // Reset form
      setShareDepositMemberNo("")
      setSelectedShareDepositMember(null)
      setCurrentShareBalance(null)
      setVoucherType("")
      setShareAmount("")
      setParticulars("")
      setActiveAction(null)

    } catch (err: any) {
      setFormError(err.message)
    } finally {
      console.log("Share deposit process completed.")
      setIsSaving(false)
    }
    console.log("Share deposit submission handled.")
  }

  
  const loadIncompleteBatches = async () => {
    console.log("Loading incomplete batches...")
    setIsBatchPopupOpen(true)
    // setBatchLoading(true)
    // setBatchError(null)
    console.log("Loading incomplete batches...")
    try {
      const res = await fetch("/api/fas/incomplete-batches", {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load batches")
      }

      setIncompleteBatches(data.data || [])
    } catch (err: any) {
      console.error("Load incomplete batches error:", err)
      setBatchError(err.message)
      setIncompleteBatches([])
    } finally {
      setBatchLoading(false)
    }
  }
  const formatAadhar = (value: string | number | readonly string[] | undefined) => {
    return String(value ?? "")
      .replace(/\D/g, "")        // remove non-digits
      .slice(0, 12)              // max 12 digits
      .replace(/(.{4})/g, "$1 ") // add space every 4 digits
      .trim();
  };





  // const filteredMembers = members.filter((member) => {
  //   const matchesSearch =
  //     member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     member.member_id?.toLowerCase().includes(searchQuery.toLowerCase())
  //   const matchesStatus = statusFilter === "all" || member.status?.toLowerCase() === statusFilter.toLowerCase()
  //   return matchesSearch && matchesStatus
  // })

  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Member Management</h1>
                <p className="text-muted-foreground">
                  {user?.role === "admin"
                    ? "All branches - Manage customer accounts and member operations"
                    : `${user?.branch || "Your branch"} - Manage customer accounts and member operations`}
                </p>
              </div>
              <Button onClick={() => router.push("/customers")}
                className="gap-2">
                <Plus className="h-4 w-4" />
                Create Customer
              </Button>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Enroll Member</CardTitle>
                  <CardDescription className="mt-1">Register new customer</CardDescription>
                </CardContent>
              </Card>
              
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => setIsViewDialogOpen(true)}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">View Member</CardTitle>
                  <CardDescription className="mt-1">View Member details</CardDescription>
                </CardContent>
              </Card>
              
              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-teal-500"
                onClick={() => {
                    setActiveAction("share-deposit")
                    setTransactionType("Share Deposit")
                  }
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50">
                    <ArrowUpCircle className="h-6 w-6 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Share Deposit</CardTitle>
                  <CardDescription className="mt-1">Add member shares</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-orange-500"
                onClick={() => {
                    setActiveAction("share-deposit")
                    setTransactionType("Share Withdrawal")
                  }
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50">
                    <ArrowDownCircle className="h-6 w-6 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Share Withdrawal</CardTitle>
                  <CardDescription className="mt-1">Withdraw member shares</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-emerald-500"
                onClick={() => setActiveAction("dividend")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                    <PiggyBank className="h-6 w-6 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Dividend</CardTitle>
                  <CardDescription className="mt-1">Process dividend payments</CardDescription>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:shadow-lg hover:border-red-500"
                onClick={() => setActiveAction("membership-closure")}
              >
                <CardHeader className="pb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Membership Closure</CardTitle>
                  <CardDescription className="mt-1">Close member account</CardDescription>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or account number..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* {isLoading ? (
                <p>Loading members...</p>
              ) : (
              //   <Table>
              //     <TableHeader>
              //       <TableRow>
              //         <TableHead>Member</TableHead>
              //         <TableHead>Account Number</TableHead>
              //         <TableHead>KYC Status</TableHead>
              //         <TableHead>Status</TableHead>
              //         <TableHead>Total Balance</TableHead>
              //         <TableHead>Actions</TableHead>
              //       </TableRow>
              //     </TableHeader>
              //     <TableBody>
              //       {filteredMembers.map((member) => (
              //         <TableRow key={member.id}>
              //           <TableCell>
              //             <div>
              //               <div className="font-medium">{member.full_name}</div>
              //               <div className="text-sm text-muted-foreground">{member.email}</div>
              //             </div>
              //           </TableCell>
              //           <TableCell className="font-mono text-sm">{member.member_id}</TableCell>
              //           <TableCell>
              //             <Badge variant={member.kyc_completed === "Yes" ? "default" : "secondary"}>
              //               {member.kyc_completed === "Yes" ? "Completed" : "Pending"}
              //             </Badge>
              //           </TableCell>
              //           <TableCell>
              //             <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
              //           </TableCell>
              //           <TableCell className="font-semibold">{member.account_balance}</TableCell>
              //           <TableCell>
              //             <DropdownMenu>
              //               <DropdownMenuTrigger asChild>
              //                 <Button variant="ghost" size="sm">
              //                   Actions
              //                 </Button>
              //               </DropdownMenuTrigger>
              //               <DropdownMenuContent align="end">
              //                 <DropdownMenuItem onClick={() => setSelectedMember(member)}>
              //                   <Eye className="mr-2 h-4 w-4" />
              //                   View Details
              //                 </DropdownMenuItem>
              //                 <DropdownMenuItem>
              //                   <Edit className="mr-2 h-4 w-4" />
              //                   Edit
              //                 </DropdownMenuItem>
              //                 <DropdownMenuItem className="text-destructive">
              //                   <Ban className="mr-2 h-4 w-4" />
              //                   Deactivate
              //                 </DropdownMenuItem>
              //               </DropdownMenuContent>
              //             </DropdownMenu>
              //           </TableCell>
              //         </TableRow>
              //       ))}
              //     </TableBody>
              //   </Table>
              )} */}
              </CardContent>
            </Card>

            <Dialog open={isCustomerAddDialogOpen} onOpenChange={setIsCustomerAddDialogOpen} >
             <DialogContent className="w-[95vw] max-w-none h-[95vh] flex flex-col p-4 ">
                <DialogHeader>
                  <div className="px-4 py-6 border-b">
                    <DialogTitle>Add New Customer</DialogTitle>
                    <DialogDescription>Enter customer details to create a new Customer</DialogDescription>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full bg-primary/10">
                      <TabsTrigger value="personal">Personal Details</TabsTrigger>
                      <TabsTrigger value="address">Address</TabsTrigger>
                      <TabsTrigger value="kycdetails">KYC Details</TabsTrigger>
                      {/* <TabsTrigger value="assetdetails">Asset Details</TabsTrigger> */}
                    </TabsList>
                    <TabsContent value="personal">

                      <div className="grid gap-4 px-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              placeholder="John Doe"
                              value={newCustomer.full_name}
                              onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="father-name">Father Name *</Label>
                            <Input
                              id="father_name"
                              placeholder="John Doe"
                              value={newCustomer.father_name}
                              onChange={(e) => setNewCustomer({ ...newCustomer, father_name: e.target.value })}
                            />
                          </div>
                          
                          {newCustomer.marital_status === "married" && (
                            <div className="space-y-2">
                            <Label htmlFor="spouse_name">Spouse Name *</Label>
                            <Input
                              id="spouse_name"
                              placeholder="John Doe"
                              value={newCustomer.spouse_name}
                              onChange={(e) => setNewCustomer({ ...newCustomer, spouse_name: e.target.value })}
                            />
                          </div>)}
                          {/* <div className="grid grid-cols-2 gap-4"> 
                            
                          </div> */}
                        </div>  

                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="gender-type">Gender</Label>
                              <Select
                                value={newCustomer.gender}
                                onValueChange={(value) => setNewCustomer({ ...newCustomer, gender: value })}
                                defaultValue="Male"
                              >
                                <SelectTrigger id="gender">
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
                              <Label htmlFor="marital_status">Marital Status</Label>
                              <Select
                                value={newCustomer.marital_status}
                                onValueChange={(value) => setNewCustomer({ ...newCustomer, marital_status: value })}
                                defaultValue="single"
                              >
                                <SelectTrigger id="marital_status">
                                  <SelectValue placeholder="Select marital status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Single</SelectItem>
                                  <SelectItem value="married">Married</SelectItem>
                                  <SelectItem value="divorced">Divorced</SelectItem>
                                  <SelectItem value="widowed">Widowed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="blood_group">Blood Group</Label>
                              <Select
                                value={newCustomer.blood_group}
                                onValueChange={(value) => setNewCustomer({ ...newCustomer, blood_group: value })}
                                defaultValue="A+"
                              >
                                <SelectTrigger id="blood_group">
                                  <SelectValue placeholder="Select blood group" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A+">A+</SelectItem>
                                  <SelectItem value="A-">A-</SelectItem>
                                  <SelectItem value="B+">B+</SelectItem>
                                  <SelectItem value="B-">B-</SelectItem>
                                  <SelectItem value="AB+">AB+</SelectItem>
                                  <SelectItem value="AB-">AB-</SelectItem>
                                  <SelectItem value="O+">O+</SelectItem>
                                  <SelectItem value="O-">O-</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <Input
                                  id="dob"
                                  type="date"
                                  value={newCustomer.dob}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, dob: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="age">age *</Label>
                                <Input
                                  id="age"
                                  type="number"
                                  value={newCustomer.dob ? new Date().getFullYear() - new Date(newCustomer.dob).getFullYear() : ''}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, age: e.target.value })}
                                />
                              </div>
                            </div>
                            
                          </div>
                          <div className="grid grid-cols-5 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="religion">Religion</Label>
                                <select
                                  id="religion"
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  value={newCustomer.religion}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, religion: e.target.value })}
                                > 
                                  <option value="">Select Religion</option>
                                  <option value="Hinduism">Hinduism</option>
                                  <option value="Christianity">Christianity</option>
                                  <option value="Islam">Islam</option>
                                  <option value="Buddhism">Buddhism</option>
                                  <option value="Sikhism">Sikhism</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="caste_category">Caste Category</Label>
                                <select
                                  id="caste_category"
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  value={newCustomer.caste_category}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, caste_category: e.target.value })}
                                >
                                  <option value="">Select Category</option>
                                  <option value="OBC">OBC</option>
                                  <option value="SC">SC</option>
                                  <option value="ST">ST</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="occupation">Occupation</Label>
                                <Input
                                  id="occupation"
                                  placeholder="Enter occupation"
                                  value={newCustomer.occupation}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, occupation: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="qualification">Qualification</Label>
                                <Input
                                  id="qualification"
                                  placeholder="Enter qualification"
                                  value={newCustomer.qualification}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, qualification: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="qualification_details">Qualification Details</Label>
                                <Input
                                  id="qualification_details"
                                  placeholder="Enter qualification details"
                                  value={newCustomer.qualification_details}
                                  onChange={(e) => setNewCustomer({ ...newCustomer, qualification_details: e.target.value })}
                                />
                              </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="anual_income">Annual Income</Label>
                              <Input
                                id="anual_income"
                                placeholder="Enter annual income"
                                value={newCustomer.anual_income}
                                onChange={(e) => setNewCustomer({ ...newCustomer, anual_income: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="board_resolution_number">Board Resolution Number</Label>
                              <Input
                                id="board_resolution_number"
                                placeholder="Enter board resolution number"
                                value={newCustomer.board_resolution_number}
                                onChange={(e) => setNewCustomer({ ...newCustomer, board_resolution_number: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="board_resolution_date">Board Resolution Date</Label>
                              <Input
                                id="board_resolution_date"
                                type="date"
                                value={newCustomer.board_resolution_date}
                                onChange={(e) => setNewCustomer({ ...newCustomer, board_resolution_date: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="ledger_folio_number">Ledger Folio Number</Label>
                              <Input
                                id="ledger_folio_number"
                                placeholder="Enter ledger folio number"
                                value={newCustomer.ledger_folio_number}
                                onChange={(e) => setNewCustomer({ ...newCustomer, ledger_folio_number: e.target.value })}
                              />
                            </div>
                          </div>
                      </div>
                      
                      <div className="flex gap-8 px-4 py-4 border-b">

                        {/* PHOTO */}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                          />

                          <div className="h-32 w-32 border-2 border-dashed rounded-md flex items-center justify-center hover:bg-muted transition overflow-hidden">
                            {photoPreview ? (
                              <img
                                src={photoPreview}
                                alt="Photo Preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Camera className="h-8 w-8" />
                                <span className="text-sm">Upload Photo</span>
                              </div>
                            )}
                          </div>
                        </label>

                        {/* SIGNATURE */}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => setSignature(e.target.files?.[0] || null)}
                          />

                          <div className="h-32 w-32 border-2 border-dashed rounded-md flex items-center justify-center hover:bg-muted transition overflow-hidden bg-white">
                            {signaturePreview ? (
                              <img
                                src={signaturePreview}
                                alt="Signature Preview"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <PenTool className="h-8 w-8" />
                                <span className="text-sm">Upload Signature</span>
                              </div>
                            )}
                          </div>
                        </label>

                      </div>

                    </TabsContent>
                    <TabsContent value="address">
                      {/* Address tab content can go here if needed */}
                      
                      <div className="grid gap-4 px-4 py-4 border-b">
                        
                        <div className="flex">
                          <div className="text-lg font-semibold flex items-center gap-1 px-4"><div className="h-4 w-1 bg-primary rounded" />Current Address</div>
                           
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="house_no">House Number</Label>
                            <Input
                              id="house_no"
                              placeholder="123 Main St, City, State ZIP"
                              value={newCustomer.house_no}
                              onChange={(e) => setNewCustomer({ ...newCustomer, house_no: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="street">Street</Label>
                            <Input
                              id="street"
                              placeholder="123 Main St, City, State ZIP"
                              value={newCustomer.street}
                              onChange={(e) => setNewCustomer({ ...newCustomer, street: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="village">Village *</Label>
                            <Input
                              id="village"
                              placeholder="John Doe"
                              value={newCustomer.village}
                              onChange={(e) => setNewCustomer({ ...newCustomer, village: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="taluk">Taluk *</Label>
                            <Input
                              id="taluk"
                              placeholder="John Doe"
                              value={newCustomer.taluk}
                              onChange={(e) => setNewCustomer({ ...newCustomer, taluk: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="district">District *</Label>
                            <Input
                              id="district"
                              placeholder="John Doe"
                              value={newCustomer.district}
                              onChange={(e) => setNewCustomer({ ...newCustomer, district: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State *</Label>
                            <Input
                              id="state"
                              placeholder="John Doe"
                              value={newCustomer.state}
                              onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pin_code">Pin Code *</Label>
                            <Input
                              id="pin_code"
                              placeholder="John Doe"
                              value={newCustomer.pin_code}
                              onChange={(e) => setNewCustomer({ ...newCustomer, pin_code: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                              id="phone"
                              placeholder="+91 9876543210"
                              value={newCustomer.phone}
                              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="nc_email"
                              type="email"
                              placeholder="john.doe@email.com"
                              value={newCustomer.email}
                              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            />
                          </div>
                        </div>  

                      </div>
                      <div className="grid gap-4 px-4 py-4 border-b">
                        <div className="flex">
                          <div className="text-lg font-semibold flex items-center gap-1 px-4"><div className="h-4 w-1 bg-primary rounded" />Permanent Address</div>
                                            
                          {/* Checkbox */}
                          <div className="flex items-center justify-end gap-2 text-sm px-4">
                            <Checkbox
                              id="same_address"
                              checked={sameAsPermanent}
                              onCheckedChange={(checked: boolean) => setSameAsPermanent(checked)}
                            />
                            <Label htmlFor="same_address" className="cursor-pointer">
                              Current address same as permanent
                            </Label>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="permanant_house_no">Permanent House Number</Label>
                            <Input
                              id="permanant_house_no"
                              placeholder="123 Main St, City, State ZIP"
                              value={newCustomer.permanant_house_no}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_house_no: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanant_street">Street</Label>
                            <Input
                              id="permanant_street"
                              placeholder="123 Main St, City, State ZIP"
                              value={newCustomer.permanant_street}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_street: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanant_village">Village *</Label>
                            <Input
                              id="permanant_village"
                              placeholder="John Doe"
                              value={newCustomer.permanant_village}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_village: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanant_taluk">Taluk *</Label>
                            <Input
                              id="permanant_taluk"
                              placeholder="John Doe"
                              value={newCustomer.permanant_taluk}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_taluk: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanant_district">District *</Label>
                            <Input
                              id="permanant_district"
                              placeholder="John Doe"
                              value={newCustomer.permanant_district}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_district: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanant_state">State *</Label>
                            <Input
                              id="permanant_state"
                              placeholder="John Doe"
                              value={newCustomer.permanant_state}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_state: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanant_pin_code">Pin Code *</Label>
                            <Input
                              id="permanant_pin_code"
                              placeholder="John Doe"
                              value={newCustomer.permanant_pin_code}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_pin_code: e.target.value })}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="permanant_phone">Phone Number *</Label>
                            <Input
                              id="permanant_phone"
                              placeholder="+91 9876543210"
                              value={newCustomer.permanant_phone}
                              onChange={(e) => setNewCustomer({ ...newCustomer, permanant_phone: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="permanent_email">Email</Label>
                            <Input
                              id="permanent_email"
                              type="email"
                              placeholder="john.doe@email.com"
                              value={newCustomer.email}
                              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            />
                          </div>
                        </div>  

                      </div>
                      
                    </TabsContent>
                    <TabsContent value="kycdetails">
                      {/* Address tab content can go here if needed */}
                      
                      <div className="px-4 py-4">

                        {/* Header Row */}
                        <div className="grid grid-cols-3 gap-4 bg-muted px-3 py-2 text-sm font-medium rounded-t-md">
                          <div>Document Type</div>
                          <div>Document Number</div>
                          <div className="px-10">Status</div>
                        </div>

                        {/* PAN */}
                        <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b items-center">
                          <div>PAN Card</div>
                          <Input
                            placeholder="ABCDE1234F"
                            value={newCustomer.pan_card_number}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, pan_card_number: e.target.value })
                            }
                          />
                          <span className="text-xs text-muted-foreground px-10">
                            {newCustomer.pan_card_number ? "Entered" : "Pending"}
                          </span>
                        </div>

                        {/* AADHAR */}
                        <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b items-center">
                          <div>Aadhar</div>
                          <Input
                            placeholder="1234 5678 9123"
                            maxLength={14}
                            value={formatAadhar(newCustomer.aadhar_id)}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\D/g, "").slice(0, 12)
                              setNewCustomer({ ...newCustomer, aadhar_id: rawValue })
                            }}
                          />
                          <span className="text-xs text-muted-foreground px-10">
                            {newCustomer.aadhar_id ? "Entered" : "Pending"}
                          </span>
                        </div>

                        {/* RATION */}
                        <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b items-center">
                          <div>Ration Card</div>
                          <Input
                            placeholder="123456789"
                            value={newCustomer.ration_no}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, ration_no: e.target.value })
                            }
                          />
                          <span className="text-xs text-muted-foreground px-10">
                            {newCustomer.ration_no ? "Entered" : "Optional"}
                          </span>
                        </div>

                        {/* VOTER */}
                        <div className="grid grid-cols-3 gap-4 px-3 py-2 border-b items-center">
                          <div>Voter ID</div>
                          <Input
                            placeholder="123456789"
                            value={newCustomer.voter_id}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, voter_id: e.target.value })
                            }
                          />
                          <span className="text-xs text-muted-foreground px-10">
                            {newCustomer.voter_id ? "Entered" : "Optional"}
                          </span>
                        </div>

                        {/* DL */}
                        <div className="grid grid-cols-3 gap-4 px-3 py-2 items-center">
                          <div>Driving License</div>
                          <Input
                            placeholder="123456789"
                            value={newCustomer.driving_license_no}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, driving_license_no: e.target.value })
                            }
                          />
                          <span className="text-xs text-muted-foreground px-10">
                            {newCustomer.driving_license_no ? "Entered" : "Optional"}
                          </span>
                        </div>

                      </div>
                    </TabsContent>
                    {/* <TabsContent value="assetdetails">
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="asset-type">Asset Type</Label>
                          <Input
                            id="asset-type"
                            placeholder="e.g., Gold, Silver, Property"
                            value={newCustomer.asset_type}
                            onChange={(e) => setNewCustomer({ ...newCustomer, asset_type: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="asset-value">Asset Value</Label>
                          <Input
                            id="asset-value"
                            placeholder="e.g., 500000"
                            value={newCustomer.asset_value}
                            onChange={(e) => setNewCustomer({ ...newCustomer, asset_value: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent> */}
                </Tabs>
                </div>
                <DialogFooter className="shrink-0 mt-auto">
                  <Button variant="outline" onClick={() => setIsCustomerAddDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                  <DialogDescription>Search by Aadhaar to enroll an existing customer</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={newMember.full_name}
                        onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="father-name">Father Name</Label>
                      <Input
                        id="father-name"
                        placeholder="Father's name"
                        value={newMember.father_name}
                        onChange={(e) => setNewMember({ ...newMember, father_name: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@email.com"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        value={newMember.phone}
                        onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={newMember.dob}
                        onChange={(e) => setNewMember({ ...newMember, dob: e.target.value })}
                        readOnly={fieldsReadOnly}
                        className={fieldsReadOnly ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-type">Account Type</Label>
                      <Select
                        value={newMember.member_type}
                        onValueChange={(value) => setNewMember({ ...newMember, member_type: value })}
                        disabled={memberFieldsReadOnly}
                      >
                        <SelectTrigger id="account-type" className={memberFieldsReadOnly ? "bg-muted" : ""}>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nominal">Nominal</SelectItem>
                          <SelectItem value="Associate">Associate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
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
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setNewMember({
                        aadhaar_no: "",
                        customer_code: "",
                        full_name: "",
                        father_name: "",
                        gender: "",
                        email: "",
                        phone: "",
                        address: "",
                        member_type: "Nominal",
                        date_of_birth: "",
                        dob: "",
                        id_type: "",
                        id_number: "",
                      })
                      setFieldsReadOnly(true)
                    }}
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
                </DialogFooter>
              </DialogContent>
            </Dialog> */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogContent className="max-w-5xl max-w-[95vw] h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Add New Member</DialogTitle>
                    <DialogDescription>
                      Search by Aadhaar to enroll an existing customer
                    </DialogDescription>
                    <div className="space-y-2 px-4 py-4">
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
                    <div className="mt-4 border-t pt-4"></div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      
                      <div className="grid grid-cols-3 gap-4 border-b">
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2 px-5 ">
                                
                                <Label htmlFor="customer_type">Customer Type</Label>
                                <select
                                    id="customer_type"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newCustomer.customer_type}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
                                  >
                                    <option value="">Select Category</option>
                                    <option value="individual">Individual</option>
                                    <option value="organization">Organization</option>
                                </select>
                            </div>
                            <div className="space-y-2 px-5">
                              <Label>Account Type</Label>
                              <Select
                                value={newMember.member_type}
                                onValueChange={(value) =>
                                  setNewMember({ ...newMember, member_type: value })
                                }
                                // disabled={memberFieldsReadOnly}
                              >
                                <SelectTrigger
                                  className={`${memberFieldsReadOnly ? "bg-muted" : ""} w-full`}
                                >
                                  <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Nominal">Nominal</SelectItem>
                                  <SelectItem value="Associate">Associate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          </div>
                          
                          <div className="space-y-2">
                              <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                  <Label htmlFor="name">Full Name *</Label>
                                  <Input
                                      id="name"
                                      placeholder="John Doe"
                                      value={newCustomer.full_name}
                                      onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                                  />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="father-name">Father Name *</Label>
                                      <Input
                                          id="father_name"
                                          placeholder="Daddy's Name"
                                          value={newCustomer.father_name}
                                          onChange={(e) => setNewCustomer({ ...newCustomer, father_name: e.target.value })}
                                  />
                                  </div>
                              </div> 
                          </div>
                          
              
                          <div className="flex gap-8 px-4 py-4 ">
              
                              {/* PHOTO */}
                              <label className="cursor-pointer">
                                  <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                  />
              
                                  <div className="h-32 w-32 border-2 border-dashed rounded-md flex items-center justify-center hover:bg-muted transition overflow-hidden">
                                  {photoPreview ? (
                                      <img
                                      src={photoPreview}
                                      alt="Photo Preview"
                                      className="h-full w-full object-cover"
                                      />
                                  ) : (
                                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                      <Camera className="h-8 w-8" />
                                      <span className="text-sm">Upload Photo</span>
                                      </div>
                                  )}
                                  </div>
                              </label>
              
                              {/* SIGNATURE */}
                              <label className="cursor-pointer">
                                  <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => setSignature(e.target.files?.[0] || null)}
                                  />
              
                                  <div className="h-32 w-32 border-2 border-dashed rounded-md flex items-center justify-center hover:bg-muted transition overflow-hidden bg-white">
                                  {signaturePreview ? (
                                      <img
                                      src={signaturePreview}
                                      alt="Signature Preview"
                                      className="h-full w-full object-contain"
                                      />
                                  ) : (
                                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                      <PenTool className="h-8 w-8" />
                                      <span className="text-sm">Upload Signature</span>
                                      </div>
                                  )}
                                  </div>
                              </label>
                          </div>
                      </div>
                    </div>
                  </DialogHeader>

                  <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid grid-cols-4">
                      <TabsTrigger value="personal">Personal Details</TabsTrigger>
                      <TabsTrigger value="address">Address</TabsTrigger>
                      <TabsTrigger value="kyc">KYC Details</TabsTrigger>
                    </TabsList>

                    {/* PERSONAL DETAILS TAB */}
                    <TabsContent value="personal">
                      <div className="grid gap-4 py-4">

                        {/* Name + Father */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Date of Birth</Label>
                            <Input
                              value={newMember.dob}
                              type="date"
                              onChange={(e) =>
                                setNewMember({ ...newMember, dob: e.target.value })
                              }
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
                              <SelectTrigger id="gender" className={`w-full ${fieldsReadOnly ? "bg-muted" : ""}`}>
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
                                onChange={(e) =>
                                  setNewMember({ ...newMember, spouseName: e.target.value })
                                }
                                readOnly={fieldsReadOnly}
                                className={fieldsReadOnly ? "bg-muted" : ""}
                              />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Board Resolution Number</Label>
                            <Input
                              value={newMember.boardResolutionNumber}
                              onChange={(e) =>
                                setNewMember({ ...newMember, boardResolutionNumber: e.target.value })
                              }
                              readOnly={fieldsReadOnly}
                              className={fieldsReadOnly ? "bg-muted" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Board Resolution Date</Label>
                            <Input
                              type="date"
                              value={newMember.boardResolutionDate}
                              onChange={(e) =>
                                setNewMember({ ...newMember, boardResolutionDate: e.target.value })
                              }
                              readOnly={fieldsReadOnly}
                              className={fieldsReadOnly ? "bg-muted" : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ledger Folio Number</Label>
                            <Input
                              value={newMember.ledgerFolioNumber}
                              onChange={(e) =>
                                setNewMember({ ...newMember, ledgerFolioNumber: e.target.value })
                              }
                              readOnly={fieldsReadOnly}
                              className={fieldsReadOnly ? "bg-muted" : ""}
                            />
                          </div>
                        </div>
                        <div className="space-y-2"></div>
                        
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
                          onChange={(e) =>
                            setNewMember({ ...newMember, address: e.target.value })
                          }
                          readOnly={fieldsReadOnly}
                          className={fieldsReadOnly ? "bg-muted" : ""}
                        />
                      </div>
                      {/* <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="house_no">House Number</Label>
                            <Input
                              id="house_no"
                              placeholder="House Number"
                              value={newMember.house_no}
                              onChange={(e) =>
                                setNewMember({ ...newMember, house_no: e.target.value })
                              }
                              readOnly={fieldsReadOnly}
                              className={fieldsReadOnly ? "bg-muted" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="street">Street</Label>
                            <Input
                              id="street"
                              placeholder="Street"
                              value={newMember.street}
                              onChange={(e) =>
                                setNewMember({ ...newMember, street: e.target.value })
                              }
                              readOnly={fieldsReadOnly}
                              className={fieldsReadOnly ? "bg-muted" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="village">Village *</Label>
                          <Input
                            id="village"
                            placeholder="Village"
                            value={newMember.village}
                            onChange={(e) =>
                              setNewMember({ ...newMember, village: e.target.value })
                            }
                            readOnly={fieldsReadOnly}
                            className={fieldsReadOnly ? "bg-muted" : ""}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="taluk">Taluk *</Label>
                          <Input
                            id="taluk"
                            placeholder="Taluk"
                            value={newMember.taluk}
                            onChange={(e) =>
                              setNewMember({ ...newMember, taluk: e.target.value })
                            }
                            readOnly={fieldsReadOnly}
                            className={fieldsReadOnly ? "bg-muted" : ""}
                          />
                        </div>
                        <div className="space-y-2"></div>
                        <div className="space-y-2"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"></div>
                        <div className="space-y-2"></div>
                        <div className="space-y-2"></div>
                      </div> */}
                    </TabsContent>
                    <TabsContent value="kyc">
                        
                    </TabsContent>
                  </Tabs>

                  <DialogFooter>
                    
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false)
                      setNewMember({
                        aadhaar_no: "",
                        customer_code: "",
                        full_name: "",
                        father_name: "",
                        gender: "",
                        email: "",
                        phone: "",
                        address: "",
                        member_type: "Nominal",
                        date_of_birth: "",
                        dob: "",
                        id_type: "",
                        id_number: "",
                      })
                      setFieldsReadOnly(true)
                    }}
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
                  </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Member Details View</DialogTitle>
                  <DialogDescription>View member information in read-only mode</DialogDescription>
                </DialogHeader>
                <div className="grid flex  gap-4">
                <div className="h-32 w-32 border-2 border-dashed rounded-md flex items-center justify-center hover:bg-muted transition overflow-hidden">
                  {memberPreview ? (
                    <img
                      src={memberPreview}
                      alt="Member Photo Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Camera className="h-8 w-8" />
                      <span className="text-sm">Member Photo</span>
                    </div>
                  )}
                </div>
                <div> 
                  {/* Member details fields can go here in read-only mode */}
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>membership no</Label>
                        <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">{selectedMember?.membershipNo}</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">{selectedMember?.fullName}</div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="personal">Personal Details</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="kycdetails">KYC Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="personal">
                    {/* Personal Details tab content can go here if needed */}
                    <div className="grid gap-4 py-4">
                      {/* Name + Father */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                        </div>

                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>


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
                      setIsAddDialogOpen(false)
                      setIsCustomerAddDialogOpen(true)
                    }}
                    className="bg-primary"
                  >
                    Create Customer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Member Details</DialogTitle>
                  <DialogDescription>Comprehensive customer profile and account overview</DialogDescription>
                </DialogHeader>
                {selectedMember && (
                  <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="profile">Profile</TabsTrigger>
                      <TabsTrigger value="accounts">Accounts</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>
                    <TabsContent value="profile" className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Full Name</Label>
                            <p className="font-medium">{selectedMember.full_name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Account Number</Label>
                            <p className="font-mono font-medium">{selectedMember.member_id}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="font-medium">{selectedMember.email}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Phone</Label>
                            <p className="font-medium">{selectedMember.phone}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Address</Label>
                            <p className="font-medium">{selectedMember.address}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Member Since</Label>
                            <p className="font-medium">{selectedMember.joined_date}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Total Balance</Label>
                          <p className="text-2xl font-bold text-foreground">{selectedMember.account_balance}</p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="accounts" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Account Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Wallet className="h-4 w-4" />
                              Account Type
                            </span>
                            <span className="font-semibold">{selectedMember.member_type}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              Status
                            </span>
                            <span className="font-semibold">{selectedMember.status}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="activity" className="space-y-4">
                      <div className="text-center py-8 text-muted-foreground">
                        Recent transactions and activities will appear here
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={activeAction === "share-deposit"} onOpenChange={() => {
              setActiveAction(null)
              setSelectedShareDepositMember(null)
              setShareDepositMemberNo("")
              }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Share Deposit</DialogTitle>
                  <DialogDescription>Add shares for a member account</DialogDescription>
                </DialogHeader>
                {formError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                <div className="grid gap-6 py-6">

                  {/* Member Name and Member Type - Display fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Transaction Type</Label>
                      <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                          <input
                            name="transactiontype"
                            value={transactionType}
                            onChange={(e) => setTransactionType(e.target.value)}
                            placeholder="Share Deposit"
                            disabled  
                          />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Transaction Date</Label>
                      <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                        {identity?.businessDate}
                      </div>
                    </div>
                  </div>
                  {/* Membership Number with Search Button */}
                  <div className="space-y-2">
                    <Label htmlFor="membership-number" className="text-sm font-medium">
                      Membership Number *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="membership-number"
                        placeholder="Enter membership number"
                        value={shareDepositMemberNo || createdMemberNo || ""}
                        onChange={(e) => setShareDepositMemberNo(e.target.value)}
                        onBlur={handleMembershipBlur}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsMemberSearchOpen(true)}
                        className="shrink-0"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </Button>
                    </div>
                  </div>

                  {/* Member Name and Member Type - Display fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Member Name</Label>
                      <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                        {selectedShareDepositMember?.full_name || members.find((m) => m.member_id === (shareDepositMemberNo || createdMemberNo))?.full_name || "—"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Member Type</Label>
                      <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                        {selectedShareDepositMember?.member_type || members.find((m) => m.member_id === (shareDepositMemberNo || createdMemberNo))?.member_type || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Voucher Type and Voucher Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Current Share Balance</Label>
                      <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                        {isFetchingMember
                          ? "Loading..."
                          : currentShareBalance !== null
                            ? `₹ ${currentShareBalance.toFixed(2)}`
                            : "—"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voucher-type" className="text-sm font-medium">
                        Voucher Type *
                      </Label>
                        <Select
                      
                          value={voucherType || ""}
                          onValueChange={(value) => setVoucherType(value === "CASH" ? "CASH" : value === "TRANSFER" ? "TRANSFER" : "")}
                        >
                          <SelectTrigger id="voucher-type" className="w-full">
                            <SelectValue placeholder="Select voucher type" />
                          </SelectTrigger>
                          <SelectContent
                          >
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      
                    </div>
                  </div>
                  {/* Batch and Select batch */}
                  <div className="grid gap-6 ">
                          {voucherType === "TRANSFER" && (
                            <div className="grid  gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">GL Batch ID</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="gl-batch-id"
                                    value={selectedBatch && selectedBatch !== 0 ? selectedBatch : "New Batch"}
                                    readOnly
                                    placeholder="Select or create batch"
                                  />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => loadIncompleteBatches()}
                                >
                                  Select Batch
                                </Button>
                                </div>
                              </div>
                            </div>
                          )}
                  </div>

                  {/* Particulars and Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="particulars" className="text-sm font-medium">
                        Particulars
                      </Label>
                      <Input id="particulars" placeholder="Enter particulars" 

                        value={particulars || ""}
                        onChange={(e) => setParticulars(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-sm font-medium">
                        Amount *
                      </Label>
                      <Input id="amount" type="number" placeholder="Enter amount" 

                        value={shareAmount || ""}
                        onChange={(e) => setShareAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                  
                  <Button
                      onClick={handleShareDepositSave}
                      disabled={isSaving || !selectedShareDepositMember}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>

                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isBatchPopupOpen} onOpenChange={setIsBatchPopupOpen}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Select GL Batch</DialogTitle>
                  <DialogDescription>
                    Choose an incomplete batch or create a new one
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex justify-between pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedBatch(0)
                      setIsBatchPopupOpen(false)
                    }}
                  >
                    + Create New Batch
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setIsBatchPopupOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Difference</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {incompleteBatches.map((b) => (
                      <TableRow key={b.batch_id}>
                        <TableCell>{b.batch_id}</TableCell>
                        <TableCell>{b.total_debit}</TableCell>
                        <TableCell>{b.total_credit}</TableCell>
                        <TableCell className="text-red-600">
                          {b.difference}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedBatch(b.batch_id)
                              setIsBatchPopupOpen(false)
                            }}
                          >
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                </DialogContent>
            </Dialog>

            {/* Member Search Popup */}
            <Dialog open={isMemberSearchOpen} onOpenChange={setIsMemberSearchOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Search Member</DialogTitle>
                  <DialogDescription>Search and select a member for share deposit</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by name, member ID, or phone..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => setMemberSearchQuery("")}>
                      Clear
                    </Button>
                  </div>

                  {/* Members List */}
                  <div className="border rounded-md max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members
                          .filter((member) => {
                            const query = memberSearchQuery.toLowerCase()
                            return (
                              !query ||
                              member.full_name?.toLowerCase().includes(query) ||
                              member.member_id?.toLowerCase().includes(query) ||
                              member.phone?.toLowerCase().includes(query)
                            )
                          })
                          .map((member) => (
                            <TableRow key={member.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium">{member.member_id}</TableCell>
                              <TableCell>{member.full_name}</TableCell>
                              <TableCell>{member.phone || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{member.member_type}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedShareDepositMember(member)
                                    setShareDepositMemberNo(member.member_id)
                                    setIsMemberSearchOpen(false)
                                    setMemberSearchQuery("")
                                  }}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        {members.filter((member) => {
                          const query = memberSearchQuery.toLowerCase()
                          return (
                            !query ||
                            member.full_name?.toLowerCase().includes(query) ||
                            member.member_id?.toLowerCase().includes(query) ||
                            member.phone?.toLowerCase().includes(query)
                          )
                        }).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No members found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsMemberSearchOpen(false)
                    setMemberSearchQuery("")
                  }}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={activeAction === "share-withdrawal"} onOpenChange={() => setActiveAction(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Share Withdrawal</DialogTitle>
                  <DialogDescription>Withdraw shares from a member account</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-member">Select Member</Label>
                    <Select>
                      <SelectTrigger id="withdraw-member">
                        <SelectValue placeholder="Choose member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name} - {member.member_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Shares</Label>
                    <p className="text-2xl font-bold text-foreground">250 shares</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-shares">Number of Shares to Withdraw</Label>
                    <Input id="withdraw-shares" type="number" placeholder="50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
                    <Input id="withdraw-amount" type="text" placeholder="₹500.00" disabled />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setActiveAction(null)}>Process Withdrawal</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={activeAction === "dividend"} onOpenChange={() => setActiveAction(null)}>
              <DialogContent className="w-[75vw] max-w-none h-[75vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Dividend Distribution</DialogTitle>
                  <DialogDescription>Process dividend payments for members</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="dividend-period">Dividend Period</Label>
                    <Select>
                      <SelectTrigger id="dividend-period">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="q1-2024">Q1 2024</SelectItem>
                        <SelectItem value="q2-2024">Q2 2024</SelectItem>
                        <SelectItem value="q3-2024">Q3 2024</SelectItem>
                        <SelectItem value="q4-2024">Q4 2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dividend-rate">Dividend Rate (%)</Label>
                    <Input id="dividend-rate" type="number" placeholder="5.0" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dividend-member">Select Member (Optional - Leave empty for all)</Label>
                    <Select>
                      <SelectTrigger id="dividend-member">
                        <SelectValue placeholder="All members" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name} - {member.member_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">Estimated Total Dividend</p>
                    <p className="text-2xl font-bold text-foreground">₹12,450.00</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setActiveAction(null)}>Process Dividend</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={activeAction === "membership-closure"} onOpenChange={() => setActiveAction(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Membership Closure</DialogTitle>
                  <DialogDescription>Close a member account permanently</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="closure-member">Select Member</Label>
                    <Select>
                      <SelectTrigger id="closure-member">
                        <SelectValue placeholder="Choose member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name} - {member.member_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-medium text-orange-800">Account Summary</p>
                    <div className="mt-2 space-y-1 text-sm text-orange-700">
                      <p>Outstanding Balance: ₹0.00</p>
                      <p>Share Value: ₹2,500.00</p>
                      <p>Pending Dividends: ₹125.00</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closure-reason">Closure Reason</Label>
                    <Select>
                      <SelectTrigger id="closure-reason">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member-request">Member Request</SelectItem>
                        <SelectItem value="relocation">Relocation</SelectItem>
                        <SelectItem value="inactive">Inactive Account</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closure-notes">Additional Notes</Label>
                    <Input id="closure-notes" placeholder="Optional closure notes..." />
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">Warning</p>
                    <p className="mt-1 text-sm text-red-700">
                      This action cannot be undone. All pending amounts will be settled.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setActiveAction(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => setActiveAction(null)}>
                    Close Membership
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Success Dialog after member enrollment */}
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
                        Member No: <span className="font-mono">{createdMemberNo}</span>
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-2 sm:justify-end">
                  <AlertDialogAction
                    onClick={() => setIsSuccessDialogOpen(false)}
                    className="bg-transparent border border-input hover:bg-accent hover:text-accent-foreground text-foreground"
                  >
                    Close
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => {
                      setIsSuccessDialogOpen(false)
                      setActiveAction("share-deposit")
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Share Deposit
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
function setBatchLoading(arg0: boolean) {
  throw new Error("Function not implemented.")
}

function setBatchError(arg0: null) {
  throw new Error("Function not implemented.")
}

