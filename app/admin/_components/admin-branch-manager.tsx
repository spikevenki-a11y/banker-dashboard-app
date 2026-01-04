"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Branch {
  branch_id: number
  branch_name: string
  branch_code: string
  city: string
  state: string
  phone_number: string
  email: string
  is_head_office: boolean
}

export function AdminBranchManager() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    branch_id: "",
    branch_name: "",
    branch_code: "",
    city: "",
    state: "",
    phone_number: "",
    email: "",
    is_head_office: false,
  })

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/admin/branches")
      if (!response.ok) throw new Error("Failed to fetch branches")
      const data = await response.json()
      setBranches(data)
    } catch (error) {
      console.error("[v0] Error fetching branches:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBranch = async () => {
    try {
      const response = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error("Failed to add branch")
      setFormData({
        branch_id: "",
        branch_name: "",
        branch_code: "",
        city: "",
        state: "",
        phone_number: "",
        email: "",
        is_head_office: false,
      })
      setIsDialogOpen(false)
      await fetchBranches()
    } catch (error) {
      console.error("[v0] Error adding branch:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Branch Management</CardTitle>
            <CardDescription>Manage bank branches and locations</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Branch</DialogTitle>
                <DialogDescription>Create a new bank branch location</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    placeholder="Downtown Branch"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_code">Branch Code</Label>
                  <Input
                    id="branch_code"
                    placeholder="DB001"
                    value={formData.branch_code}
                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone</Label>
                  <Input
                    id="phone_number"
                    placeholder="212-555-0100"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="branch@nextzenbank.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddBranch} className="w-full">
                  Create Branch
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading branches...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.branch_id}>
                  <TableCell className="font-medium">{branch.branch_name}</TableCell>
                  <TableCell className="font-mono text-sm">{branch.branch_code}</TableCell>
                  <TableCell>{branch.city}</TableCell>
                  <TableCell>{branch.state}</TableCell>
                  <TableCell>{branch.phone_number}</TableCell>
                  <TableCell className="text-sm">{branch.email}</TableCell>
                  <TableCell>
                    <Badge variant={branch.is_head_office ? "default" : "secondary"}>
                      {branch.is_head_office ? "Head Office" : "Branch"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
