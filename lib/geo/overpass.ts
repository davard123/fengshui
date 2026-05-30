/**
 * Overpass API (OpenStreetMap) — 查询坐标周边地物，免费无 Key
 *
 * 关键改进：
 *   1. 记录每个地物的距离
 *   2. 各方向按距离排序，只取最近的几个
 *   3. 不同类型有不同的"有效距离"（房子近 → 路远不算）
 */

import type { Coords } from "./nominatim"

export type Dir8 = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"

// 单个方向上的地物（带距离）
export type SurroundingFeature = {
  element:  string   // App 元素名，如 "低矮建筑"
  distance: number   // 米
}

export type SurroundingResult = {
  directions: Record<Dir8, SurroundingFeature[]>  // 每方向按距离排序
  warnings:   string[]
}

// ── 方位计算 ─────────────────────────────────────────────────────────────────
function bearing(from: Coords, to: Coords): number {
  const dLon = (to.lon - from.lon) * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat  * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function distance(from: Coords, to: Coords): number {
  // Haversine 简化版（500米内误差忽略）
  const R = 6371000
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLon = (to.lon - from.lon) * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat  * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function bearingToDir(b: number): Dir8 {
  const dirs: Dir8[] = ["N","NE","E","SE","S","SW","W","NW"]
  return dirs[Math.round(b / 45) % 8]
}

// ── OSM → App 元素 + 各类型有效距离 ──────────────────────────────────────────
// 房子近的才算（自家附近），路要稍远（不能太近，500米内主要路）
type ElementSpec = { element: string; maxDist: number }   // 超过 maxDist 的不计

function osmToElementSpec(tags: Record<string, string>): ElementSpec[] {
  const out: ElementSpec[] = []
  const hw  = tags.highway
  const ww  = tags.waterway
  const nat = tags.natural
  const lu  = tags.landuse
  const lei = tags.leisure

  // 道路：按等级有不同有效距离
  if (hw) {
    if (["motorway","motorway_link","trunk","trunk_link"].includes(hw))
      out.push({ element:"高速公路", maxDist: 800 })     // 高速影响远
    else if (["primary","primary_link","secondary","secondary_link"].includes(hw))
      out.push({ element:"主干道",   maxDist: 400 })
    else if (["residential","tertiary","service","living_street","unclassified"].includes(hw))
      out.push({ element:"小路街道", maxDist: 150 })     // 小路只算近的
  }

  // 水体
  if (nat === "water" || ww === "river" || ww === "canal")
    out.push({ element:"水(湖河海)", maxDist: 500 })
  if (ww === "stream" || ww === "ditch")
    out.push({ element:"小溪水渠", maxDist: 300 })

  // 山地
  if (nat === "peak" || nat === "hill" || nat === "ridge")
    out.push({ element:"山/高地", maxDist: 2000 })       // 远处的山也算

  // 树林
  if (nat === "wood" || lu === "forest")
    out.push({ element:"树林", maxDist: 300 })

  // 开阔
  if (lei === "park" || lei === "garden" || lu === "grass" || lu === "meadow")
    out.push({ element:"空地/开阔", maxDist: 400 })

  // 建筑：只算近的（150m内才算真正"邻居"）
  if (tags.building) {
    const lv = parseInt(tags["building:levels"] ?? "1", 10)
    if (lv >= 7)
      out.push({ element:"高楼", maxDist: 300 })
    else
      out.push({ element:"低矮建筑", maxDist: 120 })   // 近邻才算
  }

  // 特殊
  if (tags.amenity === "parking") out.push({ element:"停车场", maxDist: 200 })
  if (lu === "cemetery" || tags.amenity === "grave_yard") out.push({ element:"墓地", maxDist: 500 })
  if (tags.amenity === "fuel") out.push({ element:"加油站", maxDist: 300 })
  if (tags.power === "line") out.push({ element:"高压线", maxDist: 200 })

  return out
}

// ── Overpass 查询 ────────────────────────────────────────────────────────────
type OsmFeature = {
  type:    "node" | "way" | "relation"
  id:      number
  tags:    Record<string, string>
  center?: { lat: number; lon: number }
  lat?:    number
  lon?:    number
}

function featureCenter(f: OsmFeature): Coords | null {
  if (f.center) return f.center
  if (f.lat != null && f.lon != null) return { lat: f.lat, lon: f.lon }
  return null
}

function buildQuery(lat: number, lon: number, r: number): string {
  const a = `around:${r},${lat},${lon}`
  return `[out:json][timeout:20];
(
  way[highway~"motorway|trunk|primary|secondary|residential|tertiary|service|living_street|unclassified"](${a});
  way[natural=water](${a});
  relation[natural=water](${a});
  way[waterway~"river|stream|canal|ditch"](${a});
  node[natural~"peak|hill|ridge"](around:2000,${lat},${lon});
  way[leisure~"park|garden"](${a});
  way[landuse~"grass|meadow|forest|cemetery"](${a});
  way[building](${a});
  node[amenity~"parking|fuel|grave_yard"](${a});
  way[power=line](${a});
);
out center;`
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

async function fetchOverpass(query: string): Promise<Response> {
  const body = `data=${encodeURIComponent(query)}`
  const headers = { "Content-Type": "application/x-www-form-urlencoded" }
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, { method: "POST", headers, body })
      if (res.ok) return res
    } catch {}
  }
  throw new Error("所有 Overpass 节点均不可用")
}

