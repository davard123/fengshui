/**
 * flying-stars.ts — 玄空飞星（下卦盘）
 *
 * 算法（沈氏玄空标准下卦排盘）：
 *   1. 由建造/入住年代定元运（三元九运）
 *   2. 运星入中宫，顺飞九宫 → 运盘
 *   3. 坐山所在宫的运盘星入中，按该星卦的对应元龙阴阳定顺逆 → 山星盘
 *   4. 向首所在宫的运盘星入中，同理 → 向星盘
 *   5. 判定格局：旺山旺向 / 上山下水 / 双星会向 / 双星会坐
 *
 * 验证基准（写代码时已手工核对）：
 *   八运乾山巽向 → 旺山旺向（山星8到坐NW，向星8到向SE）
 *   八运子山午向 → 双星会向（山8向8同到向宫S）
 */

import type { PalaceId } from "@/types/fengshui"

// ── 三元九运 ─────────────────────────────────────────────────────────────────
// 每运 20 年。九运 2024–2043。
const PERIOD_TABLE: { period: number; start: number; end: number }[] = [
  { period: 1, start: 1864, end: 1883 },
  { period: 2, start: 1884, end: 1903 },
  { period: 3, start: 1904, end: 1923 },
  { period: 4, start: 1924, end: 1943 },
  { period: 5, start: 1944, end: 1963 },
  { period: 6, start: 1964, end: 1983 },
  { period: 7, start: 1984, end: 2003 },
  { period: 8, start: 2004, end: 2023 },
  { period: 9, start: 2024, end: 2043 },
]

export function yearToPeriod(year: number): number {
  const hit = PERIOD_TABLE.find((p) => year >= p.start && year <= p.end)
  if (hit) return hit.period
  // 超出范围循环推算（180年一轮）
  let y = year
  while (y < 1864) y += 180
  while (y > 2043) y -= 180
  return PERIOD_TABLE.find((p) => y >= p.start && y <= p.end)?.period ?? 9
}

export function periodLabel(period: number): string {
  const NAMES = ["一", "二", "三", "四", "五", "六", "七", "八", "九"]
  return `${NAMES[period - 1]}运`
}

// ── 洛书飞泊顺序 ─────────────────────────────────────────────────────────────
// 入中后按洛书数序飞：中5 → 乾6(NW) → 兑7(W) → 艮8(NE) → 离9(S)
//                    → 坎1(N) → 坤2(SW) → 震3(E) → 巽4(SE) → 回中
const FLY_PATH: PalaceId[] = ["CENTER", "NW", "W", "NE", "S", "N", "SW", "E", "SE"]

/** star 入中，forward=顺飞，返回每宫的星 */
function flyStar(star: number, forward: boolean): Record<PalaceId, number> {
  const out = {} as Record<PalaceId, number>
  for (let i = 0; i < 9; i++) {
    let v = forward ? star + i : star - i
    v = ((v - 1) % 9 + 9) % 9 + 1   // wrap 到 1-9
    out[FLY_PATH[i]] = v
  }
  return out
}

// ── 24山 → 宫位 + 元龙 + 阴阳 ────────────────────────────────────────────────
// 每卦 3 山，顺序为 地元 / 天元 / 人元
// 阴阳规律：地元 壬甲丙庚=阳 辰戌丑未=阴；天元 子午卯酉=阴 乾坤艮巽=阳；
//          人元 乙辛丁癸=阴 寅申巳亥=阳
type YuanLong = "地元" | "天元" | "人元"

const MOUNTAIN_INFO: Record<string, { palace: PalaceId; yuan: YuanLong; yang: boolean }> = {
  // 坎宫（北）
  壬: { palace: "N", yuan: "地元", yang: true },
  子: { palace: "N", yuan: "天元", yang: false },
  癸: { palace: "N", yuan: "人元", yang: false },
  // 艮宫（东北）
  丑: { palace: "NE", yuan: "地元", yang: false },
  艮: { palace: "NE", yuan: "天元", yang: true },
  寅: { palace: "NE", yuan: "人元", yang: true },
  // 震宫（东）
  甲: { palace: "E", yuan: "地元", yang: true },
  卯: { palace: "E", yuan: "天元", yang: false },
  乙: { palace: "E", yuan: "人元", yang: false },
  // 巽宫（东南）
  辰: { palace: "SE", yuan: "地元", yang: false },
  巽: { palace: "SE", yuan: "天元", yang: true },
  巳: { palace: "SE", yuan: "人元", yang: true },
  // 离宫（南）
  丙: { palace: "S", yuan: "地元", yang: true },
  午: { palace: "S", yuan: "天元", yang: false },
  丁: { palace: "S", yuan: "人元", yang: false },
  // 坤宫（西南）
  未: { palace: "SW", yuan: "地元", yang: false },
  坤: { palace: "SW", yuan: "天元", yang: true },
  申: { palace: "SW", yuan: "人元", yang: true },
  // 兑宫（西）
  庚: { palace: "W", yuan: "地元", yang: true },
  酉: { palace: "W", yuan: "天元", yang: false },
  辛: { palace: "W", yuan: "人元", yang: false },
  // 乾宫（西北）
  戌: { palace: "NW", yuan: "地元", yang: false },
  乾: { palace: "NW", yuan: "天元", yang: true },
  亥: { palace: "NW", yuan: "人元", yang: true },
}

