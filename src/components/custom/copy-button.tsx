"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { COPY_BUTTON_CONFIG } from "@/config/copy-button"
import { cn } from "cn"

type CopyStatus = "idle" | "copied" | "failed"

type ButtonProps = React.ComponentProps<typeof Button>

export interface CopyButtonProps {
  /** Nilai yang disalin. Tidak pernah di-log dan tidak masuk ke `aria-label`. */
  value: string
  /** `aria-label` tombol; default memakai `COPY_BUTTON_CONFIG.label`. */
  label?: string
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
  /** Durasi status "tersalin" sebelum kembali idle, dalam milidetik. */
  resetAfterMs?: number
  className?: string
}

async function writeWithClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.clipboard?.writeText !== "function") {
    return false
  }

  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

/** Fallback untuk konteks non-secure (HTTP) dan browser lama. */
function writeWithExecCommand(value: string): boolean {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return false
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.setAttribute("aria-hidden", "true")
  textarea.className = "fixed top-0 left-0 h-0 w-0 opacity-0"

  try {
    document.body.appendChild(textarea)
    textarea.select()
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

export function CopyButton({
  value,
  label,
  variant = "ghost",
  size = "icon-sm",
  resetAfterMs = 2000,
  className,
}: CopyButtonProps) {
  const [status, setStatus] = React.useState<CopyStatus>("idle")
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  function scheduleReset() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setStatus("idle")
      timeoutRef.current = null
    }, resetAfterMs)
  }

  async function handleCopy() {
    const copied =
      value.length > 0 && (await writeWithClipboard(value) || writeWithExecCommand(value))

    setStatus(copied ? "copied" : "failed")

    if (copied) {
      scheduleReset()
    }
  }

  const copied = status === "copied"
  let statusMessage = ""
  if (status === "copied") {
    statusMessage = COPY_BUTTON_CONFIG.copiedStatus
  } else if (status === "failed") {
    statusMessage = COPY_BUTTON_CONFIG.failedStatus
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        type="button"
        onClick={handleCopy}
        disabled={value.length === 0}
        aria-label={copied ? COPY_BUTTON_CONFIG.copiedLabel : (label ?? COPY_BUTTON_CONFIG.label)}
        className={cn("transition-colors motion-reduce:transition-none", className)}
      >
        <span
          aria-hidden="true"
          className="inline-flex items-center transition-opacity motion-reduce:transition-none"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </span>
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
    </>
  )
}
