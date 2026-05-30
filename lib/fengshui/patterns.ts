/**
 * patterns.ts — 风水格局规则库（离线，无需 AI）
 *
 * 覆盖：形势派巒头 + 八宅理气 + 室内格局 + 玄空飞星基础
 * 规则来源：《地理五诀》《阳宅三要》《八宅明镜》《沈氏玄空学》
 */

import type { StandingPoint, UserProfile, FocusArea } from "@/types/fengshui"
import type { RuleEngineResult } from "./rule-engine"
import { isQuickModeProfile } from "./quickmode"

// ── 评级类型 ─────────────────────────────────────────────────────────────────
export type PatternType =
  | "大吉" | "吉" | "小吉"
  | "中平"
  | "小凶" | "凶" | "大凶" | "煞"

export type PatternResult = {
  id:          string
  name:        string
  type:        PatternType
  score:       number        // -3 ~ +3
  category:    "外部形势" | "室内格局" | "八宅理气" | "人宅匹配" | "玄机格局"
  location:    string
  description: string
  classic?:    string        // 古籍出处
  suggestion?: string
  affects:     FocusArea[]  // 影响的运势方向
}

export type PatternInput = {
  standingPoints: StandingPoint[]
  profile:        UserProfile
  ruleResult:     RuleEngineResult
}

type PatternFn = (input: PatternInput) => PatternResult | null

// ── 辅助函数 ─────────────────────────────────────────────────────────────────
function allEls(pts: StandingPoint[]): string[] {
  return pts.flatMap((p) => p.directions.flatMap((d) => d.elements))
}

function pointEls(pt: StandingPoint): string[] {
  return pt.directions.flatMap((d) => d.elements)
}

function hasAny(els: string[], keywords: string[]): boolean {
  return els.some((e) => keywords.some((k) => e.includes(k)))
}

function countDirsWithElement(pt: StandingPoint, keywords: string[]): number {
  return pt.directions.filter((d) =>
    d.elements.some((e) => keywords.some((k) => e.includes(k)))
  ).length
}

function dirEls(pt: StandingPoint, dir: string): string[] {
  return pt.directions.find((d) => d.direction === dir)?.elements ?? []
}

function outdoor(pts: StandingPoint[])    { return pts.find((p) => p.type === "outdoor") }
function kitchen(pts: StandingPoint[])    { return pts.find((p) => p.type === "kitchen") }
function bedroom(pts: StandingPoint[])    { return pts.find((p) => p.type === "master-bedroom") }
function livingRoom(pts: StandingPoint[]) { return pts.find((p) => p.type === "living-room") }
function study(pts: StandingPoint[])      { return pts.find((p) => p.type === "study") }
function entrance(pts: StandingPoint[])   { return pts.find((p) => p.type === "front-door-inside") }

const OPPOSITE: Record<string, string> = {
  N:"S",S:"N",E:"W",W:"E",NE:"SW",SW:"NE",SE:"NW",NW:"SE",
}

// ════════════════════════════════════════════════════════════════════════════
// 外部形势格局（巒头 · 外局）
// ════════════════════════════════════════════════════════════════════════════

// 1. 路冲煞
const p_luchong: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  const els = pointEls(out)
  if (!hasAny(els, ["T字路口正对"])) return null
  const isHighway = hasAny(els, ["高速公路"])
  return {
    id:"luchong", name: isHighway ? "高速路冲煞" : "路冲煞",
    type:"煞", score:-3, category:"外部形势", location:"大门外",
    classic:"《阳宅三要》：路冲者，衰神煞，主破财损丁",
    description:"直路正冲大门，气如箭矢，冲射之力最烈，主意外横祸、破财伤丁、家宅不安。",
    suggestion:"门前种植茂密乔木三至五棵，或设照壁，玄关内置泰山石敢当，内设弯曲走道缓冲气流。",
    affects:["财运","健康","出行安全"],
  }
}

// 2. 反弓煞
const p_fangong: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  if (!hasAny(pointEls(out), ["弯道背离大门"])) return null
  return {
    id:"fangong", name:"反弓煞",
    type:"凶", score:-2, category:"外部形势", location:"大门外",
    classic:"《撼龙经》：弓背朝我是为煞，气散财离人丁衰",
    description:"道路如弓背朝向房屋，气流向外发散，无法聚集，主财气外散、人口离散、谋事难成。",
    suggestion:"门前设置流水景观或鱼缸，引水归堂。可植弧形绿篱化解反弓形煞。",
    affects:["财运","家庭子女"],
  }
}

// 3. 玉带环抱
const p_yudai: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  if (!hasAny(pointEls(out), ["弯道朝向大门"])) return null
  return {
    id:"yudai", name:"玉带环抱",
    type:"大吉", score:3, category:"外部形势", location:"大门外",
    classic:"《地理五诀》：玉带缠腰富贵长，弓面朝我水来藏",
    description:"道路或水流弯曲环抱房屋，如玉带缠腰，聚气纳财，为风水上上格局，主富贵绵长、贵人相助。",
    affects:["财运","贵人人际"],
  }
}

