// ─── Focus Areas (关注运势) ────────────────────────────────────────────────────

export type FocusArea =
  | "财运"     // wealth & money
  | "事业官运" // career & promotion
  | "婚姻感情" // marriage & romance
  | "家庭子女" // family & children
  | "健康"     // health
  | "学业文昌" // study & academic
  | "贵人人际" // helpful people & social
  | "出行安全" // travel & safety

export const FOCUS_AREA_OPTIONS: { area: FocusArea; icon: string; desc: string }[] = [
  { area:"财运",     icon:"💰", desc:"财富积累、投资收益" },
  { area:"事业官运", icon:"🏆", desc:"升职晋升、事业发展" },
  { area:"婚姻感情", icon:"💑", desc:"夫妻感情、桃花缘分" },
  { area:"家庭子女", icon:"👨‍👩‍👧", desc:"家庭和谐、子女教育" },
  { area:"健康",     icon:"💪", desc:"身体健康、精神状态" },
  { area:"学业文昌", icon:"📚", desc:"学习成绩、考试升学" },
  { area:"贵人人际", icon:"🤝", desc:"贵人相助、人际关系" },
  { area:"出行安全", icon:"🚗", desc:"出行平安、动态财运" },
]

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserProfile = {
  birthYear: number
  gender: "male" | "female"
  birthDetails?: string
  kuaNumber: number
  kuaGroup: "east" | "west" | "unknown"
  isQuickMode?: boolean   // true = 用户未填写真实信息，跳过个人化规则
}

// ─── Compass ──────────────────────────────────────────────────────────────────

export type CompassState = {
  degree: number
  direction: string
  locked: boolean
}

// ─── Standing Point (太极点) ──────────────────────────────────────────────────

export type StandingPointType =
  | "outdoor"            // 室外大门外 — 24山
  | "house-center"       // 全屋中心 — 8方位
  | "living-room"        // 客厅中心 — 8方位
  | "master-bedroom"     // 主卧中心 — 8方位
  | "kitchen"            // 厨房中心 — 8方位
  | "study"              // 书房/工作间 — 8方位
  | "front-door-inside"  // 大门内侧 — 8方位
  | "yard"               // 院子中心 — 8方位
  | "garage"             // 车库 — 8方位
  | "custom"             // 自定义

export type DirectionEntry = {
  direction: string   // 室外: '子'|'丑'|… 室内: 'N'|'NE'|…
  degree: number      // 该方位中心角度
  elements: string[]  // 用户标记的内容
}

export type StandingPoint = {
  id: string
  type: StandingPointType
  label: string            // "客厅中心"
  theme: string            // "财富与事业"
  compassDegree: number    // 锁定时的罗盘读数
  compassDirection: string // 朝向标签，如 "午"、"S"
  precision: "24山" | "8方位"
  directions: DirectionEntry[]
  aiAnalysis?: string      // AI 返回的分析文本
  analyzedAt?: string      // ISO 时间
}

// ─── Full Assessment (完整评估，新格式) ──────────────────────────────────────

export type FullAssessment = {
  id: string
  address: string
  profile: UserProfile
  standingPoints: StandingPoint[]
  overallSynthesis?: string  // AI 综合报告
  createdAt: string
  updatedAt: string
  note?: string
}

// ─── Legacy Assessment (旧10题格式，历史兼容) ─────────────────────────────────

export type ScoreBand = "excellent" | "good" | "average" | "challenging"

export type LegacyFormAnswers = {
  q1_housingType?: string
  q2_stories?: 1 | 2 | 3
  q2_masterBedroomFloor?: 1 | 2 | 3
  q2_condoFloor?: "ground" | 2 | 3 | "4+"
  q3_entryType?: string
  q4_garage?: string
  q5_frontBlocked?: string
  q6_culDeSac?: boolean
  q7_northShield?: boolean
  q8_nearHighway?: boolean
  q9_hazards?: string[]
  q10_water?: string
}

export type LegacyAssessment = {
  id: string
  address: string
  lat?: number
  lng?: number
  facingDegree: number
  facingDirection: string
  formAnswers?: LegacyFormAnswers
  compassScore: number
  formScore: number
  totalScore: number
  scoreBand?: ScoreBand
  summaryText?: string
  highlights: string[]
  improvements: string[]
  suggestions: string[]
  createdAt: string
  note?: string
}

