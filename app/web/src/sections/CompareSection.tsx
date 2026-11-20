// 区块 02：三模型对比（真 GPU 物理过渡的 Apple Wallet 3D 堆叠卡片：三张卡全程 absolute + translate3d/scale 丝滑互换）
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowDown, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, SlidersHorizontal } from "lucide-react"

import { api, fmtM, type CompareModel, type SamplingParams } from "@/lib/api"
import { getModelBadge } from "@/lib/meta"
import { onLiquidMove } from "@/lib/motion"
import { runInto } from "@/lib/run"
import { resolveSeed } from "@/lib/seed"
import { Composer } from "@/components/Composer"
import { EMPTY_OUTPUT, type Output } from "@/components/OutputCard"
import { PixelLoader } from "@/components/PixelLoader"
import { DEFAULT_PARAMS, SamplingPanel } from "@/components/SamplingPanel"
import { SamplingVisualizer } from "@/components/SamplingVisualizer"
import { Section } from "@/components/Section"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// 单张堆叠卡片内部正文 + 底部统计（超出最大可视高度时同样自动上滑显示新内容，保持堆叠卡片优雅定高）
function DeckCardBody({
  out,
  queued,
  missingCkpt,
}: {
  out: Output
  queued: boolean
  missingCkpt?: string
}) {
  const [elapsed, setElapsed] = useState(0)
  const [scrolledTop, setScrolledTop] = useState(false)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickBottom = useRef(true)
  const started = out.running || out.chunks.length > 0 || out.done || out.error
  const waiting = out.running && out.chunks.length === 0

  useEffect(() => {
    if (!out.running) return
    stickBottom.current = true
    setAwayFromBottom(false)
    const t0 = performance.now()
    setElapsed(0)
    const id = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100)
    return () => clearInterval(id)
  }, [out.running])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickBottom.current) return
    el.scrollTop = el.scrollHeight
    setScrolledTop(el.scrollTop > 4)
  }, [out.chunks.length, out.done, out.error])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 28
    stickBottom.current = nearBottom
    setAwayFromBottom(!nearBottom && el.scrollHeight > el.clientHeight + 24)
    setScrolledTop(el.scrollTop > 4)
  }

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    stickBottom.current = true
    setAwayFromBottom(false)
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }

  if (!started) {
    return (
      <div className="text-ink-3 flex h-[240px] items-center justify-center text-center text-[14.5px]">
        {missingCkpt
          ? `找不到 ${missingCkpt}`
          : queued
            ? "排队中，等待前一个模型完成…"
            : "点击上方「三个一起生成」，在此逐张翻阅各规模模型的续写表现"}
      </div>
    )
  }

  if (waiting) {
    return (
      <div className="flex h-[240px] items-center justify-center">
        <PixelLoader />
      </div>
    )
  }

  return (
    <div className="flex h-[270px] flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn("apple-scroll -mr-2.5 min-h-0 flex-1 overflow-y-auto pr-2.5", scrolledTop && "scroll-fade-top")}
        >
          <p className="typo-editorial text-ink text-justify text-[17.5px] leading-[1.9] tracking-[-0.004em] whitespace-pre-wrap [text-justify:inter-word]">
            <span className="bg-mark text-ink mr-0.5 rounded-[6px] px-1.5 py-0.5 font-medium italic">{out.prompt}</span>
            {out.chunks.map((c, i) => <span key={i} className="token">{c}</span>)}
            {(out.running || out.done) && <span className={cn("caret", out.running && "is-streaming")} />}
          </p>

          {out.error && (
            <p className="bg-destructive/10 text-destructive mt-4 rounded-xl px-3.5 py-2 text-[13px]">{out.error}</p>
          )}
        </div>

        {awayFromBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="liquid-pill text-ink hover:text-brand absolute bottom-2 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-medium transition-all hover:scale-105 active:scale-95"
          >
            <ArrowDown className="size-3" />
            回到最新
          </button>
        )}
      </div>

      {out.running && out.chunks.length > 0 && (
        <div className="border-line typo-num text-ink-3 mt-4 flex shrink-0 items-center gap-3 border-t pt-4 text-[12.5px]">
          <span className="text-brand font-medium">正在生成</span>
          <span>{out.chunks.length} 段</span>
          <span>{elapsed.toFixed(1)}s</span>
        </div>
      )}

      {out.done && (
        <div
          className="border-line typo-num text-ink-3 mt-4 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-[12.5px]"
          style={{ animation: "token-in 260ms ease-out both" }}
        >
          <span>Seed {out.done.seed}</span>
          <span>{out.done.n_tokens} tokens</span>
          <span>{out.done.seconds.toFixed(2)}s</span>
          <span className="text-ink ml-auto font-semibold">{out.done.tok_s.toFixed(0)} tok/s</span>
        </div>
      )}
    </div>
  )
}

