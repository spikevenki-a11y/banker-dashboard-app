"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Calculator,
  Loader2,
  TrendingDown,
} from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type LoanScheme = {
  scheme_id: number
  scheme_name: string
  interest_rate: number
  minimum_loan_amount: number
  maximum_loan_amount: number
  minimum_period_months: number
  maximum_period_months: number
}

type EMIScheduleItem = {
  installment_no: number
  due_date: string
  emi_amount: number
  principal_amount: number
  interest_amount: number
  balance_principal: number
}

type EMIResult = {
  emi_amount: number
  total_amount: number
  total_interest: number
  total_principal: number
  tenure_months: number
  schedule: EMIScheduleItem[]
}

function formatCurrency(val: number | string) {
  return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  if (!d) return "---"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function EMICalculatorPage() {
  const router = useRouter()

  // Scheme data
  const [schemes, setSchemes] = useState<LoanScheme[]>([])
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(true)

  // Calculator inputs
  const [selectedScheme, setSelectedScheme] = useState<string>("")
  const [loanAmount, setLoanAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [tenureMonths, setTenureMonths] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  // Results
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<EMIResult | null>(null)
  const [error, setError] = useState("")

  // Fetch schemes
  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const res = await fetch("/api/loans/schemes?status=ACTIVE")
        const data = await res.json()
        if (data.schemes) setSchemes(data.schemes)
      } catch (error) {
        console.error("Failed to fetch schemes:", error)
      } finally {
        setIsLoadingSchemes(false)
      }
    }
    fetchSchemes()
  }, [])

  // Auto-fill interest rate when scheme changes
  useEffect(() => {
    if (selectedScheme) {
      const scheme = schemes.find(s => s.scheme_id.toString() === selectedScheme)
      if (scheme) {
        setInterestRate(scheme.interest_rate.toString())
      }
    }
  }, [selectedScheme, schemes])

  // Calculate EMI
  const calculateEMI = async () => {
    if (!loanAmount || !interestRate || !tenureMonths) {
      setError("Please fill all required fields")
      return
    }

    const principal = parseFloat(loanAmount)
    const rate = parseFloat(interestRate)
    const tenure = parseInt(tenureMonths)

    if (principal <= 0 || rate < 0 || tenure <= 0) {
      setError("Please enter valid values")
      return
    }

    setIsCalculating(true)
    setError("")

    try {
      const res = await fetch("/api/loans/calculate-emi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal,
          interest_rate: rate,
          tenure_months: tenure,
          start_date: startDate
        })
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setResult(data)
    } catch (error: any) {
      setError(error.message || "Failed to calculate EMI")
    } finally {
      setIsCalculating(false)
    }
  }

  // Reset calculator
  const resetCalculator = () => {
    setSelectedScheme("")
    setLoanAmount("")
    setInterestRate("")
    setTenureMonths("")
    setStartDate(new Date().toISOString().split('T')[0])
    setResult(null)
    setError("")
  }

  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/loans")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loans
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">EMI Calculator</h1>
          <p className="text-muted-foreground">Calculate EMI and view amortization schedule</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calculator Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Loan Details
                </CardTitle>
                <CardDescription>Enter loan parameters to calculate EMI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Loan Scheme */}
                <div className="space-y-2">
                  <Label>Loan Scheme (Optional)</Label>
                  <Select value={selectedScheme} onValueChange={setSelectedScheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemes.map((scheme) => (
                        <SelectItem key={scheme.scheme_id} value={scheme.scheme_id.toString()}>
                          {scheme.scheme_name} ({scheme.interest_rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Loan Amount */}
                <div className="space-y-2">
                  <Label>Loan Amount *</Label>
                  <Input
                    type="number"
                    placeholder="Enter loan amount"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-2">
                  <Label>Interest Rate (% per annum) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter interest rate"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                  />
                </div>

                {/* Tenure */}
                <div className="space-y-2">
                  <Label>Tenure (Months) *</Label>
                  <Select value={tenureMonths} onValueChange={setTenureMonths}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months (1 year)</SelectItem>
                      <SelectItem value="24">24 months (2 years)</SelectItem>
                      <SelectItem value="36">36 months (3 years)</SelectItem>
                      <SelectItem value="48">48 months (4 years)</SelectItem>
                      <SelectItem value="60">60 months (5 years)</SelectItem>
                      <SelectItem value="84">84 months (7 years)</SelectItem>
                      <SelectItem value="120">120 months (10 years)</SelectItem>
                      <SelectItem value="180">180 months (15 years)</SelectItem>
                      <SelectItem value="240">240 months (20 years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={resetCalculator}>
                    Reset
                  </Button>
                  <Button className="flex-1" onClick={calculateEMI} disabled={isCalculating}>
                    {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Calculate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            {result && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Results Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <div className="text-sm text-blue-600 font-medium">Monthly EMI</div>
                    <div className="text-3xl font-bold text-blue-700">{formatCurrency(result.emi_amount)}</div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Principal Amount:</span>
                      <span className="font-semibold">{formatCurrency(loanAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Interest:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(result.total_interest)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-3">
                      <span className="font-semibold">Total Amount Payable:</span>
                      <span className="font-bold text-foreground">{formatCurrency(result.total_amount)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    {result.tenure_months} monthly installments of {formatCurrency(result.emi_amount)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Amortization Schedule */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Amortization Schedule</CardTitle>
                <CardDescription>Detailed month-by-month payment breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {!result ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Calculator className="h-16 w-16 mb-4" />
                    <p className="text-lg font-medium">Enter loan details to view schedule</p>
                    <p className="text-sm">The amortization schedule will appear here</p>
                  </div>
                ) : (
                  <Tabs defaultValue="table" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="table">Table View</TabsTrigger>
                      <TabsTrigger value="chart">Summary</TabsTrigger>
                    </TabsList>

                    <TabsContent value="table">
                      <div className="max-h-[600px] overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead className="w-16">EMI #</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead className="text-right">EMI Amount</TableHead>
                              <TableHead className="text-right">Principal</TableHead>
                              <TableHead className="text-right">Interest</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.schedule.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.installment_no}</TableCell>
                                <TableCell>{formatDate(item.due_date)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.emi_amount)}</TableCell>
                                <TableCell className="text-right text-teal-600">{formatCurrency(item.principal_amount)}</TableCell>
                                <TableCell className="text-right text-orange-600">{formatCurrency(item.interest_amount)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(item.balance_principal)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="chart">
                      <div className="space-y-6">
                        {/* Visual breakdown */}
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <div className="text-sm text-muted-foreground">Total Principal</div>
                                <div className="text-2xl font-bold text-teal-600">{formatCurrency(result.total_principal)}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {((result.total_principal / result.total_amount) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <div className="text-sm text-muted-foreground">Total Interest</div>
                                <div className="text-2xl font-bold text-orange-600">{formatCurrency(result.total_interest)}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {((result.total_interest / result.total_amount) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Progress bar visualization */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Principal vs Interest</span>
                            <span>{formatCurrency(result.total_amount)}</span>
                          </div>
                          <div className="flex h-8 rounded-lg overflow-hidden">
                            <div 
                              className="bg-teal-500 flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${(result.total_principal / result.total_amount) * 100}%` }}
                            >
                              Principal
                            </div>
                            <div 
                              className="bg-orange-500 flex items-center justify-center text-xs text-white font-medium"
                              style={{ width: `${(result.total_interest / result.total_amount) * 100}%` }}
                            >
                              Interest
                            </div>
                          </div>
                        </div>

                        {/* Year-wise breakdown */}
                        {result.schedule.length > 12 && (
                          <div>
                            <h4 className="font-semibold mb-3">Year-wise Breakdown</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Year</TableHead>
                                  <TableHead className="text-right">Principal Paid</TableHead>
                                  <TableHead className="text-right">Interest Paid</TableHead>
                                  <TableHead className="text-right">Opening Balance</TableHead>
                                  <TableHead className="text-right">Closing Balance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.from({ length: Math.ceil(result.schedule.length / 12) }, (_, yearIndex) => {
                                  const yearStart = yearIndex * 12
                                  const yearEnd = Math.min((yearIndex + 1) * 12, result.schedule.length)
                                  const yearItems = result.schedule.slice(yearStart, yearEnd)
                                  
                                  const principalPaid = yearItems.reduce((s, i) => s + i.principal_amount, 0)
                                  const interestPaid = yearItems.reduce((s, i) => s + i.interest_amount, 0)
                                  const openingBalance = yearIndex === 0 ? parseFloat(loanAmount) : result.schedule[yearStart - 1]?.balance_principal || 0
                                  const closingBalance = yearItems[yearItems.length - 1]?.balance_principal || 0

                                  return (
                                    <TableRow key={yearIndex}>
                                      <TableCell className="font-medium">Year {yearIndex + 1}</TableCell>
                                      <TableCell className="text-right text-teal-600">{formatCurrency(principalPaid)}</TableCell>
                                      <TableCell className="text-right text-orange-600">{formatCurrency(interestPaid)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(openingBalance)}</TableCell>
                                      <TableCell className="text-right font-mono">{formatCurrency(closingBalance)}</TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  )
}
