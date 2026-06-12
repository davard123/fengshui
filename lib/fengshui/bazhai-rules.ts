/**
 * bazhai-rules.ts — 八宅规则（v3）
 *
 * 核心改变：消费对象从"站立点罗盘方向"改为 RoomPlacement.palace（房间所在宫位）。
 * 这是八宅派的本义：看大门/主卧/灶位落在宅卦的哪个游年星宫。
 */

import type { PalaceId, RoomPlacementV3, UserProfile, FocusArea } from "@/types/fengshui"
import { isQuickModeProfile } from "./quickmode"
import { PALACE_INFO } from "./palaces"

export type SectorEnergy = "生气" | "延年" | "天医" | "伏位" | "祸害" | "六煞" | "五鬼" | "绝命"

// 八宅游年表：key = 坐山所属 8 方位
// ⚠ 此表由《大游年歌》逐宅推导并与公开八宅表核对（v2 的旧表有误，已修正）：
//   乾六天五祸绝延生 / 坎五天生延绝祸六 / 艮六绝祸生延天五 / 震延生祸绝五天六
//   巽天五六祸生绝延 / 离六五绝延祸生天 / 坤天延绝生祸五六 / 兑生祸延绝六五天
//   （宫序按 乾坎艮震巽离坤兑 循环）
const EIGHT_MANSIONS: Record<string, Record<string, SectorEnergy>> = {
  N:  { N: "伏位", NE: "五鬼", E: "天医", SE: "生气", S: "延年", SW: "绝命", W: "祸害", NW: "六煞" }, // 坎宅
  NE: { NE: "伏位", E: "六煞", SE: "绝命", S: "祸害", SW: "生气", W: "延年", NW: "天医", N: "五鬼" }, // 艮宅
  E:  { E: "伏位", SE: "延年", S: "生气", SW: "祸害", W: "绝命", NW: "五鬼", N: "天医", NE: "六煞" }, // 震宅
  SE: { SE: "伏位", S: "天医", SW: "五鬼", W: "六煞", NW: "祸害", N: "生气", NE: "绝命", E: "延年" }, // 巽宅
  S:  { S: "伏位", SW: "六煞", W: "五鬼", NW: "绝命", N: "延年", NE: "祸害", E: "生气", SE: "天医" }, // 离宅
  SW: { SW: "伏位", W: "天医", NW: "延年", N: "绝命", NE: "生气", E: "祸害", SE: "五鬼", S: "六煞" }, // 坤宅
  W:  { W: "伏位", NW: "生气", N: "祸害", NE: "延年", E: "绝命", SE: "六煞", S: "五鬼", SW: "天医" }, // 兑宅
  NW: { NW: "伏位", N: "六煞", NE: "天医", E: "五鬼", SE: "祸害", S: "绝命", SW: "延年", W: "生气" }, // 乾宅
}

const ENERGY_INFO: Record<SectorEnergy, { good: boolean; rank: number; desc: string }> = {
  生气: { good: true, rank: 4, desc: "最吉·财旺人旺" },
  延年: { good: true, rank: 3, desc: "吉·婚姻健康" },
  天医: { good: true, rank: 2, desc: "吉·健康贵人" },
  伏位: { good: true, rank: 1, desc: "小吉·安稳" },
  祸害: { good: false, rank: -1, desc: "凶·口舌小灾" },
  六煞: { good: false, rank: -2, desc: "凶·损财烂桃花" },
  五鬼: { good: false, rank: -3, desc: "凶·病灾是非" },
  绝命: { good: false, rank: -4, desc: "大凶" },
}

// 命卦 → 吉/凶方（东西四命）
type KuaDirs = { auspicious: string[]; inauspicious: string[]; group: "东四命" | "西四命" }
const KUA_DIRECTIONS: Record<number, KuaDirs> = {
  1: { group: "东四命", auspicious: ["SE", "E", "S", "N"], inauspicious: ["SW", "NE", "NW", "W"] },
  2: { group: "西四命", auspicious: ["NE", "W", "NW", "SW"], inauspicious: ["N", "S", "SE", "E"] },
  3: { group: "东四命", auspicious: ["S", "N", "SE", "E"], inauspicious: ["NE", "NW", "SW", "W"] },
  4: { group: "东四命", auspicious: ["N", "S", "E", "SE"], inauspicious: ["W", "NE", "SW", "NW"] },
  6: { group: "西四命", auspicious: ["W", "NE", "SW", "NW"], inauspicious: ["S", "N", "SE", "E"] },
  7: { group: "西四命", auspicious: ["NW", "SW", "NE", "W"], inauspicious: ["E", "SE", "N", "S"] },
  8: { group: "西四命", auspicious: ["SW", "NW", "W", "NE"], inauspicious: ["SE", "E", "N", "S"] },
  9: { group: "东四命", auspicious: ["E", "SE", "N", "S"], inauspicious: ["W", "NW", "SW", "NE"] },
}

