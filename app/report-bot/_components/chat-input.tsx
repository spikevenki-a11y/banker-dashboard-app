"use client"

import { forwardRef, useState, type KeyboardEvent } from "react"
import { Loader2, SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type ChatInputProps = {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

// Matches the 500-character limit applied by /api/report-chat
const MAX_LENGTH = 500

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput(
  { onSend, disabled, placeholder = "Ask for a report…" },
  ref,
) {
  const [value, setValue] = useState("")
  const canSend = !disabled && value.trim().length > 0

  const send = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue("")
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter adds a new line. Ignore Enter while an IME is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      className="flex items-end gap-2"
    >
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={MAX_LENGTH}
        rows={1}
        aria-label="Message"
        className="max-h-40 min-h-10 resize-none bg-background"
      />
      <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!canSend} aria-label="Send message">
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
      </Button>
    </form>
  )
})
