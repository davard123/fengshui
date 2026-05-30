/**
 * rule-engine.ts
 *
 * 固定风水推算层（不依赖 AI）。
 * 输入：已收集的站点数据 + 用户命卦
 * 输出：结构化发现 → 作为上下文注入 AI Prompt
 *
 * 覆盖两大流派：
 *   1. 八宅派（人-宅匹配、各方位星盘能量）
 *   2. 巒头派（形势标记：路冲、反弓、藏风聚气等）
 */

import type { StandingPoint, UserProfile } from "@/types/fengshui"
import { isQuickModeProfile } from "./quickmode"

// ── 类型 ────────────────────────────────────────────────────────────────────

export type SectorEnergy =
  | "生气" | "延年" | "天医" | "伏位"   // 四吉
  | "祸害" | "六煞" | "五鬼" | "绝命"   // 四凶

export type EnergyRating = "大吉" | "吉" | "小吉" | "凶" | "大凶"

export type DirectionAnalysis = {
  direction: string        // "N" / "NE" / 山名 等
  elements: string[]       // 用户标记的内容
  flags: string[]          // 推导出的标签，如 "路冲" / "水口在财位"
  energyLabel?: string     // 如 "生气（最吉）"
  score: number            // -2 ~ +2
  tip?: string             // 一句话点评
}

export type RuleEngineResult = {
  // 是否快速模式（未填写真实命卦）— 若为 true，下面命卦相关字段不应被使用
  isQuickMode: boolean

  // ── 命卦分析 ──────────────────────────────────────────────────
  kuaGroup: "东四命" | "西四命"
  personalAuspicious: string[]   // 4个吉方（按 生气>延年>天医>伏位）
  personalInauspicious: string[] // 4个凶方（按 绝命>五鬼>六煞>祸害）

  // ── 坐向 & 八宅 ──────────────────────────────────────────────
  houseSitting?: string          // 坐山（由室外站点的罗盘反推）
  houseFacing?: string           // 朝向山名
  houseGroup?: "东四宅" | "西四宅"
  groupMatch?: boolean           // 人宅同组 → 相配
  sectorEnergies?: Record<string, SectorEnergy>  // 8方位 → 八宅星

  // ── 方位逐个分析 ──────────────────────────────────────────────
  directionAnalyses: DirectionAnalysis[]

  // ── 汇总 ─────────────────────────────────────────────────────
  positives: string[]    // 优点要点（给 AI 直接引用）
  warnings: string[]     // 问题要点
  overallScore: number   // 粗略综合得分 -10 ~ +10（AI可以忽略，仅供参考）
}

// ── 八宅游年表 ─────────────────────────────────────────────────────────────
// key: 坐山所属8方位（N/NE/E/SE/S/SW/W/NW）
// value: 8方位对应的八宅星能量
const EIGHT_MANSIONS: Record<string, Record<string, SectorEnergy>> = {
  N:  { N:"伏位", NE:"六煞", E:"天医", SE:"延年", S:"生气", SW:"绝命", W:"祸害", NW:"五鬼" }, // 坎宅
  NE: { NE:"伏位", N:"六煞", NW:"天医", W:"延年", SW:"生气", S:"绝命", SE:"祸害", E:"五鬼" }, // 艮宅
  E:  { E:"伏位", SE:"生气", S:"延年", N:"天医", NE:"绝命", NW:"祸害", W:"五鬼", SW:"六煞" }, // 震宅
  SE: { SE:"伏位", E:"天医", N:"延年", S:"生气", SW:"五鬼", W:"绝命", NW:"祸害", NE:"六煞" }, // 巽宅
  S:  { S:"伏位", SW:"天医", W:"延年", NW:"生气", N:"绝命", NE:"五鬼", E:"祸害", SE:"六煞" }, // 离宅
  SW: { SW:"伏位", S:"六煞", SE:"五鬼", E:"绝命", N:"祸害", NE:"延年", NW:"天医", W:"生气" }, // 坤宅
  W:  { W:"伏位", NW:"生气", SW:"延年", NE:"天医", S:"祸害", N:"绝命", SE:"五鬼", E:"六煞" }, // 兑宅
  NW: { NW:"伏位", W:"天医", NE:"延年", SW:"生气", S:"祸害", N:"五鬼", SE:"绝命", E:"六煞" }, // 乾宅
}

