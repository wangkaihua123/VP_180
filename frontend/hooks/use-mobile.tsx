/**
 * 移动设备检测钩子
 * 
 * 该钩子用于检测当前设备是否为移动设备（基于屏幕宽度）：
 * - 定义了768px作为移动设备的断点
 * - 返回一个布尔值，表示当前设备是否是移动设备
 * - 自动响应窗口大小变化事件，实时更新状态
 * - 用于在应用程序中实现响应式布局和条件渲染
 * 
 * 使用方法：
 * const isMobile = useIsMobile()
 * if (isMobile) { ... } else { ... }
 */
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