// 4. 靠山格局
const p_kaoshanjixiong: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseSitting) return null
  const sitting = ruleResult.houseSitting
  const sittingEls = dirEls(out, sitting)
  const hasSupport = hasAny(sittingEls, ["山/高地","高楼","低矮建筑","树林"])
  const hasWater   = hasAny(sittingEls, ["水(湖河海)","小溪水渠"])
  if (hasWater) return {
    id:"shuihou", name:"背水无靠",
    type:"凶", score:-2, category:"外部形势", location:`坐山（${sitting}方）`,
    classic:"《阳宅撮要》：坐后见水，玄武受冲，主家宅不稳",
    description:"房屋坐山方向有水而无靠，玄武无依，气场不稳，主家宅动荡、后援乏力、子孙难旺。",
    suggestion:"可在后院种植高大乔木或建筑石墙，以人工手段形成靠山格局。",
    affects:["事业官运","家庭子女"],
  }
  if (hasSupport) return {
    id:"xuanwu", name:"玄武有靠",
    type:"吉", score:2, category:"外部形势", location:`坐山（${sitting}方）`,
    classic:"《葬经》：玄武垂头，主势盘旋，龙势有根",
    description:"房屋背后有山地、高建筑为靠，玄武稳固，后援有力，主事业稳定、子孙有靠、家宅安泰。",
    affects:["事业官运","健康","家庭子女"],
  }
  return null
}

// 5. 明堂聚气
const p_mingtang: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseFacing) return null
  const fEls = dirEls(out, ruleResult.houseFacing)
  const isOpen  = hasAny(fEls, ["空地/开阔"])
  const hasWater = hasAny(fEls, ["水(湖河海)","小溪水渠"])
  if (isOpen && hasWater) return {
    id:"mingtang_water", name:"明堂聚水",
    type:"大吉", score:3, category:"外部形势", location:`朝向（${ruleResult.houseFacing}方）`,
    classic:"《地理五诀》：前有明堂聚水，财气不绝，富贵双全",
    description:"前方明堂开阔且有水局，藏风聚气至极，为风水最贵格局之一，主财运亨通、贵人涌现、代代富贵。",
    affects:["财运","贵人人际","事业官运"],
  }
  if (isOpen) return {
    id:"mingtang_open", name:"朱雀明堂开阔",
    type:"吉", score:2, category:"外部形势", location:`朝向（${ruleResult.houseFacing}方）`,
    description:"前方宽阔无阻，朱雀展翅，纳气充足，主事业发展顺畅、财运稳健、前途光明。",
    affects:["财运","事业官运"],
  }
  return null
}

// 6. 天斩煞
const p_tianzhan: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  const dirs8 = ["N","NE","E","SE","S","SW","W","NW"]
  const adjacentPairs = [["N","NE"],["NE","E"],["E","SE"],["SE","S"],
                         ["S","SW"],["SW","W"],["W","NW"],["NW","N"]]
  for (const [a, b] of adjacentPairs) {
    if (hasAny(dirEls(out,a),["高楼"]) && hasAny(dirEls(out,b),["高楼"])) {
      return {
        id:"tianzhan", name:"天斩煞",
        type:"大凶", score:-2.5, category:"外部形势", location:`${a}-${b}方`,
        classic:"《沈氏玄空学》：两楼夹缝如刀，号曰天斩，主大凶",
        description:`${a}与${b}方向各有高楼，两楼之间形成狭缝，气如刀刃切割，主意外灾祸、疾病手术、官非纠纷。`,
        suggestion:"可在受煞方向悬挂凸面镜或葫芦，并在室内该方向摆放化煞物。",
        affects:["健康","财运","婚姻感情"],
      }
    }
  }
  return null
}

// 7. 钻心煞（古义：高速/主干道直穿前后，且无建筑遮挡）
const p_zuanxin: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseFacing || !ruleResult.houseSitting) return null

  const facingEls  = dirEls(out, ruleResult.houseFacing)
  const sittingEls = dirEls(out, ruleResult.houseSitting)

  // 必要条件 1: 前后都必须是「高速公路」（最严，主干道也不算）
  const facingHwy  = hasAny(facingEls,  ["高速公路"])
  const sittingHwy = hasAny(sittingEls, ["高速公路"])
  if (!facingHwy || !sittingHwy) return null

  // 必要条件 2: 后方不能有建筑遮挡（如果坐山有低矮建筑/高楼/树林，气被挡住，不是穿心）
  const sittingBlocked = hasAny(sittingEls, ["低矮建筑","高楼","树林","山/高地"])
  if (sittingBlocked) return null

  return {
    id:"zuanxin", name:"钻心煞",
    type:"大凶", score:-3, category:"外部形势", location:"前后高速贯穿",
    classic:"《八宅明镜》：前后有路直穿，名曰钻心，百事皆损",
    description:"房屋前后方向皆有高速公路贯穿，无建筑遮挡，气流如箭穿心而过，主财散人离、诸事不成。",
    suggestion:"最佳方案：搬迁。若无法搬迁：前后门均设照壁，室内中心位置设圆形地毯聚气，种植大型圆叶植物。",
    affects:["财运","健康","家庭子女","事业官运"],
  }
}

// 8. 壁刀煞 — 需用户目视确认（OSM 不能区分"邻居"与"墙角对冲"）
// 仅当用户手动在某方向标记了「尖顶建筑」（视觉上有锐角朝向大门）时才触发
const p_bidao: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseFacing) return null
  const adjDirs: Record<string,string[]> = {
    N:["NE","NW"], S:["SE","SW"], E:["NE","SE"], W:["NW","SW"],
    NE:["N","E"], SE:["S","E"], SW:["S","W"], NW:["N","W"],
  }
  const adj = adjDirs[ruleResult.houseFacing] ?? []
  for (const d of adj) {
    // ⚠ 必须用户明确标记「尖顶建筑」，普通邻居建筑（低矮/高楼）不算
    if (hasAny(dirEls(out,d), ["尖顶建筑"])) {
      return {
        id:"bidao", name:"壁刀煞",
        type:"凶", score:-1.5, category:"外部形势", location:`${d}方侧面`,
        classic:"《阳宅十书》：屋角切割如刀，主血光、口舌",
        description:`${d}方有尖顶建筑棱角切向大门，形成壁刀煞，主口舌是非、血光之灾。`,
        suggestion:"在受切割方向种植茂密圆叶灌木遮挡，或挂山海镇化煞。",
        affects:["健康","财运"],
      }
    }
  }
  return null
}

