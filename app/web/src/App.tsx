// 页面骨架（Apple.com 旗舰产品页架构）：
// 顶部吸顶毛玻璃导航栏 + 全幅居中大留白 Hero 首屏 + 五个纯白/浅灰交替铺底的实验章节 + 极简页脚
import { useCallback, useEffect, useState } from "react"
import { ChevronRight, Moon, Play, Sun } from "lucide-react"

import { api, type Checkpoints } from "@/lib/api"
import { useScrollProgress } from "@/lib/motion"
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
  const [showIntro, setShowIntro] = useState(true)
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
      {showIntro && <IntroSplash onDone={() => setShowIntro(false)} />}

      {/* 顶部 Apple 毛玻璃吸顶导航栏 + 底部 2px 实时阅读进度微光线 */}
      <header className="apple-nav border-line sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-[52px] max-w-[1120px] items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#" className="group flex items-center gap-2.5">
            <span className="text-ink text-[16px] font-semibold tracking-[-0.02em] transition-opacity group-hover:opacity-75">Tiny LLM</span>
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

          <GlideNav items={NAV} ready={ckpts !== null} />

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowIntro(true)}
                  aria-label="重播开场动画"
                  className="bg-field text-ink-3 hover:text-ink flex size-7.5 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
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
        {/* GPU 合成层驱动的平滑滚动进度细线 */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
          <div
            className="h-full w-full origin-left bg-gradient-to-r from-[#0071e3] via-[#5e5ce6] to-[#c946b8] transition-opacity duration-300 dark:from-[#40a5ff] dark:via-[#8b89ff] dark:to-[#f472b6]"
            style={{
              transform: `scaleX(${scrollProgress})`,
              opacity: scrollProgress > 0.005 ? 0.9 : 0,
            }}
          />
        </div>
      </header>

      <main className="bg-page min-h-screen">
        {/* Apple 旗舰产品页风格 Hero 首屏 + 柔和漂移氛围光晕 */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
            <div
              className="ambient-orb absolute -top-24 left-[22%] h-[320px] w-[420px] rounded-full blur-[110px]"
              style={{ background: "var(--ambient-1)" }}
            />
            <div
              className="ambient-orb-delayed absolute top-6 right-[20%] h-[280px] w-[380px] rounded-full blur-[110px]"
              style={{ background: "var(--ambient-2)" }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-[1120px] px-5 pt-20 pb-16 text-center sm:px-8 sm:pt-28 sm:pb-24">
            <p className="reveal text-ink-3 text-[13px] font-semibold tracking-[0.04em]">
              上海交通大学 · 计算机科学导论 · Topic B03
            </p>
            <h1
              className="reveal text-ink mx-auto mt-4 max-w-3xl text-[38px] leading-[1.08] font-semibold tracking-[-0.038em] text-balance sm:text-[62px]"
              style={{ animationDelay: "60ms" }}
            >
              从零训练的
              <br />
              <span className="apple-ai-text">迷你语言模型</span>
            </h1>
            <p
              className="reveal text-ink-3 mx-auto mt-6 max-w-2xl text-[17px] leading-[1.55] font-normal tracking-[-0.012em] text-pretty sm:text-[21px]"
              style={{ animationDelay: "120ms" }}
            >
              手写 Decoder-only Transformer，用 next-token prediction 完整实现预训练、自回归生成与多规模对照实验。
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
                className="group text-brand inline-flex items-center gap-0.5 px-2 text-[15px] font-medium underline-offset-4 hover:underline"
              >
                查看评测数据
                <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* 极简四列核心参数一览 */}
            <dl
              className="reveal border-line mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-y-6 border-t pt-10 sm:grid-cols-4"
              style={{ animationDelay: "240ms" }}
            >
              {HERO_SPECS.map(([val, label]) => (
                <div key={label} className="rounded-xl px-2 py-1 transition-transform duration-300 ease-[var(--ease-out-strong)] hover:-translate-y-0.5">
                  <dt className="text-ink text-[15px] font-semibold tracking-[-0.015em] whitespace-nowrap sm:text-[17px]">{val}</dt>
                  <dd className="text-ink-3 mt-1 text-[12px]">{label}</dd>
                </div>
              ))}
            </dl>

            {error && (
              <div className="bg-destructive/10 text-destructive mx-auto mt-8 max-w-xl rounded-2xl px-4 py-3 text-[13px]">
                连不上后端服务：{error}
              </div>
            )}
          </div>
        </section>

        {/* 五个纯白 / 浅灰交替铺陈的功能章节 */}
        {ckpts && <GenerateSection index={0} ckpts={ckpts} reload={loadCkpts} />}
        <CompareSection index={1} examples={ckpts?.examples ?? []} />
        <CurveSection index={2} />
        <FiguresSection index={3} />
        <ResultsSection index={4} />
      </main>

      {/* Apple 极简页脚 */}
      <footer className="bg-surface-alt border-line border-t py-10">
        <div className="text-ink-3 mx-auto flex max-w-[1120px] flex-col justify-between gap-2 px-5 text-[12px] sm:flex-row sm:items-center sm:px-8">
          <span>上海交通大学 计算机科学导论 · B03 从零训练一个迷你语言模型</span>
          <span>Decoder-only Transformer · Built from scratch</span>
        </div>
      </footer>
    </TooltipProvider>
  )
}
