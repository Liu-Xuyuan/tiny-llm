// 轻量动效与液态玻璃光学交互 Hook：基于原生浏览器 API，零第三方依赖
import { useEffect, useRef, useState, type PointerEventHandler } from "react"

/** 监听元素是否进入视口（触发一次后保持可见，用于 Apple 产品页风格的滚动渐显） */
export function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.08) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -48px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, visible }
}

/** 零重渲染滚动进度条 Hook：直接通过 rAF 驱动 GPU transform，滚动全程 0 次 React 重渲染 */
export function useScrollProgressRef() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = barRef.current
      if (!el) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      el.style.transform = `scaleX(${p})`
      el.style.opacity = p > 0.005 ? "0.92" : "0"
    }
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return barRef
}

/** 液态玻璃鼠标高光追踪：rAF 合批更新 --mx / --my，避免高频同步重排导致掉帧 */
const liquidRaf = new WeakMap<HTMLElement, number>()
export const onLiquidMove: PointerEventHandler<HTMLElement> = (e) => {
  const el = e.currentTarget
  if (liquidRaf.has(el)) return
  const clientX = e.clientX
  const clientY = e.clientY
  const id = window.requestAnimationFrame(() => {
    liquidRaf.delete(el)
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${clientX - r.left}px`)
    el.style.setProperty("--my", `${clientY - r.top}px`)
  })
  liquidRaf.set(el, id)
}
