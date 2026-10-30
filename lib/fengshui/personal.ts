/**
 * personal.ts — 个人命卦吉凶方（八宅·东西四命）
 * 命卦对应的本卦方位作为"坐"，套八宅游年表得出八个方位的游年星。
 */

import { EIGHT_MANSIONS, ENERGY_INFO, type SectorEnergy } from "./bazhai-rules"
import { calcKuaGroup } from "./kua-number"

const KUA_TRIGRAM: Record<number, { gua: string; dir: string }> = {
  1: { gua: "坎", dir: "N" }, 2: { gua: "坤", dir: "SW" }, 3: { gua: "震", dir: "E" },
  4: { gua: "巽", dir: "SE" }, 6: { gua: "乾", dir: "NW" }, 7: { gua: "兑", dir: "W" },
  8: { gua: "艮", dir: "NE" }, 9: { gua: "离", dir: "S" },
}

export const DIR_CN: Record<string, string> = {
  N: "北", NE: "东北", E: "东", SE: "东南", S: "南", SW: "西南", W: "西", NW: "西北",
}

/** 每颗游年星的生活用法 */
export const ENERGY_USE: Record<SectorEnergy, string> = {
  生气: "财运事业 · 大门、书桌、办公座位宜朝此方",
  天医: "健康贵人 · 主卧、灶口朝向、长辈房宜在此",
  延年: "感情人缘 · 床头、夫妻主卧宜用此方",
  伏位: "安稳平和 · 冥想、读书、床头亦可",
  祸害: "口舌小灾 · 宜放杂物、卫生间、储藏",
  六煞: "破财烂桃花 · 宜卫生间、洗衣房",
  五鬼: "是非火灾 · 宜储藏、车库，忌卧室",
  绝命: "最凶 · 宜卫生间、杂物间压制，切忌主卧大门",
}

export type PersonalDirection = { dir: string; label: string; energy: SectorEnergy; good: boolean; rank: number; use: string }

export function personalDirections(kua: number): {
  gua: string
  group: "东四命" | "西四命"
  directions: PersonalDirection[]
} | null {
  const t = KUA_TRIGRAM[kua]
  if (!t) return null
  const table = EIGHT_MANSIONS[t.dir]
  const directions = Object.entries(table)
    .map(([dir, energy]) => ({
      dir, label: DIR_CN[dir], energy,
      good: ENERGY_INFO[energy].good, rank: ENERGY_INFO[energy].rank,
      use: ENERGY_USE[energy],
    }))
    .sort((a, b) => b.rank - a.rank)
  return { gua: t.gua, group: calcKuaGroup(kua) === "east" ? "东四命" : "西四命", directions }
}
