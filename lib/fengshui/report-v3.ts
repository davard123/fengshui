/**
 * report-v3.ts — v3 综合报告生成（离线规则层）
 *
 * 输入 AssessmentV3，输出分层结构化报告：
 *   定向 → 玄空飞星 → 外局峦头 → 八宅内局 → 室内细节 → 总评
 */

import type { AssessmentV3, FocusArea, PalaceId } from "@/types/fengshui"
import {
  computeFlyingStarChart, yearToPeriod, periodLabel,
  PATTERN_MEANING, getStarCombo, getPalaceWarnings, getProsperousPalaces,
  type FlyingStarChartResult,
} from "./flying-stars"
import { runExteriorRules, type ExteriorFinding } from "./exterior-rules"
import { runBazhaiRules, type BazhaiResult } from "./bazhai-rules"
import { runInteriorRules, type InteriorFinding } from "./interior-rules"
import { degreeToMountain24 } from "./mountains-24"
import { PALACE_INFO } from "./palaces"

export type OverallRating = "大吉" | "吉" | "小吉" | "中平" | "小凶" | "凶" | "大凶"

/** 分层输出协议：每层统一结构，报告页与 AI prompt 共用 */
export type SectionReport = {
  score: number
  highlights: string[]    // 亮点（一句话/条）
  cautions: string[]      // 警示
  suggestions: string[]   // 建议
}

export type ReportV3 = {
  // 定向
  orientationText: string
  // 玄空
  flyingStars?: FlyingStarChartResult
  flyingStarSummary?: string
  palaceNotes: { palace: PalaceId; text: string; good: boolean }[]
  // 三层规则结果（原始 findings）
  exterior: ExteriorFinding[]
  bazhai: BazhaiResult | null
  interior: InteriorFinding[]
  // 分层输出协议（由 findings 汇总，报告页/AI 共用）
  sections: {
    orientation: SectionReport
    flyingStars: SectionReport
    exterior: SectionReport
    bazhai: SectionReport
    interior: SectionReport
  }
  // 汇总
  overallRating: OverallRating
  overallScore: number
  summary: string
  topActions: string[]              // 优先改善行动（≤5）
  focusScores: Partial<Record<FocusArea, number>>   // 各运势方向的净分
}

/** findings → SectionReport 汇总器 */
function toSection(findings: { name: string; score: number; location: string; description: string; suggestion?: string }[]): SectionReport {
  return {
    score: findings.reduce((s, f) => s + f.score, 0),
    highlights: findings.filter((f) => f.score > 0).map((f) => `${f.name}（${f.location}）：${f.description}`),
    cautions: findings.filter((f) => f.score < 0).map((f) => `${f.name}（${f.location}）：${f.description}`),
    suggestions: findings.filter((f) => f.score < 0 && f.suggestion).map((f) => `【${f.name}】${f.suggestion}`),
  }
}

function scoreToRating(score: number, hasSha: boolean): OverallRating {
  if (hasSha || score <= -6) return "大凶"
  if (score <= -3) return "凶"
  if (score < -1) return "小凶"
  if (score <= 1) return "中平"
  if (score <= 3) return "小吉"
  if (score <= 6) return "吉"
  return "大吉"
}

// 24山 → 8 方位（八宅用）
const MOUNTAIN_TO_DIR8: Record<string, string> = {
  壬: "N", 子: "N", 癸: "N", 丑: "NE", 艮: "NE", 寅: "NE",
  甲: "E", 卯: "E", 乙: "E", 辰: "SE", 巽: "SE", 巳: "SE",
  丙: "S", 午: "S", 丁: "S", 未: "SW", 坤: "SW", 申: "SW",
  庚: "W", 酉: "W", 辛: "W", 戌: "NW", 乾: "NW", 亥: "NW",
}

