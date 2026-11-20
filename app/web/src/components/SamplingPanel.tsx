// macOS 风格采样参数面板：
// 上组为受预设联动的「采样策略」（Temperature / Top-k / Top-p）；
// 分隔线下方为独立控制变量（生成长度 / Seed），切换预设时保持不变，方便公平对照实验。
import { Dices } from "lucide-react"

import type { SamplingParams } from "@/lib/api"
import { Segmented } from "@/components/Segmented"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const DEFAULT_PARAMS: SamplingParams = { max_new_tokens: 200, temperature: 0.8, top_k: 50, top_p: 1.0, seed: 42 }

type Preset = "greedy" | "safe" | "default" | "creative"
const PRESETS: Record<Preset, { label: string; title: string; v: Pick<SamplingParams, "temperature" | "top_k" | "top_p"> }> = {
  greedy: { label: "贪心", title: "Greedy 解码：每步取概率最大的 token，结果完全固定", v: { temperature: 0, top_k: 0, top_p: 1 } },
  safe: { label: "保守", title: "T=0.5, top-k 20", v: { temperature: 0.5, top_k: 20, top_p: 1 } },
  default: { label: "默认", title: "T=0.8, top-k 50", v: { temperature: 0.8, top_k: 50, top_p: 1 } },
  creative: { label: "创意", title: "T=1.2, top-p 0.95", v: { temperature: 1.2, top_k: 0, top_p: 0.95 } },
}

type Key = "max_new_tokens" | "temperature" | "top_k" | "top_p"
type SliderDef = { key: Key; label: string; tip: string; min: number; max: number; step: number; show: (v: number) => string }

const STRATEGY_SLIDERS: SliderDef[] = [
  { key: "temperature", label: "Temperature", tip: "logits 除以 T 再 softmax。T 越大分布越平、越随机；0 = 贪心解码（Greedy）", min: 0, max: 2, step: 0.05, show: (v) => (v === 0 ? "贪心" : v.toFixed(2)) },
  { key: "top_k", label: "Top-k", tip: "只在概率最高的 k 个 token 里抽样；0 = 不限", min: 0, max: 200, step: 1, show: (v) => (v === 0 ? "不限" : `${v}`) },
  { key: "top_p", label: "Top-p", tip: "按概率从高到低累加，只保留累计达到 p 的 token；1.0 = 不限", min: 0.1, max: 1, step: 0.05, show: (v) => (v >= 1 ? "不限" : v.toFixed(2)) },
]

const LENGTH_SLIDER: SliderDef = {
  key: "max_new_tokens",
  label: "生成长度",
  tip: "max_new_tokens：最多生成多少个 token（切换采样预设时保持不变）",
  min: 10,
  max: 500,
  step: 10,
  show: (v) => `${v} tok`,
}

function SliderRow({
  s,
  value,
  onChange,
  compact = false,
}: {
  s: SliderDef
  value: number
  onChange: (v: number) => void
  compact?: boolean
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      <div className={cn("flex items-center justify-between", compact ? "text-[12px]" : "text-[13px]")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-ink-2 cursor-help font-medium">{s.label}</span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-60">{s.tip}</TooltipContent>
        </Tooltip>
        <span className={cn("typo-num text-ink-3 font-medium", compact ? "text-[11.5px]" : "text-[12.5px]")}>
          {s.show(value)}
        </span>
      </div>
      <Slider min={s.min} max={s.max} step={s.step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  )
}

export function SamplingPanel({
  value,
  onChange,
  compact = false,
}: {
  value: SamplingParams
  onChange: (v: SamplingParams) => void
  compact?: boolean
}) {
  const set = (patch: Partial<SamplingParams>) => onChange({ ...value, ...patch })
  const current = (Object.keys(PRESETS) as Preset[]).find((k) => {
    const v = PRESETS[k].v
    return v.temperature === value.temperature && v.top_k === value.top_k && v.top_p === value.top_p
  }) ?? null

  return (
    <div className={compact ? "flex h-full flex-col justify-between gap-3" : "space-y-5"}>
      {/* 采样策略组：预设按钮与下方三条滑块严格对应联动 */}
      <div className={compact ? "flex flex-1 flex-col justify-between gap-3" : "space-y-5"}>
        <Segmented
          size="sm"
          className="flex w-full"
          value={current}
          onChange={(k) => set(PRESETS[k].v)}
          options={(Object.keys(PRESETS) as Preset[]).map((k) => ({ value: k, label: PRESETS[k].label, title: PRESETS[k].title }))}
        />

        <div className={compact ? "flex flex-1 flex-col justify-evenly gap-2.5" : "space-y-5"}>
          {STRATEGY_SLIDERS.map((s) => (
            <SliderRow key={s.key} s={s} value={value[s.key]} onChange={(v) => set({ [s.key]: v })} compact={compact} />
          ))}
        </div>
      </div>

      {/* 独立输出控制组：生成长度与随机种子不随采样预设重置 */}
      <div className={compact ? "space-y-3" : "space-y-5"}>
        <Separator />
        <SliderRow s={LENGTH_SLIDER} value={value.max_new_tokens} onChange={(v) => set({ max_new_tokens: v })} compact={compact} />

        <div className={cn("flex items-center justify-between gap-3", compact ? "text-[12px]" : "text-[13px]")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-ink-2 cursor-help font-medium">Seed</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-60">
              随机种子：固定数字可复现同一结果；点右侧骰子可在「每次随机」与「固定 42」之间一键切换
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              value={value.seed === -1 ? "" : value.seed}
              placeholder="随机"
              aria-label="seed"
              onChange={(e) => {
                const raw = e.target.value.trim()
                set({ seed: raw === "" ? -1 : Number.parseInt(raw, 10) })
              }}
              className={cn(
                "typo-num placeholder:text-brand font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                compact ? "h-7 w-18 text-[12px]" : "h-8 w-20 text-[12.5px]",
              )}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={value.seed === -1 ? "default" : "outline"}
                  size={compact ? "icon-xs" : "icon-sm"}
                  onClick={() => set({ seed: value.seed === -1 ? 42 : -1 })}
                  aria-label={value.seed === -1 ? "切回固定 seed 42" : "切换为每次随机 seed"}
                  className={compact ? "size-7" : undefined}
                >
                  <Dices className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {value.seed === -1 ? "当前每次随机，点击切回固定 42" : "点击切换为每次随机（生成后显示实际 Seed）"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
