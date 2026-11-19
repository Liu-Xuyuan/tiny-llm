// 模型核心规格条（Apple Tech Specs 大数字风格）：去掉多余小图标，靠清晰字号层级与留白呈现高级感
import { fmtM, type ModelStats as Stats } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export function ModelStats({ stats }: { stats: Stats | null }) {
  const items: [string, string, string][] = stats
    ? [
        ["模型结构", `${stats.n_layer}/${stats.n_embd}/${stats.n_head}`, "层 / 维 / 头"],
        ["总参数量", fmtM(stats.params), `非 emb ${fmtM(stats.params_non_emb)}`],
        ["分词词表", `${stats.vocab_size}`, stats.tokenizer.replace("Tokenizer", "")],
        ["训练 Token", fmtM(stats.tokens, 0), `${stats.iters} 步`],
        ["Val Loss", stats.best_val.toFixed(3), `上下文 ${stats.block_size}`],
      ]
    : []

  return (
    <div className="apple-card divide-line grid grid-cols-2 divide-x divide-y overflow-hidden rounded-[22px] sm:grid-cols-5 sm:divide-y-0">
      {stats
        ? items.map(([k, v, sub]) => (
            <div key={k} className="px-5 py-4 sm:py-5" style={{ animation: "token-in 260ms ease-out both" }}>
              <div className="text-ink-3 text-[12px] font-medium">{k}</div>
              <div className="text-ink mt-1.5 text-[22px] leading-none font-semibold tracking-[-0.025em] tabular-nums">
                {v}
              </div>
              <div className="text-ink-3 mt-1.5 truncate text-[11.5px]">{sub}</div>
            </div>
          ))
        : Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="px-5 py-5">
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ))}
    </div>
  )
}
