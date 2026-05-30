import { degreeToDirection, oppositDirection } from "./direction";
import type { Direction } from "./types";

export type GuaType = "生气" | "天医" | "延年" | "伏位" | "祸害" | "六煞" | "五鬼" | "绝命";

type BaguaRow = Record<Direction, GuaType>;

const BAGUA_TABLE: Record<number, BaguaRow> = {
  1: { N: "伏位", NE: "六煞", E: "天医", SE: "生气", S: "延年", SW: "绝命", W: "祸害", NW: "五鬼" },
  2: { N: "绝命", NE: "伏位", E: "祸害", SE: "五鬼", S: "六煞", SW: "天医", W: "生气", NW: "延年" },
  3: { N: "天医", NE: "祸害", E: "伏位", SE: "延年", S: "生气", SW: "五鬼", W: "六煞", NW: "绝命" },
  4: { N: "生气", NE: "五鬼", E: "延年", SE: "伏位", S: "天医", SW: "六煞", W: "绝命", NW: "祸害" },
  6: { N: "五鬼", NE: "延年", E: "六煞", SE: "祸害", S: "绝命", SW: "生气", W: "天医", NW: "伏位" },
  7: { N: "祸害", NE: "绝命", E: "五鬼", SE: "六煞", S: "天医", SW: "延年", W: "伏位", NW: "生气" },
  8: { N: "六煞", NE: "伏位", E: "绝命", SE: "祸害", S: "五鬼", SW: "天医", W: "延年", NW: "生气" },
  9: { N: "延年", NE: "绝命", E: "生气", SE: "天医", S: "伏位", SW: "祸害", W: "五鬼", NW: "六煞" },
};

const GUA_SCORES: Record<GuaType, number> = {
  生气: 50,
  天医: 40,
  延年: 35,
  伏位: 30,
  祸害: 20,
  六煞: 15,
  五鬼: 10,
  绝命: 5,
};

const GUA_HIGHLIGHTS: Partial<Record<GuaType, string>> = {
  生气: "大门朝向与你的命卦较为契合，属于较有利的旺气方位。",
  天医: "朝向对健康与修复类能量较友好，整体气场较柔和稳定。",
  延年: "朝向有利于关系和谐与居住稳定，属于较舒服的长期方位。",
  伏位: "朝向偏稳，整体气感较平和，适合做基础型的安定布局。",
};

const GUA_SUGGESTIONS: Partial<Record<GuaType, string>> = {
  祸害: "可在入门附近放置圆叶绿植，柔化方向不合带来的轻度冲突感。",
  六煞: "可加强玄关灯光与整洁度，减轻方向不合造成的浮动感。",
  五鬼: "保持门口明亮、清爽，避免杂物堆积，让气口更稳定。",
  绝命: "可在门内侧加入高绿植或小型屏风，帮助缓和直入的气流感。",
};

function resolveKua(kuaNumber: number): number {
  if (kuaNumber === 5) return 2;
  return kuaNumber;
}

export function getGuaType(facingDegree: number, kuaNumber: number): GuaType {
  const facing = degreeToDirection(facingDegree);
  const sitting = oppositDirection(facing);
  const row = BAGUA_TABLE[resolveKua(kuaNumber)];
  return row[sitting];
}

export function calcCompassScore(facingDegree: number, kuaNumber: number): number {
  return GUA_SCORES[getGuaType(facingDegree, kuaNumber)];
}

export function getCompassHighlight(guaType: GuaType): string | null {
  return GUA_HIGHLIGHTS[guaType] ?? null;
}

export function getCompassSuggestion(guaType: GuaType): string | null {
  return GUA_SUGGESTIONS[guaType] ?? null;
}

export function getCompassImprovement(guaType: GuaType): string | null {
  const labels: Partial<Record<GuaType, string>> = {
    祸害: "当前朝向与命卦之间存在轻度冲突，入户位置值得做柔化处理。",
    六煞: "这个朝向容易让入口区域的气感偏浮动，适合加强稳定感。",
    五鬼: "当前朝向对你的命卦支持较弱，建议重点整理门口与玄关。",
    绝命: "这是较强的不合方位，建议在入户与视线上做更明确的化解设计。",
  };
  return labels[guaType] ?? null;
}