export function generateReportV3(a: AssessmentV3): ReportV3 {
  const palaceNotes: ReportV3["palaceNotes"] = []

  // ── 1. 定向 ────────────────────────────────────────────────────────────
  let orientationText = "未完成定向"
  let sittingDir8: string | null = null
  if (a.orientation) {
    const o = a.orientation
    orientationText = `坐${o.sittingMountain}向${o.facingMountain}（朝向 ${Math.round(o.facingDegree)}°${
      o.compassVerified ? "，已罗盘验证" : "，由建筑轮廓推算"
    }）`
    sittingDir8 = MOUNTAIN_TO_DIR8[o.sittingMountain] ?? null
  }

  // ── 2. 玄空飞星 ────────────────────────────────────────────────────────
  let flyingStars: FlyingStarChartResult | undefined
  let flyingStarSummary: string | undefined
  if (a.orientation && a.builtYear) {
    const period = yearToPeriod(a.builtYear)
    flyingStars = computeFlyingStarChart(period, a.orientation.sittingMountain, a.orientation.facingMountain)
    const pm = PATTERN_MEANING[flyingStars.pattern]
    flyingStarSummary = `${periodLabel(period)}${a.orientation.sittingMountain}山${a.orientation.facingMountain}向 — ${flyingStars.pattern}（${pm.rating}）。${pm.desc}`

    // 宫位注记：旺星方位 + 凶星警示 + 房间所在宫的星组合
    const prosperous = getProsperousPalaces(flyingStars)
    if (prosperous.wealthPalace) {
      palaceNotes.push({
        palace: prosperous.wealthPalace,
        text: `当运财位（向星${period}到${PALACE_INFO[prosperous.wealthPalace].label}），宜开阔/见水/常活动`,
        good: true,
      })
    }
    if (prosperous.healthPalace) {
      palaceNotes.push({
        palace: prosperous.healthPalace,
        text: `当运丁位（山星${period}到${PALACE_INFO[prosperous.healthPalace].label}），宜厚实安静，利健康人丁`,
        good: true,
      })
    }
    for (const w of getPalaceWarnings(flyingStars)) {
      if (w.palace === "CENTER") continue
      palaceNotes.push({
        palace: w.palace,
        text: `${w.label}（${PALACE_INFO[w.palace].label}）：${w.desc}`,
        good: false,
      })
    }
    // 房间所在宫的星组合（含横跨宫位）
    for (const pl of a.placements) {
      const covered = pl.palaces && pl.palaces.length > 0 ? pl.palaces : [pl.primaryPalace]
      for (const pal of covered) {
        if (pal === "CENTER") continue
        const combo = getStarCombo(flyingStars.palaces[pal])
        if (combo) {
          palaceNotes.push({
            palace: pal,
            text: `${PALACE_INFO[pal].label}宫（有${roomLabel(pl.room)}${pal !== pl.primaryPalace ? "·跨宫" : ""}）山向星${flyingStars.palaces[pal].mountain}-${flyingStars.palaces[pal].facing}：${combo.name}，${combo.desc}`,
            good: combo.rating === "吉",
          })
        }
      }
    }
  }

  // ── 3. 三层规则 ────────────────────────────────────────────────────────
  const exterior = runExteriorRules(a.external)
  const bazhai = sittingDir8 ? runBazhaiRules(sittingDir8, a.placements, a.profile) : null
  const interior = runInteriorRules(a.checklists)

  // ── 4. 汇总评分 ────────────────────────────────────────────────────────
  let total = 0
  const focusScores: Partial<Record<FocusArea, number>> = {}
  const addFocus = (areas: FocusArea[], score: number) => {
    for (const area of areas) focusScores[area] = (focusScores[area] ?? 0) + score
  }

  for (const f of exterior) { total += f.score; addFocus(f.affects, f.score) }
  if (bazhai) for (const f of bazhai.findings) { total += f.score; addFocus(f.affects, f.score) }
  for (const f of interior) { total += f.score; addFocus(f.affects, f.score) }
  if (flyingStars) {
    const pm = PATTERN_MEANING[flyingStars.pattern]
    total += pm.rating === "大吉" ? 3 : pm.rating === "凶" ? -3 : 1
  }

  const hasSha = exterior.some((f) => f.type === "煞") ||
    (flyingStars?.pattern === "上山下水")
  const overallScore = Math.max(-10, Math.min(10, total))
  const overallRating = scoreToRating(overallScore, hasSha)

  // ── 5. 总结与行动 ──────────────────────────────────────────────────────
  const negatives = [
    ...exterior.filter((f) => f.score < 0),
    ...(bazhai?.findings.filter((f) => f.score < 0) ?? []),
    ...interior.filter((f) => f.score < 0),
  ].sort((x, y) => x.score - y.score)

  const positives = [
    ...exterior.filter((f) => f.score > 0),
    ...(bazhai?.findings.filter((f) => f.score > 0) ?? []),
    ...interior.filter((f) => f.score > 0),
  ].sort((x, y) => y.score - x.score)

  let summary: string
  if (hasSha) summary = `检测到明显煞气格局（${negatives[0]?.name ?? ""}等），建议优先化解后再论吉凶。`
  else if (overallScore >= 3) summary = `整体格局偏吉：${positives.slice(0, 2).map((p) => p.name).join("、")}等有利因素明显。`
  else if (overallScore <= -2) summary = `整体偏弱，共 ${negatives.length} 处不利格局，建议按优先级逐项改善。`
  else summary = "格局中平，吉凶互现，善用旺位、化解弱点可明显提升。"

  const seen = new Set<string>()
  const topActions = negatives
    .filter((f) => "suggestion" in f && f.suggestion)
    .filter((f) => { if (seen.has(f.name)) return false; seen.add(f.name); return true })
    .slice(0, 5)
    .map((f) => `【${f.name}】${(f as { suggestion?: string }).suggestion}`)

  // ── 6. 分层输出协议 ────────────────────────────────────────────────────
  const fsPattern = flyingStars ? PATTERN_MEANING[flyingStars.pattern] : null
  const sections: ReportV3["sections"] = {
    orientation: {
      score: a.orientation?.compassVerified ? 1 : 0,
      highlights: a.orientation ? [orientationText] : [],
      cautions: a.orientation
        ? (a.orientation.compassVerified ? [] : ["坐向由轮廓推算，建议到大门口用罗盘验证一次"])
        : ["未完成定向"],
      suggestions: [],
    },
    flyingStars: {
      score: fsPattern ? (fsPattern.rating === "大吉" ? 3 : fsPattern.rating === "凶" ? -3 : 1) : 0,
      highlights: [
        ...(flyingStarSummary && fsPattern?.rating !== "凶" ? [flyingStarSummary] : []),
        ...palaceNotes.filter((n) => n.good).map((n) => n.text),
      ],
      cautions: [
        ...(flyingStarSummary && fsPattern?.rating === "凶" ? [flyingStarSummary] : []),
        ...palaceNotes.filter((n) => !n.good).map((n) => n.text),
      ],
      suggestions: fsPattern ? [fsPattern.advice] : [],
    },
    exterior: toSection(exterior),
    bazhai: toSection(bazhai?.findings ?? []),
    interior: toSection(interior),
  }

  return {
    orientationText,
    flyingStars,
    flyingStarSummary,
    palaceNotes,
    exterior,
    bazhai,
    interior,
    sections,
    overallRating,
    overallScore,
    summary,
    topActions,
    focusScores,
  }
}

function roomLabel(room: string): string {
  const M: Record<string, string> = {
    "front-door": "大门", "master-bedroom": "主卧", "kitchen": "厨房", "stove": "灶位",
    "bathroom": "卫生间", "living-room": "客厅", "study": "书房", "stairs": "楼梯",
    "garage": "车库", "kids-bedroom": "儿童房",
  }
  return M[room] ?? room
}

// 评级配色（沿用 v2 风格）
export const RATING_COLOR_V3: Record<OverallRating, string> = {
  大吉: "#1a6b3a", 吉: "#2d8a50", 小吉: "#4aaa70",
  中平: "#8d6b4c", 小凶: "#c87820", 凶: "#c04010", 大凶: "#880000",
}
export const RATING_BG_V3: Record<OverallRating, string> = {
  大吉: "#d4edda", 吉: "#d4edda", 小吉: "#e8f5e9",
  中平: "#f0e8da", 小凶: "#fff3e0", 凶: "#fdecea", 大凶: "#ffd6d6",
}
