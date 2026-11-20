// 提示词输入区：基于标准 shadcn/ui Card + Button 构建
import { ArrowUp, Square, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
    <div className="space-y-3">
      <Card className="focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-shadow">
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
            className="typo-editorial text-ink placeholder:text-muted-foreground block w-full resize-none bg-transparent pt-4 pr-11 pl-4 text-[17px] leading-relaxed outline-none placeholder:italic"
          />
          {value && !running && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onChange("")}
              title="清空输入"
              className="absolute top-3.5 right-3.5 size-7"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pt-1.5 pb-3.5">
          <span className="text-muted-foreground text-[12px]">Enter 生成 · Shift+Enter 换行</span>
          <Button
            variant={running ? "destructive" : "default"}
            size="sm"
            onClick={running ? onStop : onSubmit}
            disabled={!running && !value.trim()}
            className="h-8.5 px-4"
          >
            {running ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-3.5" />}
            {running ? "停止" : submitLabel}
          </Button>
        </div>
      </Card>

      {examples.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {examples.map((ex) => {
            const selected = value.trim() === ex
            return (
              <Button
                key={ex}
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(ex)}
                className={cn("h-7.5 px-3 text-[12px]", !selected && "font-normal")}
              >
                {ex}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
