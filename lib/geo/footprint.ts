/**
 * footprint.ts — 建筑轮廓获取与定向几何
 *
 * 1. 从 Overpass 拉取地址附近的建筑轮廓多边形（way[building] + out geom）
 * 2. 计算质心（太极点）
 * 3. 最小外接矩形主轴 → 4 个立面法向角（坐向候选）
 * 4. 无 OSM 数据时由用户手描四角 fallback
 */

import type { Coords } from "./nominatim"

export type FacadeCandidateGeo = {
  edgeIndex: number      // 多边形第几条边
  normalDegree: number   // 外法向方位角
  length: number         // 边长（米）
  confidence: number     // 0-1
}

export type FootprintResult = {
  center: Coords                 // 太极点（轮廓质心）
  polygon: Coords[]              // 轮廓顶点
  facadeNormals: number[]        // 简化候选（按主轴推 4 向，兼容旧调用）
  facadeCandidates: FacadeCandidateGeo[]  // 逐边候选（推荐使用）
  source: "osm" | "manual"
}

// ── Overpass 轮廓查询 ────────────────────────────────────────────────────────
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
  throw new Error("Overpass 不可用")
}

type OsmGeomWay = {
  type: "way"
  id: number
  geometry: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

/**
 * 拉取坐标附近最近的建筑轮廓。
 * 返回 null = OSM 无数据，需要手描。
 */
export async function fetchBuildingFootprint(coords: Coords): Promise<FootprintResult | null> {
  try {
    const q = `[out:json][timeout:15];
way[building](around:40,${coords.lat},${coords.lon});
out geom;`
    const res = await fetchOverpass(q)
    const data = await res.json() as { elements: OsmGeomWay[] }
    const ways = (data.elements || []).filter((e) => e.type === "way" && e.geometry?.length >= 3)
    if (ways.length === 0) return null

    // 选离查询点最近的建筑（质心距离最小）
    let best: OsmGeomWay | null = null
    let bestDist = Infinity
    for (const w of ways) {
      const c = polygonCentroid(w.geometry)
      const d = haversine(coords, c)
      if (d < bestDist) { bestDist = d; best = w }
    }
    if (!best) return null

    const polygon = best.geometry.map((g) => ({ lat: g.lat, lon: g.lon }))
    return buildFootprint(polygon, "osm")
  } catch {
    return null
  }
}

/** 用户手描多边形 → FootprintResult */
export function manualFootprint(polygon: Coords[]): FootprintResult {
  return buildFootprint(polygon, "manual")
}

function buildFootprint(polygon: Coords[], source: "osm" | "manual"): FootprintResult {
  const center = polygonCentroid(polygon)
  const facadeNormals = computeFacadeNormals(polygon, center)
  const facadeCandidates = computeFacadeCandidates(polygon, center)
  return { center, polygon, facadeNormals, facadeCandidates, source }
}

/**
 * 逐边立面候选 —— 解决两个真实问题：
 *   A. 近正方形：主轴不稳定 → 逐边法向 + confidence 让用户看到"差距很小"
 *   B. L形/折线形：主轴 ≠ 门面 → 每条显著边都成为候选
 *
 * 做法：
 *   1. 每条边算长度 + 外法向
 *   2. 按法向角聚类（±10° 合并，长度累加）—— 同一面墙的折线段合并
 *   3. confidence = 该簇总边长 / 全部边长（按聚类后归一化）
 *   4. 输出按 confidence 降序，最多 6 个候选
 */
export function computeFacadeCandidates(polygon: Coords[], center: Coords): FacadeCandidateGeo[] {
  const proj = polygon.map((p) => ({
    x: (p.lon - center.lon) * 111320 * Math.cos(center.lat * Math.PI / 180),
    y: (p.lat - center.lat) * 110540,
  }))
  const n = proj.length

  type Edge = { edgeIndex: number; normalDegree: number; length: number; midX: number; midY: number }
  const edges: Edge[] = []
  let totalLen = 0

  for (let i = 0; i < n; i++) {
    const a = proj[i]
    const b = proj[(i + 1) % n]
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 1) continue   // 忽略 <1m 碎边
    totalLen += len
    // 两个法向中选指向"远离质心"的那个 = 外法向
    const n1 = { x: dy, y: -dx }   // 顺时针法向
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2
    const dot = n1.x * midX + n1.y * midY
    const nx = dot >= 0 ? n1.x : -n1.x
    const ny = dot >= 0 ? n1.y : -n1.y
    // 数学向量 → 罗盘方位角（y 北 x 东）：compass = atan2(x, y)
    const compass = ((Math.atan2(nx, ny) * 180 / Math.PI) % 360 + 360) % 360
    edges.push({ edgeIndex: i, normalDegree: compass, length: len, midX, midY })
  }
  if (edges.length === 0 || totalLen === 0) return []

  // 法向角聚类（±10°，环形距离；以簇参考角为基准做偏移平均，避免 0/360 边界 bug）
  type Cluster = { ref: number; offsetSum: number; weight: number; length: number; edgeIndex: number; maxLen: number }
  const clusters: Cluster[] = []
  const angDiff = (a: number, b: number) => {
    let d = (a - b) % 360
    if (d > 180) d -= 360
    if (d < -180) d += 360
    return d   // 有符号差 [-180, 180]
  }
  for (const e of edges.sort((p, q) => q.length - p.length)) {
    const hit = clusters.find((c) => {
      const mean = c.ref + c.offsetSum / c.weight
      return Math.abs(angDiff(e.normalDegree, mean)) <= 10
    })
    if (hit) {
      hit.offsetSum += angDiff(e.normalDegree, hit.ref) * e.length
      hit.weight += e.length
      hit.length += e.length
      if (e.length > hit.maxLen) { hit.maxLen = e.length; hit.edgeIndex = e.edgeIndex }
    } else {
      clusters.push({
        ref: e.normalDegree, offsetSum: 0, weight: e.length,
        length: e.length, edgeIndex: e.edgeIndex, maxLen: e.length,
      })
    }
  }

  return clusters
    .map((c) => ({
      edgeIndex: c.edgeIndex,
      normalDegree: (((c.ref + c.offsetSum / c.weight) % 360) + 360) % 360,
      length: Math.round(c.length * 10) / 10,
      confidence: Math.round((c.length / totalLen) * 100) / 100,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6)
}

// ── 几何工具 ─────────────────────────────────────────────────────────────────

export function haversine(a: Coords, b: Coords): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const la = a.lat * Math.PI / 180
  const lb = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function bearingBetween(from: Coords, to: Coords): number {
  const dLon = (to.lon - from.lon) * Math.PI / 180
  const la = from.lat * Math.PI / 180
  const lb = to.lat * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lb)
  const x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/**
 * 太极点推算 — 三级策略：
 *   1. 鞋带公式面积重心（= 传统"纸板平衡法"的数学等价，对顶点疏密不敏感）
 *   2. 若重心落在轮廓外（深 L 形/U 形凹宅会发生）→ 退回外接矩形中心
 *   3. 同时返回 method 供报告标注来源
 *
 * 顶点平均法已废弃：折线密集的一侧会把中心拉偏，L 形宅误差可达数米。
 */
export type TaijiResult = {
  center: Coords
  method: "area-centroid" | "bbox-center"
  concave: boolean        // 重心是否曾落到轮廓外（提示用户宅形特殊）
}

export function computeTaiji(pts: { lat: number; lon: number }[]): TaijiResult {
  const area = polygonAreaCentroid(pts)
  if (area && pointInPolygon(area, pts)) {
    return { center: area, method: "area-centroid", concave: false }
  }
  // 凹宅兜底：外接矩形中心
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const p of pts) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat)
    minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon)
  }
  return {
    center: { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 },
    method: "bbox-center",
    concave: true,
  }
}

