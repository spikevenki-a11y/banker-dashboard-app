"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Construction } from "lucide-react"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"

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

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
              <Construction className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-xl mb-2">Coming Soon</CardTitle>
            <CardDescription className="text-center max-w-md">
              The Management module is under development. You will be able to manage users, roles, branches, and organizational settings here.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </DashboardWrapper>
  )
}
