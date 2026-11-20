// 页面骨架（Apple Liquid Glass 架构）：
// 全局流动珍珠/黑曜柔彩光场 + 顶部悬浮液态玻璃导航岛 + 雕塑级 Hero 首屏 + 五大通透交替章节
import { useCallback, useEffect, useState } from "react"
import { ChevronRight, Moon, Play, Sun } from "lucide-react"

import { api, type Checkpoints } from "@/lib/api"
import { onLiquidMove, useScrollProgress } from "@/lib/motion"
import { GlideNav, type NavItem } from "@/components/GlideNav"
import { IntroSplash } from "@/components/IntroSplash"
import { Segmented } from "@/components/Segmented"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CompareSection } from "@/sections/CompareSection"
import { GenerateSection } from "@/sections/GenerateSection"
import { CurveSection, FiguresSection, ResultsSection } from "@/sections/TrainingSections"

const NAV: NavItem[] = [
  { id: "generate", label: "单模型生成" },
  { id: "compare", label: "三模型对比" },
  { id: "curve", label: "Loss 曲线" },
  { id: "figures", label: "对比图" },
  { id: "results", label: "结果表" },
]

const HERO_SPECS: [string, string][] = [
  ["0.01B – 0.1B", "三种参数规模"],
  ["BPE 8192", "自训练词表"],
  ["512", "上下文窗口"],
  ["SmolLM · TinyStories", "双语料预训练"],
]

