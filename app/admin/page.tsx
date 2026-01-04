"use client"

import { useAuth } from "@/lib/auth-context"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Building2 } from "lucide-react"
import { AdminUsersManager } from "@/app/admin/_components/admin-users-manager"
import { AdminBranchManager } from "@/app/admin/_components/admin-branch-manager"

export default function AdminPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users and branch configurations</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Manage Users</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Manage Branches</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <AdminUsersManager />
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <AdminBranchManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
