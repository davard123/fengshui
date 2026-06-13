/**
 * offline-deep-report.ts — 离线规则版深度报告（AI 不可用时的兜底）
 *
 * 纯本地模板生成，100% 可用。付费用户即使全部网络通道失败也能拿到
 * 结构完整的七节报告（数据全部来自规则引擎，无编造）。
 */

import type { AssessmentV3 } from "@/types/fengshui"
import type { ReportV3 } from "./report-v3"
import { PATTERN_MEANING, getProsperousPalaces } from "./flying-stars"
import { PALACE_INFO } from "./palaces"
import { isQuickModeProfile } from "./quickmode"

const ROOM_LABEL: Record<string, string> = {
  "front-door": "大门", "master-bedroom": "主卧", "kitchen": "厨房", "stove": "灶位",
  "bathroom": "卫生间", "living-room": "客厅", "study": "书房", "stairs": "楼梯",
  "garage": "车库", "kids-bedroom": "儿童房",
}

// 五行 → 颜色/材质（按宅卦五行生扶）
const ELEMENT_PALETTE: Record<string, { colors: string; materials: string }> = {
  水: { colors: "蓝、黑、灰为主，辅以白色（金生水）", materials: "玻璃、金属、波浪曲线造型" },
  木: { colors: "绿、青为主，辅以蓝黑（水生木）", materials: "原木、棉麻、绿植" },
  火: { colors: "红、紫、橙为主，辅以绿色（木生火）", materials: "实木、暖光照明、三角/尖形装饰" },
  土: { colors: "黄、米、咖为主，辅以红紫（火生土）", materials: "陶瓷、石材、方正厚重家具" },
  金: { colors: "白、金、银为主，辅以黄土色（土生金）", materials: "金属、圆形造型、浅色石材" },
}

