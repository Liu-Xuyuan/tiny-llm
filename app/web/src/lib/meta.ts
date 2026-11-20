// 界面展示用的辅助元数据：模型规模色标 + 对比图中文标题映射（新增未知图片时自动回退到文件名）

export type ModelBadge = {
  tag: string
  dot: string
  pill: string
  bar: string
}

const MODEL_STYLES: Record<string, ModelBadge> = {
  s10m: {
    tag: "0.01B",
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
    bar: "from-emerald-400 to-teal-500",
  },
  s50m: {
    tag: "0.05B",
    dot: "bg-indigo-500",
    pill: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 ring-indigo-500/25",
    bar: "from-indigo-400 to-sky-500",
  },
  s100m: {
    tag: "0.10B",
    dot: "bg-[#0071e3] dark:bg-[#2997ff]",
    pill: "bg-[#0071e3]/12 text-[#0071e3] dark:text-[#2997ff] ring-[#0071e3]/25",
    bar: "from-[#0071e3] to-[#5e5ce6]",
  },
}

const DEFAULT_BADGE: ModelBadge = {
  tag: "LLM",
  dot: "bg-sky-500",
  pill: "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/25",
  bar: "from-sky-400 to-indigo-500",
}

/** 按 run 名或 checkpoint 路径匹配对应的模型规模色标 */
export function getModelBadge(name: string): ModelBadge {
  const lower = name.toLowerCase()
  if (lower.includes("s100m")) return MODEL_STYLES.s100m
  if (lower.includes("s50m")) return MODEL_STYLES.s50m
  if (lower.includes("s10m")) return MODEL_STYLES.s10m
  return DEFAULT_BADGE
}

export type FigureMeta = { title: string; subtitle: string }

const FIGURE_META: Record<string, FigureMeta> = {
  "scaling.png": {
    title: "规模扩展曲线（Scaling Law）",
    subtitle: "参数量从 10M 到 100M 的验证集 loss 变化趋势",
  },
  "train_val_gap.png": {
    title: "训练与验证损失差（Train / Val Gap）",
    subtitle: "观察各规模模型的泛化能力与过拟合程度",
  },
  "val_overlay_tokens.png": {
    title: "验证集 Loss 叠图（按 Token 数）",
    subtitle: "相同已训练 token 预算下，不同规模模型的收敛效率对比",
  },
  "val_overlay_time.png": {
    title: "验证集 Loss 叠图（按训练时长）",
    subtitle: "云端 RTX 5090 实际挂钟时间与损失下降的关系",
  },
  "val_smollm_overlay.png": {
    title: "SmolLM 验证集对比",
    subtitle: "科普与说明文语料上的验证损失曲线",
  },
  "val_tinystories_overlay.png": {
    title: "TinyStories 验证集对比",
    subtitle: "英文短篇故事语料上的验证损失曲线",
  },
}

/** 根据对比图文件名返回中文标题；后续新增实验图未登记时回退为文件名 */
export function getFigureMeta(filename: string): FigureMeta {
  return FIGURE_META[filename] ?? {
    title: filename.replace(/\.png$/i, "").replace(/[_-]+/g, " "),
    subtitle: "实验结果对比图",
  }
}

// 正式训练 run 的核心指标摘要（数字与 docs/figures/results.md、bpb.md 严格一致；未知新 run 自动隐藏）
const RUN_SUMMARY: Record<string, string[]> = {
  s10m: ["13.99M 参数", "0.30B tokens", "Val 3.098", "困惑度 22.2", "4.6 min (RTX 5090)"],
  s50m: ["54.81M 参数", "1.00B tokens", "Val 2.543", "困惑度 12.7", "45.2 min (RTX 5090)"],
  s100m: ["105.92M 参数", "1.50B tokens", "Val 2.409", "困惑度 11.1", "115.9 min (RTX 5090)"],
  s10m_char: ["实验 C · 字符级分词对照", "词表 336", "SmolLM bpb 1.602", "TinyStories bpb 0.929"],
}

export function getRunSummary(run: string | null): string[] | null {
  return run ? (RUN_SUMMARY[run] ?? null) : null
}