const HOUSE_GROUP: Record<string, "东四宅" | "西四宅"> = {
  N:"东四宅", E:"东四宅", SE:"东四宅", S:"东四宅",
  NE:"西四宅", SW:"西四宅", W:"西四宅", NW:"西四宅",
}

// ── 命卦方向表 ──────────────────────────────────────────────────────────────
// 每个命卦对应的吉方（生气/延年/天医/伏位）和凶方（绝命/五鬼/六煞/祸害）
type KuaDirs = { auspicious: string[]; inauspicious: string[]; group: "东四命" | "西四命" }

const KUA_DIRECTIONS: Record<number, KuaDirs> = {
  1: { group:"东四命", auspicious:["SE","E","S","N"],   inauspicious:["SW","NE","NW","W"]   },
  2: { group:"西四命", auspicious:["NE","W","NW","SW"],  inauspicious:["N","S","SE","E"]     },
  3: { group:"东四命", auspicious:["S","N","SE","E"],   inauspicious:["NE","NW","SW","W"]   },  // 修正：绝命NE
  4: { group:"东四命", auspicious:["N","S","E","SE"],   inauspicious:["W","NE","SW","NW"]   },
  // 5 男同2，女同8（在调用前外部已转换）
  6: { group:"西四命", auspicious:["W","NE","SW","NW"],  inauspicious:["S","N","SE","E"]     },
  7: { group:"西四命", auspicious:["NW","SW","NE","W"],  inauspicious:["E","SE","N","S"]     },
  8: { group:"西四命", auspicious:["SW","NW","W","NE"],  inauspicious:["SE","E","N","S"]     },
  9: { group:"东四命", auspicious:["E","SE","N","S"],   inauspicious:["W","NW","SW","NE"]   },
}

const ENERGY_LABELS: Record<SectorEnergy, string> = {
  生气:"生气（最吉·财旺）", 延年:"延年（吉·婚姻健康）",
  天医:"天医（吉·健康贵人）", 伏位:"伏位（小吉·稳定）",
  祸害:"祸害（凶·小灾）", 六煞:"六煞（凶·损财）",
  五鬼:"五鬼（凶·病灾）", 绝命:"绝命（大凶）",
}

// ── 巒头形势规则 ────────────────────────────────────────────────────────────
// 根据元素关键词推导形势标签

type ElementRule = {
  keywords: string[]       // 匹配任一关键词即触发
  flag: string             // 显示标签
  score: number            // 对该方位的得分影响
  tip: string              // 解释
}

// ⚠ 仅记录中性事实，不自动定性为"煞"。真正的"煞"由 patterns.ts 中的格局规则判定，
// 因为格局判断需要结合方向、距离、是否在facing位等多维条件，简单关键词不够准。
const OUTDOOR_RULES: ElementRule[] = [
  // 明确的方向性凶格（用户手动标记，可信）
  { keywords:["T字路口正对"],       flag:"路冲",       score:-2,   tip:"T字路冲大门，主动荡、口舌" },
  { keywords:["弯道背离大门"],      flag:"反弓",       score:-1.5, tip:"弓背朝向，主离散" },
  { keywords:["弯道朝向大门"],      flag:"玉带",       score:+1.5, tip:"弯道环抱，聚气聚财" },

  // 中性事实记录 — 不定性，让格局规则判断
  { keywords:["高速公路"],          flag:"近高速",     score:-0.3, tip:"高速公路较近，气场较动" },
  { keywords:["主干道"],            flag:"近主干道",   score:-0.1, tip:"主干道附近，交通便利但气场较动" },
  { keywords:["水(湖河海)"],        flag:"水",         score:+0.5, tip:"有水则财气流通" },
  { keywords:["小溪水渠"],          flag:"小溪",       score:+0.3, tip:"细流，需结合方向判断" },
  { keywords:["山/高地"],           flag:"山/高地",    score:+0.5, tip:"高地需结合是否在坐山方判断" },
  { keywords:["空地/开阔"],         flag:"开阔",       score:+0.5, tip:"开阔地需结合是否在朝向方判断" },
  { keywords:["树林"],              flag:"树林",       score:+0.3, tip:"林木有助藏风" },

  // 明确的近距离凶（OSM 阈值已限定距离）
  { keywords:["墓地"],              flag:"近墓地",     score:-2,   tip:"阴气较重，需化解" },
  { keywords:["高压线"],            flag:"近高压线",   score:-1,   tip:"电磁场影响" },
  { keywords:["尖顶建筑"],          flag:"尖角",       score:-0.8, tip:"需观察是否正对" },
  { keywords:["加油站"],            flag:"近加油站",   score:-0.3, tip:"五行属火，需观察位置" },
  { keywords:["高楼"],              flag:"近高楼",     score:-0.3, tip:"高楼可能压抑或为玄武靠山" },
]

