/**
 * v3 规则引擎端到端验证（不依赖 RN，直接验证纯逻辑模块）
 * 用法: node scripts/verify-rules-v3.mjs
 * 注意: lib 内用了 "@/..." 别名的模块无法直接 import，
 *       这里验证的是关键判定表与衰减逻辑（内联复制核心数据做交叉核对）。
 */
import { strict as assert } from "node:assert"

// ── 1. 八宅游年表交叉验证 ────────────────────────────────────────────────
// bazhai-rules.ts 中已修正的表（v2 旧表被发现与大游年歌不符，已替换）
const CODE_TABLE = {
  N:  { N: "伏位", NE: "五鬼", E: "天医", SE: "生气", S: "延年", SW: "绝命", W: "祸害", NW: "六煞" },
  NE: { NE: "伏位", E: "六煞", SE: "绝命", S: "祸害", SW: "生气", W: "延年", NW: "天医", N: "五鬼" },
  E:  { E: "伏位", SE: "延年", S: "生气", SW: "祸害", W: "绝命", NW: "五鬼", N: "天医", NE: "六煞" },
  SE: { SE: "伏位", S: "天医", SW: "五鬼", W: "六煞", NW: "祸害", N: "生气", NE: "绝命", E: "延年" },
  S:  { S: "伏位", SW: "六煞", W: "五鬼", NW: "绝命", N: "延年", NE: "祸害", E: "生气", SE: "天医" },
  SW: { SW: "伏位", W: "天医", NW: "延年", N: "绝命", NE: "生气", E: "祸害", SE: "五鬼", S: "六煞" },
  W:  { W: "伏位", NW: "生气", N: "祸害", NE: "延年", E: "绝命", SE: "六煞", S: "五鬼", SW: "天医" },
  NW: { NW: "伏位", N: "六煞", NE: "天医", E: "五鬼", SE: "祸害", S: "绝命", SW: "延年", W: "生气" },
}
// 公认基准（公开八宅表）：坎宅生气在东南、离宅生气在正东、兑宅生气在西北、坤宅生气在东北
assert.equal(CODE_TABLE.N.SE, "生气", "坎宅生气应在东南")
assert.equal(CODE_TABLE.S.E, "生气", "离宅生气应在正东")
assert.equal(CODE_TABLE.W.NW, "生气", "兑宅生气应在西北")
assert.equal(CODE_TABLE.SW.NE, "生气", "坤宅生气应在东北")
assert.equal(CODE_TABLE.NW.W, "生气", "乾宅生气应在正西")
assert.equal(CODE_TABLE.E.S, "生气", "震宅生气应在正南")
assert.equal(CODE_TABLE.SE.N, "生气", "巽宅生气应在正北")
assert.equal(CODE_TABLE.NE.SW, "生气", "艮宅生气应在西南")
console.log("✓ 八宅游年表: 8 宅生气位全部与公开基准一致")

// 用大游年歌全面推导 8 宅，输出标准表供修正
// 歌诀: 乾六天五祸绝延生; 坎五天生延绝祸六; 艮六绝祸生延天五; 震延生祸绝五天六;
//       巽天五六祸生绝延; 离六五绝延祸生天; 坤天延绝生祸五六; 兑生祸延绝六五天
// 顺序均按 乾坎艮震巽离坤兑 宫序数到
const PALACE_SEQ = ["NW", "N", "NE", "E", "SE", "S", "SW", "W"]  // 乾坎艮震巽离坤兑
const SONGS = {
  NW: "六天五祸绝延生", N: "五天生延绝祸六", NE: "六绝祸生延天五", E: "延生祸绝五天六",
  SE: "天五六祸生绝延", S: "六五绝延祸生天", SW: "天延绝生祸五六", W: "生祸延绝六五天",
}
const STAR_CHAR = { 生: "生气", 延: "延年", 天: "天医", 伏: "伏位", 祸: "祸害", 六: "六煞", 五: "五鬼", 绝: "绝命" }
const STANDARD = {}
for (const sit of PALACE_SEQ) {
  const table = { [sit]: "伏位" }
  const startIdx = PALACE_SEQ.indexOf(sit)
  const song = SONGS[sit]
  for (let i = 1; i <= 7; i++) {
    const palace = PALACE_SEQ[(startIdx + i) % 8]
    table[palace] = STAR_CHAR[song[i - 1]]
  }
  STANDARD[sit] = table
}
console.log("\n标准八宅游年表（大游年歌推导）:")
for (const sit of PALACE_SEQ) console.log(`  ${sit}宅:`, JSON.stringify(STANDARD[sit]))

