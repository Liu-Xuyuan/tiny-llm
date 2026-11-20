// 分段选择器：暖亚麻凹槽 + 纸感滑块（带 ResizeObserver，窗口缩放或布局重排时始终精准对齐）
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: ReactNode; title?: string }

type Props<T extends string> = {
  options: Option<T>[]
  value: T | null
  onChange: (v: T) => void
  className?: string
  size?: "sm" | "md"
}

export function Segmented<T extends string>({ options, value, onChange, className, size = "md" }: Props<T>) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const [thumb, setThumb] = useState({ left: 0, width: 0, visible: false })

  const measure = useCallback(() => {
    const el = refs.current[options.findIndex((o) => o.value === value)]
    setThumb(el && el.offsetWidth > 0 ? { left: el.offsetLeft, width: el.offsetWidth, visible: true } : (t) => ({ ...t, visible: false }))
  }, [value, options])

  useLayoutEffect(measure, [measure])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  return (
    <div ref={wrapRef} className={cn("liquid-well relative inline-flex rounded-[10px] p-[3px]", className)}>
      <span
        aria-hidden
        className="liquid-pill absolute inset-y-[3px] rounded-[7px]"
        style={{
          left: thumb.left,
          width: thumb.width,
          opacity: thumb.visible ? 1 : 0,
          transition: "left 300ms var(--ease-out-strong), width 300ms var(--ease-out-strong), opacity 150ms",
        }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => { refs.current[i] = el }}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 flex flex-1 items-center justify-center gap-1 rounded-[7px] font-medium whitespace-nowrap transition-colors duration-150",
            size === "sm" ? "h-[26px] px-3 text-[12px]" : "h-8 px-3.5 text-[12.5px]",
            o.value === value ? "text-ink" : "text-ink-3 hover:text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