// 9. 孤峰煞
const p_gufeng: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  const dirsWithHighrise = ["N","NE","E","SE","S","SW","W","NW"].filter((d) =>
    hasAny(dirEls(out,d), ["高楼"])
  )
  if (dirsWithHighrise.length !== 1) return null
  const dirsWithLow = ["N","NE","E","SE","S","SW","W","NW"].filter((d) =>
    d !== dirsWithHighrise[0] && hasAny(dirEls(out,d), ["空地/开阔","低矮建筑"])
  )
  if (dirsWithLow.length < 3) return null
  return {
    id:"gufeng", name:"孤峰煞",
    type:"小凶", score:-1, category:"外部形势", location:`${dirsWithHighrise[0]}方`,
    classic:"《撼龙经》：孤峰独耸，气散无依，吉凶难定",
    description:`${dirsWithHighrise[0]}方有孤立高楼独耸，周围平坦无依，形势不稳，主运势起伏、孤独无助、谋事多变。`,
    suggestion:"在孤峰方向的窗户挂绿植缓和气场，避免将书房或卧室面朝孤峰方向。",
    affects:["事业官运","贵人人际"],
  }
}

// 10. 白虎压青龙（左低右高）
const p_huyin: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseFacing) return null
  // 面朝S/N时：青龙=E，白虎=W
  // 面朝E/W时：青龙=N，白虎=S（简化处理）
  const facingDir = ruleResult.houseFacing
  const dragonDir = { N:"E", S:"E", E:"N", W:"S", NE:"NW", SW:"SE", SE:"NE", NW:"SW" }[facingDir]
  const tigerDir  = { N:"W", S:"W", E:"S", W:"N", NE:"SE", SW:"NW", SE:"SW", NW:"NE" }[facingDir]
  if (!dragonDir || !tigerDir) return null
  const dragonHigh = hasAny(dirEls(out,dragonDir), ["山/高地","高楼"])
  const tigerHigh  = hasAny(dirEls(out,tigerDir),  ["山/高地","高楼"])
  if (!dragonHigh && tigerHigh) return {
    id:"baihu_ya", name:"白虎压青龙",
    type:"凶", score:-2, category:"外部形势", location:`左${dragonDir}低右${tigerDir}高`,
    classic:"《地理五诀》：白虎昂头，青龙伏地，家中多妇人当权，男丁受制",
    description:`右方（白虎${tigerDir}）高于左方（青龙${dragonDir}），白虎压制青龙，主男丁运势受损、事业多阻、口舌纠纷频发。`,
    suggestion:"在青龙方（左方）种植高大乔木提升气势，或在该方设置高灯柱以平衡左右高度。",
    affects:["事业官运","婚姻感情"],
  }
  if (dragonHigh && !tigerHigh) return {
    id:"qinglong_wang", name:"青龙昂首",
    type:"吉", score:1.5, category:"外部形势", location:`左${dragonDir}高`,
    description:`左方（青龙${dragonDir}）高于右方（白虎${tigerDir}），青龙昂首，主男丁兴旺、事业有成、贵人相助。`,
    affects:["事业官运","贵人人际"],
  }
  return null
}

// 11. 双龙抢珠（道路会合）
const p_shuanglong: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseFacing) return null
  // 朝向两侧均有道路汇聚
  const f = ruleResult.houseFacing
  const adjDirs: Record<string,string[]> = {
    N:["NE","NW"], S:["SE","SW"], E:["NE","SE"], W:["NW","SW"],
    NE:["N","E"], SE:["S","E"], SW:["S","W"], NW:["N","W"],
  }
  const adj = adjDirs[f] ?? []
  if (adj.length < 2) return null
  // 严格：必须三方向都有「主干道/高速/水体」，普通住宅街道（小路街道）不算
  const bothHaveMajor = adj.every((d) => hasAny(dirEls(out,d), ["主干道","高速公路","水(湖河海)"]))
  const faceHasMajor  = hasAny(dirEls(out,f), ["主干道","高速公路","水(湖河海)"])
  if (!bothHaveMajor || !faceHasMajor) return null
  return {
    id:"shuanglong", name:"双龙抢珠",
    type:"大吉", score:2.5, category:"外部形势", location:"大门前方",
    classic:"《地理五诀》：两水夹一龙，富贵无终穷",
    description:"大门正前方及两侧均有主干道或水体汇聚，形如双龙抢珠，聚气极旺，主财源广进、贵人云集。",
    affects:["财运","贵人人际"],
  }
}

// 12. 回旋聚气（多方有水环绕）
const p_huixuan: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  const waterDirs = countDirsWithElement(out, ["水(湖河海)","小溪水渠","弯道朝向大门"])
  if (waterDirs < 3) return null
  return {
    id:"huixuan", name:"回旋聚水",
    type:"大吉", score:3, category:"外部形势", location:"房屋周边",
    classic:"《水龙经》：水绕三方，财气大旺，子孙绵延",
    description:"房屋三方以上有水环绕，气场回旋聚积，为极贵水局，主财富积累迅速、人丁兴旺、百事顺遂。",
    affects:["财运","家庭子女"],
  }
}

