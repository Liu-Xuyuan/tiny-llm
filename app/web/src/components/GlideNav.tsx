// 顶部悬浮液态玻璃导航：晶莹水滴滑块（.liquid-pill）如水银般平滑跟随当前阅读章节与鼠标悬停移动
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export type NavItem = { id: string; label: string }

export function GlideNav({ items, ready = true }: { items: NavItem[]; ready?: boolean }) {
  const navRef = useRef<HTMLElement | null>(null)
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
  const measure = useCallback(() => {
    const idx = items.findIndex((it) => it.id === targetId)
    const el = linkRefs.current[idx]
    if (el && el.offsetWidth > 0) {
      setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true })
    }
  }, [targetId, items])

  useLayoutEffect(measure, [measure])

  // 窗口缩放或字体加载完成时同步更新液态水滴滑块位置，防止分屏切换后错位
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    window.addEventListener("resize", measure)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  return (
    <nav
      ref={navRef}
      aria-label="页面导航"
      onMouseLeave={() => setHovered(null)}
      className="no-scrollbar relative flex max-w-full items-center gap-1 overflow-x-auto"
    >
      <span
        aria-hidden
        className="bg-brand pointer-events-none absolute bottom-0 h-[2px] rounded-full"
        style={{
          left: pill.left + 8,
          width: Math.max(0, pill.width - 16),
          opacity: pill.visible ? 1 : 0,
          transition: "left 320ms var(--ease-out-strong), width 320ms var(--ease-out-strong), opacity 180ms ease",
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
              "relative z-10 shrink-0 px-2.5 py-2 text-[12.5px] tracking-[0.01em] whitespace-nowrap transition-colors duration-200 md:px-3.5 md:text-[13px]",
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
