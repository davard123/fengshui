/**
 * interior-rules.ts — 室内细节规则（v3）
 *
 * 消费 RoomChecklist.answers（明确的 yes/no），不再从方向标记里推测。
 * 每个房间有一组清单问题；答 yes 触发对应判定。
 */

import type { RoomChecklistV3, FocusArea } from "@/types/fengshui"

export type ChecklistCategory = "door" | "bed" | "mirror" | "beam" | "bathroom" | "kitchen" | "desk" | "seat" | "light"

export type ChecklistQuestion = {
  key: string
  question: string         // 显示给用户的问题
  category: ChecklistCategory   // 题目分类（动态渲染/筛选用）
  triggersWhen: boolean    // 答这个值时触发 finding
  finding: {
    name: string
    type: "吉" | "小吉" | "小凶" | "凶" | "大凶"
    score: number
    description: string
    classic?: string
    suggestion?: string
    affects: FocusArea[]
  }
}

// ── 各房间的清单 ──────────────────────────────────────────────────────────────
export const ROOM_CHECKLISTS: Record<string, ChecklistQuestion[]> = {
  "front-door": [
    {
      key: "door-sees-back", category: "door", question: "进大门能一眼看到后门/大落地窗吗？",
      triggersWhen: true,
      finding: {
        name: "穿堂煞", type: "凶", score: -2,
        classic: "《阳宅三要》：穿堂风者，财气散",
        description: "大门与后门/落地窗前后对穿，气流直入直出，财气难聚。",
        suggestion: "门内设实心玄关或屏风（宽≥90cm）阻断直穿。",
        affects: ["财运", "健康", "家庭子女"],
      },
    },
    {
      key: "door-sees-stairs-down", category: "door", question: "开门正对向下的楼梯吗？",
      triggersWhen: true,
      finding: {
        name: "开门见下行梯", type: "凶", score: -2,
        classic: "《阳宅三要》：门对下行梯，财气随之泻",
        description: "进门即见向下楼梯，气流顺梯而泄。",
        suggestion: "楼梯口设屏风或矮柜，放向上生长的绿植提气。",
        affects: ["财运", "事业官运"],
      },
    },
    {
      key: "door-sees-bathroom", category: "door", question: "开门正对卫生间门吗？",
      triggersWhen: true,
      finding: {
        name: "入门见厕", type: "凶", score: -2,
        classic: "《阳宅撮要》：开门见厕，财气从厕流走",
        description: "进门直视卫生间，秽气迎面。",
        suggestion: "卫生间门常闭，挂帘；玄关设屏风转移视线。",
        affects: ["财运", "贵人人际"],
      },
    },
    {
      key: "door-sees-stove", category: "door", question: "开门能直接看到灶台吗？",
      triggersWhen: true,
      finding: {
        name: "入门见灶", type: "凶", score: -2,
        classic: "《阳宅三要》：门对灶，家财耗",
        description: "进门正见灶台，火气外露，主耗财口舌。",
        suggestion: "加装厨房门或吧台遮挡视线。",
        affects: ["财运", "健康"],
      },
    },
    {
      key: "door-bright", category: "light", question: "玄关采光明亮、整洁无杂物吗？",
      triggersWhen: true,
      finding: {
        name: "明堂纳气", type: "吉", score: 1,
        description: "玄关明亮整洁，气口畅通，利纳吉气。",
        affects: ["财运", "贵人人际"],
      },
    },
  ],

  "master-bedroom": [
    {
      key: "bed-no-wall", category: "bed", question: "床头背后是窗户或没有实墙吗？",
      triggersWhen: true,
      finding: {
        name: "床头无靠", type: "凶", score: -1.5,
        classic: "《阳宅三要》：床宜靠实墙，无靠则气散",
        description: "床头无实墙依靠，睡眠气场不稳。",
        suggestion: "床头移到实墙；必须靠窗时加厚窗帘+实木床头板。",
        affects: ["健康", "婚姻感情"],
      },
    },
    {
      key: "mirror-faces-bed", category: "mirror", question: "有镜子正对床吗？",
      triggersWhen: true,
      finding: {
        name: "镜煞冲床", type: "凶", score: -1.5,
        classic: "《阳宅撮要》：镜对床，主惊梦",
        description: "镜面正对床铺，夜间反射易扰睡眠。",
        suggestion: "移开镜子或睡前遮盖。",
        affects: ["健康", "婚姻感情"],
      },
    },
    {
      key: "bathroom-door-faces-bed", category: "bathroom", question: "卫生间门正对床吗？",
      triggersWhen: true,
      finding: {
        name: "厕门冲床", type: "凶", score: -2,
        classic: "《阳宅三要》：厕门冲床，主病灾",
        description: "卫生间秽气直冲睡眠区。",
        suggestion: "卫生间门常闭挂帘，或调整床位。",
        affects: ["健康", "婚姻感情"],
      },
    },
    {
      key: "beam-over-bed", category: "beam", question: "床的正上方有横梁或吊柜压着吗？",
      triggersWhen: true,
      finding: {
        name: "横梁压床", type: "凶", score: -1.5,
        classic: "《阳宅十书》：梁压卧床，主身心受压",
        description: "横梁正压床上方，形成压迫感。",
        suggestion: "移床避梁，或吊顶找平遮梁。",
        affects: ["健康"],
      },
    },
    {
      key: "door-faces-bed", category: "bed", question: "房门开门正对床吗？",
      triggersWhen: true,
      finding: {
        name: "门冲床", type: "小凶", score: -1,
        description: "门气直冲床铺，睡眠易受扰。",
        suggestion: "调整床位错开门线，或门后设帘。",
        affects: ["健康"],
      },
    },
  ],

  "kitchen": [
    {
      key: "stove-opposite-sink", category: "kitchen", question: "灶台和水槽正对（隔着过道面对面）吗？",
      triggersWhen: true,
      finding: {
        name: "水火正冲", type: "凶", score: -2,
        classic: "《阳宅三要》：灶忌水克，水火相射",
        description: "灶台与水槽正对，水火相冲，主口舌是非。",
        suggestion: "水槽与灶台间放木质隔断/绿植（木通水火）。",
        affects: ["婚姻感情", "家庭子女", "健康"],
      },
    },
    {
      key: "stove-next-sink", category: "kitchen", question: "灶台和水槽紧挨着（间距小于60cm）吗？",
      triggersWhen: true,
      finding: {
        name: "水火相邻", type: "小凶", score: -0.8,
        description: "灶台水槽过近，水火同区略有冲克。",
        suggestion: "中间留出操作台面或放置木砧板。",
        affects: ["家庭子女"],
      },
    },
    {
      key: "stove-under-window", category: "kitchen", question: "灶台正对窗户或在窗户下方吗？",
      triggersWhen: true,
      finding: {
        name: "灶后无靠", type: "小凶", score: -1,
        description: "灶台靠窗，火气不稳，传统主家运飘摇。",
        suggestion: "做饭时关窗，或加装挡风板。",
        affects: ["家庭子女", "财运"],
      },
    },
  ],

  "study": [
    {
      key: "desk-back-to-door", category: "desk", question: "书桌座位背对房门吗？",
      triggersWhen: true,
      finding: {
        name: "背门而坐", type: "小凶", score: -1,
        description: "背对门口学习/办公，缺乏安全感，难以专注。",
        suggestion: "调转书桌使侧对或面对门口，背后靠实墙。",
        affects: ["学业文昌", "事业官运"],
      },
    },
    {
      key: "desk-has-wall", category: "desk", question: "座位背后是实墙吗？",
      triggersWhen: true,
      finding: {
        name: "坐有靠山", type: "吉", score: 1,
        description: "背后有实墙，坐有靠山，利专注与贵人。",
        affects: ["学业文昌", "事业官运", "贵人人际"],
      },
    },
  ],

  "living-room": [
    {
      key: "sofa-no-wall", category: "seat", question: "主沙发背后是过道或落地窗（没有实墙）吗？",
      triggersWhen: true,
      finding: {
        name: "沙发无靠", type: "小凶", score: -1,
        classic: "《阳宅三要》：坐处宜有靠",
        description: "主沙发背后无靠，家人气场不稳，贵人难聚。",
        suggestion: "沙发背后放矮柜/书架/高大绿植作人工靠山。",
        affects: ["贵人人际", "事业官运"],
      },
    },
    {
      key: "living-bright", category: "light", question: "客厅白天采光充足吗？",
      triggersWhen: true,
      finding: {
        name: "明厅吉相", type: "吉", score: 1,
        description: "明厅暗房是阳宅基本吉相，客厅明亮利家运。",
        affects: ["财运", "贵人人际"],
      },
    },
  ],
}

export type InteriorFinding = ChecklistQuestion["finding"] & { id: string; location: string }

const ROOM_LABEL: Record<string, string> = {
  "front-door": "大门/玄关", "master-bedroom": "主卧", "kitchen": "厨房",
  "study": "书房", "living-room": "客厅",
}

export function runInteriorRules(checklists: RoomChecklistV3[]): InteriorFinding[] {
  const out: InteriorFinding[] = []
  for (const cl of checklists) {
    const questions = ROOM_CHECKLISTS[cl.room]
    if (!questions) continue
    for (const q of questions) {
      const answer = cl.answers[q.key]
      if (answer === undefined) continue
      if (answer === q.triggersWhen) {
        out.push({
          ...q.finding,
          id: `${cl.room}-${q.key}`,
          location: ROOM_LABEL[cl.room] ?? cl.room,
        })
      }
    }
  }
  return out
}
