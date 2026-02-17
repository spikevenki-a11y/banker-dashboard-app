"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Users, BookOpen, Percent } from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"

const settingsCards = [
  {
    id: "configurations",
    title: "Configurations",
    description: "Manage system-wide configurations for all banking modules",
    icon: Settings,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    href: "/settings/configurations",
  },
  {
    id: "management",
    title: "Management",
    description: "Manage users, roles, branches, and organizational settings",
    icon: Users,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    href: "/settings/management",
  },
  {
    id: "scheme-maintenance",
    title: "Scheme Maintenance",
    description: "Create and maintain deposit, loan, and savings schemes",
    icon: BookOpen,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    href: "/settings/scheme-maintenance",
  },
  {
    id: "interest-maintenance",
    title: "Interest Maintenance",
    description: "Configure interest rates, slabs, and calculation parameters",
    icon: Percent,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    href: "/settings/interest-maintenance",
  },
]

export default function SettingsPage() {
  const router = useRouter()

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-8 p-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
            Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure and manage your banking system preferences
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {settingsCards.map((card) => (
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
                <CardDescription className="text-sm leading-relaxed">
                  {card.description}
                </CardDescription>
                <Button
                  variant="outline"
                  className="w-full bg-transparent mt-2"
                >
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
