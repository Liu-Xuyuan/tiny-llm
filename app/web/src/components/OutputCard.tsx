// Apple 风格输出卡片：大圆角宽敞留白、生成时顶部细微 Apple Intelligence 流光条、简洁等宽统计
import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"

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
  className,
}: {
  out: Output
  placeholder?: string
  queued?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const started = out.running || out.chunks.length > 0 || out.done || out.error
  const waiting = out.running && out.chunks.length === 0

  useEffect(() => {
    if (!out.running) return
    const t0 = performance.now()
    setElapsed(0)
    const id = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100)
    return () => clearInterval(id)
  }, [out.running])

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
        "apple-card group/out relative flex min-h-56 flex-col overflow-hidden rounded-[22px] p-6 transition-shadow duration-500 sm:p-7",
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
          {out.chunks.length > 0 && !out.running && (
            <button
              onClick={copy}
              title={copied ? "已复制" : "复制全文"}
              className={cn(
                "absolute top-5 right-5 flex h-7.5 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-all duration-150",
                copied
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 opacity-100"
                  : "liquid-pill text-ink-2 hover:text-ink opacity-80 group-hover/out:opacity-100",
              )}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copied ? "已复制" : "复制"}</span>
            </button>
          )}

          <p className="text-ink pr-20 text-[16px] leading-[1.82] tracking-[-0.006em] whitespace-pre-wrap">
            <span className="bg-mark text-ink mr-0.5 rounded-[6px] px-1.5 py-0.5 font-medium">
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

          {out.running && out.chunks.length > 0 && (
            <div className="border-line text-ink-3 mt-auto flex items-center gap-3 border-t pt-4 font-mono text-[12px] tabular-nums">
              <span className="text-brand font-sans font-medium">正在生成</span>
              <span>{out.chunks.length} 段</span>
              <span>{elapsed.toFixed(1)}s</span>
            </div>
          )}

          {out.done && (
            <div
              className="border-line text-ink-3 mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 font-mono text-[12px] tabular-nums"
              style={{ animation: "token-in 260ms ease-out both" }}
            >
              <span>seed {out.done.seed}</span>
              <span>{out.done.n_tokens} tok</span>
              <span>{out.done.seconds.toFixed(2)}s</span>
              <span className="text-ink ml-auto font-semibold">{out.done.tok_s.toFixed(0)} tok/s</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
