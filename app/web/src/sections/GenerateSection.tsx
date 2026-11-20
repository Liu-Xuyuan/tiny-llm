// 区块 01：单模型生成（Apple 产品交互区风格：全宽大数字规格条 + 宽敞双栏控制与生成卡）
import { useEffect, useRef, useState } from "react"
import { RotateCw } from "lucide-react"

import { api, type Checkpoints, type ModelStats as Stats, type SamplingParams } from "@/lib/api"
import { onLiquidMove } from "@/lib/motion"
import { runInto } from "@/lib/run"
import { Composer } from "@/components/Composer"
import { ModelStats } from "@/components/ModelStats"
import { EMPTY_OUTPUT, OutputCard, type Output } from "@/components/OutputCard"
import { DEFAULT_PARAMS, SamplingPanel } from "@/components/SamplingPanel"
import { Section } from "@/components/Section"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 将 runs/s100m/ckpt_best.pt 格式化为更优雅易读的展示文案（不改变传给后端的原始路径值）
function formatCkptLabel(path: string): { name: string; file: string } {
  const parts = path.split("/")
  if (parts.length >= 3 && parts[0] === "runs") {
    return { name: parts[1], file: parts.slice(2).join("/") }
  }
  return { name: path, file: "" }
}

export function GenerateSection({ index, ckpts, reload }: { index: number; ckpts: Checkpoints; reload: () => void }) {
  const [ckpt, setCkpt] = useState(ckpts.default ?? "")
  const [stats, setStats] = useState<Stats | null>(null)
  const [prompt, setPrompt] = useState("Once upon a time")
  const [params, setParams] = useState<SamplingParams>(DEFAULT_PARAMS)
  const [out, setOut] = useState<Output>(EMPTY_OUTPUT)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!ckpt) return
    setStats(null)
    api.model(ckpt).then(setStats).catch(console.error)
  }, [ckpt])

  const generate = () => {
    abort.current = new AbortController()
    runInto(ckpt, prompt, params, setOut, abort.current.signal)
  }

  return (
    <Section id="generate" index={index} eyebrow="Generation" title="单模型生成" desc="选择任意模型权重与采样策略，实时观察逐 token 自回归续写。">
      <div className="space-y-5">
        <ModelStats stats={stats} />

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div onPointerMove={onLiquidMove} className="apple-card flex flex-col justify-between space-y-6 rounded-[14px] p-6 lg:min-h-[548px]">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-ink text-[13px] font-semibold">模型权重</span>
                  <button
                    onClick={reload}
                    title="刷新模型列表"
                    className="text-ink-3 hover:bg-field hover:text-ink flex size-7 items-center justify-center rounded-full transition-all duration-300 active:rotate-180"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                </div>
                <Select value={ckpt} onValueChange={setCkpt}>
                  <SelectTrigger size="sm" className="liquid-well typo-num h-9.5 w-full rounded-xl border-0 px-3.5 text-[13px] font-medium shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ckpts.items.map((c) => {
                      const { name, file } = formatCkptLabel(c)
                      return (
                        <SelectItem key={c} value={c} className="typo-num text-[13px]">
                          <span className="flex items-baseline gap-2">
                            <span className="text-ink font-semibold">{name}</span>
                            {file && <span className="text-ink-3 text-[11.5px] font-normal">{file}</span>}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-line border-t" />
              <SamplingPanel value={params} onChange={setParams} />
            </div>
          </div>

          {/* 桌面端与左侧参数卡底边精准齐平，右侧输出框超长时内部上滑滚动而不拉长页面 */}
          <div className="min-w-0 lg:relative">
            <div className="flex flex-col gap-5 lg:absolute lg:inset-0">
              <div className="shrink-0">
                <Composer
                  value={prompt}
                  onChange={setPrompt}
                  onSubmit={generate}
                  onStop={() => abort.current?.abort()}
                  running={out.running}
                  examples={ckpts.examples}
                />
              </div>
              <OutputCard out={out} onRegenerate={generate} className="h-[340px] lg:h-auto lg:min-h-0 lg:flex-1" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
