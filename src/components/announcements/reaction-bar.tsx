"use client"

import { useEffect, useRef, useState } from "react"
import { REACTIONS } from "@/lib/constants"
import type { Reaction, ReactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

const LABEL_CLASS: Record<ReactionType, string> = {
  like: "text-sky-600 dark:text-sky-400",
  heart: "text-rose-600 dark:text-rose-400",
  wow: "text-amber-600 dark:text-amber-400",
  haha: "text-amber-500 dark:text-amber-300",
  angry: "text-orange-600 dark:text-orange-400",
  important: "text-red-600 dark:text-red-400",
}

export function displayedReactions(
  reactions: Reaction[],
  userId: string,
  mine: ReactionType | null
) {
  const others = reactions.filter((item) => item.user_id !== userId)
  if (!mine) return others
  return [
    ...others,
    { announcement_id: reactions[0]?.announcement_id ?? "", user_id: userId, type: mine },
  ]
}

export function ReactionSummary({ reactions }: { reactions: Reaction[] }) {
  if (!reactions.length) return <span />

  const counts = new Map<ReactionType, number>()
  for (const item of reactions) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
  }
  const stacked = REACTIONS.filter((item) => counts.has(item.type))
    .sort((a, b) => (counts.get(b.type) ?? 0) - (counts.get(a.type) ?? 0))
    .slice(0, 3)

  return (
    <p className="flex min-w-0 items-center gap-1.5">
      <span className="flex -space-x-1">
        {stacked.map((reaction) => (
          <span
            key={reaction.type}
            className="inline-flex size-5 items-center justify-center rounded-full bg-card text-[12px] ring-1 ring-background"
            title={`${counts.get(reaction.type)} ${reaction.label}`}
          >
            {reaction.emoji}
          </span>
        ))}
      </span>
      <span>{reactions.length}</span>
    </p>
  )
}

export function ReactionButton({
  active,
  pending,
  onReact,
}: {
  active: ReactionType | null
  pending: boolean
  onReact: (type: ReactionType) => void
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const holdTimer = useRef<number | null>(null)
  const holdOpened = useRef(false)
  const current = REACTIONS.find((item) => item.type === active)

  function clearClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function showPicker() {
    clearClose()
    setOpen(true)
  }

  function hidePicker(delay = 220) {
    clearClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), delay)
  }

  useEffect(() => {
    return () => {
      clearClose()
      if (holdTimer.current) window.clearTimeout(holdTimer.current)
    }
  }, [])

  function pick(type: ReactionType) {
    onReact(type)
    setOpen(false)
  }

  return (
    <div
      className="relative"
      onMouseEnter={showPicker}
      onMouseLeave={() => hidePicker()}
    >
      <button
        type="button"
        disabled={pending}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          if (holdOpened.current) {
            holdOpened.current = false
            return
          }
          onReact(active ?? "like")
        }}
        onPointerDown={() => {
          holdOpened.current = false
          holdTimer.current = window.setTimeout(() => {
            holdOpened.current = true
            showPicker()
          }, 380)
        }}
        onPointerUp={() => {
          if (holdTimer.current) window.clearTimeout(holdTimer.current)
        }}
        onPointerCancel={() => {
          if (holdTimer.current) window.clearTimeout(holdTimer.current)
        }}
        onContextMenu={(event) => event.preventDefault()}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md py-2 text-[15px] font-medium hover:bg-muted",
          current ? LABEL_CLASS[current.type] : "text-muted-foreground"
        )}
      >
        <span
          className={cn("text-base leading-none", current && "reaction-pop")}
          key={current?.type ?? "none"}
        >
          {current?.emoji ?? "👍"}
        </span>
        {current?.label ?? "Like"}
      </button>

      <div
        className={cn(
          "absolute bottom-[calc(100%-6px)] left-1/2 z-50 w-max -translate-x-1/2 pb-3 transition duration-150",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        )}
        onMouseEnter={showPicker}
        onMouseLeave={() => hidePicker()}
      >
        <div className="flex items-end gap-0.5 rounded-full bg-card px-1.5 py-1 shadow-lg ring-1 ring-foreground/10">
          {REACTIONS.map((reaction, index) => {
            const selected = active === reaction.type
            return (
              <button
                key={reaction.type}
                type="button"
                title={reaction.label}
                disabled={pending}
                onClick={() => pick(reaction.type)}
                className={cn(
                  "reaction-emoji relative flex size-10 items-center justify-center rounded-full text-[26px] leading-none",
                  selected && "bg-muted"
                )}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <span className="reaction-emoji-face">{reaction.emoji}</span>
                <span className="reaction-emoji-label">{reaction.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
