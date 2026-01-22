"use client"


import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Search,
  ArrowLeft,
} from "lucide-react"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { iconMap } from "@/lib/iconMap"

export default function SettingsPage() {
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)
  const [configSections, setConfigSections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const transformConfigResponse = (apiData: any[]) => {
  return apiData.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    icon: iconMap[section.icon] ?? Users, // fallback
    color: section.color,
    bgColor: section.bgColor,
    settings: section.settings.map((s: any) => ({
      settingId: s.settingId,   // 🔑 REQUIRED
      label: s.label,
      value: s.value,
      type: s.type,
    })),
  }))
}
  
  const filteredSections = configSections.filter((section) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      section.title.toLowerCase().includes(searchLower) ||
      section.description.toLowerCase().includes(searchLower) ||
      section.settings.some((setting: { label: string }) => setting.label.toLowerCase().includes(searchLower))
    )
  })

  
useEffect(() => {
  async function loadSettings() {
    setIsLoading(true)

    try {
      const [uiRes, shareRes] = await Promise.all([
        fetch("/api/configs", { credentials: "include" }),
        fetch("/api/configs/share", { credentials: "include" }),
      ])

      const uiData = await uiRes.json()
      const shareJson = await shareRes.json()

      let sections = transformConfigResponse(uiData)

      // Merge share config values into UI settings
      if (shareJson?.success) {
        sections = sections.map((section) => {
          if (section.id !== "shares") return section

          return {
            ...section,
            settings: section.settings.map((s: any) => ({
              ...s,
              value:
                shareJson.data[s.settingId] !== undefined
                  ? shareJson.data[s.settingId]
                  : s.value,
            })),
          }
        })
      }

      setConfigSections(sections)
    } catch (err) {
      console.error("Failed to load settings:", err)
    } finally {
      setIsLoading(false)
    }
  }

  loadSettings()
}, [])


  const selectedSection = configSections.find((s) => s.id === selectedConfig)
  if (isLoading) {
    return (
      <DashboardWrapper>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">
              Loading settings...
            </p>
          </div>
        </div>
      </DashboardWrapper>
    ) 
  }
  return (
    
    <DashboardWrapper>
      <div className="flex-1 space-y-6 p-8">
        {/* Show main view when no config is selected */}
        {!selectedConfig ? (
          <>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings & Configuration</h2>
              <p className="text-muted-foreground">Manage system-wide configurations for all banking modules</p>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search settings and configurations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredSections.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSections.map((section) => (
                  <Card
                    key={section.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                    onClick={() => setSelectedConfig(section.id)}
                  >
                    <CardHeader>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${section.bgColor}`}>
                        <section.icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <CardTitle className="mt-4">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full bg-transparent">
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No configurations found</h3>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search query</p>
              </div>
            )}
          </>
        ) : (
          /* Show configuration detail view in main content area */
          <>
            {/* Header with back button */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedConfig(null)}
                className="h-10 w-10 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                {selectedSection && (
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${selectedSection.bgColor}`}>
                    <selectedSection.icon className={`h-6 w-6 ${selectedSection.color}`} />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedSection?.title}</h2>
                  <p className="text-muted-foreground">{selectedSection?.description}</p>
                </div>
              </div>
            </div>

            {/* Configuration Table */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Settings</CardTitle>
                <CardDescription>View and modify the settings for this module</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Setting</TableHead>
                      <TableHead className="w-[30%]">Value</TableHead>
                      {/* <TableHead className="w-[20%] text-right">Type</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSection?.settings.map((setting: { label: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; type: string; value: string | boolean }, idx: Key | null | undefined) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{setting.label}</TableCell>
                        <TableCell>
                          {setting.type === "boolean" ? (
                            <Switch defaultChecked={setting.value as boolean} />
                          ) : (
                            <Input
                              defaultValue={setting.value as string}
                              type={setting.type === "number" ? "number" : "text"}
                              className="max-w-[200px]"
                            />
                          )}
                        </TableCell>
                        {/* <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                            {setting.type}
                          </span>
                        </TableCell> */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedConfig(null)} className="bg-transparent">
                Cancel
              </Button>
              <Button onClick={() => setSelectedConfig(null)}>Save Changes</Button>
            </div>
          </>
        )}
      </div>
    </DashboardWrapper>
  )
}
