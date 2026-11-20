// 区块 03–05：Loss 曲线（含深色适配）、对比图画廊（中文标题 + 键盘灯箱）、Tech Specs 结果表
import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { ChevronLeft, ChevronRight, Contrast } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { api, type ResultTable } from "@/lib/api"
import { getFigureMeta, getRunSummary } from "@/lib/meta"
import { Section } from "@/components/Section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

// 暗色适配 ↔ 白底原图：使用 360ms 光学交叉淡入淡出（避免 CSS hue-rotate 过渡产生的彩虹偏色与灰底）
function runChartFade(fn: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const doc = document as ViewTransitionDoc
  if (!reduced && typeof doc.startViewTransition === "function") {
    document.documentElement.dataset.vt = "fade"
    const vt = doc.startViewTransition(() => flushSync(fn))
    vt.finished
      .finally(() => {
        if (document.documentElement.dataset.vt === "fade") {
          delete document.documentElement.dataset.vt
        }
      })
      .catch(() => {})
    return
  }
  fn()
}

// 深色模式下提供一键“暗色适配 / 白底原图”切换，浅色模式下自动隐藏
function ChartModeToggle({ adaptDark, onToggle }: { adaptDark: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant={adaptDark ? "secondary" : "outline"}
      size="sm"
      onClick={() => runChartFade(onToggle)}
      title="切换深色模式下的图表色彩适配"
      className={cn(
        "hidden h-8 px-3 text-[12px] dark:inline-flex",
        adaptDark && "text-brand",
      )}
    >
      <Contrast
        className="size-3.5 transition-transform duration-300"
        style={{ transform: adaptDark ? "rotate(0deg)" : "rotate(180deg)" }}
      />
      {adaptDark ? "暗色适配" : "白底原图"}
    </Button>
  )
}