// ── 主函数：距离感知版本 ────────────────────────────────────────────────────
export async function querySurroundings(
  coords:  Coords,
  radiusM = 800,    // 默认 800m，让远处大山也能被发现
): Promise<SurroundingResult> {
  const emptyDirs: Record<Dir8, SurroundingFeature[]> = {
    N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[],
  }

  try {
    const query = buildQuery(coords.lat, coords.lon, radiusM)
    const res   = await fetchOverpass(query)
    const data  = await res.json() as { elements: OsmFeature[] }

    // 收集所有「方向 + 元素 + 距离」三元组
    type Entry = { dir: Dir8; element: string; distance: number }
    const entries: Entry[] = []

    for (const f of data.elements) {
      const center = featureCenter(f); if (!center) continue
      const dist = distance(coords, center)
      const dir  = bearingToDir(bearing(coords, center))
      const specs = osmToElementSpec(f.tags)
      for (const { element, maxDist } of specs) {
        if (dist > maxDist) continue   // 超过此元素的有效距离，丢弃
        entries.push({ dir, element, distance: Math.round(dist) })
      }
    }

    // 每方向按距离排序并去重（同种元素只取最近的一个）
    const directions: Record<Dir8, SurroundingFeature[]> = { ...emptyDirs }
    for (const dir of Object.keys(emptyDirs) as Dir8[]) {
      const dirEntries = entries
        .filter((e) => e.dir === dir)
        .sort((a, b) => a.distance - b.distance)
      const seen = new Set<string>()
      const result: SurroundingFeature[] = []
      for (const e of dirEntries) {
        if (seen.has(e.element)) continue
        seen.add(e.element)
        result.push({ element: e.element, distance: e.distance })
      }
      directions[dir] = result
    }

    const total = Object.values(directions).reduce((s, arr) => s + arr.length, 0)
    return {
      directions,
      warnings: total === 0 ? ["该区域 OSM 数据较少，可手动补充"] : [],
    }

  } catch (err) {
    console.warn("Overpass error:", err)
    return {
      directions: emptyDirs,
      warnings: ["周边地物查询失败，请手动标记各方位"],
    }
  }
}

// ── 兼容现有接口：转为 DirectionEntry ─────────────────────────────────────────
import type { DirectionEntry } from "@/types/fengshui"

const DIR8_DEGREE: Record<Dir8, number> = {
  N:0, NE:45, E:90, SE:135, S:180, SW:225, W:270, NW:315,
}

export function surroundingToDirectionEntries(
  result: SurroundingResult,
): DirectionEntry[] {
  return (Object.keys(result.directions) as Dir8[]).map((dir) => ({
    direction: dir,
    degree:    DIR8_DEGREE[dir],
    // 元素列表（已去重、按距离排序，最近的在前）
    elements:  result.directions[dir].map((f) => f.element),
  }))
}

// ── 新：把方位地物按距离格式化（给用户看 + 给 AI 提示）──────────────────────
export function formatDirectionFeatures(features: SurroundingFeature[]): string {
  if (!features.length) return "（无明显地物）"
  return features.map((f) => `${f.element}${f.distance}m`).join("、")
}
