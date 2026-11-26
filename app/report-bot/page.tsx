"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bot, GraduationCap, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { DashboardWrapper } from "../_components/dashboard-wrapper"
import { ChatInput } from "./_components/chat-input"
import { ChatMessageBubble, TypingIndicator } from "./_components/chat-message"
import type { ChatMessage } from "./_components/types"

const SUGGESTIONS = [
  "Scheme wise loan outstanding",
  "Branch wise jewel loan outstanding",
  "FD maturing next month",
  "Village wise member count",
]

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()))

const welcomeMessage = (): ChatMessage => ({
  id: "welcome",
  role: "bot",
  text:
    "Hello! I'm the Report Bot. Ask me for a report in plain words — for example \"scheme wise loan outstanding\" — " +
    "and I'll fetch it from your branch's data. I can report on loans, members, savings, deposits and the general ledger.",
  at: new Date(),
})

export default function ReportBotPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Keep the latest message in view
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  // Cancel an in-flight request when leaving the page
  useEffect(() => () => abortRef.current?.abort(), [])

  const addMessage = (m: Omit<ChatMessage, "id" | "at">) =>
    setMessages((prev) => [...prev, { ...m, id: newId(), at: new Date() }])

  const send = async (text: string) => {
    if (loading) return
    addMessage({ role: "user", text })
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch("/api/report-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        addMessage({ role: "bot", text: "Your session has expired. Please sign in again.", error: true })
      } else if (!res.ok || data.error) {
        addMessage({ role: "bot", text: data.error ?? "Something went wrong while running the report.", error: true })
      } else if (data.ask) {
        addMessage({ role: "bot", text: data.ask })
      } else {
        addMessage({
          role: "bot",
          text: data.reply ?? "Here is your report.",
          result: { headers: data.headers ?? [], rows: data.rows ?? [], totals: data.totals ?? {}, rowCount: data.rowCount ?? 0 },
        })
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      addMessage({ role: "bot", text: "Couldn't reach the server. Check your connection and try again.", error: true })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clear = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setMessages([welcomeMessage()])
    inputRef.current?.focus()
  }

  const showSuggestions = messages.length === 1 && !loading

  return (
    <DashboardWrapper>
      <div className="mx-auto flex h-full min-h-[420px] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">Report Bot</h1>
              <p className="truncate text-xs text-muted-foreground">Ask for reports in plain language</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/report-bot/teach" title="Teach the bot new words and phrases">
                  <GraduationCap className="h-4 w-4" />
                  Teach
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clear} disabled={messages.length === 1 && !loading}>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear conversation</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {messages.map((m) => (
            <ChatMessageBubble key={m.id} message={m} />
          ))}
          {loading && <TypingIndicator />}

          {showSuggestions && (
            <div className="flex flex-wrap gap-2 pl-11">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="outline" size="sm" className="h-auto rounded-full py-1.5 text-xs" onClick={() => send(s)}>
                  <Sparkles className="h-3 w-3 text-primary" />
                  {s}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 sm:px-6">
          <ChatInput ref={inputRef} onSend={send} disabled={loading} />
          <p className="mt-1.5 hidden text-[11px] text-muted-foreground sm:block">
            Press Enter to send, Shift + Enter for a new line.
          </p>
        </div>
      </div>
    </DashboardWrapper>
  )
}
