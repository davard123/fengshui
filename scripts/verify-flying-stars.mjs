/**
 * 玄空飞星基准盘验证
 * 用法: node scripts/verify-flying-stars.mjs
 *
 * 基准来源：沈氏玄空学公开飞星盘
 *   1. 八运 子山午向 → 双星会向；向宫(S) 山8向8；坐宫(N) 山9向7
 *   2. 八运 乾山巽向 → 旺山旺向；坐宫(NW) 山8；向宫(SE) 向8
 *   3. 八运 午山子向 → 双星会坐；坐宫(S) 山8向8
 *   4. 九运 子山午向 → 双星会坐（九运坐子：山9向9到坐N）
 */
import { strict as assert } from "node:assert"

// ── 内联复制 flying-stars.ts 的核心算法（脚本独立运行，不依赖 TS 编译）────
const FLY_PATH = ["CENTER", "NW", "W", "NE", "S", "N", "SW", "E", "SE"]

function flyStar(star, forward) {
  const out = {}
  for (let i = 0; i < 9; i++) {
    let v = forward ? star + i : star - i
    v = ((v - 1) % 9 + 9) % 9 + 1
    out[FLY_PATH[i]] = v
  }
  return out
}

const MOUNTAIN_INFO = {
  壬: { palace: "N", yuan: "地元", yang: true },  子: { palace: "N", yuan: "天元", yang: false },  癸: { palace: "N", yuan: "人元", yang: false },
  丑: { palace: "NE", yuan: "地元", yang: false }, 艮: { palace: "NE", yuan: "天元", yang: true },  寅: { palace: "NE", yuan: "人元", yang: true },
  甲: { palace: "E", yuan: "地元", yang: true },   卯: { palace: "E", yuan: "天元", yang: false },  乙: { palace: "E", yuan: "人元", yang: false },
  辰: { palace: "SE", yuan: "地元", yang: false }, 巽: { palace: "SE", yuan: "天元", yang: true },  巳: { palace: "SE", yuan: "人元", yang: true },
  丙: { palace: "S", yuan: "地元", yang: true },   午: { palace: "S", yuan: "天元", yang: false },  丁: { palace: "S", yuan: "人元", yang: false },
  未: { palace: "SW", yuan: "地元", yang: false }, 坤: { palace: "SW", yuan: "天元", yang: true },  申: { palace: "SW", yuan: "人元", yang: true },
  庚: { palace: "W", yuan: "地元", yang: true },   酉: { palace: "W", yuan: "天元", yang: false },  辛: { palace: "W", yuan: "人元", yang: false },
  戌: { palace: "NW", yuan: "地元", yang: false }, 乾: { palace: "NW", yuan: "天元", yang: true },  亥: { palace: "NW", yuan: "人元", yang: true },
}
const STAR_TO_PALACE = { 1: "N", 2: "SW", 3: "E", 4: "SE", 5: null, 6: "NW", 7: "W", 8: "NE", 9: "S" }
const PALACE_MOUNTAINS = {
  N: ["壬", "子", "癸"], NE: ["丑", "艮", "寅"], E: ["甲", "卯", "乙"], SE: ["辰", "巽", "巳"],
  S: ["丙", "午", "丁"], SW: ["未", "坤", "申"], W: ["庚", "酉", "辛"], NW: ["戌", "乾", "亥"], CENTER: [],
}
const YUAN_INDEX = { 地元: 0, 天元: 1, 人元: 2 }

function flyDirection(starIntoCenter, refMountain) {
  const ref = MOUNTAIN_INFO[refMountain]
  if (starIntoCenter === 5) return ref.yang
  const palace = STAR_TO_PALACE[starIntoCenter]
  const mountain = PALACE_MOUNTAINS[palace][YUAN_INDEX[ref.yuan]]
  return MOUNTAIN_INFO[mountain].yang
}

