"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { DialogDescription } from "@/components/ui/dialog"

import { DialogTitle } from "@/components/ui/dialog"

import { DialogHeader } from "@/components/ui/dialog"

import { DialogContent } from "@/components/ui/dialog"

import { Dialog } from "@/components/ui/dialog"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Wallet,
  FileText,
  CreditCard,
  TrendingUp,
  Building2,
  DollarSign,
  Bell,
  Shield,
  Search,
  ArrowLeft,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

export default function SettingsPage() {
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const configSections = [
    {
      id: "membership",
      title: "Membership Configuration",
      description: "Configure member enrollment, KYC requirements, and account types",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      settings: [
        { label: "Minimum Share Capital", value: "₹1,000", type: "currency" },
        { label: "Maximum Shares per Member", value: "1000", type: "number" },
        { label: "KYC Verification Required", value: true, type: "boolean" },
        { label: "Auto Account Number Generation", value: true, type: "boolean" },
      ],
    },
    {
      id: "savings",
      title: "Savings Configuration",
      description: "Set interest rates, minimum balance, and withdrawal limits",
      icon: Wallet,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      settings: [
        { label: "Annual Interest Rate", value: "4.5", type: "percentage" },
        { label: "Minimum Balance", value: "₹500", type: "currency" },
        { label: "Maximum Withdrawal per Day", value: "₹50,000", type: "currency" },
        { label: "Interest Calculation Method", value: "Daily Balance", type: "text" },
      ],
    },
    {
      id: "fixed-deposits",
      title: "Fixed Deposit Configuration",
      description: "Configure FD interest rates, tenure options, and premature withdrawal penalties",
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      settings: [
        { label: "1 Year FD Rate", value: "6.5", type: "percentage" },
        { label: "2 Year FD Rate", value: "7.0", type: "percentage" },
        { label: "3 Year FD Rate", value: "7.5", type: "percentage" },
        { label: "Premature Withdrawal Penalty", value: "1.0", type: "percentage" },
        { label: "Minimum FD Amount", value: "₹10,000", type: "currency" },
      ],
    },
    {
      id: "loans",
      title: "Loan Configuration",
      description: "Set loan interest rates, processing fees, and eligibility criteria",
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      settings: [
        { label: "Personal Loan Rate", value: "12.0", type: "percentage" },
        { label: "Business Loan Rate", value: "10.5", type: "percentage" },
        { label: "Mortgage Loan Rate", value: "8.5", type: "percentage" },
        { label: "Processing Fee", value: "1.5", type: "percentage" },
        { label: "Maximum Loan Amount", value: "₹50,00,000", type: "currency" },
      ],
    },
    {
      id: "dividend",
      title: "Dividend Configuration",
      description: "Configure dividend calculation, distribution frequency, and eligibility",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      settings: [
        { label: "Annual Dividend Rate", value: "8.0", type: "percentage" },
        { label: "Distribution Frequency", value: "Annual", type: "text" },
        { label: "Minimum Shares for Dividend", value: "10", type: "number" },
        { label: "Auto Credit to Savings", value: true, type: "boolean" },
      ],
    },
    {
      id: "shares",
      title: "Share Management",
      description: "Configure share pricing, transfer rules, and withdrawal policies",
      icon: DollarSign,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      settings: [
        { label: "Share Price", value: "₹100", type: "currency" },
        { label: "Allow Share Transfers", value: true, type: "boolean" },
        { label: "Share Withdrawal Lock Period", value: "12", type: "number" },
        { label: "Withdrawal Penalty Rate", value: "2.0", type: "percentage" },
      ],
    },
    {
      id: "organization",
      title: "Organization Settings",
      description: "Bank details, branch information, and operational hours",
      icon: Building2,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      settings: [
        { label: "Bank Name", value: "NextZen Bank", type: "text" },
        { label: "Registration Number", value: "BANK12345", type: "text" },
        { label: "Operating Days", value: "Mon-Sat", type: "text" },
        { label: "Working Hours", value: "9:00 AM - 5:00 PM", type: "text" },
      ],
    },
    {
      id: "security",
      title: "Security & Compliance",
      description: "Password policies, session management, and audit settings",
      icon: Shield,
      color: "text-red-600",
      bgColor: "bg-red-50",
      settings: [
        { label: "Password Expiry Days", value: "90", type: "number" },
        { label: "Session Timeout (minutes)", value: "30", type: "number" },
        { label: "Two-Factor Authentication", value: true, type: "boolean" },
        { label: "Enable Audit Logs", value: true, type: "boolean" },
      ],
    },
    {
      id: "notifications",
      title: "Notifications & Alerts",
      description: "Email, SMS, and in-app notification preferences",
      icon: Bell,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      settings: [
        { label: "Email Notifications", value: true, type: "boolean" },
        { label: "SMS Alerts", value: true, type: "boolean" },
        { label: "Transaction Alerts Above", value: "₹10,000", type: "currency" },
        { label: "Daily Summary Report", value: true, type: "boolean" },
      ],
    },
  ]

  const filteredSections = configSections.filter((section) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.description.toLowerCase().includes(searchLower) ||
      section.settings.some((setting) => setting.label.toLowerCase().includes(searchLower))
    )
  })

  const selectedSection = configSections.find((s) => s.id === selectedConfig)

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        {/* Show main view when no config is selected */}
        {!selectedConfig ? (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings & Configuration</h2>
              <p className="text-muted-foreground">Manage system-wide configurations for all banking modules</p>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search settings and configurations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredSections.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSections.map((section) => (
                  <Card
                    key={section.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                    onClick={() => setSelectedConfig(section.id)}
                  >
                    <CardHeader>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${section.bgColor}`}>
                        <section.icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <CardTitle className="mt-4">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full bg-transparent">
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No configurations found</h3>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query</p>
              </div>
            )}
          </>
        ) : (
          /* Show configuration detail view in main content area */
          <>
            {/* Header with back button */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedConfig(null)}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                {selectedSection && (
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${selectedSection.bgColor}`}>
                    <selectedSection.icon className={`h-6 w-6 ${selectedSection.color}`} />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedSection?.title}</h2>
                  <p className="text-muted-foreground">{selectedSection?.description}</p>
                </div>
              </div>
            </div>

            {/* Configuration Table */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Settings</CardTitle>
                <CardDescription>View and modify the settings for this module</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Setting</TableHead>
                      <TableHead className="w-[30%]">Value</TableHead>
                      <TableHead className="w-[20%] text-right">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSection?.settings.map((setting, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{setting.label}</TableCell>
                        <TableCell>
                          {setting.type === "boolean" ? (
                            <Switch defaultChecked={setting.value as boolean} />
                          ) : (
                            <Input
                              defaultValue={setting.value as string}
                              type={setting.type === "number" ? "number" : "text"}
                              className="max-w-[200px]"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                            {setting.type}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedConfig(null)} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={() => setSelectedConfig(null)}>Save Changes</Button>
            </div>
          </>
        )}
      </div>
    </DashboardWrapper>
  )
}
