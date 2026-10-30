/**
 * theme.ts — 全局设计令牌（新中式 · 古铜罗盘风）
 *
 * 视觉方向取自 design/ 下的古铜罗盘参考图：墨黑底 + 古铜金线 + 朱砂/青玉点缀。
 * 所有页面统一从这里取色，不要在页面里再写死十六进制颜色。
 */

export const C = {
  // 底色层级（由深到浅）
  bg:        "#13100c",   // 页面底
  surface:   "#1d1812",   // 卡片
  surface2:  "#272017",   // 卡片内嵌块 / 输入框
  surface3:  "#33291d",   // 选中/悬浮
  line:      "#3a2f22",   // 分割线 / 描边
  lineStrong:"#5a4a33",

  // 古铜金
  gold:      "#c9a45c",
  goldBright:"#e6c77f",
  goldDeep:  "#8a6d3b",
  onGold:    "#1a1209",   // 金色按钮上的文字

  // 文字
  text:      "#efe6d2",
  textSub:   "#c4b496",
  textMuted: "#8f8069",
  textFaint: "#62574a",

  // 语义色
  good:      "#7fbf9a",   // 青玉 — 吉
  goodBg:    "#1b2a21",
  bad:       "#e07a5f",   // 朱砂 — 凶
  badBg:     "#2e1a14",
  warn:      "#e0a95f",
  warnBg:    "#2e2414",
  info:      "#8fb3d9",
  infoBg:    "#17212c",

  // 飞星：山星 / 向星
  mountainStar: "#e6c77f",
  facingStar:   "#8fb3d9",

  overlay:   "rgba(0,0,0,0.6)",
} as const

export const R = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const

export const F = {
  hero:   { fontSize: 34, fontWeight: "900" as const, letterSpacing: 2 },
  h1:     { fontSize: 24, fontWeight: "800" as const },
  h2:     { fontSize: 18, fontWeight: "800" as const },
  h3:     { fontSize: 15, fontWeight: "800" as const },
  body:   { fontSize: 14, lineHeight: 22 },
  small:  { fontSize: 12, lineHeight: 18 },
  tiny:   { fontSize: 11, lineHeight: 15 },
} as const

/** 七级评级配色（深色底） */
export const RATING_TONE: Record<string, { fg: string; bg: string }> = {
  大吉: { fg: "#8fd4a8", bg: "#16291e" },
  吉:   { fg: "#7fbf9a", bg: "#18271e" },
  小吉: { fg: "#a6c98f", bg: "#1f2718" },
  中平: { fg: "#e6c77f", bg: "#2a2316" },
  小凶: { fg: "#e0a95f", bg: "#2e2414" },
  凶:   { fg: "#e07a5f", bg: "#2e1a14" },
  大凶: { fg: "#f06a5a", bg: "#341511" },
}
