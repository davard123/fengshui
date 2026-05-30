import { create } from "zustand"
import type {
  CompassState,
  UserProfile,
  StandingPoint,
  FullAssessment,
  HistoryItem,
  LegacyAssessment,
} from "@/types/fengshui"

type AppState = {
  // ── 生命周期 ──────────────────────────────────────────────────
  hydrated: boolean
  hasAcceptedDisclaimer: boolean

  // ── 用户档案 ──────────────────────────────────────────────────
  profile: UserProfile | null

  // ── 当前评估流程 ───────────────────────────────────────────────
  address: string
  compass: CompassState            // 当前站点的罗盘状态

  // ── 多站点数据（v2 核心）──────────────────────────────────────
  standingPoints: StandingPoint[]                 // 已完成的站点
  currentPointDraft: Partial<StandingPoint> | null // 正在编辑的站点草稿

  // ── 完成的完整评估 ─────────────────────────────────────────────
  currentFullAssessment: FullAssessment | null

  // ── 历史记录（兼容新旧格式）──────────────────────────────────
  history: HistoryItem[]

  // ── Actions ───────────────────────────────────────────────────
  acceptDisclaimer: () => void
  setProfile: (profile: UserProfile) => void
  setAddress: (address: string) => void
  setCompass: (next: Partial<CompassState>) => void

  // 站点管理
  startNewPoint: (draft: Partial<StandingPoint>) => void
  updateCurrentPointDraft: (patch: Partial<StandingPoint>) => void
  commitCurrentPoint: (point: StandingPoint) => void
  updateStandingPoint: (id: string, patch: Partial<StandingPoint>) => void
  removeStandingPoint: (id: string) => void
  clearStandingPoints: () => void

  // 完整评估
  setCurrentFullAssessment: (a: FullAssessment) => void
  saveFullAssessmentToHistory: () => void

  // 旧格式兼容（迁移历史用）
  addLegacyToHistory: (a: LegacyAssessment) => void

  // 重置
  resetAssessmentFlow: () => void
}

const INITIAL_COMPASS: CompassState = { degree: 0, direction: "N", locked: false }

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  hasAcceptedDisclaimer: false,
  profile: null,
  address: "",
  compass: INITIAL_COMPASS,
  standingPoints: [],
  currentPointDraft: null,
  currentFullAssessment: null,
  history: [],

  acceptDisclaimer: () => set({ hasAcceptedDisclaimer: true }),
  setProfile: (profile) => set({ profile }),
  setAddress: (address) => set({ address }),
  setCompass: (next) =>
    set((state) => ({ compass: { ...state.compass, ...next } })),

  // 开始新站点草稿（从站点选择页调用）
  startNewPoint: (draft) =>
    set({
      currentPointDraft: draft,
      compass: INITIAL_COMPASS,  // 重置罗盘，等用户在新位置重新锁定
    }),

  // 更新草稿（方向标记时调用）
  updateCurrentPointDraft: (patch) =>
    set((state) => ({
      currentPointDraft: state.currentPointDraft
        ? { ...state.currentPointDraft, ...patch }
        : patch,
    })),

  // 提交草稿为完成站点
  commitCurrentPoint: (point) =>
    set((state) => ({
      standingPoints: [...state.standingPoints, point],
      currentPointDraft: null,
      compass: INITIAL_COMPASS,
    })),

  // 更新已有站点（AI分析完成后回写）
  updateStandingPoint: (id, patch) =>
    set((state) => ({
      standingPoints: state.standingPoints.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    })),

  removeStandingPoint: (id) =>
    set((state) => ({
      standingPoints: state.standingPoints.filter((p) => p.id !== id),
    })),

  clearStandingPoints: () => set({ standingPoints: [] }),

  setCurrentFullAssessment: (a) => set({ currentFullAssessment: a }),

  saveFullAssessmentToHistory: () => {
    const { currentFullAssessment, history } = get()
    if (!currentFullAssessment) return
    const item: HistoryItem = { format: "v2", data: currentFullAssessment }
    set({ history: [item, ...history].slice(0, 30) })
  },

  addLegacyToHistory: (a) => {
    const item: HistoryItem = { format: "v1", data: a }
    set((state) => ({
      history: [item, ...state.history].slice(0, 30),
    }))
  },

  resetAssessmentFlow: () =>
    set({
      address: "",
      compass: INITIAL_COMPASS,
      standingPoints: [],
      currentPointDraft: null,
      currentFullAssessment: null,
    }),
}))
