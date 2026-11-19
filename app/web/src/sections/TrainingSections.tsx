// 区块 03–05：Loss 曲线（含深色适配）、对比图画廊（中文标题 + 键盘灯箱）、Tech Specs 结果表
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Contrast } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { api, type ResultTable } from "@/lib/api"
import { getFigureMeta } from "@/lib/meta"
import { Section } from "@/components/Section"
import { Segmented } from "@/components/Segmented"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// 深色模式下提供一键“暗色适配 / 白底原图”切换，浅色模式下自动隐藏
function ChartModeToggle({ adaptDark, onToggle }: { adaptDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="切换深色模式下的图表色彩适配"
      className={cn(
        "hidden h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium transition-colors dark:inline-flex",
        adaptDark ? "bg-brand-soft text-brand" : "bg-field text-ink-2 hover:text-ink",
      )}
    >
      <Contrast className="size-3.5" />
      {adaptDark ? "暗色适配" : "白底原图"}
    </button>
  )
}

export function CurveSection({ index }: { index: number }) {
  const [runs, setRuns] = useState<string[]>([])
  const [run, setRun] = useState<string | null>(null)
  const [adaptDark, setAdaptDark] = useState(true)

  useEffect(() => {
    api.runs().then((r) => { setRuns(r); setRun(r.includes("s100m") ? "s100m" : (r[0] ?? null)) }).catch(console.error)
  }, [])

  return (
    <Section
      id="curve"
      index={index}
      title="Loss 曲线"
      desc="左图按训练步数（step），右图按已训练 token 数量展示收敛轨迹。"
      aside={
        <div className="flex flex-wrap items-center gap-2.5">
          <ChartModeToggle adaptDark={adaptDark} onToggle={() => setAdaptDark((v) => !v)} />
          {runs.length > 0 && (
            <Segmented size="md" value={run} onChange={setRun} options={runs.map((r) => ({ value: r, label: r }))} />
          )}
        </div>
      }
    >
      <div className="apple-card overflow-hidden rounded-[24px] p-4 sm:p-6">
        <div className={cn("overflow-hidden rounded-[16px] transition-colors duration-200", adaptDark ? "bg-white dark:bg-[#141416]" : "bg-white")}>
          {run && (
            <img
              key={run}
              src={`/api/runs/${encodeURIComponent(run)}/curve`}
              alt={`${run} loss 曲线`}
              className={cn("img-fade w-full", adaptDark && "chart-adaptive")}
            />
          )}
        </div>
      </div>
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
              className="bg-surface-alt group overflow-hidden rounded-[22px] text-left transition-transform duration-300 ease-[var(--ease-out-strong)] hover:-translate-y-1 active:scale-[0.99] dark:bg-surface"
            >
              <div className={cn("overflow-hidden p-3.5 transition-colors", adaptDark ? "bg-white dark:bg-[#141416]" : "bg-white")}>
                <img
                  src={`/figures/${f}`}
                  alt={meta.title}
                  loading="lazy"
                  className={cn("aspect-[4/3] w-full object-contain transition-transform duration-500 ease-[var(--ease-out-strong)] group-hover:scale-[1.03]", adaptDark && "chart-adaptive")}
                />
              </div>
              <div className="px-5 py-4">
                <div className="text-ink group-hover:text-brand text-[14.5px] font-semibold tracking-[-0.01em] transition-colors">
                  {meta.title}
                </div>
                <div className="text-ink-3 mt-1 line-clamp-1 text-[12.5px]">{meta.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Apple 极简全屏灯箱 */}
      <Dialog open={activeIdx !== null} onOpenChange={(open) => { if (!open) setActiveIdx(null) }}>
        <DialogContent className="shadow-overlay rounded-[24px] border-0 p-6 sm:max-w-4xl sm:p-7">
          {activeFile && activeMeta && activeIdx !== null && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                <div>
                  <DialogTitle className="text-ink text-[18px] font-semibold tracking-[-0.02em]">{activeMeta.title}</DialogTitle>
                  <p className="text-ink-3 mt-1 text-[13px]">{activeMeta.subtitle}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <ChartModeToggle adaptDark={adaptDark} onToggle={() => setAdaptDark((v) => !v)} />
                  <span className="bg-field text-ink-2 rounded-full px-3 py-1 font-mono text-[12px] tabular-nums">
                    {activeIdx + 1} / {figures.length}
                  </span>
                </div>
              </div>
              <div className={cn("relative mt-2 overflow-hidden rounded-[18px] px-14 py-4", adaptDark ? "bg-white dark:bg-[#141416]" : "bg-white")}>
                <img
                  key={activeFile}
                  src={`/figures/${activeFile}`}
                  alt={activeMeta.title}
                  className={cn("img-fade max-h-[68vh] w-full object-contain", adaptDark && "chart-adaptive")}
                />
                {figures.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="上一张"
                      onClick={() => setActiveIdx((activeIdx - 1 + figures.length) % figures.length)}
                      className="apple-nav text-ink hover:text-brand absolute top-1/2 left-2.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
                    >
                      <ChevronLeft className="size-4.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="下一张"
                      onClick={() => setActiveIdx((activeIdx + 1) % figures.length)}
                      className="apple-nav text-ink hover:text-brand absolute top-1/2 right-2.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95"
                    >
                      <ChevronRight className="size-4.5" />
                    </button>
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
    <Section id="results" index={index} title="结果表" desc="实验 A（模型规模对比）与实验 C（字符级 vs BPE 分词）的完整评测数据。">
      <div className="space-y-6">
        {tables.map((t) => (
          <div key={t.title} className="apple-card overflow-hidden rounded-[22px] p-6 sm:p-7">
            <h3 className="text-ink mb-4 text-[17px] font-semibold tracking-[-0.015em]">{t.title}</h3>
            <div className="md-table overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.markdown}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
