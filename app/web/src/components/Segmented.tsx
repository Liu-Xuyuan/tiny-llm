// iOS / macOS 风格分段选择器：浅灰胶囊底座 + 纯净悬浮滑块平滑过渡
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
    <div className={cn("bg-field relative inline-flex rounded-full p-[3px]", className)}>
      <span
        aria-hidden
        className="bg-surface absolute inset-y-[3px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
        style={{
          left: thumb.left,
          width: thumb.width,
          opacity: thumb.visible ? 1 : 0,
          transition: "left 260ms var(--ease-out-strong), width 260ms var(--ease-out-strong), opacity 150ms",
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