const INDOOR_RULES: ElementRule[] = [
  // 大门直冲
  { keywords:["大门"],              flag:"气口",   score:0,  tip:"大门为气口，朝向至关重要" },
  // 穿堂 (需结合两端)
  { keywords:["阳台门","落地窗"],   flag:"可能穿堂",score:-0.5, tip:"前后通透需注意穿堂风" },
  // 卫生间
  { keywords:["卫生间门"],          flag:"秽气",  score:-0.5,tip:"卫生间位置影响对应方位运势" },
  // 楼梯
  { keywords:["楼梯↓","楼梯↑"],    flag:"楼梯",  score:-0.5,tip:"楼梯影响气流走向" },
  // 实墙
  { keywords:["实墙"],              flag:"有靠",  score:+0.5,tip:"实墙为靠，主稳定" },
  // 窗户/开阔
  { keywords:["窗户","落地窗"],     flag:"采光开阔",score:+0.5,tip:"采光好，气流畅通" },
  // 厨房
  { keywords:["灶台"],              flag:"灶位",  score:0,  tip:"灶位朝向影响家运" },
  { keywords:["水槽"],              flag:"水位",  score:0,  tip:"水位与灶位宜分开" },
]

// 水火相冲检测（跨方位）
function detectWaterFire(point: StandingPoint): string | null {
  const allElements = point.directions.flatMap((d) => d.elements)
  const hasStove  = allElements.some((e) => e.includes("灶台"))
  const hasSink   = allElements.some((e) => e.includes("水槽"))
  if (hasStove && hasSink) {
    // 简化：同一站点同时有灶台和水槽，检查是否在相邻/对冲方向
    return "水火同处：灶台与水槽同区域，水火相冲，主口舌是非"
  }
  return null
}

// 穿堂风检测（室内：大门方向与阳台/落地窗对冲）
function detectDraftThrough(point: StandingPoint): string | null {
  const hasDoor  = point.directions.some((d) => d.elements.includes("大门"))
  const hasBack  = point.directions.some((d) =>
    d.elements.some((e) => ["阳台门", "落地窗"].includes(e))
  )
  // 简化：同时有大门和阳台门则标记
  if (hasDoor && hasBack) return "前后通透：注意穿堂风格局，气难聚"
  return null
}

// ── 方向标准化：把 24山名/8方位名 转为 N/NE/E/SE/S/SW/W/NW ───────────────
const MOUNTAIN_TO_8DIR: Record<string, string> = {
  // 北
  壬:"N", 子:"N", 癸:"N",
  // 东北
  丑:"NE", 艮:"NE", 寅:"NE",
  // 东
  甲:"E", 卯:"E", 乙:"E",
  // 东南
  辰:"SE", 巽:"SE", 巳:"SE",
  // 南
  丙:"S", 午:"S", 丁:"S",
  // 西南
  未:"SW", 坤:"SW", 申:"SW",
  // 西
  庚:"W", 酉:"W", 辛:"W",
  // 西北
  戌:"NW", 乾:"NW", 亥:"NW",
  // 8方位直接映射
  N:"N", NE:"NE", E:"E", SE:"SE", S:"S", SW:"SW", W:"W", NW:"NW",
}

const DIR_LABELS: Record<string, string> = {
  N:"北", NE:"东北", E:"东", SE:"东南", S:"南", SW:"西南", W:"西", NW:"西北",
}

