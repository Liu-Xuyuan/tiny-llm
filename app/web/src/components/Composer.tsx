// Apple 风格输入框：大圆角纯净卡片 + 经典苹果蓝主胶囊按钮 + 柔和示例胶囊
import { ArrowUp, Square, X } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop: () => void
  running: boolean
  examples: string[]
  submitLabel?: string
  rows?: number
}

export function Composer({ value, onChange, onSubmit, onStop, running, examples, submitLabel = "生成", rows = 2 }: Props) {
  return (
    <div className="space-y-3.5">
      <div className="apple-card focus-within:ring-2 focus-within:ring-brand/35 rounded-[22px] transition-shadow duration-200">
        <div className="relative">
          <textarea
            value={value}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入英文开头，例如 Once upon a time"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (!running && value.trim()) onSubmit()
              }
            }}
            className="text-ink placeholder:text-ink-3 block w-full resize-none bg-transparent pt-5 pr-11 pl-5 text-[16px] leading-relaxed outline-none"
          />
          {value && !running && (
            <button
              type="button"
              onClick={() => onChange("")}
              title="清空输入"
              className="text-ink-3 hover:bg-field hover:text-ink absolute top-4 right-4 flex size-7 items-center justify-center rounded-full transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-4">
          <span className="text-ink-3 text-[12px]">Enter 生成 · Shift+Enter 换行</span>
          <button
            type="button"
            onClick={running ? onStop : onSubmit}
            disabled={!running && !value.trim()}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-4.5 text-[13.5px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-35",
              running
                ? "bg-destructive/12 text-destructive hover:bg-destructive/18 active:scale-[0.97]"
                : "btn-apple",
            )}
          >
            {running ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-4" />}
            {running ? "停止" : submitLabel}
          </button>
        </div>
      </div>

      {examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {examples.map((ex) => {
            const selected = value.trim() === ex
            return (
              <button
                key={ex}
                type="button"
                onClick={() => onChange(ex)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-[12.5px] transition-all duration-150 active:scale-[0.97]",
                  selected
                    ? "bg-brand text-white font-medium"
                    : "bg-surface text-ink-2 hover:bg-hover hover:text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-field",
                )}
              >
                {ex}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
