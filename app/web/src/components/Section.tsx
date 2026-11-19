// Apple 产品页风格章节容器：交替纯白 / 浅灰全幅背景，居中大标题 + 充沛呼吸留白，彻底告别“框中框”
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Props = {
  id: string
  index: number
  title: string
  desc: string
  aside?: ReactNode // 标题栏右侧的控件（如 run 切换、暗色适配）
  children: ReactNode
  tinted?: boolean // true 时使用苹果经典浅灰 (#f5f5f7) / 暗色曜石灰 (#161617) 交替铺底
  surfaceClassName?: string
}

export function Section({ id, index, title, desc, aside, children, tinted, surfaceClassName }: Props) {
  // 默认奇偶章节自动交替底色，像 apple.com 产品页一样靠色块分章而非虚线边框
  const useTinted = tinted ?? index % 2 === 0

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-14 py-16 transition-colors duration-300 sm:py-24",
        useTinted ? "bg-surface-alt" : "bg-page",
      )}
    >
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
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

        <div className={cn(surfaceClassName)}>{children}</div>
      </div>
    </section>
  )
}
