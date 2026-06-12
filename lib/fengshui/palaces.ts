/**
 * palaces.ts — 九宫格几何与宫位映射
 *
 * 九宫格采用 3×3 正北对齐网格法（实务常用），覆盖在房屋轮廓的外接矩形上：
 *   NW | N | NE
 *   W  | C | E
 *   SW | S | SE
 * 注意网格行从北往南排，地图上北在上。
 */

import type { PalaceId } from "@/types/fengshui"

// ── 宫位基础信息 ─────────────────────────────────────────────────────────────
export const PALACE_ORDER_GRID: PalaceId[][] = [
  ["NW", "N", "NE"],
  ["W", "CENTER", "E"],
  ["SW", "S", "SE"],
]

export const PALACE_INFO: Record<PalaceId, {
  label: string        // 中文方位
  bagua: string        // 后天八卦
  element: string      // 五行
}> = {
  N:      { label: "北",   bagua: "坎", element: "水" },
  NE:     { label: "东北", bagua: "艮", element: "土" },
  E:      { label: "东",   bagua: "震", element: "木" },
  SE:     { label: "东南", bagua: "巽", element: "木" },
  S:      { label: "南",   bagua: "离", element: "火" },
  SW:     { label: "西南", bagua: "坤", element: "土" },
  W:      { label: "西",   bagua: "兑", element: "金" },
  NW:     { label: "西北", bagua: "乾", element: "金" },
  CENTER: { label: "中宫", bagua: "中", element: "土" },
}

export const ALL_PALACES: PalaceId[] = ["NW", "N", "NE", "W", "CENTER", "E", "SW", "S", "SE"]

// ── 归一化坐标 → 宫位 ────────────────────────────────────────────────────────
/**
 * 输入：点在轮廓外接矩形内的归一化坐标
 *   x: 0(西) → 1(东)
 *   y: 0(北) → 1(南)   （屏幕/地图惯例：上北下南）
 * 输出：宫位
 */
export function assignPalace(x: number, y: number): PalaceId {
  const col = x < 1 / 3 ? 0 : x < 2 / 3 ? 1 : 2
  const row = y < 1 / 3 ? 0 : y < 2 / 3 ? 1 : 2
  return PALACE_ORDER_GRID[row][col]
}

// ── 房间类型 ─────────────────────────────────────────────────────────────────
export type RoomType =
  | "front-door" | "master-bedroom" | "kids-bedroom" | "kitchen" | "stove"
  | "bathroom" | "living-room" | "study" | "stairs" | "garage"

export const ROOM_INFO: Record<RoomType, { label: string; icon: string; priority: number }> = {
  "front-door":     { label: "大门",   icon: "🚪", priority: 3 },
  "master-bedroom": { label: "主卧",   icon: "🛏️", priority: 3 },
  "stove":          { label: "灶位",   icon: "🔥", priority: 3 },
  "kitchen":        { label: "厨房",   icon: "🍳", priority: 2 },
  "bathroom":       { label: "卫生间", icon: "🚽", priority: 2 },
  "living-room":    { label: "客厅",   icon: "🛋️", priority: 2 },
  "study":          { label: "书房",   icon: "📚", priority: 2 },
  "kids-bedroom":   { label: "儿童房", icon: "🧸", priority: 2 },
  "stairs":         { label: "楼梯",   icon: "🪜", priority: 1 },
  "garage":         { label: "车库",   icon: "🚗", priority: 1 },
}

export const ALL_ROOMS: RoomType[] = [
  "front-door", "master-bedroom", "kitchen", "stove", "bathroom",
  "living-room", "study", "kids-bedroom", "stairs", "garage",
]

// ── 相对方位（四灵）────────────────────────────────────────────────────────
/**
 * 把"从宅中心看某物的绝对方位角"换算成房屋的相对方位。
 * facingDegree = 房屋朝向；前方 = facing ±45°，右 = facing+90°（白虎），
 * 后 = facing+180°（玄武），左 = facing-90°（青龙）。
 */
export type RelativePosition = "front" | "back" | "left" | "right"

export const RELATIVE_LABEL: Record<RelativePosition, string> = {
  front: "前方（朱雀）",
  back: "后方（玄武）",
  left: "左方（青龙）",
  right: "右方（白虎）",
}

export function bearingToRelative(bearingDeg: number, facingDeg: number): RelativePosition {
  // 相对角 = 物体方位角 - 朝向角，归一到 [-180, 180)
  let rel = ((bearingDeg - facingDeg) % 360 + 360) % 360
  if (rel >= 180) rel -= 360
  if (rel >= -45 && rel < 45) return "front"
  if (rel >= 45 && rel < 135) return "right"   // 顺时针 90° = 面朝方向的右手 = 白虎
  if (rel >= -135 && rel < -45) return "left"  // 青龙
  return "back"
}

// ── 距离环带 ─────────────────────────────────────────────────────────────────
export type DistanceRing = "near" | "mid" | "far"

export const RING_CONFIG: Record<DistanceRing, { label: string; max: number; weight: number }> = {
  near: { label: "近（0-50m）",    max: 50,   weight: 1.0 },
  mid:  { label: "中（50-200m）",  max: 200,  weight: 0.6 },
  far:  { label: "远（200m-1km）", max: 1000, weight: 0.3 },
}

/** 山体/水体等大型地物的远环上限放宽到 2km */
const BIG_FEATURE_KINDS = new Set(["山/高地", "水(湖河海)"])

export function distanceToRing(distanceM: number, kind?: string): DistanceRing | null {
  if (distanceM <= RING_CONFIG.near.max) return "near"
  if (distanceM <= RING_CONFIG.mid.max) return "mid"
  const farMax = kind && BIG_FEATURE_KINDS.has(kind) ? 2000 : RING_CONFIG.far.max
  if (distanceM <= farMax) return "far"
  return null   // 超出有效范围，不参与分析
}

export function ringWeight(ring: DistanceRing): number {
  return RING_CONFIG[ring].weight
}

// ── 地物强度基数（severityBase）─────────────────────────────────────────────
// 最终 severity = severityBase × ringWeight ×（confirmed ? 1 : 0）
export const SEVERITY_BASE: Record<string, 1 | 2 | 3> = {
  // 强煞类（3）
  "高速公路": 3, "T字路口正对": 3, "两楼夹缝(天斩)": 3, "墓地": 3,
  // 中等（2）
  "主干道": 2, "高压线": 2, "尖顶/尖角建筑": 2, "尖顶建筑": 2,
  "弯道背离大门(反弓)": 2, "弯道朝向大门(玉带)": 2, "加油站": 2,
  // 弱（1）
  "小路街道": 1, "水(湖河海)": 1, "小溪水渠": 1, "山/高地": 1,
  "高楼": 1, "低矮建筑": 1, "空地/开阔": 1, "树林": 1, "停车场": 1,
}

export function severityBaseOf(kind: string): 1 | 2 | 3 {
  // 模糊匹配：kind 可能带括号注释
  for (const [k, v] of Object.entries(SEVERITY_BASE)) {
    if (kind.includes(k) || k.includes(kind)) return v
  }
  return 1
}