// 星数(1-9) → 卦宫（5 无卦，特殊处理）
const STAR_TO_PALACE: Record<number, PalaceId | null> = {
  1: "N", 2: "SW", 3: "E", 4: "SE", 5: null, 6: "NW", 7: "W", 8: "NE", 9: "S",
}

// 宫位 → 该卦三山（地/天/人 顺序）
const PALACE_MOUNTAINS: Record<PalaceId, string[]> = {
  N: ["壬", "子", "癸"], NE: ["丑", "艮", "寅"], E: ["甲", "卯", "乙"],
  SE: ["辰", "巽", "巳"], S: ["丙", "午", "丁"], SW: ["未", "坤", "申"],
  W: ["庚", "酉", "辛"], NW: ["戌", "乾", "亥"],
  CENTER: [],
}

const YUAN_INDEX: Record<YuanLong, number> = { 地元: 0, 天元: 1, 人元: 2 }

/**
 * 判定入中星的飞行方向（顺/逆）
 * 规则：入中星对应卦宫中、与坐(向)山同元龙的那座山，其阴阳定顺逆（阳顺阴逆）。
 * 五黄入中：无卦可循，以坐(向)山本身的阴阳定顺逆（五黄寄坐向）。
 */
function flyDirection(starIntoCenter: number, refMountain: string): boolean {
  const ref = MOUNTAIN_INFO[refMountain]
  if (!ref) throw new Error(`未知山名: ${refMountain}`)
  if (starIntoCenter === 5) {
    return ref.yang   // 五黄寄坐/向
  }
  const palace = STAR_TO_PALACE[starIntoCenter]!
  const mountain = PALACE_MOUNTAINS[palace][YUAN_INDEX[ref.yuan]]
  return MOUNTAIN_INFO[mountain].yang
}

// ── 排盘主函数 ───────────────────────────────────────────────────────────────
export type PalaceStars = { mountain: number; facing: number; base: number }
export type ChartPattern = "旺山旺向" | "上山下水" | "双星会向" | "双星会坐"

export type FlyingStarChartResult = {
  period: number
  sittingMountain: string
  facingMountain: string
  palaces: Record<PalaceId, PalaceStars>
  pattern: ChartPattern
}

export function computeFlyingStarChart(
  period: number,
  sittingMountain: string,   // 坐山，如 "子"
  facingMountain: string,    // 向首，如 "午"
): FlyingStarChartResult {
  const sitInfo = MOUNTAIN_INFO[sittingMountain]
  const faceInfo = MOUNTAIN_INFO[facingMountain]
  if (!sitInfo || !faceInfo) throw new Error(`未知山名: ${sittingMountain}/${facingMountain}`)

  // 1. 运盘：运星入中顺飞
  const base = flyStar(period, true)

  // 2. 山星盘：坐山宫的运盘星入中
  const sitStar = base[sitInfo.palace]
  const mountainChart = flyStar(sitStar, flyDirection(sitStar, sittingMountain))

  // 3. 向星盘：向首宫的运盘星入中
  const faceStar = base[faceInfo.palace]
  const facingChart = flyStar(faceStar, flyDirection(faceStar, facingMountain))

  // 4. 合并
  const palaces = {} as Record<PalaceId, PalaceStars>
  for (const p of FLY_PATH) {
    palaces[p] = { mountain: mountainChart[p], facing: facingChart[p], base: base[p] }
  }

  // 5. 格局判定：当运星(period)落在哪里
  const mountainAtSit = palaces[sitInfo.palace].mountain === period   // 旺山星到坐
  const facingAtFace = palaces[faceInfo.palace].facing === period     // 旺向星到向
  const mountainAtFace = palaces[faceInfo.palace].mountain === period // 山星上向（上山）
  const facingAtSit = palaces[sitInfo.palace].facing === period       // 向星下坐（下水）

  let pattern: ChartPattern
  if (mountainAtSit && facingAtFace) pattern = "旺山旺向"
  else if (mountainAtFace && facingAtSit) pattern = "上山下水"
  else if (mountainAtFace && facingAtFace) pattern = "双星会向"
  else pattern = "双星会坐"

  return { period, sittingMountain, facingMountain, palaces, pattern }
}

