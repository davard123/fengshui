import type { StandingPoint, UserProfile } from "@/types/fengshui"
import { runRuleEngine, formatRuleResultForPrompt } from "./rule-engine"
import { isQuickModeProfile } from "./quickmode"

// ─── 站点主题配置 ─────────────────────────────────────────────────────────────

export type PointConfig = {
  label: string
  theme: string
  precision: "24山" | "8方位"
  systemRole: string
  focusHints: string
}

export const POINT_CONFIGS: Record<string, PointConfig> = {
  outdoor: {
    label: "室外大门",
    theme: "整体外部格局",
    precision: "24山",
    systemRole: "你是一位专注于外部地理形势的风水顾问，精通形势派与理气派",
    focusHints: "请重点分析：四灵格局（玄武靠山、朱雀明堂、青龙白虎）、路冲与玉带水、周边山水方位吉凶、大门朝向与命卦匹配度",
  },
  "house-center": {
    label: "全屋中心",
    theme: "家运总体格局",
    precision: "8方位",
    systemRole: "你是一位专注于整体宅运格局的风水顾问，精通八宅派",
    focusHints: "请重点分析：八宅分区中各功能区落在吉凶哪一方、门主灶三要素是否在吉位、整体格局是否旺气聚集",
  },
  "living-room": {
    label: "客厅中心",
    theme: "财富 · 事业 · 贵人",
    precision: "8方位",
    systemRole: "你是一位专注于财富与事业运势的风水顾问",
    focusHints: "请重点分析：财位方向有无阻挡或缺失、大门气口位置是否旺气入室、有无漏财格局、贵人方向是否通畅",
  },
  "master-bedroom": {
    label: "主卧中心",
    theme: "健康 · 婚姻 · 家庭关系",
    precision: "8方位",
    systemRole: "你是一位专注于健康与夫妻关系的风水顾问",
    focusHints: "请重点分析：床头朝向是否符合命卦吉方、有无冲床格局、主卧气场是否稳定私密、夫妻关系方位有无干扰",
  },
  kitchen: {
    label: "厨房中心",
    theme: "口舌 · 是非 · 官非诉讼",
    precision: "8方位",
    systemRole: "你是一位专注于口舌是非与法律事务风水的顾问",
    focusHints: "请重点分析：灶台朝向是否犯煞、水槽与灶台是否水火相冲、厨房门的位置与冰箱是否引起是非格局",
  },
  study: {
    label: "书房中心",
    theme: "学业 · 文昌 · 子女发展",
    precision: "8方位",
    systemRole: "你是一位专注于文昌与学业运势的风水顾问",
    focusHints: "请重点分析：书桌朝向是否落在文昌方、座位是否有实墙靠背、子女房间方位与文昌方的关系",
  },
  "front-door-inside": {
    label: "大门内侧",
    theme: "纳气 · 气口走向",
    precision: "8方位",
    systemRole: "你是一位专注于气口与玄关风水的顾问",
    focusHints: "请重点分析：进门正对方向是否有冲射、气进来后是聚还是散、有无穿堂风格局、玄关区域气场引导是否合理",
  },
  yard: {
    label: "院子中心",
    theme: "外太极 · 院门气口 · 后援",
    precision: "8方位",
    systemRole: "你是一位专注于外部明堂与院门格局的风水顾问。注意：美国独立屋常有院门（Yard Gate）与房子大门（Front Door）方向不同的情况，院门是「外太极」气口，与大门「内太极」需分别评估",
    focusHints: "请重点分析：院门朝向与房子大门是否一致或冲突、前后院高低格局、院内植物与设施方位、院门 vs 大门的双气口影响",
  },
  garage: {
    label: "车库",
    theme: "动态财富 · 出行安全",
    precision: "8方位",
    systemRole: "你是一位专注于动态财与出行运势的风水顾问",
    focusHints: "请重点分析：车库大门朝向是否为吉方、从车库进入室内的通道气场、车库方位与全屋八宅的关系",
  },
  custom: {
    label: "自定义位置",
    theme: "综合分析",
    precision: "8方位",
    systemRole: "你是一位综合风水顾问",
    focusHints: "请根据该位置的实际环境标记，从形势与理气两个角度综合分析此位置的气场特征与改善建议",
  },
}

// ─── 构建单站点分析 Prompt（含规则引擎结果）────────────────────────────────