const HOUSE_GROUP: Record<string, "东四宅" | "西四宅"> = {
  N: "东四宅", E: "东四宅", SE: "东四宅", S: "东四宅",
  NE: "西四宅", SW: "西四宅", W: "西四宅", NW: "西四宅",
}

const ROOM_LABEL: Record<string, string> = {
  "front-door": "大门", "master-bedroom": "主卧", "kitchen": "厨房", "stove": "灶位",
  "bathroom": "卫生间", "living-room": "客厅", "study": "书房", "stairs": "楼梯",
  "garage": "车库", "kids-bedroom": "儿童房",
}

export type BazhaiFinding = {
  id: string
  name: string
  type: "大吉" | "吉" | "小吉" | "中平" | "小凶" | "凶" | "大凶"
  score: number
  location: string
  description: string
  suggestion?: string
  affects: FocusArea[]
}

export type BazhaiResult = {
  houseGua: string                 // 宅卦名，如 "坎宅"
  sectorEnergies: Record<string, SectorEnergy>   // 8 方位游年星
  groupMatch?: boolean             // 人宅匹配（需真实命卦）
  kuaGroup?: string
  findings: BazhaiFinding[]
}

const GUA_NAME: Record<string, string> = {
  N: "坎宅", NE: "艮宅", E: "震宅", SE: "巽宅", S: "离宅", SW: "坤宅", W: "兑宅", NW: "乾宅",
}

/**
 * @param sittingDir8 坐山 8 方位（由 24 山坐山映射，如 子→N）
 * @param placements 房间宫位放置
 * @param profile 住户命卦（可选）
 */
