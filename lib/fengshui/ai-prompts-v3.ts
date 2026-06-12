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
