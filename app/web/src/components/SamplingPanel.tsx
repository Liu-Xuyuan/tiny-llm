// macOS 风格采样参数面板：原生分段预设 + 干净滑块 + Seed 控制
import { Dices } from "lucide-react"

import type { SamplingParams } from "@/lib/api"
import { Segmented } from "@/components/Segmented"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const DEFAULT_PARAMS: SamplingParams = { max_new_tokens: 200, temperature: 0.8, top_k: 50, top_p: 1.0, seed: 42 }

type Preset = "greedy" | "safe" | "default" | "creative"
const PRESETS: Record<Preset, { label: string; title: string; v: Pick<SamplingParams, "temperature" | "top_k" | "top_p"> }> = {
  greedy: { label: "Greedy", title: "每步取概率最大的 token，结果固定", v: { temperature: 0, top_k: 0, top_p: 1 } },
  safe: { label: "保守", title: "T=0.5, top-k 20", v: { temperature: 0.5, top_k: 20, top_p: 1 } },
  default: { label: "默认", title: "T=0.8, top-k 50", v: { temperature: 0.8, top_k: 50, top_p: 1 } },
  creative: { label: "创意", title: "T=1.2, top-p 0.95", v: { temperature: 1.2, top_k: 0, top_p: 0.95 } },
}

type Key = "max_new_tokens" | "temperature" | "top_k" | "top_p"
const SLIDERS: { key: Key; label: string; tip: string; min: number; max: number; step: number; show: (v: number) => string }[] = [
  { key: "max_new_tokens", label: "生成长度", tip: "max_new_tokens：最多生成多少个 token", min: 10, max: 500, step: 10, show: (v) => `${v}` },
  { key: "temperature", label: "Temperature", tip: "logits 除以 T 再 softmax。T 越大分布越平、越随机；0 = greedy", min: 0, max: 2, step: 0.05, show: (v) => (v === 0 ? "greedy" : v.toFixed(2)) },
  { key: "top_k", label: "Top-k", tip: "只在概率最高的 k 个 token 里抽样；0 = 不限", min: 0, max: 200, step: 1, show: (v) => (v === 0 ? "不限" : `${v}`) },
  { key: "top_p", label: "Top-p", tip: "按概率从高到低累加，只保留累计达到 p 的 token；1.0 = 不限", min: 0.1, max: 1, step: 0.05, show: (v) => (v >= 1 ? "不限" : v.toFixed(2)) },
]

export function SamplingPanel({ value, onChange }: { value: SamplingParams; onChange: (v: SamplingParams) => void }) {
  const set = (patch: Partial<SamplingParams>) => onChange({ ...value, ...patch })
  const current = (Object.keys(PRESETS) as Preset[]).find((k) => {
    const v = PRESETS[k].v
    return v.temperature === value.temperature && v.top_k === value.top_k && v.top_p === value.top_p
  }) ?? null

  return (
    <div className="space-y-6">
      <Segmented
        size="sm"
        className="flex w-full"
        value={current}
        onChange={(k) => set(PRESETS[k].v)}
        options={(Object.keys(PRESETS) as Preset[]).map((k) => ({ value: k, label: PRESETS[k].label, title: PRESETS[k].title }))}
      />

      <div className="space-y-5">
        {SLIDERS.map((s) => (
          <div key={s.key} className="space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-ink-2 cursor-help font-medium">{s.label}</span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-60">{s.tip}</TooltipContent>
              </Tooltip>
              <span className="text-ink-3 font-mono text-[12px] tabular-nums">{s.show(value[s.key])}</span>
            </div>
            <Slider min={s.min} max={s.max} step={s.step} value={[value[s.key]]} onValueChange={([v]) => set({ [s.key]: v })} />
          </div>
        ))}
      </div>

      <div className="border-line flex items-center justify-between gap-3 border-t pt-4 text-[13px]">
        <span className="text-ink-2 font-medium">Seed</span>
        <div className="liquid-well flex h-8 items-center rounded-full pl-3.5 pr-1">
          <input
            type="number"
            value={value.seed}
            aria-label="seed"
            onChange={(e) => set({ seed: Number.parseInt(e.target.value || "0", 10) })}
            className="text-ink w-20 bg-transparent font-mono text-[12.5px] tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => set({ seed: -1 })}
                aria-label="随机 seed"
                className={cn(
                  "hover:text-ink flex size-6.5 items-center justify-center rounded-full transition-colors",
                  value.seed === -1 ? "bg-brand text-white" : "text-ink-3",
                )}
              >
                <Dices className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>-1 = 每次随机（结果下方显示实际用的 seed）</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
