import * as React from "react"
import { cn } from "@/lib/utils"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onPointerDown,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  // 只有按住并真正水平拖动超过 4px 时才进入连续阻尼态；点击轨道、键盘调节、切换预设均走完整 650ms 平滑过渡
  const [gliding, setGliding] = React.useState(false)

  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  const handlePointerDown: React.PointerEventHandler<HTMLSpanElement> = (e) => {
    const startX = e.clientX
    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 2) setGliding(true)
    }
    const stop = () => {
      setGliding(false)
      window.removeEventListener("pointermove", onMove)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", stop, { once: true })
    window.addEventListener("pointercancel", stop, { once: true })
    onPointerDown?.(e)
  }

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      onPointerDown={handlePointerDown}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        gliding ? "slider-glide" : "slider-smooth",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-ink/12 data-[orientation=horizontal]:h-[4px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-brand data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="liquid-thumb block size-4 shrink-0 rounded-full transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[var(--ease-spring)] hover:scale-110 active:scale-115 focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
