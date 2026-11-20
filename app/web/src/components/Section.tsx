// 章节容器：极轻透层次交替铺陈 + 瑞士/苹果风精密眉标与雕塑级主标题 + 滚动错峰渐显
import type { ReactNode } from "react"

import { useInView } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  index: number
  eyebrow?: string
  title: string
  desc: string
  aside?: ReactNode
  children: ReactNode
  tinted?: boolean
  surfaceClassName?: string
}

export function Section({ id, index, eyebrow, title, desc, aside, children, tinted, surfaceClassName }: Props) {
  const useTinted = tinted ?? index % 2 === 0
  const { ref, visible } = useInView<HTMLElement>(0.05)

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "scroll-mt-20 py-16 transition-colors duration-300 sm:py-24",
        useTinted ? "bg-surface-alt border-line/60 border-y" : "bg-transparent",
      )}
    >
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div
          className={cn(
            "scroll-item mb-9 flex flex-col justify-between gap-5 sm:mb-11 sm:flex-row sm:items-end",
            visible && "is-visible",
          )}
        >
          <div className="max-w-2xl">
            <div className="typo-kicker text-ink-3 mb-3 flex items-center gap-2.5">
              <span className="typo-num text-brand font-semibold">{String(index + 1).padStart(2, "0")}</span>
              <span aria-hidden className="bg-line-strong h-px w-6" />
              {eyebrow && <span>{eyebrow}</span>}
            </div>
            <h2 className="typo-display text-ink text-[32px] leading-[1.12] font-semibold tracking-[-0.025em] sm:text-[42px]">
              {title}
            </h2>
            <p className="text-ink-3 mt-3 max-w-[54ch] text-[15px] leading-[1.72] text-pretty sm:text-[16px]">
              {desc}
            </p>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>

        <div
          className={cn("scroll-item", visible && "is-visible", surfaceClassName)}
          style={{ transitionDelay: "110ms" }}
        >
          {children}
        </div>
      </div>
    </section>
  )
}
