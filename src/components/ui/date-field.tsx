"use client"

// Date input that matches the app theme. The browser's own date popup can't be styled, so this draws the calendar
// itself. It still posts a plain YYYY-MM-DD value under `name`, and `required` works through a hidden real input.
import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

const pad = (n: number) => String(n).padStart(2, "0")
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s?: string | null) => {
  const m = s && /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export function DateField({ name, defaultValue, required, disabled, min, max, className, placeholder = "Pick a date" }: {
  name: string; defaultValue?: string | null; required?: boolean; disabled?: boolean; min?: string; max?: string; className?: string; placeholder?: string
}) {
  const [value, setValue] = React.useState(parse(defaultValue) ? defaultValue! : "")
  const [open, setOpen] = React.useState(false)
  const selected = parse(value)
  const today = new Date()
  const [view, setView] = React.useState(() => { const d = selected ?? parse(min) ?? today; return { y: d.getFullYear(), m: d.getMonth() } })
  const [focus, setFocus] = React.useState<string | null>(null)
  const grid = React.useRef<HTMLDivElement>(null)

  const allowed = (s: string) => (!min || s >= min) && (!max || s <= max)
  const first = new Date(view.y, view.m, 1)
  const days = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, i - first.getDay() + 1))
  const shift = (months: number) => setView((v) => { const d = new Date(v.y, v.m + months, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const pick = (s: string) => { if (!allowed(s)) return; setValue(s); setOpen(false) }

  React.useEffect(() => {
    if (focus) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus()
  }, [focus, view])

  function onKey(e: React.KeyboardEvent) {
    const at = parse(focus ?? value) ?? today
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const d = new Date(at.getFullYear(), at.getMonth(), at.getDate() + step)
    if (d.getMonth() !== view.m || d.getFullYear() !== view.y) setView({ y: d.getFullYear(), m: d.getMonth() })
    setFocus(iso(d))
  }

  return (
    <Popover.Root open={open} onOpenChange={(o) => {
      setOpen(o)
      if (o) { const d = selected ?? parse(min) ?? today; setView({ y: d.getFullYear(), m: d.getMonth() }); setFocus(iso(d)) }
    }}>
      <span className="relative flex">
        <Popover.Trigger disabled={disabled}
          className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)}>
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : placeholder}
          </span>
          <CalendarIcon className="size-4 text-muted-foreground" />
        </Popover.Trigger>
        {/* Carries the value into the form and lets the browser enforce `required`. */}
        <input name={name} value={value} onChange={() => {}} required={required} disabled={disabled} tabIndex={-1} aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0" />
      </span>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} align="start" className="z-50">
          <Popover.Popup className="w-72 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => shift(-1)} className="rounded-md p-1.5 hover:bg-muted" aria-label="Previous month"><ChevronLeftIcon className="size-4" /></button>
              <span className="flex items-center gap-1 font-medium">
                {new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long" })}
                <button type="button" onClick={() => shift(-12)} className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Previous year">‹</button>
                <span className="tabular-nums">{view.y}</span>
                <button type="button" onClick={() => shift(12)} className="rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Next year">›</button>
              </span>
              <button type="button" onClick={() => shift(1)} className="rounded-md p-1.5 hover:bg-muted" aria-label="Next month"><ChevronRightIcon className="size-4" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">{WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}</div>
            <div ref={grid} role="grid" onKeyDown={onKey} className="grid grid-cols-7 gap-0.5">
              {days.map((d) => {
                const s = iso(d), inMonth = d.getMonth() === view.m, isSel = s === value, isToday = s === iso(today), ok = allowed(s)
                return (
                  <button key={s} type="button" data-day={s} disabled={!ok} onClick={() => pick(s)} tabIndex={s === (focus ?? value) ? 0 : -1}
                    aria-pressed={isSel} aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    className={cn("flex h-8 items-center justify-center rounded-md tabular-nums outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30",
                      !inMonth && "text-muted-foreground", isToday && !isSel && "border border-primary/40", isSel && "bg-primary text-primary-foreground hover:bg-primary")}>
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between">
              <button type="button" onClick={() => { setValue(""); setOpen(false) }} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">Clear</button>
              <button type="button" onClick={() => pick(iso(today))} disabled={!allowed(iso(today))} className="rounded-md px-2 py-1 font-medium hover:bg-muted disabled:opacity-30">Today</button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
