"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  ArrowLeft,
  Search,
  FileText,
  Loader2,
  Shield,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { SanctionPanel, type SanctionApplication } from "../_components/sanction-panel"

type LoanApplication = SanctionApplication

export default function LoanSanctionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL parameter for pre-selected application
  const preSelectedAppId = searchParams.get("appId")

  // Search and list state
  const [searchQuery, setSearchQuery] = useState("")
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Selected application (sanction form lives in SanctionPanel)
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null)

  // Success state
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [sanctionedLoanAppId, setSanctionedLoanAppId] = useState<number | null>(null)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Fetch pending applications
  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/loans/applications?status=PENDING")
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications || [])

        // If pre-selected app ID, select it
        if (preSelectedAppId && data.applications) {
          const app = data.applications.find(
            (a: LoanApplication) => a.loan_application_id === parseInt(preSelectedAppId)
          )
          if (app) {
            setSelectedApp(app)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [preSelectedAppId])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // Filter applications
  const filteredApplications = applications.filter(
    (app) =>
      app.reference_no?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.membership_no?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchApplications()
  }

  // Reset form
  const handleReset = () => {
    setSelectedApp(null)
    setSanctionedLoanAppId(null)
  }

  return (
    <DashboardWrapper>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/loans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Loan Sanction</h1>
            <p className="text-sm text-muted-foreground">Review and approve or reject loan applications</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Panel: Applications List */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pending Applications</CardTitle>
                <CardDescription>{applications.length} applications awaiting review</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by reference, name, membership..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-sm text-muted-foreground">No pending applications</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-22rem)] overflow-y-auto divide-y">
                    {filteredApplications.map((app) => (
                      <button
                        key={app.loan_application_id}
                        onClick={() => setSelectedApp(app)}
                        className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${
                          selectedApp?.loan_application_id === app.loan_application_id
                            ? "bg-primary/5 border-l-4 border-l-primary"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{app.member_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">
                              Ref: {app.reference_no} | {app.membership_no}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-primary">{formatCurrency(app.applied_loan_amount)}</span>
                          <Badge variant="outline" className="text-xs">
                            {app.scheme_name}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Applied: {new Date(app.application_date).toLocaleDateString("en-IN")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Application Details & Sanction Form */}
          <div className="lg:col-span-8">
            {!selectedApp ? (
              <Card className="h-full">
                <CardContent className="flex h-96 flex-col items-center justify-center text-center">
                  <Shield className="h-16 w-16 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">Select an Application</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a pending application from the list to review and process
                  </p>
                </CardContent>
              </Card>
            ) : (
              <SanctionPanel
                key={selectedApp.loan_application_id}
                app={selectedApp}
                onCancel={handleReset}
                onApproved={({ loanAppId, message }) => {
                  // Store the loan application ID for navigation to disbursement
                  setSanctionedLoanAppId(loanAppId)
                  setSuccessMessage(message)
                  setSuccessOpen(true)
                  // Remove from list and reset
                  setApplications(prev => prev.filter(a => a.loan_application_id !== loanAppId))
                  setSelectedApp(null)
                }}
                onRejected={({ loanAppId, message }) => {
                  setSuccessMessage(message)
                  setSuccessOpen(true)
                  // Remove from list and reset
                  setApplications(prev => prev.filter(a => a.loan_application_id !== loanAppId))
                  setSelectedApp(null)
                }}
              />
            )}
          </div>
        </div>

        {/* Success Dialog */}
        <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-teal-600">
                <CheckCircle2 className="h-5 w-5" />
                {successMessage.includes("sanctioned") ? "Loan Sanctioned Successfully!" : "Success"}
              </AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {successMessage}
                {successMessage.includes("sanctioned") && (
                  <span className="block mt-3 text-muted-foreground">
                    You can now proceed to disburse this loan or return to process more applications.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
              <AlertDialogAction
                onClick={() => setSuccessOpen(false)}
                className={successMessage.includes("sanctioned") ? "bg-muted text-foreground hover:bg-muted/80" : ""}
              >
                {successMessage.includes("sanctioned") ? "Stay Here" : "OK"}
              </AlertDialogAction>
              {successMessage.includes("sanctioned") && sanctionedLoanAppId && (
                <AlertDialogAction
                  onClick={() => {
                    setSuccessOpen(false)
                    router.push(`/loans/disbursement?loanId=${sanctionedLoanAppId}`)
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Proceed to Disbursement
                  <ChevronRight className="ml-1 h-4 w-4" />
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardWrapper>
  )
}
