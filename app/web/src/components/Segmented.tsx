// Liquid Glass 分段选择器：液态玻璃凹槽 + 晶莹镜面高光水滴滑块
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

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
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const [thumb, setThumb] = useState({ left: 0, width: 0, visible: false })

  useLayoutEffect(() => {
    const el = refs.current[options.findIndex((o) => o.value === value)]
    setThumb(el ? { left: el.offsetLeft, width: el.offsetWidth, visible: true } : (t) => ({ ...t, visible: false }))
  }, [value, options])

  return (
    <div className={cn("liquid-well relative inline-flex rounded-full p-[3px]", className)}>
      <span
        aria-hidden
        className="liquid-pill absolute inset-y-[3px] rounded-full"
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
            "relative z-10 flex flex-1 items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap transition-colors duration-150",
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
