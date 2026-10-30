/**
 * useHeading — 读取手机朝向（罗盘弹层与独立罗盘页共用）
 *
 * 读数来源（优先级）：
 *   1. expo-location watchHeadingAsync —— 系统罗盘融合输出：
 *      倾斜补偿 + 磁偏角校正（trueHeading=真北），精度远高于裸磁力计
 *   2. expo-sensors Magnetometer —— 系统罗盘不可用时兜底（磁北，未补偿）
 *   3. 都没有（Web/模拟器）→ source = "none"，由调用方提供手动输入
 */
import { useEffect, useRef, useState } from "react"
import * as Location from "expo-location"
import { Magnetometer } from "expo-sensors"

export type HeadingSource = "ios-true" | "ios-mag" | "magnetometer" | "none"

function computeHeadingFromMag(x: number, y: number): number {
  const radians = Math.atan2(-y, x)
  const degrees = radians * (180 / Math.PI)
  return (degrees - 90 + 360) % 360
}

export function useHeading(active: boolean) {
  const [degree, setDegree] = useState(0)
  const [source, setSource] = useState<HeadingSource | null>(null)
  const [stable, setStable] = useState(false)
  const readingsRef = useRef<number[]>([])

  useEffect(() => {
    if (!active) return
    let mounted = true
    let headingSub: Location.LocationSubscription | null = null
    let magSub: { remove: () => void } | null = null
    readingsRef.current = []
    setStable(false)

    const pushReading = (heading: number) => {
      readingsRef.current = [...readingsRef.current.slice(-2), heading]
      setDegree(heading)
      const r = readingsRef.current
      // 环形稳定判定（避免 359/1 跨界误判不稳）
      if (r.length >= 3) {
        const spread = Math.max(...r.map((a) => Math.min(
          Math.abs(a - r[0]),
          360 - Math.abs(a - r[0]),
        )))
        setStable(spread < 5)
      }
    }

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (mounted && status === "granted") {
          headingSub = await Location.watchHeadingAsync((h) => {
            if (!mounted) return
            if (h.trueHeading >= 0) {
              setSource("ios-true")
              pushReading(h.trueHeading)
            } else if (h.magHeading >= 0) {
              setSource("ios-mag")
              pushReading(h.magHeading)
            }
          })
          return
        }
      } catch {}

      try {
        const available = await Magnetometer.isAvailableAsync()
        if (!mounted) return
        if (available) {
          setSource("magnetometer")
          Magnetometer.setUpdateInterval(100)
          magSub = Magnetometer.addListener(({ x, y }) => {
            pushReading(computeHeadingFromMag(x, y))
          })
          return
        }
      } catch {}

      if (mounted) setSource("none")
    }
    void start()

    return () => {
      mounted = false
      headingSub?.remove()
      magSub?.remove()
    }
  }, [active])

  return { degree, source, stable }
}

export function headingSourceLabel(source: HeadingSource | null): string | null {
  return source === "ios-true" ? "✓ 系统罗盘（真北，已校正磁偏角）"
    : source === "ios-mag" ? "系统罗盘（磁北）"
    : source === "magnetometer" ? "磁力计（磁北，建议先画 8 字校准）"
    : null
}