export function generateOfflineDeepReport(a: AssessmentV3, r: ReportV3): string {
  const isQuick = isQuickModeProfile(a.profile ?? null)
  const S: string[] = []
  const neg = [...r.exterior, ...(r.bazhai?.findings ?? []), ...r.interior]
    .filter((f) => f.score < 0).sort((x, y) => x.score - y.score)
  const pos = [...r.exterior, ...(r.bazhai?.findings ?? []), ...r.interior]
    .filter((f) => f.score > 0).sort((x, y) => y.score - x.score)

  // ── 一、总论 ──────────────────────────────────────────────────────────
  S.push("一、总论")
  S.push(`本宅${r.orientationText}，综合评级「${r.overallRating}」。${r.summary}` +
    (pos.length > 0 ? `最突出的有利条件是${pos[0].name}；` : "") +
    (neg.length > 0 ? `最需要关注的是${neg[0].name}。` : "整体未见明显硬伤。"))

  // ── 二、定向与飞星格局 ─────────────────────────────────────────────────
  S.push("\n二、定向与飞星格局")
  if (r.flyingStars && r.flyingStarSummary) {
    const pm = PATTERN_MEANING[r.flyingStars.pattern]
    const prosperous = getProsperousPalaces(r.flyingStars)
    let t = `${r.flyingStarSummary} ${pm.advice}`
    if (prosperous.wealthPalace) {
      t += ` 当运财位在${PALACE_INFO[prosperous.wealthPalace].label}方：此处宜保持开阔明亮、常有活动，可设鱼缸、流水摆件或常用的客厅功能区，忌堆放杂物重物。`
    }
    if (prosperous.healthPalace) {
      t += ` 当运丁位在${PALACE_INFO[prosperous.healthPalace].label}方：此处宜厚实安静，适合卧室、书房或厚重家具，利健康与人丁。`
    }
    S.push(t)
  } else {
    S.push(`本宅${r.orientationText}。未提供建造年代，暂未排玄空飞星盘；补充年代后可获得元运层面的财位丁位布局建议。`)
  }

  // ── 三、外局形势 ──────────────────────────────────────────────────────
  S.push("\n三、外局形势")
  if (r.exterior.length === 0) {
    S.push("周边未确认显著的形煞或形吉地物，外局平稳。建议实地环顾四周复核一次：近距离（50米内）有无直冲道路、尖角建筑或高压设施。")
  } else {
    const lines: string[] = []
    for (const f of r.exterior) {
      lines.push(`${f.name}（${f.location}）：${f.description}${f.suggestion ? `化解：${f.suggestion}` : ""}`)
    }
    S.push(lines.join("\n"))
  }

  // ── 四、内局布置（逐房间）────────────────────────────────────────────
  S.push("\n四、内局布置")
  if (r.bazhai && r.bazhai.findings.length > 0) {
    const lines: string[] = []
    for (const f of r.bazhai.findings) {
      lines.push(`${f.name}（${f.location}）：${f.description}${f.suggestion ? `建议：${f.suggestion}` : ""}`)
    }
    S.push(lines.join("\n"))
  } else if (a.placements.length > 0) {
    S.push("已放置房间：" + a.placements.map((p) =>
      `${ROOM_LABEL[p.room] ?? p.room}在${PALACE_INFO[p.primaryPalace].label}宫`).join("、") +
      "。各宫游年星见报告中的九宫布局图。")
  } else {
    S.push("尚未放置房间宫位。完成九宫放置后可获得逐房间的八宅判定。")
  }
  // 室内细节
  if (r.interior.length > 0) {
    S.push(r.interior.map((f) =>
      `${f.name}（${f.location}）：${f.description}${f.suggestion ? `建议：${f.suggestion}` : ""}`).join("\n"))
  }

  // ── 五、五行调理 ──────────────────────────────────────────────────────
  S.push("\n五、五行调理")
  const sitting = a.orientation?.sittingMountain
  const MOUNTAIN_ELEMENT: Record<string, string> = {
    壬: "水", 子: "水", 癸: "水", 丑: "土", 艮: "土", 寅: "木",
    甲: "木", 卯: "木", 乙: "木", 辰: "土", 巽: "木", 巳: "火",
    丙: "火", 午: "火", 丁: "火", 未: "土", 坤: "土", 申: "金",
    庚: "金", 酉: "金", 辛: "金", 戌: "土", 乾: "金", 亥: "水",
  }
  const elem = sitting ? MOUNTAIN_ELEMENT[sitting] : null
  if (elem && ELEMENT_PALETTE[elem]) {
    const p = ELEMENT_PALETTE[elem]
    S.push(`本宅坐山五行属${elem}。主色调建议：${p.colors}。材质方向：${p.materials}。` +
      `大门与客厅是纳气要道，色彩宜用生扶本宅五行的体系；卧室以柔和低饱和为宜，不必拘泥。`)
  } else {
    S.push("完成定向后可获得基于坐山五行的颜色与材质建议。")
  }

  // ── 六、居住注意 ──────────────────────────────────────────────────────
  S.push("\n六、居住注意")
  const habits: string[] = [
    "保持大门区域整洁明亮，玄关不堆鞋物——气口畅，全宅气顺。",
    "客厅多用、多亮灯；长期无人活动的房间每周开窗通风。",
  ]
  if (r.flyingStars) {
    const warn = r.palaceNotes.find((n) => !n.good && n.text.includes("五黄"))
    if (warn) habits.push("五黄所在宫位（见飞星盘）今年内避免动土、钉凿与大型装修。")
  }
  if (neg.some((f) => f.name.includes("床"))) habits.push("卧床问题优先处理——睡眠占人生三分之一，影响最直接。")
  habits.push("每年立春前后复核一次布局（流年星每年轮转，吉凶方位会变化）。")
  S.push(habits.map((h, i) => `${i + 1}. ${h}`).join("\n"))

  // ── 七、改善优先级 ────────────────────────────────────────────────────
  S.push("\n七、改善优先级")
  const now: string[] = [], month: string[] = [], reno: string[] = []
  for (const f of neg) {
    if (!f.suggestion) continue
    const sug = `${f.name}：${f.suggestion}`
    if (/搬迁|装修|迁移|调换|功能调换/.test(f.suggestion)) reno.push(sug)
    else if (/种植|围墙|乔木|建/.test(f.suggestion)) month.push(sug)
    else now.push(sug)
  }
  S.push("【立刻可做】\n" + (now.length ? now.map((t, i) => `${i + 1}. ${t}`).join("\n") : "暂无紧急事项。"))
  S.push("【一月内安排】\n" + (month.length ? month.map((t, i) => `${i + 1}. ${t}`).join("\n") : "暂无。"))
  S.push("【装修时考虑】\n" + (reno.length ? reno.map((t, i) => `${i + 1}. ${t}`).join("\n") : "暂无。"))

  if (isQuick) {
    S.push("\n（提示：补充住户出生信息后，可叠加命卦层面的个人化建议。）")
  }
  S.push("\n—— 本节由规则引擎生成（结构化推算，非 AI 文本）——")

  return S.join("\n")
}
