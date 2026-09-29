"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Gem } from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

const managementCards = [
  {
    id: "appraisers",
    title: "Manage Appraiser Details",
    description: "Add, edit, and activate or deactivate jewel loan appraisers for this branch",
    icon: Gem,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    href: "/settings/management/appraisers",
  },
]

export default function ManagementPage() {
  const router = useRouter()

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/settings")}
            className="h-10 w-10 bg-transparent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Management</h2>
              <p className="text-muted-foreground">Manage users, roles, branches, and organizational settings</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {managementCards.map((card) => (
            <Card
              key={card.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
              onClick={() => router.push(card.href)}
            >
              <CardHeader className="pb-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bgColor} transition-transform group-hover:scale-110`}
                >
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{card.description}</CardDescription>
                <Button variant="outline" className="w-full bg-transparent mt-2">
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardWrapper>
  )
}
