// 开场动画（120fps GPU 物理运笔引擎）：
// 1. 预先隐形占位排版（Ghost Reserve）：整段文字从第 0 毫秒起坐标锁死，彻底消除居中抖动与单词中途折行跳动；
// 2. 唯一一支独立悬空 Apple Pencil：在 requestAnimationFrame 中对每个字符的真实几何坐标做亚像素连续插值 + 指数阻尼追踪，
//    换行与中英段落切换时平滑抬笔飞跃，全程零频繁 React 重渲染，ProMotion 120Hz 满帧丝滑。
import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

const PROMPT_TEXT = "Once upon a time"
const CONTINUATION = ", a tiny Transformer learned to imagine."
const INTRO_CN =
  "从零手写的 0.01B – 0.1B 迷你语言模型。输入任意英文开头，观察它逐 token 自回归续写，并直观对比模型规模、采样参数与训练曲线。"

// 把英文按单词切块（保持单词内不拆断），同时每个字符独立包裹 span 供笔尖逐像素追踪
function splitEnglishTokens(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? []
}

type CharPoint = {
  el: HTMLElement
  x0: number
  x1: number
  y: number
  duration: number // 写完这个字符需要的毫秒数
  pauseAfter: number // 标点或段落结束后的自然微停顿（ms）
}

