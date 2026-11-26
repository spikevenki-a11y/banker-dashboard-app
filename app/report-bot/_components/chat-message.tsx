"use client"

import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReportResultTable } from "./report-result-table"
import type { ChatMessage } from "./types"

const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" })

function Avatar({ role }: { role: ChatMessage["role"] }) {
  const Icon = role === "bot" ? Bot : User
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        role === "bot" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
  )
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  const hasTable = !!message.result && message.result.rows.length > 0

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar role={message.role} />
      <div className={cn("flex min-w-0 flex-col", isUser ? "items-end" : "items-start", hasTable ? "flex-1" : "max-w-[85%] sm:max-w-[75%]")}>
        <div
          className={cn(
            "max-w-full rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : message.error
                ? "rounded-tl-sm border border-destructive/30 bg-destructive/10 text-destructive"
                : "rounded-tl-sm bg-muted text-foreground",
            hasTable && "w-full",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {hasTable && <ReportResultTable result={message.result!} />}
        </div>
        <span className="mt-1 px-1 text-[11px] text-muted-foreground">{timeFormat.format(message.at)}</span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status" aria-label="Report bot is preparing a reply">
      <Avatar role="bot" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
