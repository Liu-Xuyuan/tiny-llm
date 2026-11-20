// 手稿创作工作台：采用标准 shadcn/ui + Radix UI 元件库（Card / Button / Badge / Select / Separator / Slider）构建
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  FilePlus2,
  RotateCw,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from "lucide-react"

import { api, type Checkpoints, type ModelStats as Stats, type SamplingParams } from "@/lib/api"
import { getModelBadge } from "@/lib/meta"
import { runInto } from "@/lib/run"
import { EMPTY_OUTPUT, type Output } from "@/components/OutputCard"
import { PixelLoader } from "@/components/PixelLoader"
import { DEFAULT_PARAMS, SamplingPanel } from "@/components/SamplingPanel"
import { SamplingVisualizer } from "@/components/SamplingVisualizer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type ManuscriptRecord = {
  id: string
  createdAt: number
  ckpt: string
  prompt: string
  text: string
  params: SamplingParams
  seed: number
  nTokens: number
  seconds: number
  tokS: number
}

const HISTORY_KEY = "tiny-llm-manuscripts-v1"
const MAX_HISTORY = 30

const HERO_SPECS: [string, string, string][] = [
  ["参数规模", "0.01B – 0.10B", "三种体量对照"],
  ["分词词表", "BPE 8,192", "自训练词表"],
  ["上下文", "512 tokens", "最大窗口长度"],
  ["预训练语料", "SmolLM · TinyStories", "双语料混合"],
]

function formatCkptLabel(path: string): { name: string; file: string } {
  const parts = path.split("/")
  if (parts.length >= 3 && parts[0] === "runs") {
    return { name: parts[1], file: parts.slice(2).join("/") }
  }
  return { name: path, file: "" }
}

