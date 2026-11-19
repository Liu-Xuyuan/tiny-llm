// Apple 产品页风格章节容器：交替纯白 / 浅灰全幅背景 + 滚动视口错峰淡入上浮
import type { ReactNode } from "react"

import { useInView } from "@/lib/motion"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  index: number
  title: string
  desc: string
  aside?: ReactNode
  children: ReactNode
  tinted?: boolean
  surfaceClassName?: string
}

export function Section({ id, index, title, desc, aside, children, tinted, surfaceClassName }: Props) {
  const useTinted = tinted ?? index % 2 === 0
  const { ref, visible } = useInView<HTMLElement>(0.05)

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "scroll-mt-14 py-16 transition-colors duration-300 sm:py-24",
        useTinted ? "bg-surface-alt" : "bg-page",
      )}
    >
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div
          className={cn(
            "scroll-item mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end",
            visible && "is-visible",
          )}
        >
          <div className="max-w-2xl">
            <p className="text-ink-3 mb-2 font-mono text-[12px] font-medium tracking-[0.04em]">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="text-ink text-[28px] leading-[1.15] font-semibold tracking-[-0.028em] sm:text-[36px]">
              {title}
            </h2>
            <p className="text-ink-3 mt-2.5 text-[15px] leading-relaxed sm:text-[17px]">{desc}</p>
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