export function runBazhaiRules(
  sittingDir8: string,
  placements: RoomPlacementV3[],
  profile?: UserProfile | null,
): BazhaiResult {
  const sectorEnergies = EIGHT_MANSIONS[sittingDir8]
  const findings: BazhaiFinding[] = []
  const isQuick = isQuickModeProfile(profile ?? null)

  if (!sectorEnergies) {
    return { houseGua: "未知", sectorEnergies: {}, findings }
  }

  // ── 房间宫位 × 游年星（按 primaryPalace 判定）─────────────────────────
  // 评分规则：吉星宫放重要房间加分；凶星宫放卧室/灶减分；
  //          卫生间/楼梯压凶星宫反而化煞（轻微加分）
  for (const pl of placements) {
    if (pl.primaryPalace === "CENTER") {
      if (pl.room === "bathroom" || pl.room === "stairs") {
        findings.push({
          id: `center-${pl.room}`, name: `${ROOM_LABEL[pl.room]}居中宫`,
          type: "凶", score: -2,
          location: "中宫",
          description: `${ROOM_LABEL[pl.room]}位于全屋中心（太极位），秽气/动气扰宅心，传统视为大忌。`,
          suggestion: "保持该区域清洁明亮，门常关；装修时优先考虑迁移。",
          affects: ["健康", "财运"],
        })
      }
      continue
    }
    const energy = sectorEnergies[pl.primaryPalace]
    if (!energy) continue
    const info = ENERGY_INFO[energy]
    const label = ROOM_LABEL[pl.room] ?? pl.room
    const palaceLabel = PALACE_INFO[pl.primaryPalace as PalaceId].label

    const isKeyRoom = ["front-door", "master-bedroom", "stove"].includes(pl.room)
    const isSuppressor = ["bathroom", "stairs", "garage"].includes(pl.room)

    if (isKeyRoom) {
      // 门主灶三要
      const good = info.good
      findings.push({
        id: `bz-${pl.room}`, name: `${label}居${energy}`,
        type: good ? (info.rank >= 3 ? "大吉" : "吉") : (info.rank <= -3 ? "大凶" : "凶"),
        score: info.rank,
        location: `${palaceLabel}宫`,
        description: `${label}位于${palaceLabel}宫（${energy}，${info.desc}）。${
          good ? "三要得吉星，格局有力。" : "三要落凶星，宜布局化解。"
        }`,
        suggestion: good ? undefined : energySuggestion(energy, pl.room),
        affects: roomAffects(pl.room),
      })
    } else if (isSuppressor && !info.good) {
      // 卫生间/楼梯压凶星 = 化煞
      findings.push({
        id: `bz-sup-${pl.room}`, name: `${label}压${energy}`,
        type: "小吉", score: 0.5,
        location: `${palaceLabel}宫`,
        description: `${label}位于${energy}凶星宫，秽气压制凶星，反而有化煞之效。`,
        affects: ["健康"],
      })
    } else if (isSuppressor && info.good && info.rank >= 3) {
      // 卫生间压生气/延年 = 浪费吉星
      findings.push({
        id: `bz-waste-${pl.room}`, name: `${label}占${energy}`,
        type: "小凶", score: -1,
        location: `${palaceLabel}宫`,
        description: `${label}占据${energy}吉星宫，吉气受秽，旺气难以发挥。`,
        suggestion: "保持此区域格外整洁干燥，门常关，可放绿植化解。",
        affects: energy === "生气" ? ["财运"] : ["健康", "婚姻感情"],
      })
    } else if (["study", "kids-bedroom", "living-room"].includes(pl.room) && info.good) {
      findings.push({
        id: `bz-good-${pl.room}`, name: `${label}居${energy}`,
        type: "吉", score: info.rank * 0.5,
        location: `${palaceLabel}宫`,
        description: `${label}位于${palaceLabel}宫（${energy}），${info.desc}。`,
        affects: roomAffects(pl.room),
      })
    }
  }

  // ── 人宅匹配（需真实命卦）────────────────────────────────────────────
  let groupMatch: boolean | undefined
  let kuaGroup: string | undefined
  if (!isQuick && profile) {
    let kua = profile.kuaNumber
    if (kua === 5) kua = profile.gender === "male" ? 2 : 8
    const kd = KUA_DIRECTIONS[kua]
    if (kd) {
      kuaGroup = kd.group
      const houseGroup = HOUSE_GROUP[sittingDir8]
      groupMatch = kd.group.slice(0, 2) === houseGroup.slice(0, 2)
      findings.push(groupMatch ? {
        id: "renzhai-ok", name: "人宅相配",
        type: "吉", score: 2,
        location: "整体",
        description: `命卦属${kd.group}，房屋属${houseGroup}，人宅同气，居住相得。`,
        affects: ["财运", "事业官运", "健康", "家庭子女"],
      } : {
        id: "renzhai-no", name: "人宅不配",
        type: "小凶", score: -1,
        location: "整体",
        description: `命卦属${kd.group}，房屋属${houseGroup}，气场有别，宜以室内布局弥补。`,
        suggestion: "主卧与床位尽量安排在个人吉方，可部分化解。",
        affects: ["财运", "事业官运", "健康"],
      })

      // 主卧是否在个人吉方
      const master = placements.find((p) => p.room === "master-bedroom")
      if (master && master.primaryPalace !== "CENTER") {
        if (kd.auspicious.includes(master.primaryPalace)) {
          findings.push({
            id: "kua-master", name: "主卧居命卦吉方",
            type: "吉", score: 1.5,
            location: PALACE_INFO[master.primaryPalace as PalaceId].label + "宫",
            description: "主卧位于您命卦的吉方，睡眠休养得吉气滋养。",
            affects: ["健康", "婚姻感情"],
          })
        } else if (kd.inauspicious.slice(0, 2).includes(master.primaryPalace)) {
          findings.push({
            id: "kua-master-bad", name: "主卧居命卦凶方",
            type: "凶", score: -1.5,
            location: PALACE_INFO[master.primaryPalace as PalaceId].label + "宫",
            description: "主卧位于您命卦较凶的方位，长期休息受扰。",
            suggestion: "床头朝向个人吉方可部分化解（用罗盘单项测量确认）。",
            affects: ["健康", "婚姻感情"],
          })
        }
      }
    }
  }

  return { houseGua: GUA_NAME[sittingDir8] ?? "未知", sectorEnergies, groupMatch, kuaGroup, findings }
}

function energySuggestion(energy: SectorEnergy, room: string): string {
  if (energy === "绝命") return "可用铜葫芦/六帝钱化煞，保持明亮整洁；长期宜考虑功能调换。"
  if (energy === "五鬼") return "多用暖色照明，避免阴暗杂乱；可摆放红色装饰泄五鬼之气。"
  if (energy === "六煞") return "保持干燥，蓝黑色水属性装饰宜少用。"
  return "保持整洁明亮即可，祸害为小凶，影响有限。"
}

function roomAffects(room: string): FocusArea[] {
  switch (room) {
    case "front-door": return ["财运", "事业官运", "家庭子女"]
    case "master-bedroom": return ["健康", "婚姻感情"]
    case "stove": case "kitchen": return ["健康", "家庭子女"]
    case "study": return ["学业文昌", "事业官运"]
    case "kids-bedroom": return ["学业文昌", "家庭子女"]
    case "living-room": return ["贵人人际", "财运"]
    default: return ["健康"]
  }
}