export function CurveSection({ index }: { index: number }) {
  const [runs, setRuns] = useState<string[]>([])
  const [run, setRun] = useState<string | null>(null)
  const [adaptDark, setAdaptDark] = useState(true)

  useEffect(() => {
    api.runs().then((r) => { setRuns(r); setRun(r.includes("s100m") ? "s100m" : (r[0] ?? null)) }).catch(console.error)
  }, [])

  const runSummary = getRunSummary(run)

  return (
    <Section
      id="curve"
      index={index}
      eyebrow="Convergence"
      title="Loss 曲线"
      desc="左图按训练步数（step），右图按已训练 token 数量展示收敛轨迹。"
      aside={
        <div className="flex flex-wrap items-center gap-2.5">
          <ChartModeToggle adaptDark={adaptDark} onToggle={() => setAdaptDark((v) => !v)} />
          {runs.length > 0 && run && (
            <Tabs value={run} onValueChange={setRun}>
              <TabsList>
                {runs.map((r) => (
                  <TabsTrigger key={r} value={r} className="typo-num">
                    {r}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
      }
    >
      <Card className="overflow-hidden p-4 sm:p-6">
        {runSummary && (
          <div
            key={run}
            className="stat-pop border-border typo-num mb-4 flex flex-wrap items-center gap-2 border-b pb-3.5 text-[12px]"
          >
            <span className="text-ink mr-1 text-[13px] font-semibold tracking-[-0.01em]">{run}</span>
            {runSummary.map((item) => (
              <Badge key={item} variant="secondary" className="typo-num font-normal">
                {item}
              </Badge>
            ))}
          </div>
        )}
        {/* 所有实验的 Loss 曲线同尺寸叠放并预加载，切换时平滑交叉淡入淡出与微缩放 */}
        <div
          className={cn(
            "relative grid aspect-[8/3] overflow-hidden rounded-lg transition-colors duration-200",
            adaptDark ? "bg-surface dark:bg-[#141416]" : "bg-white",
          )}
        >
          {runs.map((r) => {
            const isActive = r === run
            return (
              <img
                key={r}
                src={`/api/runs/${encodeURIComponent(r)}/curve`}
                alt={`${r} loss 曲线`}
                aria-hidden={!isActive}
                className={cn(
                  "col-start-1 row-start-1 h-full w-full object-contain transition-[opacity,transform] duration-500 ease-[var(--ease-out-strong)]",
                  adaptDark && "chart-paper chart-adaptive",
                  isActive ? "z-10 scale-100 opacity-100" : "pointer-events-none z-0 scale-[0.985] opacity-0",
                )}
              />
            )
          })}
        </div>
      </Card>
    </Section>
  )
}

export function FiguresSection({ index }: { index: number }) {
  const [figures, setFigures] = useState<string[]>([])
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [adaptDark, setAdaptDark] = useState(true)

  useEffect(() => { api.figures().then(setFigures).catch(console.error) }, [])

  useEffect(() => {
    if (activeIdx === null || figures.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setActiveIdx((i) => (i === null ? null : (i - 1 + figures.length) % figures.length))
      if (e.key === "ArrowRight") setActiveIdx((i) => (i === null ? null : (i + 1) % figures.length))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeIdx, figures.length])

  const activeFile = activeIdx !== null ? figures[activeIdx] : null
  const activeMeta = activeFile ? getFigureMeta(activeFile) : null

  return (
    <Section
      id="figures"
      index={index}
      eyebrow="Visualization"
      title="对比图"
      desc="模型规模扩展与多数据源验证集上的实验可视化，点击任意卡片放大浏览。"
      aside={<ChartModeToggle adaptDark={adaptDark} onToggle={() => setAdaptDark((v) => !v)} />}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {figures.map((f, i) => {
          const meta = getFigureMeta(f)
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActiveIdx(i)}
              className="bg-card border-border hover:border-line-strong group overflow-hidden rounded-xl border text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
            >
              <div className={cn("overflow-hidden p-3.5 transition-colors", adaptDark ? "bg-surface dark:bg-[#141416]" : "bg-white")}>
                <img
                  src={`/figures/${f}`}
                  alt={meta.title}
                  loading="lazy"
                  className={cn("aspect-[4/3] w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]", adaptDark && "chart-paper chart-adaptive")}
                />
              </div>
              <div className="border-border border-t px-4 py-3.5">
                <div className="text-ink group-hover:text-brand text-[14.5px] font-semibold tracking-[-0.01em] transition-colors">
                  {meta.title}
                </div>
                <div className="text-muted-foreground mt-1 line-clamp-1 text-[12px]">{meta.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 学术画廊全屏灯箱 */}
      <Dialog open={activeIdx !== null} onOpenChange={(open) => { if (!open) setActiveIdx(null) }}>
        <DialogContent className="liquid-modal rounded-[16px] p-6 sm:max-w-4xl sm:p-7">
          {activeFile && activeMeta && activeIdx !== null && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                <div>
                  <DialogTitle className="typo-display text-ink text-[20px] font-semibold tracking-[-0.02em]">{activeMeta.title}</DialogTitle>
                  <p className="text-ink-3 mt-1 text-[13px]">{activeMeta.subtitle}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <ChartModeToggle adaptDark={adaptDark} onToggle={() => setAdaptDark((v) => !v)} />
                  <span className="liquid-pill typo-num text-ink-2 rounded-[8px] px-3 py-1 text-[12px] font-medium">
                    {activeIdx + 1} / {figures.length}
                  </span>
                </div>
              </div>
              <div className={cn("relative mt-2 overflow-hidden rounded-[10px] px-14 py-4", adaptDark ? "bg-surface dark:bg-[#141416]" : "bg-white")}>
                <img
                  key={activeFile}
                  src={`/figures/${activeFile}`}
                  alt={activeMeta.title}
                  className={cn("img-fade max-h-[68vh] w-full object-contain", adaptDark && "chart-paper chart-adaptive")}
                />
                {figures.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="上一张"
                      onClick={() => setActiveIdx((activeIdx - 1 + figures.length) % figures.length)}
                      className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded-full"
                    >
                      <ChevronLeft className="size-4.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="下一张"
                      onClick={() => setActiveIdx((activeIdx + 1) % figures.length)}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full"
                    >
                      <ChevronRight className="size-4.5" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  )
}

export function ResultsSection({ index }: { index: number }) {
  const [tables, setTables] = useState<ResultTable[]>([])
  useEffect(() => { api.results().then(setTables).catch(console.error) }, [])

  return (
    <Section id="results" index={index} eyebrow="Benchmarks" title="结果表" desc="实验 A（模型规模对比）与实验 C（字符级 vs BPE 分词）的完整评测数据。">
      <div className="space-y-6">
        {tables.map((t) => (
          <Card key={t.title} className="overflow-hidden p-6 sm:p-7">
            <h3 className="text-ink mb-4 text-[17px] font-semibold tracking-[-0.015em]">{t.title}</h3>
            <div className="md-table overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.markdown}</ReactMarkdown>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  )
}

type LabTab = "curve" | "figures" | "results"

// 一体化实验数据看板：使用标准 Radix Tabs 子标签页切换
export function LabView() {
  const [tab, setTab] = useState<LabTab>("curve")

  return (
    <div className="apple-scroll flex-1 overflow-y-auto">
      <div className="border-border bg-card/75 sticky top-0 z-10 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-2.5 sm:px-8">
          <div className="flex items-center gap-2">
            <Badge variant="outline">实验数据</Badge>
            <span className="text-muted-foreground text-[12.5px]">训练收敛与对照评测档案</span>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as LabTab)}>
            <TabsList>
              <TabsTrigger value="curve">Loss 曲线</TabsTrigger>
              <TabsTrigger value="figures">对比图画廊</TabsTrigger>
              <TabsTrigger value="results">完整结果表</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div key={tab}>
        {tab === "curve" && <CurveSection index={0} />}
        {tab === "figures" && <FiguresSection index={1} />}
        {tab === "results" && <ResultsSection index={2} />}
      </div>
    </div>
  )
}