export function buildPointPrompt(
  point: StandingPoint,
  profile: UserProfile,
  address: string,
  allPoints?: StandingPoint[],
): string {
  const config  = POINT_CONFIGS[point.type] ?? POINT_CONFIGS.custom
  const isQuick = isQuickModeProfile(profile)

  const directionLines = point.directions
    .filter((d) => d.elements.length > 0)
    .map((d) => `  ${d.direction}（${Math.round(d.degree)}°）：${d.elements.join("、")}`)
    .join("\n")

  const emptyNote = point.directions.every((d) => d.elements.length === 0)
    ? "（用户未标记任何方位，请根据已知信息给出一般性建议）"
    : ""

  const ruleResult = allPoints && allPoints.length > 0
    ? runRuleEngine(allPoints, profile)
    : null
  const ruleBlock = ruleResult ? formatRuleResultForPrompt(ruleResult) : null

  // 用户信息块：快速模式下不传命卦
  const userInfoBlock = isQuick
    ? `【用户信息】未填写出生年份与性别 — 请勿提及命卦、东四命/西四命、人宅匹配、个人吉凶方等内容。
房产地址（美国）：${address}`
    : `【用户基本信息】
出生年份：${profile.birthYear}，性别：${profile.gender === "male" ? "男" : "女"}
命卦：${profile.kuaNumber}（${profile.kuaGroup === "east" ? "东四命" : "西四命"}）
房产地址（美国）：${address}`

  const ruleNote = isQuick
    ? `注意：用户未填写真实出生信息，本次分析严格限制在环境格局层面，不得提及任何命卦/八宅/人宅匹配/个人吉凶方相关内容。`
    : `注意：上述结果按命卦八宅与形势规则计算，请直接引用并综合判断，不要重新推导。`

  return `${userInfoBlock}

【勘察位置】
站点：${config.label}（${point.precision}精度）
罗盘朝向：${Math.round(point.compassDegree)}°（${point.compassDirection}方向）

【${point.precision}方位标记（用户实地所见）】
${directionLines || emptyNote}
${ruleBlock ? `
【传统风水规则推算结果】
${ruleBlock}

${ruleNote}
` : ""}
【分析视角】
${config.focusHints}

【输出格式】（纯文字，不用Markdown符号）
亮点：[该位置有哪些好的风水条件]
可优化：[哪些方面存在隐患或不足]
建议：[1-3条立刻可操作的改善措施]

报告要求：中文，200字以内，语气积极建设，通俗易懂，切忌危言耸听。`
}

// ─── 构建综合报告 Prompt（含规则引擎完整分析）──────────────────────────────

export function buildSynthesisPrompt(
  standingPoints: StandingPoint[],
  profile: UserProfile,
  address: string,
): string {
  const isQuick = isQuickModeProfile(profile)
  const ruleResult = runRuleEngine(standingPoints, profile)

  const sittingStr = ruleResult.houseSitting
    ? (isQuick
        ? `坐${ruleResult.houseSitting}朝${ruleResult.houseFacing}`
        : `坐${ruleResult.houseSitting}朝${ruleResult.houseFacing}（${ruleResult.houseGroup}）`)
    : "未确定"

  const positives = ruleResult.positives.slice(0, 3).join("；") || "无明显优势"
  const warnings  = ruleResult.warnings.slice(0, 4).join("；") || "无明显问题"

  const pointSummaries = standingPoints
    .map((p) => {
      const config = POINT_CONFIGS[p.type] ?? POINT_CONFIGS.custom
      const filledDirs = p.directions.filter((d) => d.elements.length > 0).length
      const aiSnippet = p.aiAnalysis ? `；AI摘要：${p.aiAnalysis.slice(0, 60)}…` : ""
      return `${config.label}（${p.compassDirection}方，${filledDirs}个方位已标记${aiSnippet}）`
    })
    .join("\n")

  const userBlock = isQuick
    ? `基本信息：用户未填写出生年份与性别，请仅基于环境格局分析，不要提及命卦/东四命/西四命/人宅匹配/个人吉凶方。
地址：${address}`
    : `基本信息：命卦${profile.kuaNumber}（${profile.kuaGroup === "east" ? "东四命" : "西四命"}），${address}`

  const advTail = isQuick
    ? "（基于环境与坐向，不涉及命卦）"
    : "（结合人宅关系和命卦给出针对性方案）"

  return `美国房产风水综合分析。

${userBlock}
坐向：${sittingStr}
有利因素：${positives}
问题警示：${warnings}

各站点：
${pointSummaries}

请按以下结构输出综合风水报告（纯文字，不用符号）：
整体格局：（2-3句，说明该房整体风水优劣）
核心优势：（列出2-3个最突出的好格局）
重点问题：（列出2-3个最需解决的问题，按严重程度排序）
行动建议：（给出3条具体可操作的改善建议，${advTail}）

${isQuick ? "⚠ 严格要求：本次分析不得出现「命卦」「东四命」「西四命」「人宅」等字样，仅讨论环境格局。" : ""}
要求：中文，500字左右，专业通俗，积极建设，给出实际可行的改善方向。`
}