function computeChart(period, sit, face) {
  const sitInfo = MOUNTAIN_INFO[sit]
  const faceInfo = MOUNTAIN_INFO[face]
  const base = flyStar(period, true)
  const sitStar = base[sitInfo.palace]
  const mountainChart = flyStar(sitStar, flyDirection(sitStar, sit))
  const faceStar = base[faceInfo.palace]
  const facingChart = flyStar(faceStar, flyDirection(faceStar, face))
  const palaces = {}
  for (const p of FLY_PATH) palaces[p] = { mountain: mountainChart[p], facing: facingChart[p], base: base[p] }

  const mAtSit = palaces[sitInfo.palace].mountain === period
  const fAtFace = palaces[faceInfo.palace].facing === period
  const mAtFace = palaces[faceInfo.palace].mountain === period
  const fAtSit = palaces[sitInfo.palace].facing === period
  let pattern
  if (mAtSit && fAtFace) pattern = "旺山旺向"
  else if (mAtFace && fAtSit) pattern = "上山下水"
  else if (mAtFace && fAtFace) pattern = "双星会向"
  else pattern = "双星会坐"
  return { palaces, pattern }
}

function fmt(chart) {
  const order = [["SE","S","SW"],["E","CENTER","W"],["NE","N","NW"]]
  return order.map(row => row.map(p => {
    const s = chart.palaces[p]
    return `${s.mountain}${s.facing}|${s.base}`
  }).join("  ")).join("\n")
}

// ── 基准 1: 八运 子山午向 ────────────────────────────────────────────────────
{
  const c = computeChart(8, "子", "午")
  console.log("八运 子山午向:\n" + fmt(c))
  assert.equal(c.pattern, "双星会向", "八运子山午向应为双星会向")
  assert.equal(c.palaces.S.mountain, 8, "向宫(S)山星应为8")
  assert.equal(c.palaces.S.facing, 8, "向宫(S)向星应为8")
  assert.equal(c.palaces.N.mountain, 9, "坐宫(N)山星应为9")
  assert.equal(c.palaces.N.facing, 7, "坐宫(N)向星应为7")
  console.log("✓ 基准1 通过: 双星会向, S=88, N=97\n")
}

// ── 基准 2: 八运 乾山巽向 ────────────────────────────────────────────────────
{
  const c = computeChart(8, "乾", "巽")
  console.log("八运 乾山巽向:\n" + fmt(c))
  assert.equal(c.pattern, "旺山旺向", "八运乾山巽向应为旺山旺向")
  assert.equal(c.palaces.NW.mountain, 8, "坐宫(NW)山星应为8")
  assert.equal(c.palaces.SE.facing, 8, "向宫(SE)向星应为8")
  console.log("✓ 基准2 通过: 旺山旺向\n")
}

// ── 基准 3: 八运 午山子向 ────────────────────────────────────────────────────
{
  const c = computeChart(8, "午", "子")
  console.log("八运 午山子向:\n" + fmt(c))
  assert.equal(c.pattern, "双星会坐", "八运午山子向应为双星会坐")
  assert.equal(c.palaces.S.mountain, 8, "坐宫(S)山星应为8")
  assert.equal(c.palaces.S.facing, 8, "坐宫(S)向星应为8")
  console.log("✓ 基准3 通过: 双星会坐\n")
}

// ── 基准 4: 八运 丑山未向（旺山旺向另一例）─────────────────────────────────
{
  const c = computeChart(8, "丑", "未")
  console.log("八运 丑山未向:\n" + fmt(c))
  assert.equal(c.pattern, "旺山旺向", "八运丑山未向应为旺山旺向")
  console.log("✓ 基准4 通过: 旺山旺向\n")
}

// ── 基准 5: 九运 子山午向 ────────────────────────────────────────────────────
{
  const c = computeChart(9, "子", "午")
  console.log("九运 子山午向:\n" + fmt(c))
  // 九运坐子向午：9入中顺飞，N宫运星5，五黄寄坐(子阴)逆飞 → 山星9到坐N
  // S宫运星4，巽卦天元巽阳顺飞 → 向星9落坐宫N → 双星会坐（旺丁不旺财）
  assert.equal(c.pattern, "双星会坐", "九运子山午向应为双星会坐")
  assert.equal(c.palaces.N.mountain, 9, "坐宫(N)山星应为9")
  assert.equal(c.palaces.N.facing, 9, "坐宫(N)向星应为9")
  console.log("✓ 基准5 通过: 双星会坐, N=99\n")
}

console.log("════════════════════")
console.log("全部 5 个基准盘验证通过 ✓")
