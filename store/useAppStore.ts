import { create } from "zustand"
import type {
  CompassState,
  UserProfile,
  AssessmentV3,
  HouseFootprintData,
  HouseOrientation,
  ExternalFeatureV3,
  RoomPlacementV3,
  RoomChecklistV3,
  HistoryItemV3,
} from "@/types/fengshui"

type AppState = {
  // ── 生命周期 ────────────────────────────────────────────────
  hydrated: boolean
  hasAcceptedDisclaimer: boolean

  // ── 用户档案（住户命卦，跟随评估）────────────────────────────
  profile: UserProfile | null

  // ── 罗盘（组件级共享状态：定向验证/单项测量用）───────────────
  compass: CompassState

  // ── 当前评估 v3 ──────────────────────────────────────────────
  assessment: AssessmentV3 | null

  // ── 历史 ─────────────────────────────────────────────────────
  history: HistoryItemV3[]

  // ── Actions ─────────────────────────────────────────────────
  acceptDisclaimer: () => void
  setProfile: (profile: UserProfile) => void
  setCompass: (next: Partial<CompassState>) => void

  startAssessment: (address: string) => void
  setFootprint: (fp: HouseFootprintData) => void
  setOrientation: (o: HouseOrientation) => void
  setBuiltYear: (year: number | undefined) => void
  setExternalFeatures: (features: ExternalFeatureV3[]) => void
  upsertExternalFeature: (f: ExternalFeatureV3) => void
  removeExternalFeature: (id: string) => void
  /** palaces=null 移除；palaces[0] 为 primaryPalace，可多宫（房间横跨） */
  placeRoom: (room: string, palaces: RoomPlacementV3["primaryPalace"][] | null) => void
  setChecklist: (cl: RoomChecklistV3) => void
  setReportText: (text: string) => void
  saveToHistory: () => void
  resetAssessment: () => void
}

const INITIAL_COMPASS: CompassState = { degree: 0, direction: "N", locked: false }

function touch(a: AssessmentV3): AssessmentV3 {
  return { ...a, updatedAt: new Date().toISOString() }
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  hasAcceptedDisclaimer: false,
  profile: null,
  compass: INITIAL_COMPASS,
  assessment: null,
  history: [],

  acceptDisclaimer: () => set({ hasAcceptedDisclaimer: true }),
  setProfile: (profile) =>
    set((s) => ({
      profile,
      assessment: s.assessment ? touch({ ...s.assessment, profile }) : s.assessment,
    })),
  setCompass: (next) => set((s) => ({ compass: { ...s.compass, ...next } })),

  startAssessment: (address) =>
    set({
      assessment: {
        id: `v3-${Date.now()}`,
        address,
        external: [],
        placements: [],
        checklists: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),

  setFootprint: (fp) =>
    set((s) => s.assessment
      ? { assessment: touch({ ...s.assessment, footprint: fp }) }
      : {}),

  setOrientation: (o) =>
    set((s) => s.assessment
      ? { assessment: touch({ ...s.assessment, orientation: o }) }
      : {}),

  setBuiltYear: (year) =>
    set((s) => s.assessment
      ? { assessment: touch({ ...s.assessment, builtYear: year }) }
      : {}),

  setExternalFeatures: (features) =>
    set((s) => s.assessment
      ? { assessment: touch({ ...s.assessment, external: features }) }
      : {}),

  upsertExternalFeature: (f) =>
    set((s) => {
      if (!s.assessment) return {}
      const rest = s.assessment.external.filter((x) => x.id !== f.id)
      return { assessment: touch({ ...s.assessment, external: [...rest, f] }) }
    }),

  removeExternalFeature: (id) =>
    set((s) => s.assessment
      ? { assessment: touch({ ...s.assessment, external: s.assessment.external.filter((x) => x.id !== id) }) }
      : {}),

  placeRoom: (room, palaces) =>
    set((s) => {
      if (!s.assessment) return {}
      const rest = s.assessment.placements.filter((p) => p.room !== room)
      const placements = palaces && palaces.length > 0
        ? [...rest, { room, primaryPalace: palaces[0], palaces }]
        : rest
      return { assessment: touch({ ...s.assessment, placements }) }
    }),

  setChecklist: (cl) =>
    set((s) => {
      if (!s.assessment) return {}
      const rest = s.assessment.checklists.filter((c) => c.room !== cl.room)
      return { assessment: touch({ ...s.assessment, checklists: [...rest, cl] }) }
    }),

  setReportText: (text) =>
    set((s) => s.assessment
      ? { assessment: touch({ ...s.assessment, reportText: text }) }
      : {}),

  saveToHistory: () => {
    const { assessment, history } = get()
    if (!assessment) return
    const item: HistoryItemV3 = { format: "v3", data: assessment }
    const rest = history.filter((h) => !(h.format === "v3" && h.data.id === assessment.id))
    set({ history: [item, ...rest].slice(0, 30) })
  },

  resetAssessment: () => set({ assessment: null, compass: INITIAL_COMPASS }),
}))