// ── 2. 距离环带衰减 ──────────────────────────────────────────────────────
const RING_W = { near: 1.0, mid: 0.6, far: 0.3 }
const sha = (ring) => -3 * RING_W[ring]
assert.ok(sha("near") < sha("mid") && sha("mid") < sha("far"), "形煞应随距离衰减")
console.log("\n✓ 距离衰减: near=-3.0 mid=-1.8 far=-0.9")

// ── 3. 相对方位换算 ──────────────────────────────────────────────────────
function bearingToRelative(bearingDeg, facingDeg) {
  let rel = ((bearingDeg - facingDeg) % 360 + 360) % 360
  if (rel >= 180) rel -= 360
  if (rel >= -45 && rel < 45) return "front"
  if (rel >= 45 && rel < 135) return "right"
  if (rel >= -135 && rel < -45) return "left"
  return "back"
}
// 朝南(180°)的房子: 正南=front, 正北=back, 正东=left(青龙), 正西=right(白虎)
assert.equal(bearingToRelative(180, 180), "front")
assert.equal(bearingToRelative(0, 180), "back")
assert.equal(bearingToRelative(90, 180), "left")    // 面朝南，东在左手 → 青龙
assert.equal(bearingToRelative(270, 180), "right")  // 西在右手 → 白虎
console.log("✓ 四灵换算: 朝南宅 东=青龙 西=白虎 北=玄武 南=朱雀")

console.log("\n════ 规则验证完成 ════")

// ── 4. 太极点（鞋带面积重心 + 凹宅兜底）──────────────────────────────────
function areaCentroid(pts) {
  const lat0 = pts[0].lat
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540
  const xy = pts.map(p => ({ x: (p.lon - pts[0].lon) * kx, y: (p.lat - pts[0].lat) * ky }))
  let a2 = 0, cx = 0, cy = 0
  for (let i = 0; i < xy.length; i++) {
    const p = xy[i], q = xy[(i + 1) % xy.length]
    const cross = p.x * q.y - q.x * p.y
    a2 += cross; cx += (p.x + q.x) * cross; cy += (p.y + q.y) * cross
  }
  if (Math.abs(a2) < 1e-6) return null
  return { lat: pts[0].lat + (cy / (3 * a2)) / ky, lon: pts[0].lon + (cx / (3 * a2)) / kx }
}

// 测试1：矩形 — 重心应在几何中心
{
  const rect = [
    { lat: 33.0000, lon: -117.0000 }, { lat: 33.0000, lon: -116.9990 },
    { lat: 33.0002, lon: -116.9990 }, { lat: 33.0002, lon: -117.0000 },
  ]
  const c = areaCentroid(rect)
  assert.ok(Math.abs(c.lat - 33.0001) < 1e-6, "矩形重心 lat")
  assert.ok(Math.abs(c.lon - (-116.9995)) < 1e-6, "矩形重心 lon")
  console.log("✓ 太极点-矩形: 重心=几何中心")
}

// 测试2：顶点密度偏置 — 一侧加密顶点不应拉偏重心（旧顶点平均法会偏）
{
  const rectDense = [
    { lat: 33.0000, lon: -117.0000 },
    { lat: 33.0000, lon: -116.99975 }, { lat: 33.0000, lon: -116.99950 },
    { lat: 33.0000, lon: -116.99925 }, { lat: 33.0000, lon: -116.9990 },  // 南边 5 个点
    { lat: 33.0002, lon: -116.9990 }, { lat: 33.0002, lon: -117.0000 },   // 北边 2 个点
  ]
  const c = areaCentroid(rectDense)
  assert.ok(Math.abs(c.lat - 33.0001) < 1e-7, "加密顶点不应拉偏面积重心")
  // 旧顶点平均法: avgLat = (33.0000*5 + 33.0002*2)/7 = 33.0000571 ≠ 33.0001 ← 偏了
  console.log("✓ 太极点-密度偏置: 面积重心不受顶点疏密影响（旧平均法偏差 0.43e-4 度≈5米）")
}

// 测试3：L 形 — 重心在实体部分内
{
  // L 形：大矩形去掉右上角
  const lShape = [
    { lat: 33.0000, lon: -117.0000 }, { lat: 33.0000, lon: -116.9990 },
    { lat: 33.0001, lon: -116.9990 }, { lat: 33.0001, lon: -116.9995 },
    { lat: 33.0002, lon: -116.9995 }, { lat: 33.0002, lon: -117.0000 },
  ]
  const c = areaCentroid(lShape)
  // L 形重心应偏向"实"的一侧（西南），lat < 33.0001, lon < -116.9994
  assert.ok(c.lat < 33.0001 && c.lon < -116.9994, "L形重心应偏向实体侧")
  console.log("✓ 太极点-L形: 重心偏向实体侧 (lat=" + c.lat.toFixed(6) + ")")
}

console.log("\n════ 太极点验证完成 ════")
