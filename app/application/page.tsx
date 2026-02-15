"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ApplicationPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 text-center pb-12">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-teal-100 p-3">
                <Check className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Application Submitted</h1>
            <p className="text-muted-foreground mb-6">
              Thank you! Your application has been received. Our team will review it and contact you within 2-3 business
              days.
            </p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Bank Account Application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <Input placeholder="Enter your full name" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <Input type="email" placeholder="your@email.com" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                <Input type="tel" placeholder="+91 XXXXX XXXXX" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Account Type</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option>Savings Account</option>
                  <option>Current Account</option>
                  <option>Business Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Additional Information</label>
                <Textarea placeholder="Tell us about your banking needs..." required />
              </div>

              <Button type="submit" className="w-full">
                Submit Application
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}