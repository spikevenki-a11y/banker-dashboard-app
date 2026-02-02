"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FileText,
  TrendingUp,
  Users,
  Wallet,
  CreditCard,
  PiggyBank,
  DollarSign,
  AlertCircle,
  FileBarChart,
  Download,
  Search,
  Camera,
  PenTool,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

interface Customer {
  caste: string | number | readonly string[] | undefined
  customer_type: string | number | readonly string[] | undefined
  full_name: string
  father_name: string
  spouse_name: string
  gender: string
  marital_status: string
  blood_group: string
  dob: string
  age: string
  religion: string
  caste_category: string
  occupation: string
  qualification: string
  qualification_details: string
  anual_income: string
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
  voter_id: string
  driving_license_no: string
}

const initialCustomer: Customer = {
    full_name: "",
    father_name: "",
    spouse_name: "",
    gender: "male",
    marital_status: "single",
    blood_group: "A+",
    dob: "",
    age: "",
    religion: "",
    caste_category: "",
    occupation: "",
    qualification: "",
    qualification_details: "",
    anual_income: "",
    board_resolution_number: "",
    board_resolution_date: "",
    ledger_folio_number: "",
    house_no: "",
    street: "",
    village: "",
    taluk: "",
    district: "",
    state: "",
    pin_code: "",
    phone: "",
    email: "",
    permanant_house_no: "",
    permanant_street: "",
    permanant_village: "",
    permanant_taluk: "",
    permanant_district: "",
    permanant_state: "",
    permanant_pin_code: "",
    permanant_phone: "",
    pan_card_number: "",
    aadhar_id: "",
    ration_no: "",
    voter_id: "",
    driving_license_no: "",
    caste: undefined,
    customer_type: undefined
}

export default function CustomerPage() {
  const [newCustomer, setNewCustomer] = useState<Customer>(initialCustomer)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const [signature, setSignature] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string>("")
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"personal" | "address" | "kycdetails">("personal")


  const formatAadhar = (value: string) => {
    return value.replace(/(\d{4})(?=\d)/g, "$1 ").slice(0, 14)
  }
  const resetAddressFields = () => {
            setSameAsPermanent(false);

            setNewCustomer({
                ...newCustomer,
                house_no: "",
                street: "",
                village: "",
                taluk: "",
                district: "",
                state: "",
                pin_code: "",
                phone: "",
                email: "",

                permanant_house_no: "",
                permanant_street: "",
                permanant_village: "",
                permanant_taluk: "",
                permanant_district: "",
                permanant_state: "",
                permanant_pin_code: "",
                permanant_phone: "",
            });
            };



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
      resetAddressFields(); // 👈 clear everything here
    //   setNewCustomer(emptyCustomer)
    } catch (e: any) {
      console.log(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardWrapper>
    <div className="flex-1 space-y-6 p-8">
        <div className="grid grid-cols-3 gap-4 border-b">
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
        
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">

                    <TabsList className="grid grid-cols-3 w-full bg-primary/10 ">
                      <TabsTrigger value="personal">Personal Details</TabsTrigger>
                      <TabsTrigger value="address">Address</TabsTrigger>
                      <TabsTrigger value="kycdetails">KYC Details</TabsTrigger>
                      {/* <TabsTrigger value="assetdetails">Asset Details</TabsTrigger> */}
                    </TabsList>
                    <TabsContent value="personal">

                      <div className="grid gap-4 px-4 py-4">
                                <div className="grid grid-cols-5 gap-8 space-y-2">
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
                                    <div className="space-y-2 col-span-2">

                                        <Label htmlFor="gender-type">Gender</Label>
                                        <Select
                                        value={newCustomer.gender}
                                        onValueChange={(value) => setNewCustomer({ ...newCustomer, gender: value })}
                                        defaultValue="Male"
                                        >
                                            <SelectTrigger id="gender" className="w-full">
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
                                            <SelectTrigger id="marital_status" className="w-full">
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
                                </div>    
                                    
                                <div className="grid grid-cols-5 gap-8 space-y-2">

                                    {/* {newCustomer.marital_status === "married" && ( */}
                                    <div className="space-y-2">
                                        <Label htmlFor="spouse_name">Spouse Name *</Label>
                                        <Input
                                        id="spouse_name"
                                        placeholder="John Doe"
                                        value={newCustomer.spouse_name}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, spouse_name: e.target.value })}
                                        />
                                    </div>
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
                                        <Label htmlFor="caste">Caste</Label>
                                        <select
                                        id="caste"
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newCustomer.caste}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, caste: e.target.value })}
                                        >
                                            <option value="">Select Caste</option>
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
                                    {/* )} */}
                                    {/* <div className="grid grid-cols-2 gap-4"> 

                                    </div> */}
                                </div>  
                        
                                <div className="grid grid-cols-5 gap-8">
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
                                </div>

                                <div className="grid grid-cols-5 gap-8 space-y-2">
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
                      <div className="grid gap-4 px-4 py-4">
                        <div className="flex">
                          <div className="text-lg font-semibold flex items-center gap-1 px-4"><div className="h-4 w-1 bg-primary rounded" />Permanent Address</div>
                                            
                          {/* Checkbox */}
                          <div className="flex items-center justify-end gap-2 text-sm px-4">
                            <Checkbox
                              id="same_address"
                              checked={sameAsPermanent}
                                onCheckedChange={(checked: boolean) => {
                                setSameAsPermanent(checked);

                                if (checked) {
                                setNewCustomer((prev) => ({
                                    ...prev,
                                    permanant_house_no: prev.house_no,
                                    permanant_street: prev.street,
                                    permanant_village: prev.village,
                                    permanant_taluk: prev.taluk,
                                    permanant_district: prev.district,
                                    permanant_state: prev.state,
                                    permanant_pin_code: prev.pin_code,
                                    permanant_phone: prev.phone,
                                    // permanant_email: prev.email, // if needed
                                }));
                                }
                            }}
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
                          <Input required
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
                </Tabs>
                <div className="shrink-0 border-t bg-background px-4 py-3 flex justify-end items-center sticky bottom-0">
                    <div className="flex gap-4">
                    <Button className="bg-blue-100"
                        variant="outline"
                        onClick={() => {
                        if (activeTab === "address") setActiveTab("personal")
                        if (activeTab === "kycdetails") setActiveTab("address")
                        }}
                        hidden={activeTab === "personal"}
                    >
                        Previous
                    </Button>
                    <Button className="bg-blue-100"
                        variant="outline"
                        onClick={() => {
                            if (activeTab === "personal") setActiveTab("address")
                            if (activeTab === "address") setActiveTab("kycdetails")
                        }}
                        hidden={activeTab === "kycdetails"}
                    >
                        next
                    </Button>
                    </div>
                    <Button onClick={handleCreateCustomer} disabled={isSubmitting} hidden={activeTab !== "kycdetails"}>
                        {isSubmitting ? "Creating..." : "Create Customer"}
                    </Button>
                </div>
    </div>
    </DashboardWrapper>
  )
}
