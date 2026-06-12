"use client"

import { useRouter } from "next/navigation"
import { Terminal, PlusSquare } from "lucide-react"
import { DashboardWrapper } from "@/app/_components/dashboard-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const adminCards = [
  {
    id: "add-scheme",
    title: "Add Scheme",
    description: "Create new savings, deposit, or loan schemes from master templates",
    icon: PlusSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    href: "/settings/admin-console/add-scheme",
  },
]

export default function AdminConsolePage() {
  const router = useRouter()

  return (
    <DashboardWrapper>
      <div className="flex-1 space-y-8 p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Terminal className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Admin Console</h2>
            <p className="text-muted-foreground mt-1">
              Advanced administrative tools and backend controls
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {adminCards.map((card) => (
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
