"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"

// Scheme Details card for Loans → New Loan Application.
// Shows the selected loan_schemes row; styled like the Member Summary card.

export type LoanSchemeDetails = {
  scheme_id: number
  scheme_name: string
  scheme_description?: string | null
  loan_type?: string | null
  scheme_status?: string | null
  interest_rate?: number | string | null
  interest_calculation_method?: string | null
  repayment_frequency?: string | null
  installment_calculation_method?: string | null
  minimum_loan_amount?: number | string | null
  maximum_loan_amount?: number | string | null
  minimum_period_months?: number | string | null
  maximum_period_months?: number | string | null
  processing_fee_percent?: number | string | null
  processing_fee_min?: number | string | null
  processing_fee_max?: number | string | null
  penal_interest_rate?: number | string | null
  prepayment_allowed?: boolean | null
  prepayment_penalty_percent?: number | string | null
  collateral_required?: boolean | null
  minimum_age?: number | string | null
  maximum_age?: number | string | null
}

const label = (value?: string | null) => (value ? value.replace(/_/g, " ") : "---")
const amount = (value?: number | string | null) =>
  value === null || value === undefined || value === ""
    ? "---"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value))
const percent = (value?: number | string | null) =>
  value === null || value === undefined || value === "" ? "---" : `${Number(value)}%`
const range = (min?: number | string | null, max?: number | string | null, fmt: (v: any) => string = String) =>
  min === null || min === undefined || max === null || max === undefined ? "---" : `${fmt(min)} – ${fmt(max)}`

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <div className="text-sm font-semibold">{children}</div>
    </div>
  )
}

export function LoanSchemeDetailsCard({ scheme }: { scheme: LoanSchemeDetails | null | undefined }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Scheme Details</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {scheme ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Row title="Scheme Name">{scheme.scheme_name}</Row>
              {scheme.scheme_status && (
                <Badge variant={scheme.scheme_status === "ACTIVE" ? "default" : "secondary"}>{scheme.scheme_status}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Row title="Scheme ID"><span className="font-mono">{scheme.scheme_id}</span></Row>
              <Row title="Loan Type"><Badge variant="outline">{label(scheme.loan_type)}</Badge></Row>
            </div>
            {scheme.scheme_description && (
              <Row title="Description"><span className="font-normal text-muted-foreground">{scheme.scheme_description}</span></Row>
            )}

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <Row title="Interest Rate">{percent(scheme.interest_rate)} p.a.</Row>
              <Row title="Calculation Method">{label(scheme.interest_calculation_method)}</Row>
              <Row title="Repayment">{label(scheme.repayment_frequency)}</Row>
              <Row title="Installment Method">{label(scheme.installment_calculation_method)}</Row>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <Row title="Loan Amount">{range(scheme.minimum_loan_amount, scheme.maximum_loan_amount, amount)}</Row>
              <Row title="Tenure">{range(scheme.minimum_period_months, scheme.maximum_period_months)} months</Row>
              <Row title="Member Age">{range(scheme.minimum_age, scheme.maximum_age)} yrs</Row>
              <Row title="Collateral">{scheme.collateral_required ? "Required" : "Not required"}</Row>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <Row title="Processing Fee">
                {percent(scheme.processing_fee_percent)}
                {(Number(scheme.processing_fee_min) > 0 || Number(scheme.processing_fee_max) > 0) && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {range(scheme.processing_fee_min, scheme.processing_fee_max, amount)}
                  </span>
                )}
              </Row>
              <Row title="Penal Interest">{percent(scheme.penal_interest_rate)}</Row>
              <Row title="Prepayment">
                {scheme.prepayment_allowed ? "Allowed" : "Not allowed"}
                {scheme.prepayment_allowed && Number(scheme.prepayment_penalty_percent) > 0 && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    Penalty {percent(scheme.prepayment_penalty_percent)}
                  </span>
                )}
              </Row>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a loan scheme to see its details</p>
        )}
      </CardContent>
    </Card>
  )
}
