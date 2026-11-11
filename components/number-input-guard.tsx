"use client"
import { useEffect } from "react"

function isNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === "number"
}

/**
 * Stops number inputs from changing value via the keyboard up/down arrows
 * or the mouse wheel, app-wide. Typing a value is unaffected.
 */
export function NumberInputGuard() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && isNumberInput(e.target)) {
        e.preventDefault()
      }
    }
    // Wheel over a focused number input would otherwise step its value.
    // Blur it instead so the page scrolls normally.
    const onWheel = (e: WheelEvent) => {
      if (isNumberInput(e.target) && document.activeElement === e.target) {
        e.target.blur()
      }
    }

    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("wheel", onWheel, { capture: true, passive: true })
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions)
    }
  }, [])

  return null
}
