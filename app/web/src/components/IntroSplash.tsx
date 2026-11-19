// 开场动画（Apple Keynote / "Hello" 极简书写风格）：
// 纯白/纯黑无边框大舞台，一支 Apple Pencil 风格光笔续写 "Once upon a time"，引出模型用途。
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

const PROMPT_TEXT = "Once upon a time"
const CONTINUATION = ", a tiny Transformer learned to imagine."
const INTRO_CN =
  "从零手写的 0.01B – 0.1B 迷你语言模型。输入任意英文开头，观察它逐 token 自回归续写，并直观对比模型规模、采样参数与训练曲线。"

// Apple Pencil 风格极简笔身：纯白/银灰立体质感 + 苹果蓝微光笔尖
function ApplePencil({ writing }: { writing: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none relative ml-1 inline-block h-[1em] w-0 align-baseline">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className={cn(
          "absolute -left-[3px] bottom-[2px] size-10 origin-[4px_36px] drop-shadow-[0_6px_14px_rgba(0,0,0,0.16)] transition-all duration-500 ease-[var(--ease-out-strong)] dark:drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]",
          writing ? "pen-writing opacity-100" : "translate-x-2 -translate-y-3 rotate-[12deg] opacity-0",
        )}
      >
        <defs>
          <linearGradient id="pencilShaft" x1="10" y1="30" x2="34" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5f5f7" />
            <stop offset="55%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d2d2d7" />
          </linearGradient>
        </defs>
        {/* 笔杆主体：简洁修长的 Apple Pencil 轮廓 */}
        <path
          d="M31.2 4.6a2.6 2.6 0 0 1 3.7 3.7L15.4 27.8l-7.2 2.4 2.4-7.2L31.2 4.6Z"
          fill="url(#pencilShaft)"
          stroke="#a1a1a6"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* 顶部浅银金属环 */}
        <path d="M27.6 8.2 31.3 11.9" stroke="#86868b" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
        {/* 锥形笔尖 */}
        <path d="M10.6 23 15.4 27.8 8.2 30.2 10.6 23Z" fill="#e8e8ed" stroke="#a1a1a6" strokeWidth="0.9" strokeLinejoin="round" />
        {/* 笔尖触点：苹果蓝微点 */}
        <path d="M8.2 30.2 10.4 29.4 9 28 8.2 30.2Z" fill="var(--brand)" />
      </svg>
    </span>
  )
}

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [enCount, setEnCount] = useState(0)
  const [cnCount, setCnCount] = useState(0)
  const [phase, setPhase] = useState<"prompt" | "writing-en" | "writing-cn" | "finished">("prompt")
  const [exiting, setExiting] = useState(false)

  const dismiss = () => {
    if (exiting) return
    setExiting(true)
    setTimeout(onDone, 460)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.key === "Enter" && phase === "finished")) dismiss()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEnCount(CONTINUATION.length)
      setCnCount(INTRO_CN.length)
      setPhase("finished")
      return
    }

    let timer: ReturnType<typeof setTimeout>
    if (phase === "prompt") {
      timer = setTimeout(() => setPhase("writing-en"), 480)
    } else if (phase === "writing-en") {
      if (enCount < CONTINUATION.length) {
        const ch = CONTINUATION[enCount]
        const delay = ch === "," || ch === "." ? 140 : ch === " " ? 42 : 38
        timer = setTimeout(() => setEnCount((n) => n + 1), delay)
      } else {
        timer = setTimeout(() => setPhase("writing-cn"), 340)
      }
    } else if (phase === "writing-cn") {
      if (cnCount < INTRO_CN.length) {
        const ch = INTRO_CN[cnCount]
        const delay = ch === "。" || ch === "，" ? 110 : 28
        timer = setTimeout(() => setCnCount((n) => n + 1), delay)
      } else {
        timer = setTimeout(() => setPhase("finished"), 260)
      }
    }
    return () => clearTimeout(timer)
  }, [phase, enCount, cnCount])

  return (
    <div
      role="dialog"
      aria-label="Tiny LLM 开场介绍"
      className={cn(
        "bg-page fixed inset-0 z-50 flex flex-col items-center justify-center px-6 transition-all duration-500 ease-[var(--ease-out-strong)]",
        exiting ? "pointer-events-none scale-[1.015] opacity-0" : "opacity-100",
      )}
    >
      {/* 右上角极轻的跳过文字链接 */}
      <button
        type="button"
        onClick={dismiss}
        className="text-ink-3 hover:text-ink fixed top-6 right-7 text-[13px] font-medium transition-colors"
      >
        跳过
      </button>

      {/* 无边框纯净排版中心：留白充足，像苹果发布会主视觉 */}
      <div className="reveal w-full max-w-[780px] text-center">
        <p className="text-ink-3 mb-7 text-[13px] font-semibold tracking-[0.06em] uppercase">
          SJTU · Topic B03 · Tiny LLM
        </p>

        <h1 className="text-ink min-h-[120px] text-[30px] leading-[1.22] font-semibold tracking-[-0.032em] text-balance sm:min-h-[144px] sm:text-[46px]">
          <span className="apple-ai-text">{PROMPT_TEXT}</span>
          <span>{CONTINUATION.slice(0, enCount)}</span>
          {(phase === "prompt" || phase === "writing-en") && <ApplePencil writing={phase === "writing-en"} />}
        </h1>

        <p className="text-ink-3 mx-auto mt-6 min-h-[64px] max-w-[600px] text-[16px] leading-[1.7] font-normal tracking-[-0.01em] text-pretty sm:text-[18px]">
          {INTRO_CN.slice(0, cnCount)}
          {(phase === "writing-cn" || phase === "finished") && <ApplePencil writing={phase === "writing-cn"} />}
          {phase === "finished" && <span className="caret" />}
        </p>

        <div
          className={cn(
            "mt-11 flex items-center justify-center gap-4 transition-all duration-500 ease-[var(--ease-out-strong)]",
            phase === "finished" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-60 hover:opacity-100",
          )}
        >
          <button
            type="button"
            onClick={dismiss}
            className="btn-apple inline-flex h-11 items-center gap-2 rounded-full px-7 text-[15px] font-medium"
          >
            开始探索
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
