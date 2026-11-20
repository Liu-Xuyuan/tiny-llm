// 等待第一个 token 时显示：3×3 像素点阵 + 扫光文字 + 已等待时间
import { useEffect, useState } from "react"

// 每个点的亮起延迟（ms），错开后看起来像在"流动"
const DELAYS = [90, 180, 270, 0, 90, 180, 90, 180, 270]

export function PixelLoader({ label = "生成中" }: { label?: string }) {
  const [t0] = useState(() => performance.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed((performance.now() - t0) / 1000), 100)
    return () => clearInterval(id)
  }, [t0])

  return (
    <div role="status" className="flex w-fit items-center gap-2.5">
      <span aria-hidden className="grid grid-cols-[repeat(3,4.5px)] gap-[2px]">
        {DELAYS.map((d, i) => <span key={i} className="pixel bg-brand size-[4.5px] rounded-[1.5px]" style={{ animationDelay: `${d}ms` }} />)}
      </span>
      <span className="shimmer text-[13px] font-medium">{label}</span>
      <span className="typo-num text-ink-3 text-[12.5px]">{elapsed.toFixed(1)}s</span>
    </div>
  )
}
