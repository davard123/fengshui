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
