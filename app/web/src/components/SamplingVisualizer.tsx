// 实时采样原理可视化：基于真实 Softmax / Temperature / Top-k / Top-p 数学公式，
// 在拖动滑块时即时演示词表候选概率如何被重塑与截断（答辩讲解采样策略的直观教具）。
import { useMemo } from "react"

import type { SamplingParams } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// 模拟模型在 "Once upon a time, there was a ___" 处输出的 8 个典型候选词原始 logit
const SAMPLE_CANDIDATES: { token: string; logit: number }[] = [
  { token: "little", logit: 4.35 },
  { token: "young", logit: 3.65 },
  { token: "small", logit: 3.15 },
  { token: "girl", logit: 2.65 },
  { token: "kind", logit: 2.15 },
  { token: "magical", logit: 1.55 },
  { token: "lonely", logit: 0.95 },
  { token: "dragon", logit: 0.35 },
]

// 将实际词表规模的 top_k（0~200）平滑映射到 8 根示意柱的截断数量，让滑块微调肉眼可见
function mapTopKToBars(topK: number, n: number): number {
  if (topK <= 0) return n
  if (topK <= 1) return 1
  if (topK <= 5) return 2
  if (topK <= 15) return 3
  if (topK <= 30) return 4
  if (topK <= 55) return 5
  if (topK <= 90) return 6
  if (topK <= 140) return 7
  return n
}

type BarItem = {
  token: string
  prob: number // 重归一化后的采样概率（0~1）
  rawProb: number // 截断前的 softmax 概率（用于视觉对比）
  kept: boolean
  reason?: "k" | "p" | "greedy"
}

const COMPACT_CANDIDATES: { token: string; logit: number }[] = [
  { token: "little", logit: 4.35 },
  { token: "young", logit: 3.55 },
  { token: "small", logit: 2.95 },
  { token: "girl", logit: 2.35 },
  { token: "magical", logit: 1.55 },
  { token: "dragon", logit: 0.55 },
]

function computeDistribution(
  params: SamplingParams,
  candidates: { token: string; logit: number }[],
): {
  bars: BarItem[]
  keptCount: number
  summary: string
} {
  const n = candidates.length
  const { temperature, top_k, top_p } = params

  // 1. 贪心解码（T = 0）：直接 argmax，100% 锁定最高分候选词
  if (temperature <= 0.001) {
    return {
      bars: candidates.map((c, i) => ({
        token: c.token,
        prob: i === 0 ? 1 : 0,
        rawProb: i === 0 ? 1 : 0,
        kept: i === 0,
        reason: i === 0 ? undefined : "greedy",
      })),
      keptCount: 1,
      summary: "贪心解码（argmax）：100% 锁定最高概率词，输出完全确定。",
    }
  }

  // 2. 温度缩放 + Softmax
  const scaled = candidates.map((c) => c.logit / temperature)
  const maxLogit = Math.max(...scaled)
  const exps = scaled.map((v) => Math.exp(v - maxLogit))
  const sumExp = exps.reduce((a, b) => a + b, 0)
  const rawProbs = exps.map((e) => e / sumExp)

  // 3. Top-k 截断
  const kLimit = mapTopKToBars(top_k, n)
  const afterK = rawProbs.map((p, i) => ({
    idx: i,
    rawProb: p,
    kept: i < kLimit,
    reason: i < kLimit ? undefined : ("k" as const),
  }))

  // 对 Top-k 保留的词做一次临时归一化，再执行 Top-p 核截断
  const sumK = afterK.reduce((s, x) => s + (x.kept ? x.rawProb : 0), 0) || 1
  let cumP = 0
  const afterP = afterK.map((item) => {
    if (!item.kept) return { ...item, normP: 0 }
    const pNorm = item.rawProb / sumK
    const keepByP = cumP < top_p || cumP === 0 // 始终至少保留第 1 个词
    cumP += pNorm
    if (!keepByP && top_p < 0.999) {
      return { ...item, kept: false, reason: "p" as const, normP: 0 }
    }
    return { ...item, normP: pNorm }
  })

  // 4. 最终重归一化
  const finalSum = afterP.reduce((s, x) => s + (x.kept ? x.normP : 0), 0) || 1
  const bars: BarItem[] = afterP.map((x, i) => ({
    token: candidates[i].token,
    prob: x.kept ? x.normP / finalSum : 0,
    rawProb: x.rawProb,
    kept: x.kept,
    reason: x.reason,
  }))

  const keptCount = bars.filter((b) => b.kept).length
  let summary = ""
  if (temperature < 0.6) {
    summary = `低温（T=${temperature.toFixed(2)}）拉大高分优势，分布尖锐保守；保留 ${keptCount} 词。`
  } else if (temperature > 1.05) {
    summary = `高温（T=${temperature.toFixed(2)}）压平分布，尾部词获更多机会；保留 ${keptCount} 词。`
  } else if (top_p < 0.99) {
    summary = `核采样（Top-p ${top_p.toFixed(2)}）截断长尾，保留累计概率前 ${keptCount} 词。`
  } else {
    summary = `均衡采样（T=${temperature.toFixed(2)}）：流畅与多样折中，保留 ${keptCount} 词。`
  }

  return { bars, keptCount, summary }
}

export function SamplingVisualizer({
  params,
  compact = false,
  className,
}: {
  params: SamplingParams
  compact?: boolean
  className?: string
}) {
  const candidates = compact ? COMPACT_CANDIDATES : SAMPLE_CANDIDATES
  const { bars, keptCount } = useMemo(() => computeDistribution(params, candidates), [params, candidates])
  const maxProb = Math.max(0.35, ...bars.map((b) => b.prob))

  return (
    <Card className={cn("p-3.5", className)}>
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
        <span className="text-ink-2 text-[11.5px] font-medium">Next-Token 概率分布示意</span>
        <Badge variant="secondary" className="typo-num text-brand px-1.5 py-0 text-[10.5px]">
          {keptCount} / {bars.length} 保留
        </Badge>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1.5">
        {bars.map((b) => {
          const widthPct = b.kept ? Math.max(2, (b.prob / maxProb) * 100) : Math.max(2, (b.rawProb / maxProb) * 100)
          return (
            <div key={b.token} className="grid grid-cols-[50px_1fr_34px] items-center gap-2 text-[11.5px]">
              <span
                className={cn(
                  "typo-editorial truncate italic transition-colors duration-200",
                  b.kept ? "text-ink font-medium" : "text-ink-3/55 line-through",
                )}
              >
                {b.token}
              </span>
              <div className={cn("bg-field overflow-hidden rounded-full", compact ? "h-[6px]" : "h-[7px]")}>
                <div
                  className={cn(
                    "h-full rounded-full transition-[width,background-color,opacity] duration-300 ease-[var(--ease-out-strong)]",
                    b.kept ? "bg-brand" : "bg-ink-3/25 opacity-45",
                  )}
                  style={{ width: `${widthPct.toFixed(1)}%` }}
                />
              </div>
              <span
                className={cn(
                  "typo-num text-right text-[11px] transition-colors duration-200",
                  b.kept ? "text-ink-2 font-medium" : "text-ink-3/50",
                )}
              >
                {b.kept ? `${Math.round(b.prob * 100)}%` : "—"}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
