"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
} from "lucide-react"

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

  return (
    <div className="flex-1 space-y-6 p-8">
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

      {selectedConfig && (
        <Dialog open={!!selectedConfig} onOpenChange={() => setSelectedConfig(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {(() => {
                  const section = configSections.find((s) => s.id === selectedConfig)
                  if (!section) return null
                  const Icon = section.icon
                  return (
                    <>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-5 w-5 ${section.color}`} />
                      </div>
                      {section.title}
                    </>
                  )
                })()}
              </DialogTitle>
              <DialogDescription>{configSections.find((s) => s.id === selectedConfig)?.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {configSections
                .find((s) => s.id === selectedConfig)
                ?.settings.map((setting, idx) => (
                  <div key={idx} className="space-y-2">
                    {setting.type === "boolean" ? (
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`setting-${idx}`} className="text-sm font-medium">
                          {setting.label}
                        </Label>
                        <Switch id={`setting-${idx}`} defaultChecked={setting.value as boolean} />
                      </div>
                    ) : (
                      <>
                        <Label htmlFor={`setting-${idx}`} className="text-sm font-medium">
                          {setting.label}
                        </Label>
                        <Input
                          id={`setting-${idx}`}
                          defaultValue={setting.value as string}
                          type={setting.type === "number" ? "number" : "text"}
                          placeholder={`Enter ${setting.label.toLowerCase()}`}
                        />
                      </>
                    )}
                  </div>
                ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedConfig(null)}>
                Cancel
              </Button>
              <Button onClick={() => setSelectedConfig(null)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
