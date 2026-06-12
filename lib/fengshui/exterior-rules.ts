/**
 * exterior-rules.ts — 外局峦头规则（v3）
 *
 * 与 v2 patterns.ts 的根本区别：
 *   - 消费 ExternalFeatureV3{ring, relative, confirmed}，不再用 8 方位元素列表
 *   - 形煞只在 near/mid 环触发，severity 按环带权重衰减
 *   - 几何敏感格局（路冲/反弓/玉带）必须 confirmed===true
 *   - 四灵用相对方位（front=朱雀 back=玄武 left=青龙 right=白虎）
 */

import type { ExternalFeatureV3, FocusArea } from "@/types/fengshui"
import { ringWeight, severityBaseOf } from "./palaces"

/**
 * 统一煞气评分：severity = severityBase × ringWeight
 * （confirmed 已在 active() 过滤；geometryAdjustment 由各规则的触发条件承担）
 */
function shaScore(f: ExternalFeatureV3): number {
  const base = f.severityBase ?? severityBaseOf(f.kind)
  return -base * ringWeight(f.ring)
}
function goodScore(f: ExternalFeatureV3, magnitude: number): number {
  return magnitude * ringWeight(f.ring)
}

export type ExteriorFinding = {
  id: string
  name: string
  type: "大吉" | "吉" | "小吉" | "中平" | "小凶" | "凶" | "大凶" | "煞"
  score: number             // 已按距离环带加权
  location: string          // 如 "前方（朱雀）50m 内"
  description: string
  classic?: string
  suggestion?: string
  affects: FocusArea[]
}

const REL_LABEL: Record<string, string> = {
  front: "前方（朱雀）", back: "后方（玄武）", left: "左方（青龙）", right: "右方（白虎）",
}

// 只统计已确认（自动项需用户确认，手动项默认确认）
function active(features: ExternalFeatureV3[]): ExternalFeatureV3[] {
  return features.filter((f) => f.confirmed)
}

function has(fs: ExternalFeatureV3[], kinds: string[], opts?: {
  relative?: string[]; rings?: string[]
}): ExternalFeatureV3 | undefined {
  return fs.find((f) =>
    kinds.some((k) => f.kind.includes(k)) &&
    (!opts?.relative || opts.relative.includes(f.relative)) &&
    (!opts?.rings || opts.rings.includes(f.ring))
  )
}

function locText(f: ExternalFeatureV3): string {
  return `${REL_LABEL[f.relative]} ${Math.round(f.distance)}m`
}