// ── 主函数 ──────────────────────────────────────────────────────────────────
export function runRuleEngine(
  standingPoints: StandingPoint[],
  profile: UserProfile,
): RuleEngineResult {
  // 是否为快速模式（未填写真实出生信息）
  const isQuick = isQuickModeProfile(profile)

  // 1. 命卦方向
  let kua = profile.kuaNumber
  // 命卦5：男→2，女→8
  if (kua === 5) kua = profile.gender === "male" ? 2 : 8
  const kuaDirs = KUA_DIRECTIONS[kua] ?? KUA_DIRECTIONS[1]

  // 2. 找室外站点（outdoor）来确定坐向
  const outdoorPoint = standingPoints.find((p) => p.type === "outdoor")
  let houseSitting: string | undefined
  let houseFacing: string | undefined
  let houseGroup: "东四宅" | "西四宅" | undefined
  let sectorEnergies: Record<string, SectorEnergy> | undefined
  let groupMatch: boolean | undefined

  if (outdoorPoint) {
    // 室外站点的罗盘朝向 = 大门朝向（面）；坐向 = 朝向 + 180°
    const facingDir8 = MOUNTAIN_TO_8DIR[outdoorPoint.compassDirection] ?? outdoorPoint.compassDirection
    houseFacing = facingDir8
    // 坐向是朝向的对面
    const OPPOSITE: Record<string, string> = {
      N:"S", S:"N", E:"W", W:"E", NE:"SW", SW:"NE", SE:"NW", NW:"SE",
    }
    houseSitting = OPPOSITE[facingDir8]
    houseGroup = houseSitting ? HOUSE_GROUP[houseSitting] : undefined
    sectorEnergies = houseSitting ? EIGHT_MANSIONS[houseSitting] : undefined
    // 仅当用户填写了真实命卦时，才计算人宅匹配
    groupMatch = isQuick
      ? undefined
      : (houseGroup && kuaDirs.group.startsWith(houseGroup.slice(0,2))) ? true : false
  }

  // 3. 逐方位分析（对所有站点汇总）
  const directionAnalyses: DirectionAnalysis[] = []
  const positives: string[] = []
  const warnings: string[] = []

  for (const point of standingPoints) {
    const isOutdoor = point.type === "outdoor"
    const rules = isOutdoor ? OUTDOOR_RULES : INDOOR_RULES

    for (const de of point.directions) {
      if (de.elements.length === 0) continue

      const dir8 = MOUNTAIN_TO_8DIR[de.direction] ?? de.direction
      const energy = sectorEnergies?.[dir8]

      // 匹配元素规则
      const flags: string[] = []
      let score = energy
        ? (["生气","延年","天医","伏位"].includes(energy) ? 0.5 : -0.5)
        : 0
      const tips: string[] = []

      for (const rule of rules) {
        if (rule.keywords.some((kw) => de.elements.includes(kw))) {
          flags.push(rule.flag)
          score += rule.score
          tips.push(rule.tip)
        }
      }

      // 命卦方向加权（仅在真实命卦时启用）
      if (!isQuick) {
        const isPersonalGood = kuaDirs.auspicious.includes(dir8)
        const isPersonalBad  = kuaDirs.inauspicious.includes(dir8)
        if (isPersonalGood)  { score += 0.5; flags.push(`命卦吉方`) }
        if (isPersonalBad)   { score -= 0.5; flags.push(`命卦凶方`) }
      }

      const analysis: DirectionAnalysis = {
        direction: de.direction,
        elements: de.elements,
        flags,
        energyLabel: energy ? ENERGY_LABELS[energy] : undefined,
        score: Math.max(-2, Math.min(2, score)),
        tip: tips[0], // 取最显著的提示
      }
      directionAnalyses.push(analysis)

      // 汇总
      if (score >= 1) {
        positives.push(`${de.direction}方（${point.label}）：${flags.join("、")}，利好`)
      } else if (score <= -1) {
        warnings.push(`${de.direction}方（${point.label}）：${flags.join("、")}，需注意`)
      }
    }

    // 特殊跨方位检测
    const wf = detectWaterFire(point)
    const dt = detectDraftThrough(point)
    if (wf) warnings.push(`${point.label}：${wf}`)
    if (dt) warnings.push(`${point.label}：${dt}`)
  }

  // 4. 人宅匹配（仅真实命卦时输出）
  if (!isQuick) {
    if (groupMatch === false) {
      warnings.push(`人宅不配：命卦属${kuaDirs.group}，房屋属${houseGroup}，气场相克，宜加强趋吉化煞`)
    } else if (groupMatch === true) {
      positives.push(`人宅相配：命卦与房屋同属${kuaDirs.group}，基础格局吉`)
    }
  }

  // 5. 大门朝向是否对命卦有利（仅真实命卦时输出）
  if (!isQuick && houseFacing) {
    if (kuaDirs.auspicious[0] === houseFacing) {
      positives.push(`大门朝向${DIR_LABELS[houseFacing] ?? houseFacing}，正对命卦生气方，极佳`)
    } else if (kuaDirs.inauspicious.includes(houseFacing)) {
      warnings.push(`大门朝向${DIR_LABELS[houseFacing] ?? houseFacing}，属命卦凶方，建议化解`)
    }
  }

  const overallScore = (positives.length - warnings.length * 1.5)

  return {
    isQuickMode:         isQuick,
    kuaGroup:            kuaDirs.group,
    personalAuspicious:  kuaDirs.auspicious,
    personalInauspicious:kuaDirs.inauspicious,
    houseSitting,
    houseFacing,
    houseGroup,
    groupMatch,
    sectorEnergies,
    directionAnalyses,
    positives,
    warnings,
    overallScore,
  }
}