const PEEK_STEP = 56 // 每张背面卡片顶部露出的高度（px）

export function CompareSection({ index, examples }: { index: number; examples: string[] }) {
  const [models, setModels] = useState<CompareModel[]>([])
  const [prompt, setPrompt] = useState("Once upon a time")
  const [params, setParams] = useState<SamplingParams>(DEFAULT_PARAMS)
  const [outs, setOuts] = useState<Output[]>([EMPTY_OUTPUT, EMPTY_OUTPUT, EMPTY_OUTPUT])
  const [running, setRunning] = useState(false)
  const [showParams, setShowParams] = useState(false)
  const [activeIdx, setActiveIdx] = useState(2)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [frontHeight, setFrontHeight] = useState(320)

  const contentRefs = useRef<(HTMLDivElement | null)[]>([])
  const userPicked = useRef(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    api.compareModels().then((list) => {
      setModels(list)
      setActiveIdx(list.length > 0 ? list.length - 1 : 0)
    }).catch(console.error)
  }, [])

  // 用 ResizeObserver 实时测量当前最前卡的真实内容高度，平滑驱动外层舞台高度，彻底消除位置跳变
  useLayoutEffect(() => {
    const el = contentRefs.current[activeIdx]
    if (!el) return
    const measure = () => setFrontHeight(Math.max(300, Math.ceil(el.offsetHeight)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeIdx, models.length, outs])

  const selectCard = (idx: number) => {
    userPicked.current = true
    setHoveredIdx(null)
    setActiveIdx(idx)
  }

  const generate = async () => {
    setRunning(true)
    userPicked.current = false
    setOuts(models.map(() => EMPTY_OUTPUT))
    abort.current = new AbortController()
    const p = { ...params, seed: resolveSeed(params.seed) }
    for (const [i, m] of models.entries()) {
      if (m.missing || abort.current.signal.aborted) continue
      if (!userPicked.current) setActiveIdx(i)
      const setOne = (f: (o: Output) => Output) => setOuts((all) => all.map((o, j) => (j === i ? f(o) : o)))
      await runInto(m.ckpt, prompt, p, setOne, abort.current.signal)
    }
    setRunning(false)
  }

  const copyCard = async (i: number) => {
    const out = outs[i]
    if (!out) return
    try {
      await navigator.clipboard.writeText(out.prompt + out.chunks.join(""))
      setCopiedIdx(i)
      setTimeout(() => setCopiedIdx(null), 1600)
    } catch { /* 无剪贴板权限时忽略 */ }
  }

  const summary = `Temperature ${params.temperature === 0 ? "贪心" : params.temperature} · Top-k ${params.top_k || "不限"} · Top-p ${params.top_p >= 1 ? "不限" : params.top_p} · ${params.max_new_tokens} tok · Seed ${params.seed === -1 ? "随机" : params.seed}`

  const speedRows = models
    .map((m, i) => ({ idx: i, run: m.run, tok_s: outs[i]?.done?.tok_s ?? 0, seconds: outs[i]?.done?.seconds ?? 0 }))
    .filter((r) => r.tok_s > 0)
  const maxSpeed = Math.max(...speedRows.map((r) => r.tok_s), 1)

  // 计算每张卡在堆叠中的深度：当前选中为 0（最前），其余按顺序排在 1、2 层露在顶部
  const backIndices = models.map((_, i) => i).filter((i) => i !== activeIdx)
  const getDepth = (i: number) => {
    if (i === activeIdx) return 0
    const pos = backIndices.indexOf(i)
    return backIndices.length - pos
  }

  const totalBack = backIndices.length
  const topOffset = totalBack * PEEK_STEP
  // 背面卡高度始终略小于最前卡，保证全程物理滑行也不可能从底部露尾
  const backCardHeight = Math.max(220, frontHeight - 24)

  return (
    <Section id="compare" index={index} eyebrow="Comparison" title="三模型对比" desc="同一开头、同一组采样参数、同一随机种子。点击露出的卡片顶部或上方选择器，丝滑翻阅不同规模模型的续写。">
      <div className="space-y-6">
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

        {/* 可展开采样参数面板：基于标准 Radix Collapsible + Card 双栏对称布局 */}
        <Card className="overflow-hidden">
          <Collapsible open={showParams} onOpenChange={setShowParams}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-ink-2 hover:text-ink flex w-full items-center gap-2.5 px-5 py-3.5 text-[13px] transition-colors"
              >
                <SlidersHorizontal className="text-brand size-3.5" />
                <span className="font-medium">采样参数</span>
                <span className="typo-num text-muted-foreground truncate text-[12.5px]">{summary}</span>
                <ChevronDown className={cn("ml-auto size-4 transition-transform duration-200", showParams && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-border grid gap-6 border-t px-5 pt-5 pb-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-start sm:px-6">
                <SamplingPanel value={params} onChange={setParams} />
                <div className="space-y-3">
                  <SamplingVisualizer params={params} />
                  <p className="text-muted-foreground px-1 text-[11.5px] leading-relaxed">
                    三组模型共享同一 Prompt、同一采样策略与同一随机种子，确保输出差异仅来自参数规模。
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* 模型选择器栏 */}
        {models.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="liquid-well inline-flex flex-wrap items-center gap-1 rounded-[10px] p-1">
              {models.map((m, i) => {
                const out = outs[i] ?? EMPTY_OUTPUT
                const badge = getModelBadge(m.run)
                const isActive = i === activeIdx
                return (
                  <button
                    key={m.run}
                    type="button"
                    onClick={() => selectCard(i)}
                    className={cn(
                      "flex items-center gap-2 rounded-[7px] px-4 py-1.5 text-[13px] transition-all duration-200",
                      isActive ? "liquid-pill text-ink font-semibold" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", badge.dot, out.running && "animate-pulse")} />
                    <span>{m.run}</span>
                    <span className="typo-num text-ink-3 text-[11.5px] font-normal">
                      {out.done ? `${out.done.tok_s.toFixed(0)} tok/s` : badge.tag}
                    </span>
                  </button>
                )
              })}
            </div>

            {models.length > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="上一个模型"
                  onClick={() => selectCard((activeIdx - 1 + models.length) % models.length)}
                  className="liquid-pill text-ink-2 hover:text-ink flex size-8 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="下一个模型"
                  onClick={() => selectCard((activeIdx + 1) % models.length)}
                  className="liquid-pill text-ink-2 hover:text-ink flex size-8 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Apple Wallet 真物理 3D 堆叠卡片舞台：三张卡全程 absolute，纯 GPU translate3d + scale 平滑互换 */}
        {models.length > 0 && (
          <div
            className="relative mx-auto w-full max-w-[920px]"
            style={{
              height: `${topOffset + frontHeight}px`,
              transition: "height 560ms var(--ease-out-strong)",
            }}
          >
            {models.map((m, i) => {
              const out = outs[i] ?? EMPTY_OUTPUT
              const badge = getModelBadge(m.run)
              const depth = getDepth(i)
              const isFront = depth === 0
              const isHovered = hoveredIdx === i && !isFront
              const isQueued = running && !m.missing && !out.running && !out.done && !out.error && out.chunks.length === 0

              // 全程由同一套 translate3d + scale 驱动，三张卡丝滑滑行互换，绝无 position 跳变生硬感
              const baseY = isFront ? topOffset : (totalBack - depth) * PEEK_STEP
              const y = isHovered ? baseY - 9 : baseY
              const scale = isFront ? 1 : 1 - depth * 0.032 + (isHovered ? 0.006 : 0)

              return (
                <div
                  key={m.run}
                  role={isFront ? undefined : "button"}
                  tabIndex={isFront ? undefined : 0}
                  onMouseEnter={() => { if (!isFront) setHoveredIdx(i) }}
                  onMouseLeave={() => { if (hoveredIdx === i) setHoveredIdx(null) }}
                  onPointerMove={isFront ? onLiquidMove : undefined}
                  onClick={() => { if (!isFront) selectCard(i) }}
                  onKeyDown={(e) => {
                    if (!isFront && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault()
                      selectCard(i)
                    }
                  }}
                  style={{
                    transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
                    zIndex: 30 - depth * 10,
                    height: isFront ? `${frontHeight}px` : `${backCardHeight}px`,
                    opacity: isFront ? 1 : isHovered ? 0.99 : Math.max(0.84, 1 - depth * 0.07),
                    transition: [
                      "transform 580ms cubic-bezier(0.22, 1, 0.36, 1)",
                      "height 560ms cubic-bezier(0.22, 1, 0.36, 1)",
                      "opacity 420ms ease",
                      "box-shadow 480ms ease",
                      "background-color 360ms ease",
                    ].join(", "),
                  }}
                  className={cn(
                    "apple-card absolute inset-x-0 top-0 origin-top overflow-hidden rounded-[16px] will-change-transform",
                    isFront
                      ? cn(out.running && "apple-generating")
                      : "cursor-pointer",
                  )}
                >
                  {/* 内部自然高度容器：供 ResizeObserver 精准测量完整内容高度 */}
                  <div ref={(el) => { contentRefs.current[i] = el }}>
                    {/* 生成中顶部极细 Apple Intelligence 流光条 */}
                    {out.running && <div aria-hidden className="streaming-bar absolute inset-x-0 top-0 h-[2.5px]" />}

                    {/* 卡片顶栏（背面卡片露出的就是这条卡头） */}
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 px-6 py-4 transition-colors duration-300 sm:px-8",
                        isFront ? "border-line border-b" : "border-b border-transparent",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("size-2.5 rounded-full", badge.dot, out.running && "animate-pulse")} />
                        <span className="text-ink text-[18px] font-semibold tracking-[-0.02em]">{m.run}</span>
                        <span className="typo-num text-ink-3 text-[13px]">
                          {m.params ? `${fmtM(m.params)} · ${badge.tag}` : "权重缺失"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {out.running && <span className="text-brand text-[12.5px] font-medium">正在生成…</span>}
                        {isQueued && <span className="text-ink-3 text-[12.5px]">排队中</span>}
                        {out.done && !out.running && (
                          <span className="typo-num text-ink-2 text-[13px] font-medium">
                            {out.done.tok_s.toFixed(0)} tok/s · {out.done.seconds.toFixed(2)}s
                          </span>
                        )}
                        {!isFront && !out.running && !isQueued && !out.done && (
                          <span className="text-ink-3 text-[12px]">点击展开</span>
                        )}

                        {isFront && out.chunks.length > 0 && !out.running && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); copyCard(i) }}
                            className={cn(
                              "flex h-7.5 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors",
                              copiedIdx === i
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-field text-ink-2 hover:bg-hover hover:text-ink",
                            )}
                          >
                            {copiedIdx === i ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                            <span>{copiedIdx === i ? "已复制" : "复制"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 正文区：抽至最前时平滑淡入，退居后排时柔和隐退 */}
                    <div
                      className={cn(
                        "px-6 py-6 transition-opacity duration-400 sm:px-8 sm:py-7",
                        isFront ? "opacity-100" : "pointer-events-none opacity-0 select-none",
                      )}
                    >
                      <DeckCardBody out={out} queued={isQueued} missingCkpt={m.missing ? m.ckpt : undefined} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 本次实测推理吞吐横向对比条：点击某一行联动把对应卡片丝滑抽至最前 */}
        {speedRows.length >= 2 && (
          <div onPointerMove={onLiquidMove} className="apple-card mx-auto max-w-[920px] rounded-[24px] p-6 sm:p-7" style={{ animation: "fade-up 420ms var(--ease-out-strong) both" }}>
            <div className="mb-5 flex items-center justify-between">
              <span className="text-ink text-[15px] font-semibold tracking-[-0.015em]">本次推理吞吐对比</span>
              <span className="text-ink-3 text-[12px]">点击任意条目切换卡片</span>
            </div>
            <div className="space-y-3.5">
              {speedRows.map((r, idx) => {
                const badge = getModelBadge(r.run)
                const pct = Math.max(8, (r.tok_s / maxSpeed) * 100)
                const isSelected = r.idx === activeIdx
                return (
                  <button
                    key={r.run}
                    type="button"
                    onClick={() => selectCard(r.idx)}
                    className={cn(
                      "block w-full space-y-1.5 rounded-xl p-2 text-left transition-colors",
                      isSelected ? "bg-surface shadow-sm" : "hover:bg-surface/60",
                    )}
                  >
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="text-ink flex items-center gap-2 font-semibold">
                        <span className={cn("size-2 rounded-full", badge.dot)} />
                        {r.run}
                      </span>
                      <span className="typo-num text-ink-2 text-[13px]">
                        <strong className="text-ink font-semibold">{r.tok_s.toFixed(0)} tok/s</strong> · {r.seconds.toFixed(2)}s
                      </span>
                    </div>
                    <div className="bg-hover h-2.5 overflow-hidden rounded-full">
                      <div
                        className={cn("bar-grow h-full rounded-full bg-gradient-to-r", badge.bar)}
                        style={{ width: `${pct}%`, animationDelay: `${idx * 100}ms` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