// ─── History item (兼容新旧两种格式) ─────────────────────────────────────────

export type HistoryItem =
  | { format: "v2"; data: FullAssessment }
  | { format: "v1"; data: LegacyAssessment }

// ═══════════════════════════════════════════════════════════════════════════
// v3 — 阳宅体系重构（定向/外局/内局九宫/细节 四层）
// ═══════════════════════════════════════════════════════════════════════════

// ─── 定向 ────────────────────────────────────────────────────────────────────

/** 立面候选：算法先给候选，用户选哪条边是大门立面，可追溯坐向的由来 */
export type FacadeCandidate = {
  edgeIndex: number      // 轮廓上的边序号（手描/OSM 多边形的第几条边）
  normalDegree: number   // 该边的外法向方位角（0-360）
  length: number         // 边长（米）— 越长越可能是主立面
  confidence: number     // 0-1：边长占比 × 主轴一致性（正方形/L形时各候选差距小）
}

export type HouseOrientation = {
  facingDegree: number          // 0-360 精确朝向
  facingMountain: string        // 24山, 如 "午"
  sittingMountain: string       // 对宫, 如 "子"
  source: "footprint" | "compass" | "manual"
  compassVerified: boolean      // 是否在大门口用罗盘验证过
  selectedEdgeIndex?: number    // 用户选中的立面边（追溯用）
  candidates?: FacadeCandidate[] // 当时的全部候选（追溯用）
}

// ─── 宅中心与轮廓 ────────────────────────────────────────────────────────────

export type GeoPoint = { lat: number; lon: number }

export type HouseFootprintData = {
  center: GeoPoint              // 太极点 = 轮廓质心
  polygon: GeoPoint[]           // 建筑轮廓
  source: "osm" | "manual"
}

// ─── 外局地物（保留距离）────────────────────────────────────────────────────

export type ExternalFeatureV3 = {
  id: string
  kind: string                  // "高速公路" | "T字路口正对" | "水(湖河海)" | ...
  bearingFromCenter: number     // 从宅中心看的绝对方位角
  distance: number              // 米
  ring: "near" | "mid" | "far"
  relative: "front" | "back" | "left" | "right"   // 朱雀/玄武/青龙/白虎
  source: "auto" | "manual"
  confirmed: boolean            // 自动项需用户确认才参与形煞判定
  severityBase?: 1 | 2 | 3      // 地物本身强度（高速/T字口=3 小路/普通水=1）
                                // 最终 severity = severityBase × ringWeight
}

// ─── 内局：房间 → 宫位 ──────────────────────────────────────────────────────

export type PalaceId = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "CENTER"

export type RoomPlacementV3 = {
  room: string                  // RoomType (palaces.ts)
  primaryPalace: PalaceId       // 房间主体所在宫（八宅判定用）
  palaces?: PalaceId[]          // 房间横跨的全部宫位（含 primary；飞星组合提示用）
}

// ─── 玄空飞星 ────────────────────────────────────────────────────────────────

export type FlyingStarPalace = { mountain: number; facing: number; base: number }

export type FlyingStarChartData = {
  period: number
  palaces: Record<PalaceId, FlyingStarPalace>
  pattern: "旺山旺向" | "上山下水" | "双星会向" | "双星会坐"
}

// ─── 细节清单 ────────────────────────────────────────────────────────────────

export type RoomChecklistV3 = {
  room: string
  answers: Record<string, boolean>
  measurements?: { item: string; degree: number; mountain: string }[]
}

// ─── 评估主体 v3 ─────────────────────────────────────────────────────────────

export type AssessmentV3 = {
  id: string
  address: string
  footprint?: HouseFootprintData
  orientation?: HouseOrientation
  builtYear?: number
  profile?: UserProfile
  external: ExternalFeatureV3[]
  placements: RoomPlacementV3[]
  flyingStars?: FlyingStarChartData
  checklists: RoomChecklistV3[]
  reportText?: string           // AI 综合（可选）
  createdAt: string
  updatedAt: string
}

export type HistoryItemV3 =
  | { format: "v3"; data: AssessmentV3 }
  | { format: "v2"; data: FullAssessment }
  | { format: "v1"; data: LegacyAssessment }