/** 鞋带公式面积重心（平面近似：经度按纬度余弦缩放） */
export function polygonAreaCentroid(pts: { lat: number; lon: number }[]): Coords | null {
  if (pts.length < 3) return null
  const lat0 = pts[0].lat
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180)   // 米/经度
  const ky = 110540                                      // 米/纬度
  const xy = pts.map((p) => ({ x: (p.lon - pts[0].lon) * kx, y: (p.lat - pts[0].lat) * ky }))

  let a2 = 0, cx = 0, cy = 0
  for (let i = 0; i < xy.length; i++) {
    const p = xy[i], q = xy[(i + 1) % xy.length]
    const cross = p.x * q.y - q.x * p.y
    a2 += cross
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  if (Math.abs(a2) < 1e-6) return null   // 退化多边形
  cx /= (3 * a2)
  cy /= (3 * a2)
  return { lat: pts[0].lat + cy / ky, lon: pts[0].lon + cx / kx }
}

/** 射线法点在多边形内判定 */
export function pointInPolygon(pt: Coords, polygon: { lat: number; lon: number }[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat
    const xj = polygon[j].lon, yj = polygon[j].lat
    if (((yi > pt.lat) !== (yj > pt.lat)) &&
        (pt.lon < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/** @deprecated 顶点平均（有偏），仅保留兼容；新代码请用 computeTaiji */
export function polygonCentroid(pts: { lat: number; lon: number }[]): Coords {
  return computeTaiji(pts).center
}

/**
 * 计算 4 个立面法向角。
 * 做法：把多边形投影到局部平面（米），用边长加权统计主导边方向 →
 * 主轴 θ 与副轴 θ+90°，4 个法向 = θ+90, θ+180, θ+270, θ（按接近 N/E/S/W 排序输出）
 */
export function computeFacadeNormals(polygon: Coords[], center: Coords): number[] {
  // 投影：x 向东（米），y 向北（米）
  const proj = polygon.map((p) => ({
    x: (p.lon - center.lon) * 111320 * Math.cos(center.lat * Math.PI / 180),
    y: (p.lat - center.lat) * 110540,
  }))

  // 边方向统计（方向模 180°，长度加权；用倍角向量平均避免 0/180 折叠问题）
  let sx = 0, sy = 0
  for (let i = 0; i < proj.length; i++) {
    const a = proj[i]
    const b = proj[(i + 1) % proj.length]
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len < 0.5) continue
    const ang = Math.atan2(dy, dx)         // 数学角（x 东为 0，逆时针）
    sx += Math.cos(2 * ang) * len
    sy += Math.sin(2 * ang) * len
  }
  const mainMath = Math.atan2(sy, sx) / 2  // 主导边的数学角

  // 数学角 → 罗盘方位角：compass = (90 - deg(math)) mod 360
  const mainCompass = ((90 - mainMath * 180 / Math.PI) % 360 + 360) % 360

  // 主导边走向为 mainCompass；其立面法向 = mainCompass ± 90；副轴边的法向 = mainCompass / +180
  const normals = [
    (mainCompass + 90) % 360,
    (mainCompass + 180) % 360,
    (mainCompass + 270) % 360,
    mainCompass % 360,
  ]
  // 按接近 N(0) → E(90) → S(180) → W(270) 排序，方便 UI 一致展示
  return normals.sort((a, b) => a - b)
}

/** 点在多边形外接矩形中的归一化位置（x: 0西→1东, y: 0北→1南），给九宫格用 */
export function normalizeInBounds(point: Coords, polygon: Coords[]): { x: number; y: number } {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  for (const p of polygon) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat)
    minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon)
  }
  const x = maxLon === minLon ? 0.5 : (point.lon - minLon) / (maxLon - minLon)
  const y = maxLat === minLat ? 0.5 : (maxLat - point.lat) / (maxLat - minLat)  // 北在上
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
}
