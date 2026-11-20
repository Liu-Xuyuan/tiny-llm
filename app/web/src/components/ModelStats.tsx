// 模型核心规格条（Apple Mac Studio 规格表级数字雕塑）：主数值锐利加粗、单位与斜杠轻灰退让
import type { ReactNode } from "react"

import { fmtM, type ModelStats as Stats } from "@/lib/api"
import { onLiquidMove } from "@/lib/motion"
import { Skeleton } from "@/components/ui/skeleton"

function StatNumber({ value, unit }: { value: string; unit?: string }) {
  return (
    <span className="typo-display typo-num inline-flex items-baseline gap-0.5 whitespace-nowrap">
      <span className="text-ink text-[20px] leading-none font-semibold tracking-[-0.03em] md:text-[22px] lg:text-[24px]">{value}</span>
      {unit && <span className="text-ink-3 text-[12px] font-medium tracking-normal md:text-[13px]">{unit}</span>}
    </span>
  )
}

export function ModelStats({ stats }: { stats: Stats | null }) {
  const items: [string, ReactNode, string][] = stats
    ? [
        [
          "模型结构",
          <span
            key="arch"
            className="typo-display typo-num inline-flex items-baseline text-[18px] leading-none font-semibold tracking-[-0.025em] whitespace-nowrap md:text-[20px] lg:text-[22px]"
          >
            <span className="text-ink">{stats.n_layer}</span>
            <span className="text-ink-3/45 mx-1 text-[13px] font-light md:text-[15px]">/</span>
            <span className="text-ink">{stats.n_embd}</span>
            <span className="text-ink-3/45 mx-1 text-[13px] font-light md:text-[15px]">/</span>
            <span className="text-ink">{stats.n_head}</span>
          </span>,
          "层 / 维 / 头",
        ],
        [
          "总参数量",
          <StatNumber key="p" value={(stats.params / 1e6).toFixed(1)} unit="M" />,
          `非 emb ${fmtM(stats.params_non_emb)}`,
        ],
        [
          "分词词表",
          <StatNumber key="v" value={stats.vocab_size.toLocaleString("en-US")} />,
          stats.tokenizer.replace("Tokenizer", ""),
        ],
        [
          "训练 Token",
          <StatNumber key="t" value={(stats.tokens / 1e6).toFixed(0)} unit="M" />,
          `${stats.iters.toLocaleString("en-US")} 步`,
        ],
        [
          "Val Loss",
          <StatNumber key="l" value={stats.best_val.toFixed(3)} />,
          `上下文 ${stats.block_size}`,
        ],
      ]
    : []

  return (
    <div
      onPointerMove={onLiquidMove}
      className="apple-card divide-line grid grid-cols-2 divide-x divide-y overflow-hidden rounded-[14px] sm:grid-cols-[1.4fr_1fr_0.92fr_1fr_0.92fr] sm:divide-y-0"
    >
      {stats
        ? items.map(([k, node, sub], idx) => (
            <div
              key={`${stats.ckpt}-${k}`}
              className={`stat-pop hover:bg-field/60 min-w-0 px-4 py-4.5 transition-colors duration-200 md:px-5 sm:py-5${idx === 0 ? " col-span-2 sm:col-span-1" : ""}`}
              style={{ animationDelay: `${idx * 45}ms` }}
            >
              <div className="text-ink-3 text-[11.5px] font-medium tracking-[0.01em]">{k}</div>
              <div className="mt-2">{node}</div>
              <div className="typo-num text-ink-3 mt-2 truncate text-[11.5px]">{sub}</div>
            </div>
          ))
        : Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={`px-4 py-5 md:px-5${i === 0 ? " col-span-2 sm:col-span-1" : ""}`}>
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ))}
    </div>
  )
}
