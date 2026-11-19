// 顶部水平导航（Apple 吸顶液态滑块风格）：胶囊指示底板平滑跟随当前阅读章节与鼠标悬停移动
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type NavItem = { id: string; label: string }

export function GlideNav({ items, ready = true }: { items: NavItem[]; ready?: boolean }) {
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [active, setActive] = useState(items[0]?.id)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false })

  useEffect(() => {
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting))
        const first = items.find((it) => seen.get(it.id))
        if (first) setActive(first.id)
      },
      { rootMargin: "-20% 0px -60% 0px" },
    )
    items.forEach((it) => { const el = document.getElementById(it.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [items, ready])

  const targetId = hovered ?? active
  useLayoutEffect(() => {
    const idx = items.findIndex((it) => it.id === targetId)
    const el = linkRefs.current[idx]
    if (el) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true })
    }
  }, [targetId, items])

  return (
    <nav
      aria-label="页面导航"
      onMouseLeave={() => setHovered(null)}
      className="relative hidden items-center gap-0.5 md:flex"
    >
      <span
        aria-hidden
        className="bg-field pointer-events-none absolute inset-y-0 rounded-full"
        style={{
          left: pill.left,
          width: pill.width,
          opacity: pill.visible ? 1 : 0,
          transition: "left 300ms var(--ease-out-strong), width 300ms var(--ease-out-strong), opacity 180ms ease",
        }}
      />
      {items.map((it, i) => {
        const isActive = active === it.id
        return (
          <a
            key={it.id}
            ref={(el) => { linkRefs.current[i] = el }}
            href={`#${it.id}`}
            onMouseEnter={() => setHovered(it.id)}
            className={cn(
              "relative z-10 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors duration-200",
              isActive ? "text-ink font-medium" : "text-ink-3 hover:text-ink",
            )}
          >
            {it.label}
          </a>
        )
      })}
    </nav>
  )
}