export function runExteriorRules(features: ExternalFeatureV3[]): ExteriorFinding[] {
  const fs = active(features)
  const out: ExteriorFinding[] = []
  const push = (f: ExteriorFinding) => out.push(f)

  // ── 1. 路冲煞（必须人工确认 T字路口正对，且在近/中环、前方）─────────
  {
    const hit = has(fs, ["T字路口"], { relative: ["front"], rings: ["near", "mid"] })
    if (hit) push({
      id: "luchong", name: "路冲煞",
      type: "煞", score: shaScore(hit),
      location: locText(hit),
      classic: "《阳宅三要》：路冲者，衰神煞，主破财损丁",
      description: `${locText(hit)}有道路直冲，气如箭矢，距离越近冲射越烈。`,
      suggestion: "门前种植茂密乔木或设照壁，玄关内置屏风缓冲气流。",
      affects: ["财运", "健康", "出行安全"],
    })
  }

  // ── 2. 反弓煞（人工确认，近/中环）────────────────────────────────────
  {
    const hit = has(fs, ["弯道背离", "反弓"], { rings: ["near", "mid"] })
    if (hit) push({
      id: "fangong", name: "反弓煞",
      type: "凶", score: shaScore(hit),
      location: locText(hit),
      classic: "《撼龙经》：弓背朝我是为煞，气散财离人丁衰",
      description: `${locText(hit)}道路弓背朝向房屋，气流外散难聚。`,
      suggestion: "受煞方向植弧形绿篱，或设流水景观引气归堂。",
      affects: ["财运", "家庭子女"],
    })
  }

  // ── 3. 玉带环抱（人工确认）──────────────────────────────────────────
  {
    const hit = has(fs, ["弯道朝向", "玉带"], { rings: ["near", "mid"] })
    if (hit) push({
      id: "yudai", name: "玉带环抱",
      type: "大吉", score: goodScore(hit, 3),
      location: locText(hit),
      classic: "《地理五诀》：玉带缠腰富贵长",
      description: `${locText(hit)}道路弯曲环抱，聚气纳财，上佳形局。`,
      affects: ["财运", "贵人人际"],
    })
  }

  // ── 4. 玄武有靠 / 背水无靠（后方）────────────────────────────────────
  {
    const support = has(fs, ["山/高地", "高楼", "低矮建筑", "树林"], { relative: ["back"] })
    const water = has(fs, ["水(湖河海)", "小溪"], { relative: ["back"], rings: ["near", "mid"] })
    if (water && !support) push({
      id: "shuihou", name: "背水无靠",
      type: "凶", score: shaScore(water),
      location: locText(water),
      classic: "《阳宅撮要》：坐后见水，玄武受冲",
      description: "屋后近处有水而无实靠，气场不稳，主后援乏力。",
      suggestion: "后院建围墙或种植高大乔木，人工成靠。",
      affects: ["事业官运", "家庭子女", "健康"],
    })
    else if (support) push({
      id: "xuanwu", name: "玄武有靠",
      type: "吉", score: goodScore(support, 2),
      location: locText(support),
      classic: "《葬经》：玄武垂头，龙势有根",
      description: "屋后有山地/建筑为靠，后援有力，主事业稳定。",
      affects: ["事业官运", "健康", "家庭子女"],
    })
  }

  // ── 5. 明堂格局（前方）──────────────────────────────────────────────
  {
    const open = has(fs, ["空地/开阔", "公园"], { relative: ["front"] })
    const water = has(fs, ["水(湖河海)", "小溪"], { relative: ["front"], rings: ["near", "mid"] })
    if (open && water) push({
      id: "mingtang_water", name: "明堂聚水",
      type: "大吉", score: goodScore(water, 3),
      location: locText(water),
      classic: "《地理五诀》：前有明堂聚水，财气不绝",
      description: "前方开阔且近处见水，藏风聚气，玄空向星得水尤佳。",
      affects: ["财运", "贵人人际", "事业官运"],
    })
    else if (open) push({
      id: "mingtang_open", name: "朱雀明堂开阔",
      type: "吉", score: goodScore(open, 2),
      location: locText(open),
      description: "前方宽阔无阻，纳气充足，主前途光明。",
      affects: ["财运", "事业官运"],
    })
  }

  // ── 6. 天斩煞（前方近/中环两栋高楼，人工确认有夹缝）──────────────────
  {
    const hit = has(fs, ["天斩", "两楼夹缝"], { rings: ["near", "mid"] })
    if (hit) push({
      id: "tianzhan", name: "天斩煞",
      type: "大凶", score: shaScore(hit),
      location: locText(hit),
      classic: "《沈氏玄空学》：两楼夹缝如刀，号曰天斩",
      description: `${locText(hit)}两栋高楼之间的狭缝正对房屋，气流切割。`,
      suggestion: "受煞方向挂凸面镜，窗台摆放阔叶植物遮挡。",
      affects: ["健康", "财运", "婚姻感情"],
    })
  }

  // ── 7. 高速公路（近环才算煞，中环减弱，远环只是事实）────────────────
  {
    const hit = has(fs, ["高速公路"], { rings: ["near"] })
    const mid = has(fs, ["高速公路"], { rings: ["mid"] })
    if (hit) push({
      id: "gaosu", name: "高速动煞",
      type: "凶", score: shaScore(hit),
      location: locText(hit),
      description: "高速公路紧邻（50m内），噪音气流扰动剧烈，气场难安。",
      suggestion: "临高速一侧加厚隔音，密植乔木隔离带。",
      affects: ["健康", "财运"],
    })
    else if (mid) push({
      id: "gaosu_mid", name: "近高速",
      type: "小凶", score: shaScore(mid),
      location: locText(mid),
      description: "高速公路在 200m 内，有一定噪音与气流影响。",
      affects: ["健康"],
    })
  }

  // ── 8. 阴煞（墓地，近/中环）─────────────────────────────────────────
  {
    const hit = has(fs, ["墓地"], { rings: ["near", "mid"] })
    if (hit) push({
      id: "yinsha", name: "阴煞",
      type: "大凶", score: shaScore(hit),
      location: locText(hit),
      classic: "《阳宅三要》：近墓者阴气重",
      description: `${locText(hit)}有墓地，阴气较重。`,
      suggestion: "多种阳性植物，加强采光照明。",
      affects: ["健康", "家庭子女"],
    })
  }

  // ── 9. 高压电煞（近环）──────────────────────────────────────────────
  {
    const hit = has(fs, ["高压线"], { rings: ["near"] })
    if (hit) push({
      id: "diansha", name: "高压电煞",
      type: "凶", score: shaScore(hit),
      location: locText(hit),
      description: "高压线在 50m 内经过，电磁干扰，主心神不宁。",
      suggestion: "卧室避开朝向高压线一侧。",
      affects: ["健康"],
    })
  }

  // ── 10. 尖煞（人工确认尖角正对，近/中环）─────────────────────────────
  {
    const hit = has(fs, ["尖顶", "尖角"], { rings: ["near", "mid"] })
    if (hit) push({
      id: "jiansha", name: "尖煞",
      type: "凶", score: shaScore(hit),
      location: locText(hit),
      classic: "《阳宅撮要》：尖角对射，主口舌血光",
      description: `${locText(hit)}有尖角建筑朝向房屋。`,
      suggestion: "受煞方向种圆叶灌木遮挡。",
      affects: ["财运", "健康"],
    })
  }

  // ── 11. 青龙白虎平衡（左右对比）──────────────────────────────────────
  {
    const left = has(fs, ["山/高地", "高楼"], { relative: ["left"] })
    const right = has(fs, ["山/高地", "高楼"], { relative: ["right"] })
    if (left && !right) push({
      id: "qinglong", name: "青龙昂首",
      type: "吉", score: goodScore(left, 1.5),
      location: locText(left),
      description: "左方（青龙位）有高物，主贵人相助、男丁兴旺。",
      affects: ["事业官运", "贵人人际"],
    })
    else if (right && !left) push({
      id: "baihu", name: "白虎压青龙",
      type: "凶", score: shaScore(right),
      location: locText(right),
      classic: "《地理五诀》：白虎昂头，主口舌是非",
      description: "右方（白虎位）高于左方，白虎抬头压制青龙。",
      suggestion: "左方种高大乔木或设高灯柱平衡气势。",
      affects: ["事业官运", "婚姻感情"],
    })
  }

  // ── 12. 四灵完备（前开阔 + 后有靠 + 左右有护）────────────────────────
  {
    const front = has(fs, ["空地/开阔", "水(湖河海)", "公园"], { relative: ["front"] })
    const back = has(fs, ["山/高地", "高楼", "低矮建筑", "树林"], { relative: ["back"] })
    const left = has(fs, ["山/高地", "高楼", "低矮建筑", "树林"], { relative: ["left"] })
    const right = has(fs, ["山/高地", "高楼", "低矮建筑", "树林"], { relative: ["right"] })
    if (front && back && left && right) push({
      id: "siling", name: "四灵格局完备",
      type: "大吉", score: 3,
      location: "整体外局",
      classic: "《葬经》：玄武垂头，朱雀翔舞，青龙蜿蜒，白虎驯俯",
      description: "前有明堂、后有靠山、左右有护，四灵齐备，极难得的大吉外局。",
      affects: ["财运", "事业官运", "婚姻感情", "健康", "家庭子女", "贵人人际"],
    })
  }

  // ── 13. 水局（任意方向近/中环见水，与第5条不重复时的兜底加分）────────
  {
    const water = has(fs, ["水(湖河海)"], { rings: ["near", "mid"] })
    const already = out.some((o) => o.id === "mingtang_water" || o.id === "shuihou")
    if (water && !already) push({
      id: "shuiju", name: "近水格局",
      type: "小吉", score: goodScore(water, 1),
      location: locText(water),
      description: "近处见水，水主财气流通；具体吉凶以玄空向星到水方为准。",
      affects: ["财运"],
    })
  }

  return out
}