function loadHistory(): ManuscriptRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(items: ManuscriptRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)))
  } catch {
    /* 忽略本地存储配额异常 */
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

type Props = {
  ckpts: Checkpoints | null
  error: string
  reload: () => void
  historyOpen: boolean
  onCloseHistory: () => void
  inspectorOpen: boolean
  onToggleInspector: () => void
  onCloseInspector: () => void
  onOpenLab: () => void
}

export function StudioView({
  ckpts,
  error,
  reload,
  historyOpen,
  onCloseHistory,
  inspectorOpen,
  onToggleInspector,
  onCloseInspector,
  onOpenLab,
}: Props) {
  const [ckpt, setCkpt] = useState(ckpts?.default ?? "")
  const [stats, setStats] = useState<Stats | null>(null)
  const [prompt, setPrompt] = useState("Once upon a time")
  const [params, setParams] = useState<SamplingParams>(DEFAULT_PARAMS)
  const [out, setOut] = useState<Output>(EMPTY_OUTPUT)
  const [history, setHistory] = useState<ManuscriptRecord[]>(loadHistory)
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [awayFromBottom, setAwayFromBottom] = useState(false)

  const abort = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickBottom = useRef(true)
  const lastSavedDone = useRef<Output["done"]>(null)
  const activeRunMeta = useRef<{ ckpt: string; params: SamplingParams }>({ ckpt: "", params: DEFAULT_PARAMS })

  useEffect(() => {
    if (!ckpt && ckpts?.default) setCkpt(ckpts.default)
  }, [ckpt, ckpts?.default])

  useEffect(() => {
    if (!ckpt) return
    setStats(null)
    api.model(ckpt).then(setStats).catch(console.error)
  }, [ckpt])

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
    if (!el || !stickBottom.current || !started) return
    el.scrollTop = el.scrollHeight
  }, [out.chunks.length, out.done, out.error, started])

  useEffect(() => {
    if (!out.done || out.done === lastSavedDone.current) return
    lastSavedDone.current = out.done
    const rec: ManuscriptRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      ckpt: activeRunMeta.current.ckpt || ckpt,
      prompt: out.prompt,
      text: out.chunks.join(""),
      params: activeRunMeta.current.params,
      seed: out.done.seed,
      nTokens: out.done.n_tokens,
      seconds: out.done.seconds,
      tokS: out.done.tok_s,
    }
    setActiveRecordId(rec.id)
    setHistory((prev) => {
      const next = [rec, ...prev].slice(0, MAX_HISTORY)
      saveHistory(next)
      return next
    })
  }, [out.done, out.prompt, out.chunks, ckpt])

  const generateWith = useCallback(
    (p: string) => {
      const trimmed = p.trim()
      if (!trimmed || !ckpt) return
      abort.current?.abort()
      abort.current = new AbortController()
      setActiveRecordId(null)
      activeRunMeta.current = { ckpt, params: { ...params } }
      runInto(ckpt, p, params, setOut, abort.current.signal)
    },
    [ckpt, params],
  )

  const handleNewManuscript = () => {
    abort.current?.abort()
    setOut(EMPTY_OUTPUT)
    setActiveRecordId(null)
    setPrompt("")
    if (window.innerWidth < 1024) onCloseHistory()
  }

  const handleSelectRecord = (rec: ManuscriptRecord) => {
    abort.current?.abort()
    setActiveRecordId(rec.id)
    setCkpt(rec.ckpt)
    setPrompt(rec.prompt)
    setParams(rec.params)
    const doneObj = { seed: rec.seed, n_tokens: rec.nTokens, seconds: rec.seconds, tok_s: rec.tokS }
    lastSavedDone.current = doneObj
    setOut({
      prompt: rec.prompt,
      chunks: rec.text ? [rec.text] : [],
      running: false,
      done: doneObj,
    })
    if (window.innerWidth < 1024) onCloseHistory()
  }

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setHistory((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveHistory(next)
      return next
    })
    if (activeRecordId === id) setActiveRecordId(null)
  }

  const handleCanvasScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = dist <= 32
    stickBottom.current = nearBottom
    setAwayFromBottom(!nearBottom && el.scrollHeight > el.clientHeight + 40)
  }

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    stickBottom.current = true
    setAwayFromBottom(false)
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(out.prompt + out.chunks.join(""))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* 忽略剪贴板权限错误 */
    }
  }

  const ckptInfo = formatCkptLabel(ckpt)
  const badge = getModelBadge(ckpt)

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {(historyOpen || inspectorOpen) && (
        <div
          aria-hidden
          onClick={() => {
            onCloseHistory()
            onCloseInspector()
          }}
          className="fixed inset-0 top-[54px] z-20 bg-black/20 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* ================================================================ 左侧：手稿历史记录栏 */}
      <aside
        aria-label="手稿历史记录"
        className={cn(
          "border-border bg-surface-alt z-30 flex shrink-0 flex-col overflow-hidden transition-[width,transform,opacity] duration-300 ease-[var(--ease-out-strong)]",
          "fixed top-[54px] bottom-0 left-0 w-[272px] border-r lg:static lg:top-auto",
          historyOpen
            ? "translate-x-0 opacity-100 lg:w-[260px]"
            : "pointer-events-none -translate-x-full opacity-0 lg:w-0 lg:translate-x-0 lg:border-r-0",
        )}
      >
        <div className="border-border flex items-center justify-between gap-2 border-b px-3.5 py-2.5">
          <span className="text-ink-2 text-[12px] font-semibold">手稿记录</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="xs" onClick={handleNewManuscript}>
              <FilePlus2 className="size-3.5" />
              新建
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCloseHistory}
              aria-label="关闭历史栏"
              className="lg:hidden"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="apple-scroll flex-1 overflow-y-auto p-3">
          {history.length === 0 ? (
            <div className="border-border rounded-lg border border-dashed px-3.5 py-6 text-center">
              <BookOpen className="text-muted-foreground/60 mx-auto mb-2 size-4.5" />
              <p className="text-ink-2 text-[12.5px] font-medium">暂无手稿记录</p>
              <p className="text-muted-foreground mt-1 text-[11.5px] leading-relaxed">
                完成续写后自动归档，点击可恢复全文与参数。
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {history.map((rec) => {
                const isActive = rec.id === activeRecordId
                const recName = formatCkptLabel(rec.ckpt).name
                const recBadge = getModelBadge(rec.ckpt)
                return (
                  <div
                    key={rec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectRecord(rec)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleSelectRecord(rec)
                      }
                    }}
                    className={cn(
                      "group relative cursor-pointer rounded-lg border px-3 py-2.5 transition-colors",
                      isActive
                        ? "border-primary/40 bg-card shadow-xs"
                        : "hover:border-border hover:bg-card/70 border-transparent",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="typo-editorial text-ink line-clamp-1 text-[13.5px] font-medium italic">
                        {rec.prompt}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRecord(rec.id, e)}
                        title="删除记录"
                        className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-1 text-[11.5px]">{rec.text || "…"}</p>
                    <div className="typo-num text-muted-foreground mt-2 flex items-center gap-2 text-[10.5px]">
                      <span className="inline-flex items-center gap-1">
                        <span className={cn("size-1.5 rounded-full", recBadge.dot)} />
                        {recName}
                      </span>
                      <span>·</span>
                      <span>{rec.params.temperature === 0 ? "贪心" : `T ${rec.params.temperature.toFixed(1)}`}</span>
                      <span className="ml-auto">{fmtTime(rec.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {ckpts && ckpts.examples.length > 0 && (
            <div className="mt-5">
              <Separator className="mb-3.5" />
              <div className="text-muted-foreground mb-1.5 px-2 text-[11px] font-medium">示例开篇</div>
              <div className="space-y-0.5">
                {ckpts.examples.map((ex) => (
                  <Button
                    key={ex}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPrompt(ex)
                      if (window.innerWidth < 1024) onCloseHistory()
                    }}
                    className="text-ink-2 h-7.5 w-full justify-start px-2 text-[12px] font-normal"
                  >
                    <span className="truncate">{ex}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================================================================ 中央：主创作画布 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 顶部工具条：标准 Select + Button + 元数据 */}
        <div className="border-border bg-card/60 flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {ckpts ? (
              <Select value={ckpt} onValueChange={setCkpt}>
                <SelectTrigger
                  size="sm"
                  className="typo-num h-7.5 w-auto min-w-[126px] gap-2 rounded-md text-[12.5px] font-medium shadow-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ckpts.items.map((c) => {
                    const { name, file } = formatCkptLabel(c)
                    const b = getModelBadge(c)
                    return (
                      <SelectItem key={c} value={c} className="typo-num text-[12.5px]">
                        <span className="flex items-center gap-2">
                          <span className={cn("size-1.5 rounded-full", b.dot)} />
                          <span className="text-ink font-semibold">{name}</span>
                          {file && <span className="text-muted-foreground text-[11px] font-normal">{file}</span>}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Skeleton className="h-7 w-28 rounded-md" />
            )}

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={reload}
              title="刷新模型列表"
              className="size-7 active:rotate-180"
            >
              <RotateCw className="size-3.5" />
            </Button>

            {stats && (
              <>
                <Separator orientation="vertical" className="hidden h-4 md:block" />
                <div className="typo-num text-muted-foreground hidden items-center gap-2 text-[11.5px] md:flex">
                  <span>
                    {stats.n_layer}L / {stats.n_embd}D / {stats.n_head}H
                  </span>
                  <span>·</span>
                  <span>{(stats.params / 1e6).toFixed(1)}M</span>
                  <span>·</span>
                  <span>Val {stats.best_val.toFixed(3)}</span>
                </div>
              </>
            )}
          </div>

          <Button
            variant={inspectorOpen ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleInspector}
            className="typo-num h-7.5 px-2.5 text-[11.5px]"
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">
              {params.temperature === 0 ? "贪心" : `T ${params.temperature.toFixed(2)}`} ·{" "}
              {params.top_k === 0 ? "k 不限" : `k ${params.top_k}`} · {params.max_new_tokens} tok
            </span>
            <span className="sm:hidden">参数</span>
          </Button>
        </div>

        {/* 中央可滚动区 */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={handleCanvasScroll}
            className="apple-scroll flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10"
          >
            {error && (
              <Card className="border-destructive/30 bg-destructive/8 text-destructive mx-auto mb-6 max-w-[700px] px-4 py-3 text-center text-[13px] shadow-none">
                连不上后端服务：{error}
              </Card>
            )}

            {!started ? (
              /* ---- 空态：克制、去 AI 营销味的专业工具首屏 ---- */
              <div className="mx-auto flex min-h-full max-w-[700px] flex-col justify-center py-2">
                <div className="space-y-2.5 text-center">
                  <h1 className="typo-display text-ink text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[42px]">
                    从零训练的迷你语言模型
                  </h1>
                  <p className="text-muted-foreground mx-auto max-w-[46ch] text-[14.5px] leading-relaxed">
                    Decoder-only Transformer 纯手写实现，支持多规模权重切换、采样策略调校与自回归流式续写。
                  </p>
                </div>

                {/* 标准 Card 四列规格表 */}
                <Card className="divide-border mt-7 grid grid-cols-2 divide-y overflow-hidden sm:grid-cols-[1fr_0.95fr_0.9fr_1.35fr] sm:divide-x sm:divide-y-0">
                  {HERO_SPECS.map(([title, val, sub]) => (
                    <div key={title} className="px-4 py-3.5 text-left">
                      <div className="text-muted-foreground text-[11px] font-medium">{title}</div>
                      <div className="typo-num text-ink mt-1 text-[14.5px] font-semibold tracking-[-0.015em] whitespace-nowrap">
                        {val}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-[11px]">{sub}</div>
                    </div>
                  ))}
                </Card>

                {/* 示例输入快捷按钮组 */}
                {ckpts && ckpts.examples.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-muted-foreground text-[12px] font-medium">快速测试输入</span>
                      <Button variant="link" size="xs" onClick={onOpenLab} className="h-auto p-0 text-[12px]">
                        查看训练曲线与评测表
                        <ArrowUpRight className="size-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ckpts.examples.slice(0, 4).map((ex) => (
                        <Button
                          key={ex}
                          variant="outline"
                          onClick={() => {
                            setPrompt(ex)
                            generateWith(ex)
                          }}
                          className="h-auto justify-between rounded-lg px-3.5 py-3 text-left font-normal"
                        >
                          <span className="typo-editorial text-ink line-clamp-1 text-[14.5px] italic">{ex}</span>
                          <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ---- 活跃态：标准 Card 手稿输出页（全宽两端对齐） ---- */
              <Card
                className={cn(
                  "mx-auto max-w-[720px] p-6 sm:p-8",
                  out.running && "apple-generating",
                )}
              >
                <div className="flex h-8 items-center justify-between gap-3">
                  <div className="typo-num text-muted-foreground flex items-center gap-2 text-[12px]">
                    <span className={cn("size-2 rounded-full", badge.dot)} />
                    <span className="text-ink font-semibold">{ckptInfo.name}</span>
                    <span>·</span>
                    <span>{out.running ? `正在生成 ${elapsed.toFixed(1)}s` : "生成结果"}</span>
                  </div>

                  {out.chunks.length > 0 && !out.running && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => generateWith(out.prompt)}
                        title="用当前参数重新生成"
                        className="size-7.5 active:rotate-180"
                      >
                        <RotateCw className="size-3.5" />
                      </Button>
                      <Button
                        variant={copied ? "secondary" : "outline"}
                        size="sm"
                        onClick={copyText}
                        className={cn(
                          "h-7.5 px-2.5 text-[12px]",
                          copied && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        <span>{copied ? "已复制" : "复制"}</span>
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {waiting ? (
                  <div className="flex min-h-[220px] items-center justify-center">
                    <PixelLoader />
                  </div>
                ) : (
                  <>
                    <p className="typo-editorial text-ink text-justify text-[18px] leading-[1.95] tracking-[-0.004em] whitespace-pre-wrap [text-justify:inter-word]">
                      <span className="bg-mark text-ink mr-0.5 rounded-[5px] px-1.5 py-0.5 font-medium italic">
                        {out.prompt}
                      </span>
                      {out.chunks.map((c, i) => (
                        <span key={i} className="token">
                          {c}
                        </span>
                      ))}
                      {(out.running || out.done) && <span className={cn("caret", out.running && "is-streaming")} />}
                    </p>

                    {out.error && (
                      <p className="bg-destructive/10 text-destructive mt-5 rounded-lg px-3.5 py-2.5 text-[13px]">
                        {out.error}
                      </p>
                    )}

                    {out.running && out.chunks.length > 0 && (
                      <>
                        <Separator className="mt-6 mb-3.5" />
                        <div className="typo-num text-muted-foreground flex items-center gap-3 text-[12px]">
                          <span className="text-brand font-medium">正在生成</span>
                          <span>{out.chunks.length} 段</span>
                          <span>{elapsed.toFixed(1)}s</span>
                        </div>
                      </>
                    )}

                    {out.done && (
                      <>
                        <Separator className="mt-6 mb-3.5" />
                        <div className="typo-num text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                          <span>Seed {out.done.seed}</span>
                          <span>{out.done.n_tokens} tokens</span>
                          <span>{out.done.seconds.toFixed(2)}s</span>
                          <span className="text-ink ml-auto font-semibold">{out.done.tok_s.toFixed(0)} tok/s</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </Card>
            )}
          </div>

          {awayFromBottom && started && (
            <Button
              variant="outline"
              size="xs"
              onClick={scrollToBottom}
              className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 shadow-md"
            >
              <ArrowDown className="size-3" />
              回到最新
            </Button>
          )}
        </div>

        {/* 底部常驻输入区（标准 Card + Button） */}
        <div className="border-border bg-page shrink-0 border-t px-4 py-3 sm:px-8">
          <Card className="focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 mx-auto max-w-[720px] transition-shadow">
            <div className="flex items-end gap-2 px-3.5 py-2">
              <textarea
                value={prompt}
                rows={1}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入英文开头，例如 Once upon a time…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (!out.running && prompt.trim()) generateWith(prompt)
                  }
                }}
                className="typo-editorial text-ink placeholder:text-muted-foreground max-h-28 min-h-[34px] flex-1 resize-none bg-transparent py-1 text-[16px] leading-relaxed outline-none placeholder:italic"
              />

              {prompt && !out.running && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPrompt("")}
                  title="清空输入"
                  className="mb-0.5 shrink-0"
                >
                  <X className="size-3.5" />
                </Button>
              )}

              <Button
                variant={out.running ? "destructive" : "default"}
                size="sm"
                onClick={out.running ? () => abort.current?.abort() : () => generateWith(prompt)}
                disabled={!out.running && (!prompt.trim() || !ckpt)}
                className="mb-0.5 h-8.5 shrink-0 px-3.5"
              >
                {out.running ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-3.5" />}
                {out.running ? "停止" : "生成"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ================================================================ 右侧：采样控制与原理抽屉 */}
      <aside
        aria-label="采样控制与原理"
        className={cn(
          "border-border bg-surface-alt z-30 flex shrink-0 flex-col overflow-hidden transition-[width,transform,opacity] duration-300 ease-[var(--ease-out-strong)]",
          "fixed top-[54px] right-0 bottom-0 w-[328px] border-l lg:static lg:top-auto",
          inspectorOpen
            ? "translate-x-0 opacity-100 lg:w-[336px]"
            : "pointer-events-none translate-x-full opacity-0 lg:w-0 lg:translate-x-0 lg:border-l-0",
        )}
      >
        <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-ink-2 text-[12px] font-semibold">采样控制与原理</span>
          <Button variant="ghost" size="icon-xs" onClick={onCloseInspector} aria-label="收起参数抽屉">
            <X className="size-3.5" />
          </Button>
        </div>

        <div className="apple-scroll flex-1 overflow-y-auto p-3">
          <div className="flex min-h-full flex-col gap-3">
            {/* 单行四格规格卡 */}
            <Card className="shrink-0 px-3 py-2.5">
              {stats ? (
                <div className="divide-border grid grid-cols-4 divide-x text-center">
                  <div className="pr-1.5">
                    <div className="text-muted-foreground text-[10px]">层/维/头</div>
                    <div className="typo-num text-ink mt-0.5 text-[11px] font-semibold whitespace-nowrap">
                      {stats.n_layer}/{stats.n_embd}/{stats.n_head}
                    </div>
                  </div>
                  <div className="px-1.5">
                    <div className="text-muted-foreground text-[10px]">参数量</div>
                    <div className="typo-num text-ink mt-0.5 text-[11px] font-semibold whitespace-nowrap">
                      {(stats.params / 1e6).toFixed(1)}M
                    </div>
                  </div>
                  <div className="px-1.5">
                    <div className="text-muted-foreground text-[10px]">词表</div>
                    <div className="typo-num text-ink mt-0.5 text-[11px] font-semibold whitespace-nowrap">
                      {stats.vocab_size.toLocaleString("en-US")}
                    </div>
                  </div>
                  <div className="pl-1.5">
                    <div className="text-muted-foreground text-[10px]">Val Loss</div>
                    <div className="typo-num text-ink mt-0.5 text-[11px] font-semibold whitespace-nowrap">
                      {stats.best_val.toFixed(3)}
                    </div>
                  </div>
                </div>
              ) : (
                <Skeleton className="h-8 rounded-md" />
              )}
            </Card>

            {/* 实时采样概率分布卡 */}
            <SamplingVisualizer params={params} compact className="flex-1" />

            {/* 采样控件卡 */}
            <Card className="flex flex-[1.45] flex-col p-3.5">
              <SamplingPanel value={params} onChange={setParams} compact />
            </Card>
          </div>
        </div>
      </aside>
    </div>
  )
}