export function IntroSplash({
  onStartExit,
  onDone,
}: {
  onStartExit?: () => void
  onDone: () => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLSpanElement>(null)
  const penRef = useRef<HTMLDivElement>(null)
  const penSvgRef = useRef<SVGSVGElement>(null)
  const [finished, setFinished] = useState(false)
  const [exiting, setExiting] = useState(false)

  const dismiss = () => {
    if (exiting) return
    setExiting(true)
    onStartExit?.()
    setTimeout(onDone, 780)
  }

  // Esc 随时跳过；写完后按 Enter 或向下滚动滚轮/触控板也可触发上滑揭幕
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.key === "Enter" && finished)) dismiss()
    }
    const onWheel = (e: WheelEvent) => {
      if (finished && e.deltaY > 18) dismiss()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("wheel", onWheel, { passive: true })
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("wheel", onWheel)
    }
  })

  // 120fps requestAnimationFrame 连续运笔动画主循环
  useEffect(() => {
    const stage = stageRef.current
    const pen = penRef.current
    const penSvg = penSvgRef.current
    if (!stage || !pen || !penSvg) return

    const charEls = Array.from(stage.querySelectorAll<HTMLElement>("[data-ink-char]"))
    if (charEls.length === 0) return

    // 尊重系统减少动态效果偏好
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      charEls.forEach((el) => el.classList.add("ink-shown"))
      pen.style.opacity = "0"
      setFinished(true)
      return
    }

    let rafId = 0
    let cancelled = false

    const startAnimation = () => {
      if (cancelled) return
      const stageRect = stage.getBoundingClientRect()
      const promptRect = promptRef.current?.getBoundingClientRect()

      // 测量每个字符相对舞台的精确几何起止点与书写基线
      const points: CharPoint[] = charEls.map((el) => {
        const r = el.getBoundingClientRect()
        const ch = el.dataset.inkChar ?? ""
        const isEn = el.dataset.inkLang === "en"
        const isLastEn = el.dataset.inkEndEn === "1"
        const isPunct = /[,，。—.]/.test(ch)
        return {
          el,
          x0: r.left - stageRect.left,
          x1: r.right - stageRect.left,
          y: r.bottom - stageRect.top - r.height * 0.16,
          duration: ch === " " ? 18 : isEn ? 36 : 32,
          pauseAfter: isLastEn ? 320 : isPunct ? 115 : 0,
        }
      })

      // 为每个字符预先计算全局时间轴（含行间飞跃过渡时间，换行绝不瞬移！）
      type Segment = {
        kind: "write" | "fly"
        tStart: number
        tEnd: number
        fromX: number
        fromY: number
        toX: number
        toY: number
        pointIdx: number
      }

      const segments: Segment[] = []
      let cursorT = 360 // 开头先温柔停顿 360ms 亮出 Prompt 与落笔
      let prevX = promptRect ? promptRect.right - stageRect.left + 2 : points[0].x0
      let prevY = promptRect ? promptRect.bottom - stageRect.top - promptRect.height * 0.16 : points[0].y

      points.forEach((pt, idx) => {
        const dy = Math.abs(pt.y - prevY)
        const dx = pt.x0 - prevX
        // 检测到换行或跨段（Y 变化超过 10px，或大幅跳回行首），插入一段平滑弧线抬笔飞行
        if (dy > 10 || dx < -24) {
          const dist = Math.hypot(dx, dy)
          const flyMs = Math.min(280, Math.max(150, dist * 0.35))
          segments.push({
            kind: "fly",
            tStart: cursorT,
            tEnd: cursorT + flyMs,
            fromX: prevX,
            fromY: prevY,
            toX: pt.x0,
            toY: pt.y,
            pointIdx: idx,
          })
          cursorT += flyMs
        }
        segments.push({
          kind: "write",
          tStart: cursorT,
          tEnd: cursorT + pt.duration,
          fromX: pt.x0,
          fromY: pt.y,
          toX: pt.x1,
          toY: pt.y,
          pointIdx: idx,
        })
        cursorT += pt.duration + pt.pauseAfter
        prevX = pt.x1
        prevY = pt.y
      })

      const totalTime = cursorT
      const startX = promptRect ? promptRect.right - stageRect.left + 2 : points[0].x0
      const startY = promptRect ? promptRect.bottom - stageRect.top - promptRect.height * 0.16 : points[0].y

      let penX = startX + 10
      let penY = startY - 14
      let shownUntil = -1
      let t0 = 0
      let prevFrame = 0

      // 定位初始落笔
      pen.style.transform = `translate3d(${penX}px, ${penY}px, 0)`
      pen.style.opacity = "0"

      const tick = (now: number) => {
        if (cancelled) return
        if (!t0) {
          t0 = now
          prevFrame = now
        }
        const elapsed = now - t0
        const dt = Math.min(0.05, (now - prevFrame) / 1000)
        prevFrame = now

        let targetX = prevX
        let targetY = prevY
        let lift = 0
        let tilt = 0
        let opacity = 1

        if (elapsed < 360) {
          // 落笔准备阶段：从右上方柔和落到 Prompt 末尾
          const p = Math.min(1, elapsed / 300)
          const ease = 1 - Math.pow(1 - p, 3)
          targetX = startX
          targetY = startY
          opacity = ease
          lift = (1 - ease) * 14
          tilt = (1 - ease) * 10
        } else if (elapsed <= totalTime) {
          // 找到当前时间对应的段落
          let seg = segments[segments.length - 1]
          for (let i = 0; i < segments.length; i++) {
            if (elapsed <= segments[i].tEnd) {
              seg = segments[i]
              break
            }
            // 已经完全经过的书写段，立刻点亮对应文字
            if (segments[i].kind === "write" && segments[i].pointIdx > shownUntil) {
              shownUntil = segments[i].pointIdx
              points[shownUntil].el.classList.add("ink-shown")
            }
          }

          if (elapsed < seg.tStart) {
            // 标点自然微停顿期间，笔尖停在上一字末尾轻缓呼吸
            const lastPt = points[Math.max(0, seg.pointIdx - 1)]
            targetX = lastPt.x1
            targetY = lastPt.y
            lift = 2
            tilt = 2
          } else {
            const raw = (elapsed - seg.tStart) / Math.max(1, seg.tEnd - seg.tStart)
            const u = Math.min(1, Math.max(0, raw))
            if (seg.kind === "fly") {
              // 换行 / 跨段弧线抬笔飞跃（三次平滑插值 + 抛物线抬高）
              const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
              targetX = seg.fromX + (seg.toX - seg.fromX) * ease
              targetY = seg.fromY + (seg.toY - seg.fromY) * ease
              lift = Math.sin(u * Math.PI) * 18
              tilt = Math.sin(u * Math.PI) * 11
            } else {
              // 连续书写单字：亚像素推进 + 细腻自然笔势波动
              targetX = seg.fromX + (seg.toX - seg.fromX) * u
              targetY = seg.fromY + Math.sin(now * 0.022) * 1.1
              tilt = Math.sin(now * 0.018) * 2.8 - 2
              if (u >= 0.25 && seg.pointIdx > shownUntil) {
                shownUntil = seg.pointIdx
                points[shownUntil].el.classList.add("ink-shown")
              }
            }
          }
        } else {
          // 写完收笔：点亮所有残留字符，钢笔优雅向右上方抬笔淡出
          for (let i = shownUntil + 1; i < points.length; i++) {
            points[i].el.classList.add("ink-shown")
          }
          shownUntil = points.length - 1
          const outP = Math.min(1, (elapsed - totalTime) / 420)
          const easeOut = 1 - Math.pow(1 - outP, 3)
          targetX = prevX + easeOut * 14
          targetY = prevY
          lift = easeOut * 18
          tilt = easeOut * 14
          opacity = 1 - easeOut

          if (outP >= 1) {
            pen.style.opacity = "0"
            setFinished(true)
            return
          }
        }

        // 指数平滑阻尼追踪：适配 60Hz / 120Hz 任意刷新率，丝滑无锯齿
        const k = 1 - Math.exp(-dt * 28)
        penX += (targetX - penX) * k
        penY += (targetY - lift - penY) * k

        pen.style.opacity = opacity.toFixed(3)
        pen.style.transform = `translate3d(${penX.toFixed(2)}px, ${penY.toFixed(2)}px, 0)`
        penSvg.style.transform = `rotate(${tilt.toFixed(2)}deg)`

        rafId = requestAnimationFrame(tick)
      }

      rafId = requestAnimationFrame(tick)
    }

    // 等待字体加载完再量取精确字形坐标，避免字体替换引起笔尖偏移
    document.fonts.ready.then(startAnimation)

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  const enTokens = splitEnglishTokens(CONTINUATION)
  const cnChars = Array.from(INTRO_CN)

  return (
    <div
      role="dialog"
      aria-label="Tiny LLM 开场介绍"
      style={{
        transform: exiting ? "translate3d(0, -104%, 0)" : "translate3d(0, 0, 0)",
        transition: "transform 780ms cubic-bezier(0.32, 0.72, 0, 1), border-radius 520ms ease, box-shadow 520ms ease",
      }}
      className={cn(
        "bg-page fixed inset-0 z-50 flex flex-col items-center justify-center px-6 will-change-transform",
        exiting
          ? "pointer-events-none rounded-b-[36px] shadow-[0_28px_80px_rgba(0,0,0,0.16)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.75)]"
          : "rounded-b-none",
      )}
    >
      {/* 右上角跳过按钮 */}
      <button
        type="button"
        onClick={dismiss}
        className={cn(
          "liquid-pill text-ink-2 hover:text-brand fixed top-6 right-7 z-10 rounded-[9px] px-4 py-1.5 text-[12.5px] font-medium transition-all duration-300 active:scale-95",
          exiting && "opacity-0",
        )}
      >
        跳过
      </button>

      {/* 暖宣纸出版舞台：退场时内容带轻微上浮视差淡出，配合整块幕布上滑揭开主页 */}
      <div
        ref={stageRef}
        className={cn(
          "reveal relative z-10 w-full max-w-[820px] text-center transition-all duration-500 ease-[var(--ease-out-strong)]",
          exiting && "-translate-y-8 opacity-0",
        )}
      >
        {/* 唯一一支 120fps GPU 悬空蘸水/书画笔（定位原点精准对齐笔尖） */}
        <div
          ref={penRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-20 will-change-transform"
          style={{ opacity: 0 }}
        >
          <span className="nib-glow bg-brand absolute -top-[4px] -left-[4px] size-2.5 rounded-full blur-[3px]" />
          <svg
            ref={penSvgRef}
            viewBox="0 0 40 40"
            fill="none"
            className="absolute -left-[8px] -top-[30px] size-10 origin-[8px_30px] drop-shadow-[0_6px_14px_rgba(25,23,21,0.16)] dark:drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)]"
          >
            <defs>
              <linearGradient id="pencilShaft" x1="10" y1="30" x2="34" y2="6" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f5f5f7" />
                <stop offset="55%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#d2d2d7" />
              </linearGradient>
            </defs>
            <path
              d="M31.2 4.6a2.6 2.6 0 0 1 3.7 3.7L15.4 27.8l-7.2 2.4 2.4-7.2L31.2 4.6Z"
              fill="url(#pencilShaft)"
              stroke="#a1a1a6"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M27.6 8.2 31.3 11.9" stroke="#86868b" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
            <path d="M10.6 23 15.4 27.8 8.2 30.2 10.6 23Z" fill="#e8e8ed" stroke="#a1a1a6" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M8.2 30.2 10.4 29.4 9 28 8.2 30.2Z" fill="var(--brand)" />
          </svg>
        </div>

        <p className="typo-kicker text-ink-3 mb-8 flex items-center justify-center gap-3">
          <span aria-hidden className="bg-line-strong h-px w-6" />
          <span>PROLOGUE · SJTU TOPIC B03 · TINY LLM</span>
          <span aria-hidden className="bg-line-strong h-px w-6" />
        </p>

        <h1 className="typo-editorial text-ink text-[34px] leading-[1.28] font-normal tracking-[-0.02em] text-balance sm:text-[52px]">
          <span ref={promptRef} className="apple-ai-text pr-0.5 font-medium italic">
            {PROMPT_TEXT}
          </span>
          {enTokens.map((tok, tIdx) => {
            const isSpace = /^\s+$/.test(tok)
            const isLastToken = tIdx === enTokens.length - 1
            if (isSpace) {
              return (
                <span key={`sp-${tIdx}`} data-ink-char=" " data-ink-lang="en" className="ink-char">
                  {tok}
                </span>
              )
            }
            const letters = Array.from(tok)
            return (
              <span key={`wd-${tIdx}`} className="inline-block whitespace-nowrap">
                {letters.map((ch, cIdx) => (
                  <span
                    key={cIdx}
                    data-ink-char={ch}
                    data-ink-lang="en"
                    data-ink-end-en={isLastToken && cIdx === letters.length - 1 ? "1" : undefined}
                    className="ink-char"
                  >
                    {ch}
                  </span>
                ))}
              </span>
            )
          })}
        </h1>

        <p className="text-ink-3 mx-auto mt-7 max-w-[580px] text-[15.5px] leading-[1.9] font-normal tracking-[0.01em] text-pretty sm:text-[17px]">
          {cnChars.map((ch, idx) => (
            <span key={idx} data-ink-char={ch} data-ink-lang="cn" className="ink-char">
              {ch}
            </span>
          ))}
          <span
            aria-hidden
            className={cn(
              "caret transition-opacity duration-300",
              finished ? "opacity-100" : "opacity-0",
            )}
          />
        </p>

        <div
          className={cn(
            "mt-11 flex flex-col items-center justify-center gap-3 transition-all duration-500 ease-[var(--ease-out-strong)]",
            finished ? "translate-y-0 opacity-100" : "translate-y-2 opacity-60 hover:opacity-100",
          )}
        >
          <button
            type="button"
            onClick={dismiss}
            className="btn-apple group inline-flex h-11 items-center gap-2 rounded-full px-7 text-[15px] font-medium"
          >
            开始探索
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
          <span
            className={cn(
              "text-ink-3 text-[12px] transition-opacity duration-500",
              finished ? "opacity-75" : "opacity-0",
            )}
          >
            按 Enter 或向下滚动进入
          </span>
        </div>
      </div>
    </div>
  )
}
