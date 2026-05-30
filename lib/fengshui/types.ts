// ─── Directions ───────────────────────────────────────────────────────────────

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

// ─── User ─────────────────────────────────────────────────────────────────────

export type KuaGroup = 'east' | 'west'

export interface UserProfile {
  birthYear: number
  gender: 'male' | 'female'
  birthDateTimeOptional?: string  // "YYYY-MM-DD HH:mm", optional bazi input
  kuaNumber: number               // 1–9
  kuaGroup: KuaGroup
}

// ─── Form answers (10 questions) ──────────────────────────────────────────────

export type HousingType =
  | 'single-family'
  | 'end-townhouse'
  | 'mid-townhouse'
  | 'duplex'
  | 'condo'

export type EntryType = 'front-door' | 'shared-corridor' | 'garage'
export type GarageType = 'none' | 'front-facing' | 'side' | 'underground'
export type FrontBlockType = 'open' | 'wall' | 'tree' | 'utility-pole'
export type WaterPosition = 'south-east' | 'other-direction' | 'none'
export type Hazard = 'hospital' | 'cemetery' | 'powerlines' | 'industrial'

export interface FormAnswers {
  // Q1
  q1_housingType: HousingType

  // Q2 — non-condo branch
  q2_stories?: 1 | 2 | 3
  q2_masterBedroomFloor?: 1 | 2 | 3

  // Q2 — condo branch
  q2_condoFloor?: 'ground' | 2 | 3 | '4+'

  // Q3–Q10
  q3_entryType: EntryType
  q4_garage: GarageType
  q5_frontBlocked: FrontBlockType
  q6_culDeSac: boolean
  q7_northShield: boolean
  q8_nearHighway: boolean
  q9_hazards: Hazard[]
  q10_water: WaterPosition
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export type ScoreBand = 'excellent' | 'good' | 'average' | 'challenging'

export interface QuestionScore {
  score: number           // raw question score (0–5)
  highlight: string | null
  improvement: string | null
  suggestion: string | null
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface AssessmentResult {
  facingDirection: Direction
  kuaNumber: number
  kuaGroup: KuaGroup
  compassScore: number    // 0–50
  formScore: number       // 0–50
  totalScore: number      // 0–100
  scoreBand: ScoreBand
  summaryText: string
  highlights: string[]
  improvements: string[]
  suggestions: string[]
}

// ─── Persisted assessment ─────────────────────────────────────────────────────

export interface Assessment {
  id: string
  address: string
  lat: number
  lng: number
  facingDegree: number
  formAnswers: FormAnswers
  result: AssessmentResult
  createdAt: string
  note?: string
}