// 13. 停气聚气格局（四周有围合，前方开阔）
const p_tingqi: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseFacing) return null
  const enclosed = ["N","NE","E","SE","S","SW","W","NW"].filter((d) =>
    d !== ruleResult.houseFacing &&
    hasAny(dirEls(out,d), ["低矮建筑","高楼","山/高地","树林"])
  ).length
  const frontOpen = hasAny(dirEls(out, ruleResult.houseFacing), ["空地/开阔","水(湖河海)"])
  if (enclosed >= 4 && frontOpen) return {
    id:"tingqi", name:"藏风停气",
    type:"吉", score:2, category:"外部形势", location:"整体格局",
    classic:"《葬经》：气乘风则散，界水则止，古人聚之使不散，藏风聚气",
    description:"房屋三面有围合遮挡，前方开阔纳气，形成藏风聚气之局，气流停积于此，主财气稳定积累、家宅安宁。",
    affects:["财运","家庭子女"],
  }
  return null
}

// 14. 恶水煞（停滞污水）
const p_eshuisha: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseSitting) return null
  const sittingWater = hasAny(dirEls(out, ruleResult.houseSitting), ["水(湖河海)","小溪水渠"])
  const facingWater  = ruleResult.houseFacing ? hasAny(dirEls(out, ruleResult.houseFacing), ["水(湖河海)"]) : false
  // 坐山有水（背水）且朝向无水（不是水绕型）
  if (sittingWater && !facingWater) return {
    id:"eshuisha", name:"背水无靠",
    type:"凶", score:-2, category:"外部形势", location:`坐山（${ruleResult.houseSitting}方）`,
    description:"坐山方向背靠水体，玄武无依，气场不稳，水主动荡，主家业难守、健康受损、子孙运势飘移。",
    suggestion:"后院建实体围墙或种植密集竹林，人工制造靠山效果。",
    affects:["事业官运","家庭子女","健康"],
  }
  return null
}

// 15. 阴煞
const p_yinsha: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  if (!hasAny(pointEls(out), ["墓地"])) return null
  return {
    id:"yinsha", name:"阴煞",
    type:"大凶", score:-3, category:"外部形势", location:"大门外周边",
    classic:"《阳宅三要》：近墓者，阴气重，主病灾连绵",
    description:"房屋附近有墓地，阴寒之气弥漫，长期居住主家人健康欠佳、精神萎靡、噩梦频繁、诸事不顺。",
    suggestion:"大量种植阳性植物（龙柏、桂花、菊花），加强室内照明与通风，门口挂八卦凸镜。",
    affects:["健康","家庭子女"],
  }
}

// 16. 电煞
const p_diansha: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  if (!hasAny(pointEls(out), ["高压线"])) return null
  return {
    id:"diansha", name:"高压电煞",
    type:"凶", score:-2, category:"外部形势", location:"房屋周边",
    description:"高压输电线从房屋附近经过，强烈电磁场形成电煞，主心神不宁、睡眠障碍、头疼头晕、运势受干扰。",
    suggestion:"在高压线方向种植密集绿化带遮挡，卧室床头避免朝向高压线方位，可在该方放置黑曜石或水晶柱。",
    affects:["健康"],
  }
}