type Theme = "light" | "dark"
function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme")
      if (saved === "light" || saved === "dark") return saved
    } catch { /* 忽略 */ }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try { localStorage.setItem("theme", theme) } catch { /* 忽略 */ }
  }, [theme])
  return [theme, setTheme]
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [introState, setIntroState] = useState<"open" | "exiting" | "closed">("open")
  const [ckpts, setCkpts] = useState<Checkpoints | null>(null)
  const [error, setError] = useState("")
  const scrollProgress = useScrollProgress()

  const loadCkpts = useCallback(() => {
    setError("")
    api.checkpoints().then(setCkpts).catch((e) => setError(String(e)))
  }, [])
  useEffect(loadCkpts, [loadCkpts])

  return (
    <TooltipProvider delayDuration={200}>
      {introState !== "closed" && (
        <IntroSplash
          onStartExit={() => setIntroState("exiting")}
          onDone={() => setIntroState("closed")}
        />
      )}

      {/* Apple Studio 棚拍自然中性光影：纯粹无杂色的冷银/黑曜明暗层次，告别廉价彩色渐变坨 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            theme === "dark"
              ? "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255, 255, 255, 0.065), transparent 70%)"
              : "radial-gradient(ellipse 85% 55% at 50% -8%, rgba(255, 255, 255, 0.95), transparent 68%), linear-gradient(180deg, #ffffff 0%, #f5f5f7 42%, #efeff2 100%)",
        }}
      />

      {/* 视口顶边 2px 液态阅读进度细光带（独立于悬浮胶囊岛，不被圆角裁切） */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden">
        <div
          className="h-full w-full origin-left bg-gradient-to-r from-[#0071e3] via-[#5e5ce6] to-[#c946b8] transition-opacity duration-300 dark:from-[#40a5ff] dark:via-[#8b89ff] dark:to-[#f472b6]"
          style={{
            transform: `scaleX(${scrollProgress})`,
            opacity: scrollProgress > 0.005 ? 0.92 : 0,
          }}
        />
      </div>

      {/* 顶部悬浮液态玻璃导航岛（macOS Tahoe / iOS 26 招牌悬浮胶囊岛） */}
      <header className="pointer-events-none sticky top-3 z-40 px-4 sm:px-6">
        <div className="liquid-island pointer-events-auto relative mx-auto flex h-[54px] max-w-[1080px] items-center justify-between gap-4 overflow-hidden rounded-full px-4 sm:px-5">
          <a href="#" className="group relative z-10 flex items-center gap-2.5 pl-1">
            <span className="typo-display text-[16px] tracking-[-0.025em] transition-opacity group-hover:opacity-75">
              <span className="text-ink font-semibold">Tiny</span>
              <span className="text-ink-3 ml-1 font-normal">LLM</span>
            </span>
            {ckpts && !error && (
              <span className="text-ink-3 hidden items-center gap-1.5 text-[11.5px] sm:inline-flex">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-65" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                {ckpts.items.length} 个模型就绪
              </span>
            )}
          </a>

          <div className="relative z-10">
            <GlideNav items={NAV} ready={ckpts !== null} />
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIntroState("open")}
                  aria-label="重播开场动画"
                  className="liquid-pill text-ink-2 hover:text-ink flex size-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Play className="size-3 translate-x-[0.5px] fill-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent>重播开场动画</TooltipContent>
            </Tooltip>

            <Segmented
              size="sm"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: <Sun className="size-3.5" />, title: "浅色外观" },
                { value: "dark", label: <Moon className="size-3.5" />, title: "深色外观" },
              ]}
            />
          </div>
        </div>
      </header>

      <main
        className="relative min-h-screen"
        style={
          introState === "closed"
            ? undefined
            : {
                transform: introState === "open" ? "translate3d(0, 28px, 0) scale(0.985)" : "translate3d(0, 0, 0) scale(1)",
                opacity: introState === "open" ? 0.45 : 1,
                transition: "transform 820ms cubic-bezier(0.22, 1, 0.36, 1), opacity 680ms ease",
              }
        }
      >
        {/* Hero 首屏 */}
        <section className="relative">
          <div className="relative z-10 mx-auto max-w-[1120px] px-5 pt-18 pb-16 text-center sm:px-8 sm:pt-26 sm:pb-24">
            <p className="reveal liquid-pill typo-kicker text-ink-2 mx-auto inline-flex items-center rounded-full px-4 py-1.5">
              SJTU · 计算机科学导论 · Topic B03
            </p>
            <h1
              className="reveal typo-display mx-auto mt-7 max-w-3xl text-[40px] leading-[1.1] tracking-[-0.036em] sm:text-[66px]"
              style={{ animationDelay: "60ms" }}
            >
              <span className="text-ink-2 font-medium tracking-[-0.024em]">从零训练的</span>
              <br />
              <span className="apple-ai-text font-bold tracking-[-0.044em]">迷你语言模型</span>
            </h1>
            <p
              className="reveal text-ink-3 mx-auto mt-6 max-w-[46ch] text-[17px] leading-[1.65] font-normal tracking-[0.005em] text-pretty sm:text-[20px]"
              style={{ animationDelay: "120ms" }}
            >
              手写 Decoder-only Transformer，以 next-token prediction 完整实现预训练、自回归生成与多规模对照实验。
            </p>

            <div
              className="reveal mt-9 flex flex-wrap items-center justify-center gap-4"
              style={{ animationDelay: "180ms" }}
            >
              <a
                href="#generate"
                className="btn-apple inline-flex h-11 items-center rounded-full px-6 text-[15px] font-medium"
              >
                开始体验生成
              </a>
              <a
                href="#results"
                className="liquid-pill group text-ink inline-flex h-11 items-center gap-0.5 rounded-full px-5 text-[14.5px] font-medium transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
              >
                查看评测数据
                <ChevronRight className="size-4 text-brand transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* 液态玻璃四列核心规格条：为第 4 列语料名分配充裕宽度，彻底告别贴边拥挤 */}
            <dl
              onPointerMove={onLiquidMove}
              className="reveal apple-card divide-line mx-auto mt-14 grid max-w-4xl grid-cols-2 divide-x divide-y overflow-hidden rounded-[24px] sm:grid-cols-[1fr_0.9fr_0.8fr_1.45fr] sm:divide-y-0"
              style={{ animationDelay: "240ms" }}
            >
              {HERO_SPECS.map(([val, label]) => (
                <div key={label} className="px-6 py-5 transition-colors duration-200 hover:bg-white/25 dark:hover:bg-white/5">
                  <dt className="typo-display typo-num text-ink text-[15.5px] font-semibold tracking-[-0.02em] whitespace-nowrap sm:text-[17px]">{val}</dt>
                  <dd className="text-ink-3 mt-1.5 text-[12px] tracking-[0.01em]">{label}</dd>
                </div>
              ))}
            </dl>

            {error && (
              <div className="bg-destructive/12 text-destructive mx-auto mt-8 max-w-xl rounded-2xl px-4 py-3 text-[13px] backdrop-blur-md">
                连不上后端服务：{error}
              </div>
            )}
          </div>
        </section>

        {/* 五个通透交替铺陈的实验章节 */}
        {ckpts && <GenerateSection index={0} ckpts={ckpts} reload={loadCkpts} />}
        <CompareSection index={1} examples={ckpts?.examples ?? []} />
        <CurveSection index={2} />
        <FiguresSection index={3} />
        <ResultsSection index={4} />
      </main>

      <footer className="border-line border-t bg-surface-alt py-10 backdrop-blur-md">
        <div className="text-ink-3 mx-auto flex max-w-[1120px] flex-col justify-between gap-2 px-5 text-[12px] sm:flex-row sm:items-center sm:px-8">
          <span>上海交通大学 计算机科学导论 · B03 从零训练一个迷你语言模型</span>
          <span>Decoder-only Transformer · Built from scratch</span>
        </div>
      </footer>
    </TooltipProvider>
  )
}