// ── 格局解读 ────────────────────────────────────────────────────────────────
export const PATTERN_MEANING: Record<ChartPattern, { rating: "大吉" | "凶" | "小吉"; desc: string; advice: string }> = {
  旺山旺向: {
    rating: "大吉",
    desc: "当运山星到坐、向星到向，丁财两旺，是玄空最理想格局。",
    advice: "宜坐后有靠（实墙/高地）、向前开阔或见水，格局之力可全部发挥。",
  },
  上山下水: {
    rating: "凶",
    desc: "山星上向、向星下坐，丁财皆不得位，传统视为损丁破财之局。",
    advice: "若向方反有山、坐方反有水（颠倒地形）可化解；否则宜在坐方加强水景、向方布置厚重物件以补救。",
  },
  双星会向: {
    rating: "小吉",
    desc: "山向两星同到向首，旺财不旺丁，利事业财运、人丁稍弱。",
    advice: "向方宜先见水再见山（如前院水景+远处楼房），可财丁兼收。",
  },
  双星会坐: {
    rating: "小吉",
    desc: "山向两星同到坐山，旺丁不旺财，利健康人丁、财运稍弱。",
    advice: "坐后宜先见水再见山；室内可在坐方设鱼缸/流水增财。",
  },
}

// ── 山向星组合吉凶（最常用组合）──────────────────────────────────────────────
// key: `${山星}-${向星}`
export const STAR_COMBOS: Record<string, { rating: "吉" | "凶" | "中"; name: string; desc: string }> = {
  "1-6": { rating: "吉", name: "文昌魁星", desc: "利读书考试、文职升迁" },
  "6-1": { rating: "吉", name: "文昌魁星", desc: "利读书考试、文职升迁" },
  "1-4": { rating: "吉", name: "文昌科名", desc: "一四同宫，利科甲文名" },
  "4-1": { rating: "吉", name: "文昌科名", desc: "一四同宫，利科甲文名" },
  "8-9": { rating: "吉", name: "喜庆临门", desc: "当元旺气逢生气，主喜事、置业" },
  "9-8": { rating: "吉", name: "喜庆临门", desc: "当元旺气逢生气，主喜事、置业" },
  "1-8": { rating: "吉", name: "财禄丰盈", desc: "白水生旺土，利财富积累" },
  "8-1": { rating: "吉", name: "财禄丰盈", desc: "白水生旺土，利财富积累" },
  "6-8": { rating: "吉", name: "武贵进财", desc: "金土相生，利权职与不动产" },
  "8-6": { rating: "吉", name: "武贵进财", desc: "金土相生，利权职与不动产" },
  "2-5": { rating: "凶", name: "病符灾星", desc: "二五交加，主疾病缠绵，卧室厨房尤忌" },
  "5-2": { rating: "凶", name: "病符灾星", desc: "二五交加，主疾病缠绵，卧室厨房尤忌" },
  "6-7": { rating: "凶", name: "交剑煞", desc: "两金相战，主口角官非、利器之伤" },
  "7-6": { rating: "凶", name: "交剑煞", desc: "两金相战，主口角官非、利器之伤" },
  "2-3": { rating: "凶", name: "斗牛煞", desc: "土木相克，主是非争执、官讼" },
  "3-2": { rating: "凶", name: "斗牛煞", desc: "土木相克，主是非争执、官讼" },
  "7-9": { rating: "凶", name: "火金相战", desc: "主火灾隐患、心肺之疾，厨房尤忌" },
  "9-7": { rating: "凶", name: "火金相战", desc: "主火灾隐患、心肺之疾，厨房尤忌" },
  "3-7": { rating: "凶", name: "穿心煞", desc: "金木交战，主盗劫、手足之伤" },
  "7-3": { rating: "凶", name: "穿心煞", desc: "金木交战，主盗劫、手足之伤" },
}

/** 取某宫的组合吉凶（无命中常用组合则返回 null） */
export function getStarCombo(stars: PalaceStars) {
  return STAR_COMBOS[`${stars.mountain}-${stars.facing}`] ?? null
}

/** 宫位级警示：当运的五黄、二黑所在宫 */
export function getPalaceWarnings(chart: FlyingStarChartResult): { palace: PalaceId; star: number; label: string; desc: string }[] {
  const out: { palace: PalaceId; star: number; label: string; desc: string }[] = []
  for (const p of FLY_PATH) {
    const s = chart.palaces[p]
    if (s.facing === 5 || s.mountain === 5) {
      out.push({ palace: p, star: 5, label: "五黄煞位", desc: "此宫忌动土、忌设卧室厨房，宜静不宜动" })
    } else if (s.facing === 2 || s.mountain === 2) {
      out.push({ palace: p, star: 2, label: "二黑病符", desc: "此宫与健康相关，卧室在此宜多通风采光" })
    }
  }
  return out
}

/** 找当运旺星方位（向星=当运 → 财位；山星=当运 → 丁位） */
export function getProsperousPalaces(chart: FlyingStarChartResult): { wealthPalace: PalaceId | null; healthPalace: PalaceId | null } {
  let wealthPalace: PalaceId | null = null
  let healthPalace: PalaceId | null = null
  for (const p of FLY_PATH) {
    if (p === "CENTER") continue
    if (chart.palaces[p].facing === chart.period) wealthPalace = p
    if (chart.palaces[p].mountain === chart.period) healthPalace = p
  }
  return { wealthPalace, healthPalace }
}