// 17. 尖煞（煞气）
const p_jiansha: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  if (!hasAny(pointEls(out), ["尖顶建筑"])) return null
  return {
    id:"jiansha", name:"尖煞",
    type:"凶", score:-1.5, category:"外部形势", location:"大门外",
    classic:"《阳宅撮要》：尖角对射，主口舌血光",
    description:"周边有尖顶或锐角建筑朝向房屋，尖煞射入，主破财、口舌纠纷、头部及血光之灾。",
    suggestion:"受煞方向挂凸面镜折射尖煞，或种植圆叶灌木遮挡，室内对应方位放圆形装饰品化解尖锐。",
    affects:["财运","健康"],
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 室内格局（内局 · 形势）
// ════════════════════════════════════════════════════════════════════════════

// 18. 穿堂煞
const p_chuantang: PatternFn = ({ standingPoints }) => {
  for (const pt of standingPoints.filter((p) => p.type !== "outdoor")) {
    const els = pointEls(pt)
    if (hasAny(els, ["大门"]) && hasAny(els, ["阳台门","落地窗"])) {
      return {
        id:"chuantang", name:"穿堂煞",
        type:"凶", score:-2, category:"室内格局", location:pt.label,
        classic:"《阳宅三要》：穿堂风者，财气散，主贫",
        description:"大门与阳台门或落地窗前后对穿，气流直入直出无法停留，财气随风而散，主家财难聚、家人多病、运势不稳。",
        suggestion:"大门内设实心玄关隔断（宽至少90cm），或放置屏风阻断气流直穿，玄关铺设与客厅不同颜色地板为界。",
        affects:["财运","健康","家庭子女"],
      }
    }
  }
  return null
}

// 19. 水火相冲
const p_shuihuo: PatternFn = ({ standingPoints }) => {
  const k = kitchen(standingPoints); if (!k) return null
  const stoveDirs = k.directions.filter((d) => d.elements.includes("灶台")).map((d) => d.direction)
  const sinkDirs  = k.directions.filter((d) => d.elements.includes("水槽")).map((d) => d.direction)
  if (!stoveDirs.length || !sinkDirs.length) return null
  const isOpposite = stoveDirs.some((s) => sinkDirs.includes(OPPOSITE[s] ?? ""))
  return {
    id:"shuihuo", name: isOpposite ? "水火正冲（重煞）" : "水火同区",
    type: isOpposite ? "煞" : "小凶", score: isOpposite ? -2.5 : -1,
    category:"室内格局", location:"厨房",
    classic:"《阳宅三要》：灶忌水克，水火相射，主口舌官非",
    description: isOpposite
      ? "灶台与水槽正对排列，水克火之力最猛，主家人口舌是非不断、肠胃疾病、易遇官非纠纷、夫妻争吵频发。"
      : "灶台与水槽位置相近，水火同区，主口舌小摩擦、消化系统偶发问题。",
    suggestion: isOpposite
      ? "灶台与水槽之间放置木制隔板（木生火泄水，起化煞作用），或重新装修移动位置。"
      : "灶台与水槽之间保持至少60cm间距，可放一盆绿植缓解。",
    affects:["婚姻感情","家庭子女","事业官运"],
  }
}

// 20. 入门见灶
const p_menjian_zao: PatternFn = ({ standingPoints }) => {
  const ent = entrance(standingPoints); if (!ent) return null
  if (!hasAny(pointEls(ent), ["灶台"])) return null
  return {
    id:"menjian_zao", name:"入门见灶",
    type:"凶", score:-2, category:"室内格局", location:"大门内侧",
    classic:"《阳宅三要》：门对灶，家财耗，主口舌火灾",
    description:"进门正见灶台，外界气场直冲火源，主家财消耗迅速、口舌是非、易有火灾之忧、健康受损。",
    suggestion:"在灶台前设遮挡（可用橱柜门），或调整进门动线使大门不直对厨房。",
    affects:["财运","健康"],
  }
}

// 21. 入门见厕
const p_menjian_ce: PatternFn = ({ standingPoints }) => {
  const ent = entrance(standingPoints); if (!ent) return null
  if (!hasAny(pointEls(ent), ["卫生间门"])) return null
  return {
    id:"menjian_ce", name:"入门见厕",
    type:"凶", score:-2, category:"室内格局", location:"大门内侧",
    classic:"《阳宅撮要》：开门见厕，财气从厕流走",
    description:"进门直视卫生间，秽气迎面，财气随排水而流失，主家财难聚、贵人难遇、家人健康频有状况。",
    suggestion:"卫生间门常闭，门上贴全身镜或挂珠帘，玄关设屏风转移进门视线，厕门口可放盐灯或绿植。",
    affects:["财运","贵人人际"],
  }
}

// 22. 开门见楼梯向下
const p_menjian_xia: PatternFn = ({ standingPoints }) => {
  const ent = entrance(standingPoints); if (!ent) return null
  if (!hasAny(pointEls(ent), ["楼梯↓"])) return null
  return {
    id:"menjian_xia", name:"开门见下行楼梯",
    type:"凶", score:-2, category:"室内格局", location:"大门内侧",
    classic:"《阳宅三要》：门对下行梯，财气随之泻",
    description:"进门即见向下楼梯，气流顺梯而泄，财气难以积聚，主事业难有积累、财来财去、家人精神压抑。",
    suggestion:"楼梯口设屏风或矮柜，放置向上生长的圆叶绿植（如发财树），地上铺红色地毯提气。",
    affects:["财运","事业官运"],
  }
}

// 23. 梁压床
const p_liang_bed: PatternFn = ({ standingPoints }) => {
  const bed = bedroom(standingPoints); if (!bed) return null
  // 用"床头朝向"配合"实墙"来推断有无梁——如果没有实墙背靠，可能有悬梁
  const noBacking = !hasAny(pointEls(bed), ["实墙"])
  const hasWindow  = hasAny(pointEls(bed), ["窗户","落地窗"])
  if (!noBacking) return null
  if (hasWindow) return {
    id:"liang_window", name:"床无靠背（窗背床）",
    type:"凶", score:-1.5, category:"室内格局", location:"主卧",
    classic:"《阳宅三要》：床宜靠实墙，无靠则气散",
    description:"床头背后无实墙或有窗，气场不稳，睡眠时背后空洞，主睡眠质量差、精神涣散、感情不稳。",
    suggestion:"床头紧靠实墙，若必须靠窗则加厚窗帘并设实木床头柜，床头上方不可有梁或悬挂物。",
    affects:["婚姻感情","健康"],
  }
  return null
}

// 24. 镜煞冲床
const p_jingsha: PatternFn = ({ standingPoints }) => {
  const bed = bedroom(standingPoints); if (!bed) return null
  if (!hasAny(pointEls(bed), ["镜子正对"])) return null
  return {
    id:"jingsha", name:"镜煞冲床",
    type:"凶", score:-1.5, category:"室内格局", location:"主卧",
    classic:"《阳宅撮要》：镜对床，主惊梦、夫妻不睦",
    description:"卧室内镜子正对床铺，夜间反射人影，主睡眠不安、易惊梦噩梦、精神状态差、夫妻感情生隙。",
    suggestion:"睡前用布遮盖镜面，或将镜子移至衣柜内侧，避免镜面任何角度能照到床头。",
    affects:["婚姻感情","健康"],
  }
}

// 25. 卫生间门冲床
const p_cesuo_bed: PatternFn = ({ standingPoints }) => {
  const bed = bedroom(standingPoints); if (!bed) return null
  if (!hasAny(pointEls(bed), ["卫生间门"])) return null
  return {
    id:"cesuo_bed", name:"卫生间门冲床",
    type:"凶", score:-2, category:"室内格局", location:"主卧",
    classic:"《阳宅三要》：厕门冲床，主病灾连绵",
    description:"主卧内卫生间门正对床铺，秽气夜间直冲睡眠者，主身体健康频出问题、睡眠障碍、夫妻感情受损。",
    suggestion:"卫生间门常闭，门上挂厚重布帘，床头方向放水晶或盐灯净化气场，尽量调整床的朝向。",
    affects:["健康","婚姻感情"],
  }
}

// 26. 漏财水（厨房卫生间在财位）
const p_loucai: PatternFn = ({ standingPoints, ruleResult }) => {
  if (!ruleResult.sectorEnergies) return null
  for (const pt of standingPoints) {
    if (!["kitchen","front-door-inside"].includes(pt.type)) continue
    const dir8 = pt.compassDirection
    const energy = ruleResult.sectorEnergies[dir8]
    if (energy === "生气") return {
      id:"loucai", name:"财位有漏",
      type:"小凶", score:-1, category:"室内格局", location:pt.label,
      description:`${pt.label}位于${energy}方（最旺财位），厨房或卫生间的水火、秽气会消耗该方的财旺之气，主财来财去难以积存。`,
      suggestion:"在该方位摆放植物或流水摆件稳固气场，厨卫保持整洁干燥，门常关。",
      affects:["财运"],
    }
  }
  return null
}

// 27. 书房文昌位
const p_wenchang: PatternFn = ({ standingPoints, ruleResult, profile }) => {
  if (isQuickModeProfile(profile)) return null
  const s = study(standingPoints); if (!s) return null
  const dir8 = s.compassDirection
  // 文昌方 = 命卦的天医方（读书之星）
  const isWenchang = ruleResult.personalAuspicious[2] === dir8  // 天医 = 第3个吉方
  if (!isWenchang) return null
  return {
    id:"wenchang", name:"书房居文昌位",
    type:"大吉", score:2.5, category:"八宅理气", location:"书房",
    classic:"《八宅明镜》：书房居天医，主文昌大旺",
    description:`书房位于您命卦的天医方（${dir8}），文昌星照耀，利于学业、思维清晰、文职工作顺利，子女读书有成。`,
    affects:["学业文昌"],
  }
}

// 28. 回字形气场（气流无法流通）
const p_huizi: PatternFn = ({ standingPoints }) => {
  for (const pt of standingPoints.filter((p) => p.type !== "outdoor")) {
    const allWall = ["N","NE","E","SE","S","SW","W","NW"].every((d) =>
      hasAny(dirEls(pt,d), ["实墙"])
    )
    if (allWall) return {
      id:"huizi", name:"四面实墙（闷宫）",
      type:"凶", score:-1.5, category:"室内格局", location:pt.label,
      description:`${pt.label}四面皆为实墙，无门无窗，气场封闭如同囚笼，阴气积聚，主住者思想局限、事业受困、情绪郁结。`,
      suggestion:"增设天窗或室内照明提亮空间，摆放散发香气的鲜花植物，使用暖色装饰化解闭塞感。",
      affects:["健康","事业官运"],
    }
  }
  return null
}

// 29. 无靠煞（重要位置背后空旷）
const p_wukao: PatternFn = ({ standingPoints, ruleResult }) => {
  if (!ruleResult.houseSitting) return null
  const liv = livingRoom(standingPoints); if (!liv) return null
  const backDir = OPPOSITE[liv.compassDirection]
  if (!backDir) return null
  const hasOpen = hasAny(dirEls(liv, backDir), ["空地/开阔","窗户","阳台门"])
  const hasBacking = hasAny(dirEls(liv, backDir), ["实墙"])
  if (hasOpen && !hasBacking) return {
    id:"wukao_living", name:"客厅无靠",
    type:"小凶", score:-1, category:"室内格局", location:"客厅",
    classic:"《阳宅三要》：坐位宜有靠，背后空则气散",
    description:"客厅主位背后无实墙依靠，气场不稳，主家庭成员事业缺乏稳定支撑，贵人难以长久相助。",
    suggestion:"主沙发背靠实墙，若背后是落地窗则加厚遮光窗帘，沙发后放置高大植物或书柜作为人工靠山。",
    affects:["事业官运","贵人人际"],
  }
  return null
}

// ════════════════════════════════════════════════════════════════════════════
// 八宅理气（依赖真实命卦 — isQuickMode 时跳过）
// ════════════════════════════════════════════════════════════════════════════

// 30. 人宅匹配
const p_renzhai: PatternFn = ({ ruleResult, profile }) => {
  if (isQuickModeProfile(profile)) return null  // 没有真实出生信息时不显示
  if (ruleResult.groupMatch === undefined) return null
  return ruleResult.groupMatch ? {
    id:"renzhai_ok", name:"人宅相配",
    type:"吉", score:2, category:"人宅匹配", location:"整体格局",
    classic:"《八宅明镜》：人宅同气，吉星得力",
    description:`命卦属${ruleResult.kuaGroup}，房屋属${ruleResult.houseGroup}，人宅同气相求，气场相合，居住有助于运势整体提升、家运顺遂。`,
    affects:["财运","事业官运","婚姻感情","健康","家庭子女"],
  } : {
    id:"renzhai_no", name:"人宅不配",
    type:"小凶", score:-1, category:"人宅匹配", location:"整体格局",
    description:`命卦属${ruleResult.kuaGroup}，房屋属${ruleResult.houseGroup}，人宅气场相克，需在室内布局上加以调整弥补，尤以主卧朝向为重。`,
    suggestion:"将主卧调整至个人生气或延年方，大门口铺设与命卦相应颜色（东四命用绿/蓝，西四命用黄/白）。",
    affects:["财运","事业官运","婚姻感情","健康","家庭子女"],
  }
}

// 31. 大门八宅星
const p_mendoor: PatternFn = ({ ruleResult }) => {
  if (!ruleResult.houseFacing || !ruleResult.sectorEnergies) return null
  const energy = ruleResult.sectorEnergies[ruleResult.houseFacing]
  if (!energy) return null
  const isGood = ["生气","延年","天医","伏位"].includes(energy)
  const scoreMap: Record<string,number> = { 生气:3, 延年:2, 天医:1.5, 伏位:0.5, 祸害:-1, 六煞:-1.5, 五鬼:-2, 绝命:-3 }
  const typeMap: Record<string,PatternType> = {
    生气:"大吉", 延年:"吉", 天医:"吉", 伏位:"小吉",
    祸害:"小凶", 六煞:"凶", 五鬼:"凶", 绝命:"大凶",
  }
  return {
    id:"men_energy", name:`大门居${energy}方`,
    type: typeMap[energy] ?? "中平",
    score: scoreMap[energy] ?? 0,
    category:"八宅理气", location:`大门（朝${ruleResult.houseFacing}）`,
    classic:"《八宅明镜》：门为气口，居吉星则纳吉，居凶星则纳凶",
    description:`按八宅游年，大门朝向方（${ruleResult.houseFacing}）的宅卦星为「${energy}」。${isGood ? "吉气从门而入，利家运。" : "凶气易从门而入，需在门口布置化解。"}`,
    suggestion: isGood ? undefined : `门口挂金属风铃（金克木制煞），铺红色门垫，门两侧放石狮或貔貅一对。`,
    affects:["财运","事业官运","家庭子女"],
  }
}

// 32. 主卧方位
const p_woshidir: PatternFn = ({ standingPoints, ruleResult }) => {
  const bed = bedroom(standingPoints); if (!bed || !ruleResult.sectorEnergies) return null
  const energy = ruleResult.sectorEnergies[bed.compassDirection]
  if (!energy) return null
  const typeMap: Record<string,PatternType> = {
    生气:"大吉", 延年:"吉", 天医:"吉", 伏位:"小吉",
    祸害:"小凶", 六煞:"凶", 五鬼:"大凶", 绝命:"大凶",
  }
  const scoreMap: Record<string,number> = { 生气:2.5, 延年:2, 天医:1.5, 伏位:0.5, 祸害:-1, 六煞:-1.5, 五鬼:-2.5, 绝命:-3 }
  return {
    id:"woshi_dir", name:`主卧居${energy}方`,
    type: typeMap[energy] ?? "中平",
    score: scoreMap[energy] ?? 0,
    category:"八宅理气", location:"主卧",
    classic:"《八宅明镜》：主卧宜居延年，利婚姻；居生气，利丁财",
    description:`主卧所处方位（${bed.compassDirection}）的宅卦星为「${energy}」，${["生气","延年","天医","伏位"].includes(energy) ? "利于夫妻感情与健康。" : "长期居住有损健康与夫妻关系，需加强化煞布局。"}`,
    suggestion: ["绝命","五鬼"].includes(energy) ? "在主卧放置六帝古钱或葫芦化煞，床头方向挂圆形镜，房间保持明亮整洁。" : undefined,
    affects:["婚姻感情","健康"],
  }
}

// 33. 命卦大门方向
const p_kuamen: PatternFn = ({ ruleResult, profile }) => {
  if (isQuickModeProfile(profile)) return null
  if (!ruleResult.houseFacing) return null
  const isGood = ruleResult.personalAuspicious.includes(ruleResult.houseFacing)
  const isBad  = ruleResult.personalInauspicious.includes(ruleResult.houseFacing)
  if (!isGood && !isBad) return null
  const rankGood = ruleResult.personalAuspicious.indexOf(ruleResult.houseFacing)
  return {
    id:"kua_men", name: isGood ? `大门朝命卦${["生气","延年","天医","伏位"][rankGood]}方` : "大门朝命卦凶方",
    type: isGood ? (rankGood === 0 ? "大吉" : "吉") : "凶",
    score: isGood ? [3,2,1.5,0.5][rankGood] : -1.5,
    category:"人宅匹配", location:"大门",
    description: isGood
      ? `大门朝向（${ruleResult.houseFacing}）恰是您命卦的${["生气","延年","天医","伏位"][rankGood]}方，出入皆受吉气护持。`
      : `大门朝向（${ruleResult.houseFacing}）属您命卦凶方，长期出入受凶气影响，运势易受波折。`,
    suggestion: isBad ? "在大门内侧铺设五帝古钱，门上挂桃木八卦镜化解。" : undefined,
    affects:["事业官运","财运"],
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 玄机格局（综合 · 稀有 · 高阶）
// ════════════════════════════════════════════════════════════════════════════

// 34. 四灵完备
const p_siling: PatternFn = ({ standingPoints, ruleResult }) => {
  const out = outdoor(standingPoints); if (!out || !ruleResult.houseSitting || !ruleResult.houseFacing) return null
  const sitting = ruleResult.houseSitting; const facing = ruleResult.houseFacing
  const dragonDir: Record<string,string> = { N:"E", S:"E", E:"N", W:"S", NE:"NW", SW:"SE", SE:"NE", NW:"SW" }
  const tigerDir:  Record<string,string> = { N:"W", S:"W", E:"S", W:"N", NE:"SE", SW:"NW", SE:"SW", NW:"NE" }
  const hasFront  = hasAny(dirEls(out,facing),  ["空地/开阔","水(湖河海)"])
  const hasBack   = hasAny(dirEls(out,sitting), ["山/高地","高楼","低矮建筑"])
  const dragon = dragonDir[facing]; const tiger = tigerDir[facing]
  const hasDragon = dragon && hasAny(dirEls(out,dragon), ["低矮建筑","山/高地","树林"])
  const hasTiger  = tiger  && hasAny(dirEls(out,tiger),  ["低矮建筑","山/高地","树林"])
  if (!hasFront || !hasBack || !hasDragon || !hasTiger) return null
  return {
    id:"siling", name:"四灵格局完备",
    type:"大吉", score:3, category:"玄机格局", location:"整体外局",
    classic:"《葬经》：玄武垂头，朱雀翔舞，青龙蜿蜒，白虎驯俯，四势协调，大吉之地",
    description:"前有明堂（朱雀），后有靠山（玄武），左有青龙，右有白虎，四灵齐备，风水格局完整，为极难得的大吉地，主家运兴隆、富贵绵延数代。",
    affects:["财运","事业官运","婚姻感情","健康","家庭子女","贵人人际"],
  }
}

// 35. 金城水局（圆形水绕）
const p_jincheng: PatternFn = ({ standingPoints }) => {
  const out = outdoor(standingPoints); if (!out) return null
  const waterCount = countDirsWithElement(out, ["水(湖河海)","弯道朝向大门"])
  const roadCurve  = countDirsWithElement(out, ["弯道朝向大门"])
  if (waterCount + roadCurve < 4) return null
  return {
    id:"jincheng", name:"金城水局",
    type:"大吉", score:3, category:"玄机格局", location:"房屋四周",
    classic:"《水龙经》：金城环抱，百年大旺",
    description:"水流与弯道四面环绕，形成金城水局，气场回旋聚积至极，为罕见的大富贵格局，主财富积累极速、家业千秋。",
    affects:["财运","家庭子女"],
  }
}

// 36. 文笔峰格局
const p_wenbi: PatternFn = ({ standingPoints, ruleResult, profile }) => {
  if (isQuickModeProfile(profile)) return null
  const out = outdoor(standingPoints); if (!out || !ruleResult.personalAuspicious) return null
  // 文昌方（天医方，第3吉方）有高楼/尖顶（文笔峰）
  const wenchang = ruleResult.personalAuspicious[2]
  if (!wenchang) return null
  if (!hasAny(dirEls(out, wenchang), ["高楼","尖顶建筑"])) return null
  const isJian = hasAny(dirEls(out, wenchang), ["尖顶建筑"])
  return {
    id:"wenbi", name:"文笔峰朝文昌",
    type: isJian ? "大吉" : "吉",
    score: isJian ? 2.5 : 1.5,
    category:"玄机格局", location:`文昌方（${wenchang}）`,
    classic:"《地理五诀》：文笔插天，文昌大旺，科甲连登",
    description:`您命卦文昌方（${wenchang}）有${isJian ? "尖顶（文笔峰）" : "高楼"}矗立，文笔朝向，利于文昌运势，主家中有人在学业、写作、文职方面大有成就。`,
    affects:["学业文昌","事业官运"],
  }
}

// 37. 木星文昌格局（书房）
const p_muxing: PatternFn = ({ standingPoints, ruleResult, profile }) => {
  if (isQuickModeProfile(profile)) return null
  const s = study(standingPoints); if (!s) return null
  const wenchang = ruleResult.personalAuspicious[2]
  if (wenchang && s.compassDirection === wenchang) return {
    id:"muxing_study", name:"书房居文昌天医位",
    type:"大吉", score:2.5, category:"玄机格局", location:"书房",
    description:`书房位于命卦天医（文昌）方（${wenchang}），文昌星得力，思维敏锐，利于学业考试、创作写作、晋升升职，子女读书成绩优秀。`,
    affects:["学业文昌","事业官运"],
  }
  return null
}

// ════════════════════════════════════════════════════════════════════════════
// 完整规则列表
// ════════════════════════════════════════════════════════════════════════════
export const ALL_PATTERNS: PatternFn[] = [
  // 外部形势
  p_luchong, p_fangong, p_yudai, p_kaoshanjixiong, p_mingtang,
  p_tianzhan, p_zuanxin, p_bidao, p_gufeng, p_huyin, p_shuanglong,
  p_huixuan, p_tingqi, p_eshuisha, p_yinsha, p_diansha, p_jiansha,
  // 室内格局
  p_chuantang, p_shuihuo, p_menjian_zao, p_menjian_ce, p_menjian_xia,
  p_liang_bed, p_jingsha, p_cesuo_bed, p_loucai, p_wukao, p_huizi,
  // 八宅理气
  p_renzhai, p_mendoor, p_woshidir, p_kuamen, p_wenchang,
  // 玄机格局
  p_siling, p_jincheng, p_wenbi, p_muxing,
]