// ── 工具：把规则引擎结果格式化为 Prompt 文本块 ─────────────────────────────
export function formatRuleResultForPrompt(r: RuleEngineResult): string {
  const lines: string[] = []

  // 命卦相关部分仅在用户填写真实出生信息时才输出
  if (!r.isQuickMode) {
    lines.push(`【命卦推算】`)
    lines.push(`命卦属${r.kuaGroup}`)
    lines.push(`个人吉方：${r.personalAuspicious.join("、")}（生气/延年/天医/伏位）`)
    lines.push(`个人凶方：${r.personalInauspicious.join("、")}（绝命/五鬼/六煞/祸害）`)
  } else {
    lines.push(`【说明】用户未填写出生年份与性别，本次仅基于环境格局分析，不涉及命卦、人宅匹配。`)
  }

  if (r.houseSitting) {
    lines.push(``)
    lines.push(r.isQuickMode ? `【坐向】` : `【八宅推算】`)
    if (r.isQuickMode) {
      lines.push(`坐${DIR_LABELS[r.houseSitting] ?? r.houseSitting}朝${DIR_LABELS[r.houseFacing!] ?? r.houseFacing}`)
    } else {
      lines.push(`坐${DIR_LABELS[r.houseSitting] ?? r.houseSitting}朝${DIR_LABELS[r.houseFacing!] ?? r.houseFacing}，属${r.houseGroup}`)
      lines.push(`人宅匹配：${r.groupMatch ? "✓ 相配" : "✗ 不配"}`)
      if (r.sectorEnergies) {
        lines.push(`各方位八宅星：`)
        for (const [dir, energy] of Object.entries(r.sectorEnergies)) {
          lines.push(`  ${DIR_LABELS[dir] ?? dir}（${dir}）：${energy}`)
        }
      }
    }
  }

  if (r.directionAnalyses.length > 0) {
    lines.push(``)
    lines.push(`【各方位形势】`)
    for (const d of r.directionAnalyses) {
      const flagStr = d.flags.length > 0 ? `→ ${d.flags.join("、")}` : ""
      lines.push(`${d.direction}方：${d.elements.join("、")} ${flagStr}`)
      if (!r.isQuickMode && d.energyLabel) lines.push(`  八宅：${d.energyLabel}`)
    }
  }

  if (r.positives.length > 0) {
    lines.push(``)
    lines.push(`【已识别优势】`)
    r.positives.forEach((p) => lines.push(`✓ ${p}`))
  }

  if (r.warnings.length > 0) {
    lines.push(``)
    lines.push(`【已识别问题】`)
    r.warnings.forEach((w) => lines.push(`⚠ ${w}`))
  }

  return lines.join("\n")
}
