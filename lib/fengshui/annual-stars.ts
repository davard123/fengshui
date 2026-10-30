/**
 * annual-stars.ts — 流年飞星 + 太岁 / 岁破 / 三煞
 *
 * 年星入中：2017 丁酉年一白入中，此后每年逆退一星（2024 三碧、2025 二黑、2026 一白、2027 九紫）。
 * 入中后按洛书路径顺飞（与 flying-stars.ts 的 FLY_PATH 相同）。
 * 流年以立春（约 2 月 4 日）为界，这里按公历年近似，页面会提示。
 */

import type { PalaceId } from "@/types/fengshui"

const FLY_PATH: PalaceId[] = ["CENTER", "NW", "W", "NE", "S", "N", "SW", "E", "SE"]

const STEMS    = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const ZODIAC   = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]

/** 地支 → 所在宫位（二十四山归八宫） */
const BRANCH_PALACE: Record<string, PalaceId> = {
  子: "N", 丑: "NE", 寅: "NE", 卯: "E", 辰: "SE", 巳: "SE",
  午: "S", 未: "SW", 申: "SW", 酉: "W", 戌: "NW", 亥: "NW",
}

export type AnnualStarInfo = {
  name: string
  short: string
  good: boolean
  meaning: string
  advice: string
}

export const ANNUAL_STAR_INFO: Record<number, AnnualStarInfo> = {
  1: { name: "一白贪狼", short: "一白", good: true,  meaning: "人缘、桃花、升迁", advice: "宜多活动，可放水养植物或保持明亮整洁" },
  2: { name: "二黑巨门", short: "二黑", good: false, meaning: "病符星，主健康欠佳", advice: "宜静，忌长期卧病者居住；可摆放铜器、金属饰品化解" },
  3: { name: "三碧禄存", short: "三碧", good: false, meaning: "是非口舌、官非", advice: "少在此处谈判争执；可用红色装饰或暖光灯泄木气" },
  4: { name: "四绿文曲", short: "四绿", good: true,  meaning: "文昌，利学业考试", advice: "适合书桌、学习区；可放四支富贵竹" },
  5: { name: "五黄廉贞", short: "五黄", good: false, meaning: "最凶之星，主灾病、意外", advice: "全年忌动土装修、忌钉钉敲打；宜静，可放铜葫芦或金属风铃" },
  6: { name: "六白武曲", short: "六白", good: true,  meaning: "偏财、贵人、权力", advice: "适合办公位，可适度激活（金属摆件）" },
  7: { name: "七赤破军", short: "七赤", good: false, meaning: "破财、盗贼、口舌", advice: "注意门窗防盗；可用蓝/黑色或静水泄金气" },
  8: { name: "八白左辅", short: "八白", good: true,  meaning: "正财、置业", advice: "宜保持整洁、常有人气" },
  9: { name: "九紫右弼", short: "九紫", good: true,  meaning: "喜庆、姻缘，九运当旺", advice: "宜明亮温暖，适合客厅或常活动区" },
}

export type AnnualChart = {
  year: number
  ganzhi: string            // 丙午
  zodiac: string            // 马
  centerStar: number
  palaces: Record<PalaceId, number>
  taisui: { branch: string; palace: PalaceId }   // 太岁方：宜静不宜冲
  suipo:  { branch: string; palace: PalaceId }   // 岁破方：忌动土
  sansha: { label: string; palace: PalaceId }    // 三煞方：宜坐不宜向、忌动土
}

export function annualCenterStar(year: number): number {
  const v = ((1 - (year - 2017)) % 9 + 9) % 9
  return v === 0 ? 9 : v
}

export function computeAnnualChart(year: number): AnnualChart {
  const center = annualCenterStar(year)
  const palaces = {} as Record<PalaceId, number>
  for (let i = 0; i < 9; i++) {
    palaces[FLY_PATH[i]] = ((center + i - 1) % 9) + 1
  }

  const bi = ((year - 4) % 12 + 12) % 12
  const si = ((year - 4) % 10 + 10) % 10
  const branch = BRANCHES[bi]
  const opposite = BRANCHES[(bi + 6) % 12]

  // 三合局定三煞：申子辰→南，寅午戌→北，巳酉丑→东，亥卯未→西
  const sanhe = ["申", "子", "辰"].includes(branch) ? "S"
    : ["寅", "午", "戌"].includes(branch) ? "N"
    : ["巳", "酉", "丑"].includes(branch) ? "E" : "W"
  const SANSHA_LABEL: Record<string, string> = {
    S: "南方（巳午未）", N: "北方（亥子丑）", E: "东方（寅卯辰）", W: "西方（申酉戌）",
  }

  return {
    year,
    ganzhi: STEMS[si] + branch,
    zodiac: ZODIAC[bi],
    centerStar: center,
    palaces,
    taisui: { branch, palace: BRANCH_PALACE[branch] },
    suipo:  { branch: opposite, palace: BRANCH_PALACE[opposite] },
    sansha: { label: SANSHA_LABEL[sanhe], palace: sanhe as PalaceId },
  }
}

export type AnnualNote = { palace: PalaceId; good: boolean; text: string }

/**
 * 结合住宅房间分布给出流年提示
 * placements：房间 → 宫位（可空，空则只给通用提示）
 */
export function annualNotes(
  chart: AnnualChart,
  placements: { room: string; palaces: PalaceId[] }[],
  roomLabel: (r: string) => string,
): AnnualNote[] {
  const notes: AnnualNote[] = []
  const roomsIn = (p: PalaceId) =>
    placements.filter((pl) => pl.palaces.includes(p)).map((pl) => roomLabel(pl.room))

  for (const p of FLY_PATH) {
    if (p === "CENTER") continue
    const star = chart.palaces[p]
    const info = ANNUAL_STAR_INFO[star]
    const rooms = roomsIn(p)
    if (star === 5 || star === 2) {
      notes.push({
        palace: p, good: false,
        text: `${info.name}飞临${PALACE_CN[p]}${rooms.length ? `（${rooms.join("、")}）` : ""}：${info.meaning}。${info.advice}`,
      })
    } else if ((star === 9 || star === 8 || star === 1) && rooms.length) {
      notes.push({
        palace: p, good: true,
        text: `${info.name}到${PALACE_CN[p]}（${rooms.join("、")}）：${info.meaning}，${info.advice}`,
      })
    } else if (star === 4 && rooms.some((r) => r === "书房" || r === "儿童房")) {
      notes.push({ palace: p, good: true, text: `四绿文昌到${PALACE_CN[p]}（${rooms.join("、")}），利学习考试` })
    }
  }

  notes.push({
    palace: chart.taisui.palace, good: false,
    text: `太岁在${chart.taisui.branch}（${PALACE_CN[chart.taisui.palace]}）：宜静，忌在此方大动土；书桌座位不宜正对此方`,
  })
  notes.push({
    palace: chart.suipo.palace, good: false,
    text: `岁破在${chart.suipo.branch}（${PALACE_CN[chart.suipo.palace]}）：今年忌在此方动土、装修`,
  })
  notes.push({
    palace: chart.sansha.palace, good: false,
    text: `三煞在${chart.sansha.label}：宜背靠不宜面对（座位/床头不宜朝向三煞），忌动土`,
  })
  return notes
}

export const PALACE_CN: Record<PalaceId, string> = {
  N: "北", NE: "东北", E: "东", SE: "东南", S: "南", SW: "西南", W: "西", NW: "西北", CENTER: "中宫",
}
