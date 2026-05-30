/**
 * free-report.ts — 免费规则报告（离线，无需 AI）
 * 运行所有格局规则，按用户关注的运势方向输出重点报告
 */

import type { StandingPoint, UserProfile, FocusArea } from "@/types/fengshui"
import { runRuleEngine } from "./rule-engine"
import { ALL_PATTERNS, type PatternResult, type PatternType } from "./patterns"

export type OverallRating = "大吉" | "吉" | "小吉" | "中平" | "小凶" | "凶" | "大凶"

// 针对某个运势方向的专项分析
export type FocusInsight = {
  area:        FocusArea
  rating:      OverallRating
  score:       number
  findings:    PatternResult[]  // 与该运势相关的格局
  summary:     string           // 一句话点评
}

export type FreeReport = {
  overallRating:  OverallRating
  score:          number
  allFindings:    PatternResult[]
  sha:            PatternResult[]
  inauspicious:   PatternResult[]
  auspicious:     PatternResult[]
  focusInsights:  FocusInsight[]   // 按关注运势的专项分析
  quickTips:      string[]
  summary:        string
}

// 运势方向 → 古籍点评模板
const AREA_COMMENTS: Record<FocusArea, { good: string; bad: string; neutral: string }> = {
  "财运":     { good:"财路通畅，积累有利", bad:"财气受阻，需防漏财耗损", neutral:"财运平稳，宜守不宜冒进" },
  "事业官运": { good:"官星有力，晋升机遇多", bad:"事业受制，贵人难遇", neutral:"事业稳定，按部就班" },
  "婚姻感情": { good:"感情和谐，婚姻稳固", bad:"感情有扰，易生摩擦口角", neutral:"感情平淡，需主动经营" },
  "家庭子女": { good:"家庭和睦，子女聪慧", bad:"家宅不安，子女运势需关注", neutral:"家庭平稳，子女自立" },
  "健康":     { good:"气场清明，健康有保障", bad:"煞气影响健康，需加强化解", neutral:"健康平稳，注意作息规律" },
  "学业文昌": { good:"文昌得力，学业顺遂", bad:"文昌受压，学习需加倍努力", neutral:"学业平稳，靠自身努力" },
  "贵人人际": { good:"贵人方旺，人际关系佳", bad:"贵人方受阻，需主动拓展", neutral:"贵人时有，把握时机" },
  "出行安全": { good:"出行方位吉，动态运势佳", bad:"出行需谨慎，动态方位有煞", neutral:"出行平安，保持谨慎" },
}

function scoreToRating(score: number, hasSha: boolean): OverallRating {
  if (hasSha || score <= -6)  return "大凶"
  if (score <= -3)             return "凶"
  if (score < -1)              return "小凶"
  if (score <= 1)              return "中平"
  if (score <= 3)              return "小吉"
  if (score <= 6)              return "吉"
  return "大吉"
}

export function generateFreeReport(
  standingPoints: StandingPoint[],
  profile:        UserProfile,
  focusAreas:     FocusArea[] = [],
): FreeReport {
  const ruleResult = runRuleEngine(standingPoints, profile)

  // 运行所有规则
  const all: PatternResult[] = []
  for (const fn of ALL_PATTERNS) {
    const r = fn({ standingPoints, profile, ruleResult })
    if (r) all.push(r)
  }

  const sha          = all.filter((f) => f.type === "煞")
  const inauspicious = all.filter((f) => ["大凶","凶","小凶"].includes(f.type))
  const auspicious   = all.filter((f) => ["大吉","吉","小吉"].includes(f.type))

  const raw   = all.reduce((s, f) => s + f.score, 0)
  const score = Math.max(-10, Math.min(10, raw))
  const overallRating = scoreToRating(score, sha.length >= 2)

  // ── 按关注运势生成专项分析 ──────────────────────────────────────────────────
  const focusInsights: FocusInsight[] = focusAreas.map((area) => {
    const related = all.filter((f) => f.affects.includes(area))
    const areaScore = related.reduce((s, f) => s + f.score, 0)
    const hasSha = related.some((f) => f.type === "煞")
    const rating = scoreToRating(areaScore, hasSha)

    const tpl = AREA_COMMENTS[area]
    const goodCount = related.filter((f) => ["大吉","吉","小吉"].includes(f.type)).length
    const badCount  = related.filter((f) => ["凶","大凶","煞","小凶"].includes(f.type)).length
    const summary = hasSha ? `⚠ ${area}有煞气影响，${tpl.bad}`
      : badCount > goodCount ? tpl.bad
      : goodCount > badCount ? tpl.good
      : tpl.neutral

    return { area, rating, score: areaScore, findings: related, summary }
  })

  // ── 快速建议：优先取关注运势里最严重的问题 ────────────────────────────────
  const priorityFindings = focusAreas.length > 0
    ? focusInsights.flatMap((i) => i.findings).filter((f) => f.suggestion && f.score < 0)
    : [...sha, ...inauspicious].filter((f) => f.suggestion)
  const seen = new Set<string>()
  const quickTips = priorityFindings
    .sort((a, b) => a.score - b.score)
    .filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true })
    .slice(0, 3)
    .map((f) => `【${f.name}】${f.suggestion!}`)

  // ── 总结 ──────────────────────────────────────────────────────────────────
  const auspCount = auspicious.length
  const badCount2 = sha.length + inauspicious.length
  let summary = ""
  if (sha.length > 0)
    summary = `检测到 ${sha.length} 处煞气（${sha.map((s) => s.name).join("、")}），需优先化解。`
  else if (badCount2 > auspCount)
    summary = `整体偏凶，共发现 ${badCount2} 处不利格局，建议针对性改善布局。`
  else if (auspCount > badCount2)
    summary = `整体格局偏吉，${auspicious[0]?.name ?? ""}等有利因素明显，适合居住。`
  else
    summary = `格局中平，吉凶互现，善用有利方位可提升整体居住运势。`

  return {
    overallRating, score, allFindings: all,
    sha, inauspicious, auspicious,
    focusInsights, quickTips, summary,
  }
}

// ── 颜色映射 ─────────────────────────────────────────────────────────────────
export const RATING_COLOR: Record<OverallRating, string> = {
  大吉:"#1a6b3a", 吉:"#2d8a50", 小吉:"#4aaa70",
  中平:"#8d6b4c",
  小凶:"#c87820", 凶:"#c04010", 大凶:"#880000",
}
export const RATING_BG: Record<OverallRating, string> = {
  大吉:"#d4edda", 吉:"#d4edda", 小吉:"#e8f5e9",
  中平:"#f0e8da",
  小凶:"#fff3e0", 凶:"#fdecea", 大凶:"#ffd6d6",
}
export const TYPE_COLOR: Record<PatternType, string> = {
  大吉:"#1a6b3a", 吉:"#2d8a50", 小吉:"#4aaa70",
  中平:"#8d6b4c",
  小凶:"#c87820", 凶:"#c04010", 大凶:"#880000", 煞:"#660000",
}
export const TYPE_BG: Record<PatternType, string> = {
  大吉:"#d4edda", 吉:"#d4edda", 小吉:"#e8f5e9",
  中平:"#f0e8da",
  小凶:"#fff3e0", 凶:"#fdecea", 大凶:"#ffd6d6", 煞:"#ffe0e0",
}
