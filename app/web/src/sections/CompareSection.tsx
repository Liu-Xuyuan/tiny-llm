// 区块 02：三模型对比（致敬 Apple Compare 页面：宽敞三列对比 + 极简性能横向对比条）
import { useEffect, useRef, useState } from "react"
import { ChevronDown, SlidersHorizontal } from "lucide-react"

import { api, fmtM, type CompareModel, type SamplingParams } from "@/lib/api"
import { getModelBadge } from "@/lib/meta"
import { runInto } from "@/lib/run"
import { resolveSeed } from "@/lib/seed"
import { Composer } from "@/components/Composer"
import { EMPTY_OUTPUT, OutputCard, type Output } from "@/components/OutputCard"
import { DEFAULT_PARAMS, SamplingPanel } from "@/components/SamplingPanel"
import { Section } from "@/components/Section"
import { cn } from "@/lib/utils"

export function CompareSection({ index, examples }: { index: number; examples: string[] }) {
  const [models, setModels] = useState<CompareModel[]>([])
  const [prompt, setPrompt] = useState("Once upon a time")
  const [params, setParams] = useState<SamplingParams>(DEFAULT_PARAMS)
  const [outs, setOuts] = useState<Output[]>([EMPTY_OUTPUT, EMPTY_OUTPUT, EMPTY_OUTPUT])
  const [running, setRunning] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => { api.compareModels().then(setModels).catch(console.error) }, [])

  const generate = async () => {
    setRunning(true)
    setOuts([EMPTY_OUTPUT, EMPTY_OUTPUT, EMPTY_OUTPUT])
    abort.current = new AbortController()
    const p = { ...params, seed: resolveSeed(params.seed) }
    for (const [i, m] of models.entries()) {
      if (m.missing || abort.current.signal.aborted) continue
      const setOne = (f: (o: Output) => Output) => setOuts((all) => all.map((o, j) => (j === i ? f(o) : o)))
      await runInto(m.ckpt, prompt, p, setOne, abort.current.signal)
    }
    setRunning(false)
  }

  const summary = `T ${params.temperature} · k ${params.top_k || "∞"} · p ${params.top_p} · ${params.max_new_tokens} tok · seed ${params.seed}`

  const speedRows = models
    .map((m, i) => ({ run: m.run, tok_s: outs[i]?.done?.tok_s ?? 0, seconds: outs[i]?.done?.seconds ?? 0 }))
    .filter((r) => r.tok_s > 0)
  const maxSpeed = Math.max(...speedRows.map((r) => r.tok_s), 1)

  return (
    <Section id="compare" index={index} title="三模型对比" desc="同一开头、同一组采样参数、同一随机种子，横向对比 0.01B、0.05B 与 0.1B 的生成表现。">
      <div className="space-y-5">
        <Composer
          value={prompt}
          onChange={setPrompt}
          onSubmit={generate}
          onStop={() => abort.current?.abort()}
          running={running}
          examples={examples}
          submitLabel="三个一起生成"
          rows={1}
        />

        {/* 可展开采样参数面板 */}
        <div className="bg-surface-alt rounded-[18px] transition-colors">
          <button
            onClick={() => setShowParams((s) => !s)}
            className="text-ink-2 hover:text-ink flex w-full items-center gap-2.5 px-5 py-3.5 text-[13px] transition-colors"
          >
            <SlidersHorizontal className="size-3.5 text-brand" />
            <span className="font-medium">采样参数</span>
            <span className="text-ink-3 truncate font-mono text-[12px]">{summary}</span>
            <ChevronDown className={cn("ml-auto size-4 transition-transform duration-300", showParams && "rotate-180")} />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-strong)]"
            style={{ gridTemplateRows: showParams ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="border-line max-w-md border-t px-5 pt-5 pb-6">
                <SamplingPanel value={params} onChange={setParams} />
              </div>
            </div>
          </div>
        </div>

        {/* 三列宽敞对比卡 */}
        <div className="grid gap-5 md:grid-cols-3">
          {models.map((m, i) => {
            const out = outs[i] ?? EMPTY_OUTPUT
            const badge = getModelBadge(m.run)
            const isQueued = running && !m.missing && !out.running && !out.done && !out.error && out.chunks.length === 0
            return (
              <div key={m.run} className="flex min-w-0 flex-col gap-3">
                <div className="flex items-baseline justify-between px-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-ink text-[19px] font-semibold tracking-[-0.02em]">{m.run}</span>
                    <span className="text-ink-3 font-mono text-[12px] tabular-nums">
                      {m.params ? `${fmtM(m.params)} · ${badge.tag}` : "缺失"}
                    </span>
                  </div>
                  {out.running && <span className="text-brand text-[12px] font-medium">生成中…</span>}
                  {isQueued && <span className="text-ink-3 text-[12px]">排队中</span>}
                  {out.done && !out.running && (
                    <span className="text-ink-2 font-mono text-[12px] font-medium tabular-nums">
                      {out.done.tok_s.toFixed(0)} tok/s
                    </span>
                  )}
                </div>
                <OutputCard
                  out={out}
                  queued={isQueued}
                  className="bg-surface-alt flex-1 shadow-none dark:bg-surface"
                  placeholder={m.missing ? `找不到 ${m.ckpt}` : "等待生成"}
                />
              </div>
            )
          })}
        </div>

        {/* Apple 性能对比条：简洁、克制、醒目 */}
        {speedRows.length >= 2 && (
          <div className="bg-surface-alt rounded-[22px] p-6 sm:p-7" style={{ animation: "fade-up 420ms var(--ease-out-strong) both" }}>
            <div className="text-ink mb-5 text-[15px] font-semibold tracking-[-0.015em]">
              本次推理吞吐对比
            </div>
            <div className="space-y-4">
              {speedRows.map((r) => {
                const badge = getModelBadge(r.run)
                const pct = Math.max(8, (r.tok_s / maxSpeed) * 100)
                return (
                  <div key={r.run} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="text-ink font-semibold">{r.run}</span>
                      <span className="text-ink-2 font-mono text-[12.5px] tabular-nums">
                        <strong className="text-ink font-semibold">{r.tok_s.toFixed(0)} tok/s</strong> · {r.seconds.toFixed(2)}s
                      </span>
                    </div>
                    <div className="bg-hover h-2.5 overflow-hidden rounded-full">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-[var(--ease-out-strong)]", badge.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
