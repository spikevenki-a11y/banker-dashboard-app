"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, GraduationCap, Loader2, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { DashboardWrapper } from "../../_components/dashboard-wrapper"
import { TeachForm } from "./_components/teach-form"
import { PhraseList } from "./_components/phrase-list"
import { NeedsAttentionList } from "./_components/needs-attention"
import type { CatalogDataset, NeedsAttention, NewPhrase, TaughtPhrase } from "./_components/types"

type TeachData = { phrases: TaughtPhrase[]; needsAttention: NeedsAttention[]; catalog: CatalogDataset[] }

const API = "/api/report-chat/teach"

export default function ReportBotTeachPage() {
  const { user } = useAuth()
  const [data, setData] = useState<TeachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tab, setTab] = useState("attention")
  const [prefill, setPrefill] = useState<{ phrase: string; nonce: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(res.status === 403 ? "Only admins can teach the Report Bot." : json.error ?? "Couldn't load phrases.")
      setData(json)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (p: NewPhrase): Promise<string | null> => {
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error ?? "Couldn't save the phrase."
      setNotice(`Saved “${p.phrase.toLowerCase()}”. The bot uses it from the next question.`)
      setTab("phrases")
      await load()
      return null
    } catch {
      return "Couldn't reach the server. Try again."
    }
  }

  const remove = async (id: number) => {
    try {
      const res = await fetch(`${API}?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setNotice("Phrase removed.")
      await load()
    } catch {
      setError("Couldn't remove the phrase. Try again.")
    }
  }

  const teachWord = (phrase: string) => {
    setNotice(null)
    setPrefill({ phrase, nonce: Date.now() })
    window.scrollTo({ top: 0, behavior: "smooth" })
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })
  }

  const isAdmin = user?.role === "admin"

  return (
    <DashboardWrapper>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                <Link href="/report-bot" className="hover:underline">
                  Report Bot
                </Link>{" "}
                / Teach
              </p>
              <h1 className="text-xl font-semibold text-foreground">Teach the Report Bot</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/report-bot">
              <ArrowLeft className="h-4 w-4" />
              Back to chat
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <Alert variant={isAdmin ? "destructive" : "default"}>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {notice && (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TeachForm catalog={data.catalog} prefill={prefill} onSave={save} />

            <Card>
              <CardContent className="pt-6">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="attention">
                      Needs attention
                      {data.needsAttention.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 px-1.5">
                          {data.needsAttention.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="phrases">
                      Taught phrases
                      <Badge variant="secondary" className="ml-1.5 px-1.5">
                        {data.phrases.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="attention" className="mt-4">
                    <NeedsAttentionList items={data.needsAttention} onTeach={teachWord} />
                  </TabsContent>
                  <TabsContent value="phrases" className="mt-4">
                    <PhraseList phrases={data.phrases} catalog={data.catalog} onDelete={remove} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardWrapper>
  )
}
