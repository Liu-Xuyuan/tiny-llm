// 应用主壳：基于 shadcn/ui + Radix UI 元件库构建（Tabs / Button / Badge / Tooltip / Segmented）
import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Moon, PanelLeft, Play, SlidersHorizontal, Sun } from "lucide-react"

import { api, type Checkpoints } from "@/lib/api"
import { IntroSplash } from "@/components/IntroSplash"
import { Segmented } from "@/components/Segmented"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CompareSection } from "@/sections/CompareSection"
import { StudioView } from "@/sections/StudioView"
import { LabView } from "@/sections/TrainingSections"
import { cn } from "@/lib/utils"

type AppMode = "studio" | "compare" | "lab"

type Theme = "light" | "dark"
type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

function useTheme(): [Theme, (t: Theme, originEl?: HTMLElement | null) => void] {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("theme-v2")
      if (saved === "light" || saved === "dark") return saved
    } catch { /* 忽略 */ }
    return "light"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try { localStorage.setItem("theme-v2", theme) } catch { /* 忽略 */ }
  }, [theme])

  const switchTheme = useCallback(
    (next: Theme, originEl?: HTMLElement | null) => {
      if (next === theme) return

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const doc = document as ViewTransitionDoc

      const apply = () => {
        flushSync(() => setThemeState(next))
        document.documentElement.classList.toggle("dark", next === "dark")
        try { localStorage.setItem("theme-v2", next) } catch { /* 忽略 */ }
      }

      if (!reduced && typeof doc.startViewTransition === "function") {
        const rect = originEl?.getBoundingClientRect()
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 48
        const y = rect ? rect.top + rect.height / 2 : 28
        const endRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        )

        document.documentElement.dataset.vt = "ripple"
        const vt = doc.startViewTransition(apply)
        vt.ready
          .then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 540,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                pseudoElement: "::view-transition-new(root)",
              },
            )
          })
          .catch(() => {})
        vt.finished
          .finally(() => {
            if (document.documentElement.dataset.vt === "ripple") {
              delete document.documentElement.dataset.vt
            }
          })
          .catch(() => {})
        return
      }

      if (!reduced) {
        document.documentElement.classList.add("theme-transitioning")
        window.setTimeout(() => document.documentElement.classList.remove("theme-transitioning"), 360)
      }
      setThemeState(next)
    },
    [theme],
  )

  return [theme, switchTheme]
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const themeToggleRef = useRef<HTMLDivElement>(null)
  const [introState, setIntroState] = useState<"open" | "exiting" | "closed">("open")
  const [mode, setMode] = useState<AppMode>("studio")
  const [ckpts, setCkpts] = useState<Checkpoints | null>(null)
  const [error, setError] = useState("")

  const [historyOpen, setHistoryOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1180 : true,
  )
  const [inspectorOpen, setInspectorOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  )

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

      <div
        className="bg-page flex h-dvh flex-col overflow-hidden"
        style={
          introState === "closed"
            ? undefined
            : {
                transform: introState === "open" ? "translate3d(0, 24px, 0) scale(0.988)" : "translate3d(0, 0, 0) scale(1)",
                opacity: introState === "open" ? 0.45 : 1,
                transition: "transform 820ms cubic-bezier(0.22, 1, 0.36, 1), opacity 680ms ease",
              }
        }
      >
        {/* 顶栏：标准 Radix Tabs 切换 + shadcn Button / Badge 控件 */}
        <header className="editorial-masthead z-40 shrink-0">
          <div className="flex h-[54px] items-center justify-between gap-2 px-3.5 sm:px-5">
            <div className="flex shrink-0 items-center gap-2">
              {mode === "studio" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={historyOpen ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => setHistoryOpen((v) => !v)}
                      aria-label={historyOpen ? "收起手稿历史" : "展开手稿历史"}
                    >
                      <PanelLeft className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{historyOpen ? "收起手稿记录" : "展开手稿记录"}</TooltipContent>
                </Tooltip>
              )}

              <button
                type="button"
                onClick={() => setMode("studio")}
                className="flex items-center gap-2 px-1 text-left transition-opacity hover:opacity-80"
              >
                <span className="typo-display text-[17px] tracking-[-0.025em] whitespace-nowrap">
                  <span className="text-ink font-semibold">Tiny</span>
                  <span className="text-ink-3 ml-1 font-normal">LLM</span>
                </span>
              </button>

              {ckpts && !error && (
                <>
                  <Separator orientation="vertical" className="hidden h-4 md:block" />
                  <Badge variant="outline" className="typo-num hidden gap-1.5 font-normal xl:inline-flex">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {ckpts.items.length} 个模型就绪
                  </Badge>
                </>
              )}
            </div>

            {/* 中央：标准 Radix Tabs 模式切换 */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as AppMode)}>
              <TabsList>
                <TabsTrigger value="studio">手稿创作</TabsTrigger>
                <TabsTrigger value="compare">三模型对比</TabsTrigger>
                <TabsTrigger value="lab">实验数据</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 右侧：标准 Button 控件组 + 浅深切换 */}
            <div className="flex shrink-0 items-center gap-1.5">
              {mode === "studio" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={inspectorOpen ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => setInspectorOpen((v) => !v)}
                      aria-label={inspectorOpen ? "收起参数与采样原理" : "展开参数与采样原理"}
                    >
                      <SlidersHorizontal className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{inspectorOpen ? "收起采样控制" : "展开采样控制"}</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIntroState("open")}
                    aria-label="重播开场动画"
                  >
                    <Play className="size-3.5 translate-x-[0.5px] fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>重播开场动画</TooltipContent>
              </Tooltip>

              <div ref={themeToggleRef}>
                <Segmented
                  size="sm"
                  value={theme}
                  onChange={(t) => setTheme(t, themeToggleRef.current)}
                  options={[
                    { value: "light", label: <Sun className="size-3.5" />, title: "浅色外观" },
                    { value: "dark", label: <Moon className="size-3.5" />, title: "深色外观" },
                  ]}
                />
              </div>
            </div>
          </div>
        </header>

        {/* 主工作区 */}
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={cn("min-h-0 flex-1 flex-col", mode === "studio" ? "flex" : "hidden")}>
            <StudioView
              ckpts={ckpts}
              error={error}
              reload={loadCkpts}
              historyOpen={historyOpen}
              onCloseHistory={() => setHistoryOpen(false)}
              inspectorOpen={inspectorOpen}
              onToggleInspector={() => setInspectorOpen((v) => !v)}
              onCloseInspector={() => setInspectorOpen(false)}
              onOpenLab={() => setMode("lab")}
            />
          </div>

          {mode === "compare" && (
            <div className="apple-scroll min-h-0 flex-1 overflow-y-auto">
              <CompareSection index={0} examples={ckpts?.examples ?? []} />
            </div>
          )}

          {mode === "lab" && <LabView />}
        </main>
      </div>
    </TooltipProvider>
  )
}
