/**
 * ai-prompts-v3.ts — v3 四层结构化 AI prompt（消费 SectionReport 分层协议）
 */
import type { AssessmentV3 } from "@/types/fengshui"
import type { ReportV3, SectionReport } from "./report-v3"
import { isQuickModeProfile } from "./quickmode"

function sectionBlock(title: string, s: SectionReport): string[] {
  if (s.highlights.length === 0 && s.cautions.length === 0) return []
  const lines = [``, `【${title}】（小计 ${s.score.toFixed(1)} 分）`]
  for (const h of s.highlights) lines.push(`  ✓ ${h}`)
  for (const c of s.cautions) lines.push(`  ⚠ ${c}`)
  return lines
}

export function buildV3SynthesisPrompt(a: AssessmentV3, r: ReportV3): string {
  const isQuick = isQuickModeProfile(a.profile ?? null)

  const lines: string[] = []
  lines.push("美国阳宅风水综合分析。以下推算结果均由系统按固定规则计算，请直接引用，不要重新推导。")
  lines.push(...sectionBlock("第一层 定向", r.sections.orientation))
  lines.push(...sectionBlock("第二层 玄空飞星", r.sections.flyingStars))
  lines.push(...sectionBlock("第三层 外局峦头（距离越近影响越大）", r.sections.exterior))
  lines.push(...sectionBlock("第四层 八宅内局" + (r.bazhai ? `（${r.bazhai.houseGua}）` : ""), r.sections.bazhai))
  lines.push(...sectionBlock("第五层 室内细节", r.sections.interior))

  lines.push("")
  lines.push(`【系统总评】${r.overallRating}（${r.overallScore.toFixed(1)}分）。${r.summary}`)
  lines.push("")
  if (isQuick) {
    lines.push("注意：用户未填写出生信息，严禁出现「命卦」「东四命」「西四命」「人宅」等字样，仅谈环境格局。")
  }
  lines.push("请输出（纯文字，不用Markdown符号）：")
  lines.push("整体格局：（2-3句）")
  lines.push("核心优势：（最多3点）")
  lines.push("重点问题：（最多3点，按严重程度）")
  lines.push("行动建议：（3条，具体可操作，注明在哪个方位/房间做什么）")
  lines.push("")
  lines.push("要求：中文，450字内，专业通俗，积极建设，不危言耸听。各层结论冲突时给出权衡判断。")

  return lines.join("\n")
}

export const V3_SYSTEM_PROMPT =
  "你是一位精通玄空飞星、八宅与峦头形势的阳宅风水顾问。规则推算已由系统完成，你的任务是综合判断（尤其当各层结论冲突时给出权衡）、通俗解释、给出可操作建议。"

// ─── 深度报告（付费版，~900字，分节输出）──────────────────────────────────────

export function buildV3DeepPrompt(a: AssessmentV3, r: ReportV3): string {
  const isQuick = isQuickModeProfile(a.profile ?? null)

  const lines: string[] = []
  lines.push("美国阳宅风水深度报告（付费版）。以下推算结果均由系统按固定规则计算，请直接引用，不要重新推导。")
  lines.push(...sectionBlock("第一层 定向", r.sections.orientation))
  lines.push(...sectionBlock("第二层 玄空飞星", r.sections.flyingStars))
  lines.push(...sectionBlock("第三层 外局峦头（距离越近影响越大）", r.sections.exterior))
  lines.push(...sectionBlock("第四层 八宅内局" + (r.bazhai ? `（${r.bazhai.houseGua}）` : ""), r.sections.bazhai))
  lines.push(...sectionBlock("第五层 室内细节", r.sections.interior))

  // 房间放置明细（深度版给 AI 更多素材做逐房间建议）
  if (a.placements.length > 0) {
    lines.push("")
    lines.push("【房间宫位明细】")
    for (const pl of a.placements) {
      lines.push(`  ${pl.room} → ${pl.primaryPalace}宫${pl.palaces && pl.palaces.length > 1 ? `（跨 ${pl.palaces.join("/")}）` : ""}`)
    }
  }
  // 罗盘单项测量
  const measures = a.checklists.flatMap((c) => c.measurements ?? [])
  if (measures.length > 0) {
    lines.push("")
    lines.push("【现场罗盘测量】")
    for (const m of measures) lines.push(`  ${m.item}：${Math.round(m.degree)}°（${m.mountain}山）`)
  }

  lines.push("")
  lines.push(`【系统总评】${r.overallRating}（${r.overallScore.toFixed(1)}分）。${r.summary}`)
  lines.push("")
  if (isQuick) {
    lines.push("注意：用户未填写出生信息，严禁出现「命卦」「东四命」「西四命」「人宅」等字样，仅谈环境格局。")
  }
  lines.push("请按以下七节输出完整深度报告（纯文字，各节以节名开头，不用Markdown符号）：")
  lines.push("一、总论：这套房子的风水底盘如何，最突出的特征是什么（3-4句）")
  lines.push("二、定向与飞星格局：坐向与元运配合的吉凶，旺星方位怎么用（财位放什么、丁位怎么布置）")
  lines.push("三、外局形势：周边环境的利弊与化解（结合距离远近谈轻重）")
  lines.push("四、内局布置：逐个重要房间（大门/主卧/灶位等）给具体建议，包括颜色、材质、摆放")
  lines.push("五、五行调理：根据格局给出宜用的颜色体系与材质方向")
  lines.push("六、居住注意：日常使用中要养成/避免的习惯（3-5条）")
  lines.push("七、改善优先级：把所有建议按「立刻做/一月内/装修时」三档排序")
  lines.push("")
  lines.push("要求：中文 800-1000 字，专业但通俗，积极建设，不危言耸听，各层结论冲突时给出权衡判断。")

  return lines.join("\n")
}

export const V3_DEEP_SYSTEM_PROMPT =
  "你是一位有三十年经验、精通玄空飞星、八宅与峦头形势的阳宅风水顾问，正在为付费客户撰写正式书面报告。规则推算已由系统完成，你的职责：综合权衡各层结论、用通俗语言解释原理、给出具体到房间/方位/颜色/材质的可操作建议。文风沉稳专业，像一份可以打印存档的咨询报告。"
