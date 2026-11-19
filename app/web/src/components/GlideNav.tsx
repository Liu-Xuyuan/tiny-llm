// 顶部水平导航（Apple.com 吸顶子导航风格）：scroll-spy 自动高亮当前阅读章节，点击平滑跳转
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type NavItem = { id: string; label: string }

export function GlideNav({ items, ready = true }: { items: NavItem[]; ready?: boolean }) {
  const [active, setActive] = useState(items[0]?.id)

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

  return (
    <nav aria-label="页面导航" className="hidden items-center gap-1 md:flex">
      {items.map((it) => {
        const isActive = active === it.id
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            className={cn(
              "rounded-full px-3 py-1 text-[12.5px] transition-colors duration-200",
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
