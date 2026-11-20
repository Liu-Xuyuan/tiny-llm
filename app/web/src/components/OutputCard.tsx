// Apple 风格输出卡片：固定高度不撑变形，超出下边界时自动平滑上滑显示新内容，顶部柔和渐隐，支持手动回看
import { useEffect, useRef, useState } from "react"
import { ArrowDown, Check, Copy, RotateCw } from "lucide-react"

import type { GenDone } from "@/lib/api"
import { onLiquidMove } from "@/lib/motion"
import { PixelLoader } from "@/components/PixelLoader"
import { cn } from "@/lib/utils"

export type Output = { prompt: string; chunks: string[]; running: boolean; done: GenDone | null; error?: string }

export const EMPTY_OUTPUT: Output = { prompt: "", chunks: [], running: false, done: null }

export function OutputCard({
  out,
  placeholder,
  queued = false,
  onRegenerate,
  className,
}: {
  out: Output
  placeholder?: string
  queued?: boolean
  onRegenerate?: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)
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

  // 流式输出超出下边界时自动上滑跟随最新内容（若用户手动往上翻看则暂停跟随）
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickBottom.current) return
    el.scrollTop = el.scrollHeight
    setScrolledTop(el.scrollTop > 4)
  }, [out.chunks.length, out.done, out.error])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distToBottom <= 28
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(out.prompt + out.chunks.join(""))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* 无剪贴板权限时忽略 */ }
  }

  return (
    <div
      onPointerMove={onLiquidMove}
      className={cn(
        "apple-card group/out relative flex min-h-60 flex-col overflow-hidden rounded-[14px] p-6 transition-shadow duration-500 sm:p-7",
        out.running && "apple-generating",
        className,
      )}
    >
      {/* 生成中顶部极克制的 2px 流光条 */}
      {out.running && <div aria-hidden className="streaming-bar absolute inset-x-0 top-0 h-[2px]" />}

      {!started ? (
        <div className="text-ink-3 m-auto text-center text-[14px]">
          {queued ? "排队中，等待前一个模型完成…" : (placeholder ?? "输入一段英文开头，点击生成查看续写")}
        </div>
      ) : waiting ? (
        <div className="m-auto"><PixelLoader /></div>
      ) : (
        <>
          {/* 固定高度顶栏：放置状态标签与操作按钮，不挤压正文右侧空间，保证正文全宽两端对齐且生成结束零跳动 */}
          <div className="mb-3 flex h-7.5 shrink-0 items-center justify-between gap-2">
            <span className="text-ink-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium tracking-[0.02em]">
              {out.running ? (
                <>
                  <span className="bg-brand size-1.5 animate-pulse rounded-full" />
                  <span>正在续写</span>
                </>
              ) : (
                <span>生成结果</span>
              )}
            </span>

            {out.chunks.length > 0 && !out.running && (
              <div className="flex items-center gap-1.5 opacity-85 transition-opacity duration-150 group-hover/out:opacity-100">
                {onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    title="重新生成"
                    className="liquid-pill text-ink-2 hover:text-ink flex size-7.5 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:rotate-180"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={copy}
                  title={copied ? "已复制" : "复制全文"}
                  className={cn(
                    "flex h-7.5 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-all duration-150",
                    copied
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 opacity-100"
                      : "liquid-pill text-ink-2 hover:text-ink",
                  )}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "已复制" : "复制"}</span>
                </button>
              </div>
            )}
          </div>

          {/* 内部滚动视口：全宽两端对齐，-mr-2.5 pr-2.5 让文本右边与底栏严格齐平且为细滚动条留出呼吸槽 */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className={cn(
                "apple-scroll -mr-2.5 min-h-0 flex-1 overflow-y-auto pr-2.5",
                scrolledTop && "scroll-fade-top",
              )}
            >
              <p className="typo-editorial text-ink text-justify text-[17.5px] leading-[1.9] tracking-[-0.004em] whitespace-pre-wrap [text-justify:inter-word]">
                <span className="bg-mark text-ink mr-0.5 rounded-[6px] px-1.5 py-0.5 font-medium italic">
                  {out.prompt}
                </span>
                {out.chunks.map((c, i) => <span key={i} className="token">{c}</span>)}
                {(out.running || out.done) && <span className={cn("caret", out.running && "is-streaming")} />}
              </p>

              {out.error && (
                <p className="bg-destructive/10 text-destructive mt-4 rounded-xl px-3.5 py-2 text-[13px]">
                  {out.error}
                </p>
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
        </>
      )}
    </div>
  )
}
