import type { StandingPointType } from "@/types/fengshui"

// ─── 24山定义 ─────────────────────────────────────────────────────────────────
// 顺序：从正北偏西（壬）开始，顺时针排列
// 每山占15°，中心角度为该山的标准方位

export type Mountain = {
  name: string      // 山名，如 "壬"
  center: number    // 中心角度 (0–360)
  start: number     // 起始角度
  end: number       // 结束角度
  sector: string    // 所属八卦方位
  element: string   // 五行属性
}

export const MOUNTAINS_24: Mountain[] = [
  // 北方 (壬子癸)
  { name: "壬", center: 345, start: 337.5, end: 352.5, sector: "北", element: "水" },
  { name: "子", center: 0,   start: 352.5, end: 7.5,   sector: "北", element: "水" },
  { name: "癸", center: 15,  start: 7.5,   end: 22.5,  sector: "北", element: "水" },
  // 东北方 (丑艮寅)
  { name: "丑", center: 30,  start: 22.5,  end: 37.5,  sector: "东北", element: "土" },
  { name: "艮", center: 45,  start: 37.5,  end: 52.5,  sector: "东北", element: "土" },
  { name: "寅", center: 60,  start: 52.5,  end: 67.5,  sector: "东北", element: "木" },
  // 东方 (甲卯乙)
  { name: "甲", center: 75,  start: 67.5,  end: 82.5,  sector: "东", element: "木" },
  { name: "卯", center: 90,  start: 82.5,  end: 97.5,  sector: "东", element: "木" },
  { name: "乙", center: 105, start: 97.5,  end: 112.5, sector: "东", element: "木" },
  // 东南方 (辰巽巳)
  { name: "辰", center: 120, start: 112.5, end: 127.5, sector: "东南", element: "土" },
  { name: "巽", center: 135, start: 127.5, end: 142.5, sector: "东南", element: "木" },
  { name: "巳", center: 150, start: 142.5, end: 157.5, sector: "东南", element: "火" },
  // 南方 (丙午丁)
  { name: "丙", center: 165, start: 157.5, end: 172.5, sector: "南", element: "火" },
  { name: "午", center: 180, start: 172.5, end: 187.5, sector: "南", element: "火" },
  { name: "丁", center: 195, start: 187.5, end: 202.5, sector: "南", element: "火" },
  // 西南方 (未坤申)
  { name: "未", center: 210, start: 202.5, end: 217.5, sector: "西南", element: "土" },
  { name: "坤", center: 225, start: 217.5, end: 232.5, sector: "西南", element: "土" },
  { name: "申", center: 240, start: 232.5, end: 247.5, sector: "西南", element: "金" },
  // 西方 (庚酉辛)
  { name: "庚", center: 255, start: 247.5, end: 262.5, sector: "西", element: "金" },
  { name: "酉", center: 270, start: 262.5, end: 277.5, sector: "西", element: "金" },
  { name: "辛", center: 285, start: 277.5, end: 292.5, sector: "西", element: "金" },
  // 西北方 (戌乾亥)
  { name: "戌", center: 300, start: 292.5, end: 307.5, sector: "西北", element: "土" },
  { name: "乾", center: 315, start: 307.5, end: 322.5, sector: "西北", element: "金" },
  { name: "亥", center: 330, start: 322.5, end: 337.5, sector: "西北", element: "水" },
]

// ─── 8方位定义 ────────────────────────────────────────────────────────────────

export type Direction8 = {
  name: string    // "N" | "NE" | ...
  label: string   // "北" | "东北" | ...
  center: number
  start: number
  end: number
}

export const DIRECTIONS_8: Direction8[] = [
  { name: "N",  label: "北",   center: 0,   start: 337.5, end: 22.5  },
  { name: "NE", label: "东北", center: 45,  start: 22.5,  end: 67.5  },
  { name: "E",  label: "东",   center: 90,  start: 67.5,  end: 112.5 },
  { name: "SE", label: "东南", center: 135, start: 112.5, end: 157.5 },
  { name: "S",  label: "南",   center: 180, start: 157.5, end: 202.5 },
  { name: "SW", label: "西南", center: 225, start: 202.5, end: 247.5 },
  { name: "W",  label: "西",   center: 270, start: 247.5, end: 292.5 },
  { name: "NW", label: "西北", center: 315, start: 292.5, end: 337.5 },
]

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

// 度数 → 24山
export function degreeToMountain24(degree: number): Mountain {
  const d = ((degree % 360) + 360) % 360
  // 子山跨越0°，需特殊处理
  for (const m of MOUNTAINS_24) {
    if (m.name === "子") {
      if (d >= 352.5 || d < 7.5) return m
    } else if (m.name === "壬") {
      if (d >= 337.5 && d < 352.5) return m
    } else {
      if (d >= m.start && d < m.end) return m
    }
  }
  return MOUNTAINS_24[1] // fallback: 子
}

// 度数 → 8方位
export function degreeToDirection8(degree: number): Direction8 {
  const d = ((degree % 360) + 360) % 360
  for (const dir of DIRECTIONS_8) {
    if (dir.name === "N") {
      if (d >= 337.5 || d < 22.5) return dir
    } else {
      if (d >= dir.start && d < dir.end) return dir
    }
  }
  return DIRECTIONS_8[0]
}

// 获取与站点类型对应的精度
export function precisionForType(type: StandingPointType): "24山" | "8方位" {
  return type === "outdoor" ? "24山" : "8方位"
}

// 生成方向环数据（供 DirectionRing 组件使用）
// facingDegree: 锁定的朝向角度（该方向将出现在环的顶部）
export type RingSegment = {
  direction: string   // 山名或方位名
  label: string       // 显示用（同上，或附加中文）
  degree: number      // 该格的中心角度
  // 在圆环上的渲染角度（相对于锁定朝向旋转后）
  renderAngle: number
}

export function get24MountainRing(facingDegree: number): RingSegment[] {
  return MOUNTAINS_24.map((m) => ({
    direction: m.name,
    label: m.name,
    degree: m.center,
    // 朝向方向置顶：renderAngle = center - facingDegree
    renderAngle: ((m.center - facingDegree) + 360) % 360,
  }))
}

export function get8DirectionRing(facingDegree: number): RingSegment[] {
  return DIRECTIONS_8.map((d) => ({
    direction: d.name,
    label: d.label,
    degree: d.center,
    renderAngle: ((d.center - facingDegree) + 360) % 360,
  }))
}
