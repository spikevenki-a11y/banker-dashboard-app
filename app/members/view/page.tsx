"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  Shield,
  Building2,
  Users,
  Hash,
  Eye,
} from "lucide-react"

type MemberData = {
  customer_code: string
  membership_class: string
  member_type: string
  membership_no: string
  ledger_folio_number: string
  board_resolution_number: string
  boardresolutiondate: string
  status: string
  full_name: string
  father_name: string
  gender: string
  date_of_birth: string
  customer_type: string
  spouse_name: string
  mobile_no: string
  email: string
  house_no: string
  street: string
  village: string
  thaluk: string
  district: string
  state: string
  pincode: string
  phone_no: string
  aadhaar_no: string
  pan_no: string
  ration_no: string
  driving_license_no: string
}

type SearchFields = {
  member_name: string
  father_name: string
  phone_number: string
  aadhaar_number: string
  ledger_folio_number: string
}

export default function ViewMemberPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchFields, setSearchFields] = useState<SearchFields>({
    member_name: "",
    father_name: "",
    phone_number: "",
    aadhaar_number: "",
    ledger_folio_number: "",
  })
  const [members, setMembers] = useState<MemberData[]>([])
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<"personal" | "address" | "kyc">("personal")

  const handleSearch = async () => {
    setIsSearching(true)
    setHasSearched(true)
    setSelectedMember(null)
    try {
      const res = await fetch("/api/memberships/view_member", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchFields),
      })
      const data = await res.json()
      if (res.ok && data.found && data.memberData) {
        setMembers(data.memberData)
      } else {
        setMembers([])
      }
    } catch {
      setMembers([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectMember = (member: MemberData) => {
    setSelectedMember(member)
  }

  const formatAadhaar = (val: string) => {
    if (!val) return "---"
    return `${val.slice(0, 4)} ${val.slice(4, 8)} ${val.slice(8)}`
  }

  const buildAddress = (m: MemberData) => {
    const parts = [m.house_no, m.street, m.village, m.thaluk, m.district, m.state].filter(Boolean)
    const address = parts.join(", ")
    return m.pincode ? `${address} - ${m.pincode}` : address || "---"
  }

  return (
    <DashboardWrapper>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/members")}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to members</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">View Member</h1>
            <p className="text-sm text-muted-foreground">
              Search and view member details
            </p>
          </div>
        </div>

        {/* Search Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Search Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Member Name</Label>
                <Input
                  placeholder="Enter name"
                  value={searchFields.member_name}
                  onChange={(e) => setSearchFields({ ...searchFields, member_name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Father Name</Label>
                <Input
                  placeholder="Enter father name"
                  value={searchFields.father_name}
                  onChange={(e) => setSearchFields({ ...searchFields, father_name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                <Input
                  placeholder="Enter phone"
                  value={searchFields.phone_number}
                  onChange={(e) => setSearchFields({ ...searchFields, phone_number: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Aadhaar Number</Label>
                <Input
                  placeholder="Enter Aadhaar"
                  value={searchFields.aadhaar_number}
                  onChange={(e) => setSearchFields({ ...searchFields, aadhaar_number: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Ledger No.</Label>
                <Input
                  placeholder="Enter ledger no."
                  value={searchFields.ledger_folio_number}
                  onChange={(e) => setSearchFields({ ...searchFields, ledger_folio_number: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={isSearching} className="w-full gap-2">
                  <Search className="h-4 w-4" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results or Detail */}
        {selectedMember ? (
          /* Member Detail View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setSelectedMember(null)} className="gap-2">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to results
              </Button>
              <Badge
                variant={selectedMember.status?.toUpperCase() === "ACTIVE" ? "default" : "secondary"}
                className={
                  selectedMember.status?.toUpperCase() === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-gray-100 text-gray-600"
                }
              >
                {selectedMember.status || "---"}
              </Badge>
            </div>

            {/* Member Summary Header */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="py-5">
                <div className="flex items-start gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-foreground">{selectedMember.full_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {"S/o D/o"} {selectedMember.father_name || "---"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-3.5 w-3.5" />
                        {selectedMember.membership_no}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedMember.phone_no || selectedMember.mobile_no || "---"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {selectedMember.email || "---"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Class {selectedMember.membership_class || "---"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Customer Type</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                    {selectedMember.customer_type || "---"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Member Type</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                    {selectedMember.member_type || "---"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Ledger Folio No.</p>
                  <p className="mt-1 text-sm font-semibold font-mono text-foreground">
                    {selectedMember.ledger_folio_number || "---"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-medium text-muted-foreground">Gender</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                    {selectedMember.gender || "---"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Details */}
            <Card>
              <CardHeader className="pb-0">
                <div className="flex gap-1 border-b">
                  {(
                    [
                      { key: "personal", label: "Personal Details", icon: User },
                      { key: "address", label: "Address", icon: MapPin },
                      { key: "kyc", label: "KYC Details", icon: Shield },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === tab.key
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {activeTab === "personal" && (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField icon={User} label="Full Name" value={selectedMember.full_name} />
                    <DetailField icon={Users} label="Father Name" value={selectedMember.father_name} />
                    <DetailField icon={Users} label="Spouse Name" value={selectedMember.spouse_name} />
                    <DetailField icon={Calendar} label="Date of Birth" value={selectedMember.date_of_birth} />
                    <DetailField icon={User} label="Gender" value={selectedMember.gender} capitalize />
                    <DetailField icon={Phone} label="Mobile" value={selectedMember.mobile_no || selectedMember.phone_no} />
                    <DetailField icon={Mail} label="Email" value={selectedMember.email} />
                    <DetailField icon={FileText} label="Board Resolution No." value={selectedMember.board_resolution_number} />
                    <DetailField icon={Calendar} label="Board Resolution Date" value={selectedMember.boardresolutiondate} />
                  </div>
                )}

                {activeTab === "address" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField icon={MapPin} label="House No." value={selectedMember.house_no} />
                      <DetailField icon={MapPin} label="Street" value={selectedMember.street} />
                      <DetailField icon={MapPin} label="Village" value={selectedMember.village} />
                      <DetailField icon={MapPin} label="Taluk" value={selectedMember.thaluk} />
                      <DetailField icon={MapPin} label="District" value={selectedMember.district} />
                      <DetailField icon={MapPin} label="State" value={selectedMember.state} />
                      <DetailField icon={Hash} label="Pincode" value={selectedMember.pincode} />
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs font-medium text-muted-foreground">Full Address</p>
                      <p className="mt-1 text-sm text-foreground">{buildAddress(selectedMember)}</p>
                    </div>
                  </div>
                )}

                {activeTab === "kyc" && (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField icon={CreditCard} label="Aadhaar No." value={formatAadhaar(selectedMember.aadhaar_no)} mono />
                    <DetailField icon={CreditCard} label="PAN No." value={selectedMember.pan_no} mono />
                    <DetailField icon={FileText} label="Ration No." value={selectedMember.ration_no} />
                    <DetailField icon={CreditCard} label="Driving License No." value={selectedMember.driving_license_no} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Search Results Table */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {hasSearched
                  ? `Search Results (${members.length})`
                  : "Member Results"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Searching members...</p>
                  </div>
                </div>
              ) : hasSearched && members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-base font-medium text-muted-foreground">No members found</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : members.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Membership No</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Father Name</TableHead>
                        <TableHead className="font-semibold">Phone</TableHead>
                        <TableHead className="font-semibold">Aadhaar</TableHead>
                        <TableHead className="font-semibold">Class</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member, idx) => (
                        <TableRow
                          key={`${member.membership_no}-${idx}`}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSelectMember(member)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {member.membership_no}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              {member.email && (
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{member.father_name || "---"}</TableCell>
                          <TableCell className="text-sm">
                            {member.phone_no || member.mobile_no || "---"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {member.aadhaar_no ? formatAadhaar(member.aadhaar_no) : "---"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {member.membership_class === "A"
                                ? "Class A"
                                : member.membership_class === "B"
                                  ? "Class B"
                                  : member.membership_class || "---"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={member.status?.toUpperCase() === "ACTIVE" ? "default" : "secondary"}
                              className={
                                member.status?.toUpperCase() === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-gray-100 text-gray-600"
                              }
                            >
                              {member.status || "---"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-primary hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectMember(member)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">
                    Search by name, father name, phone, Aadhaar, or ledger number
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardWrapper>
  )
}

/* Reusable detail field component */
function DetailField({
  icon: Icon,
  label,
  value,
  mono = false,
  capitalize = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
  mono?: boolean
  capitalize?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p
        className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {value || "---"}
      </p>
    </div>
  )
}
