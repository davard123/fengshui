import { useState } from "react"
import { router } from "expo-router"
import {
  ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator,
} from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { synthesizeAllPoints } from "@/lib/ai-client"
import { StandingPointCard } from "@/components/StandingPointCard"
import { FocusAreaPicker } from "@/components/FocusAreaPicker"
import { generateFreeReport, RATING_COLOR, RATING_BG, TYPE_COLOR, TYPE_BG } from "@/lib/fengshui/free-report"
import type { PatternResult } from "@/lib/fengshui/patterns"
import type { FocusArea } from "@/types/fengshui"

export default function SynthesisScreen() {
  const standingPoints        = useAppStore((s) => s.standingPoints)
  const profile               = useAppStore((s) => s.profile)
  const address               = useAppStore((s) => s.address)
  const currentFullAssessment = useAppStore((s) => s.currentFullAssessment)
  const setCurrentFullAssessment    = useAppStore((s) => s.setCurrentFullAssessment)
  const saveFullAssessmentToHistory = useAppStore((s) => s.saveFullAssessmentToHistory)

  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState<string | null>(null)
  const aiSynthesis = currentFullAssessment?.overallSynthesis

  const freeReport = profile
    ? generateFreeReport(standingPoints, profile, focusAreas)
    : null

  const runAiSynthesis = async () => {
    if (!profile || standingPoints.length === 0) return
    setAiLoading(true); setAiError(null)
    const result = await synthesizeAllPoints(standingPoints, profile, address, focusAreas)
    if (result.ok) {
      setCurrentFullAssessment({
        id: currentFullAssessment?.id ?? `full-${Date.now()}`,
        address, profile,
        standingPoints: [...standingPoints],
        overallSynthesis: result.text,
        createdAt: currentFullAssessment?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } else { setAiError(result.error) }
    setAiLoading(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>综合风水报告</Text>
      <Text style={styles.address}>{address}</Text>
      <Text style={styles.meta}>
        {standingPoints.length} 个站点 ·{" "}
        {profile?.isQuickMode
          ? "未填写出生信息（仅环境分析）"
          : `命卦 ${profile?.kuaNumber ?? "-"}`}
      </Text>

      {/* 快速模式提示 */}
      {profile?.isQuickMode && (
        <Pressable
          onPress={() => router.push("/setup")}
          style={styles.quickModeBanner}
        >
          <Text style={styles.quickModeIcon}>ℹ️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickModeTitle}>填写出生信息以获得个人化分析</Text>
            <Text style={styles.quickModeDesc}>
              当前仅显示环境格局分析，命卦、八宅、人宅匹配等需要您的真实出生年份和性别。
            </Text>
          </View>
          <Text style={styles.quickModeArrow}>›</Text>
        </Pressable>
      )}

      {/* ── 运势关注选择器 ── */}
      <View style={styles.card}>
        <FocusAreaPicker selected={focusAreas} onChange={setFocusAreas} />
      </View>

      {/* ── 免费规则报告 ── */}
      {freeReport && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>格局分析</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>免费 · 离线</Text>
            </View>
          </View>

          {/* 总评 */}
          <View style={[styles.ratingCard, { backgroundColor: RATING_BG[freeReport.overallRating] }]}>
            <Text style={[styles.ratingBig, { color: RATING_COLOR[freeReport.overallRating] }]}>
              {freeReport.overallRating}
            </Text>
            <Text style={styles.ratingSummary}>{freeReport.summary}</Text>
          </View>

          {/* 关注运势专项分析（有选择才显示）*/}
          {freeReport.focusInsights.length > 0 && (
            <View style={styles.focusSection}>
              <Text style={styles.subTitle}>关注运势专项</Text>
              {freeReport.focusInsights.map((insight) => (
                <View key={insight.area}
                  style={[styles.insightCard, { borderLeftColor: RATING_COLOR[insight.rating] }]}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.ratingPill, { backgroundColor: RATING_BG[insight.rating] }]}>
                      <Text style={[styles.ratingPillText, { color: RATING_COLOR[insight.rating] }]}>
                        {insight.rating}
                      </Text>
                    </View>
                    <Text style={styles.insightArea}>{insight.area}</Text>
                  </View>
                  <Text style={styles.insightSummary}>{insight.summary}</Text>
                  {insight.findings.length > 0 && (
                    <View style={styles.insightFindings}>
                      {insight.findings.map((f) => (
                        <View key={f.id} style={styles.findingPill}>
                          <Text style={[styles.findingPillText, { color: TYPE_COLOR[f.type] }]}>
                            {f.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {insight.findings.length === 0 && (
                    <Text style={styles.noFindingText}>该运势方向未发现明显格局影响</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 煞气（最优先） */}
          {freeReport.sha.length > 0 && (
            <FindingGroup title="⚠ 煞气格局" findings={freeReport.sha} />
          )}

          {/* 凶格 */}
          {freeReport.inauspicious.length > 0 && (
            <FindingGroup title="不利格局" findings={freeReport.inauspicious} />
          )}

          {/* 吉格 */}
          {freeReport.auspicious.length > 0 && (
            <FindingGroup title="有利格局" findings={freeReport.auspicious} />
          )}

          {/* 快速建议 */}
          {freeReport.quickTips.length > 0 && (
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>
                {focusAreas.length > 0 ? `${focusAreas.join(" · ")} — 优先改善建议` : "立即可做的改善"}
              </Text>
              {freeReport.quickTips.map((t, i) => (
                <Text key={i} style={styles.tipText}>• {t}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 已勘察站点 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>已勘察站点</Text>
        {standingPoints.map((p) => (
          <StandingPointCard key={p.id} point={p}
            onPress={() => router.push({ pathname: "/point-analysis", params: { id: p.id } })} />
        ))}
      </View>

      {/* ── AI 深度分析（高级）── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI 深度分析</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>高级</Text>
          </View>
        </View>
        <View style={styles.card}>
          {aiLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#8d6b4c" />
              <Text style={styles.loadingText}>AI 综合分析中…</Text>
            </View>
          )}
          {aiError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{aiError}</Text>
              <Pressable onPress={runAiSynthesis} style={styles.retryBtn}>
                <Text style={styles.retryText}>重试</Text>
              </Pressable>
            </View>
          )}
          {!aiLoading && !aiError && aiSynthesis && (
            <Text style={styles.aiText}>{aiSynthesis}</Text>
          )}
          {!aiLoading && !aiError && !aiSynthesis && (
            <>
              <Text style={styles.aiDesc}>
                AI 结合规则推算、五行生克、命卦运势给出个性化深度分析
                {focusAreas.length > 0 ? `，重点关注：${focusAreas.join("、")}` : ""}。
                需要 MiniMax API Key。
              </Text>
              <Pressable onPress={runAiSynthesis} style={styles.aiBtn}>
                <Text style={styles.aiBtnText}>生成 AI 深度分析</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* 保存 */}
      <Pressable onPress={() => { saveFullAssessmentToHistory(); router.push("/history") }}
        style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>保存到历史记录</Text>
      </Pressable>
    </ScrollView>
  )
}

// ── 格局分组子组件 ────────────────────────────────────────────────────────────
function FindingGroup({ title, findings }: { title: string; findings: PatternResult[] }) {
  return (
    <View style={styles.findingGroup}>
      <Text style={styles.findingGroupTitle}>{title}</Text>
      {findings.map((f) => <FindingCard key={f.id} f={f} />)}
    </View>
  )
}

function FindingCard({ f }: { f: PatternResult }) {
  const [open, setOpen] = useState(false)
  return (
    <Pressable onPress={() => setOpen((v) => !v)}
      style={[styles.findingCard, { borderLeftColor: TYPE_COLOR[f.type] }]}>
      <View style={styles.findingTop}>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_BG[f.type] }]}>
          <Text style={[styles.typeBadgeText, { color: TYPE_COLOR[f.type] }]}>{f.type}</Text>
        </View>
        <Text style={styles.findingName}>{f.name}</Text>
        <Text style={styles.findingLoc}>{f.location}</Text>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
      </View>

      {/* 影响的运势标签 */}
      {f.affects.length > 0 && (
        <View style={styles.affectsRow}>
          {f.affects.map((a) => (
            <View key={a} style={styles.affectsPill}>
              <Text style={styles.affectsPillText}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {open && (
        <View style={styles.findingDetail}>
          {f.classic && (
            <Text style={styles.findingClassic}>📜 {f.classic}</Text>
          )}
          <Text style={styles.findingDesc}>{f.description}</Text>
          {f.suggestion && (
            <Text style={styles.findingSuggestion}>💡 {f.suggestion}</Text>
          )}
        </View>
      )}
    </Pressable>
  )
}

// ── 样式 ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { padding: 20, backgroundColor: "#fffaf3", gap: 20 },
  title:       { fontSize: 28, fontWeight: "800", color: "#2a2118" },
  address:     { fontSize: 13, color: "#8d6b4c", marginTop: -12 },
  meta:        { fontSize: 12, color: "#9b8878", marginTop: -12 },

  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "#eadfce",
  },
  section:     { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:  { fontSize: 17, fontWeight: "800", color: "#2a2118" },
  subTitle:    { fontSize: 14, fontWeight: "800", color: "#2a2118" },

  freeBadge:     { backgroundColor: "#d4edda", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  freeBadgeText: { color: "#2d6a3f", fontSize: 11, fontWeight: "700" },
  proBadge:      { backgroundColor: "#2a2118", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  proBadgeText:  { color: "#f0d060", fontSize: 11, fontWeight: "700" },

  ratingCard:    { borderRadius: 16, padding: 18, alignItems: "center", gap: 6 },
  ratingBig:     { fontSize: 52, fontWeight: "900" },
  ratingSummary: { fontSize: 14, color: "#2a2118", textAlign: "center", lineHeight: 22 },

  // 专项运势
  focusSection:  { gap: 8 },
  insightCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#eadfce", borderLeftWidth: 4, gap: 6,
  },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingPill:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ratingPillText:{ fontSize: 13, fontWeight: "800" },
  insightArea:   { fontSize: 16, fontWeight: "800", color: "#2a2118" },
  insightSummary:{ fontSize: 13, color: "#46392c", lineHeight: 20 },
  insightFindings: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  findingPill:   { backgroundColor: "#f0e8da", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  findingPillText:{ fontSize: 12, fontWeight: "700" },
  noFindingText: { fontSize: 12, color: "#9b8878", fontStyle: "italic" },

  // 格局列表
  findingGroup:  { gap: 8 },
  findingGroupTitle: { fontSize: 13, fontWeight: "700", color: "#8d6b4c",
                        textTransform: "uppercase", letterSpacing: 0.5 },
  findingCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#eadfce", borderLeftWidth: 4, gap: 6,
  },
  findingTop:  { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typeBadge:   { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: "800" },
  findingName: { fontSize: 14, fontWeight: "800", color: "#2a2118", flex: 1 },
  findingLoc:  { fontSize: 11, color: "#9b8878" },
  chevron:     { fontSize: 10, color: "#9b8878" },

  affectsRow:  { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  affectsPill: { backgroundColor: "#f0e8da", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  affectsPillText: { fontSize: 10, color: "#8d6b4c", fontWeight: "600" },

  findingDetail: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0e8da" },
  findingClassic:{ fontSize: 12, color: "#8d6b4c", fontStyle: "italic" },
  findingDesc:   { fontSize: 13, color: "#46392c", lineHeight: 20 },
  findingSuggestion: { fontSize: 13, color: "#2d6a3f", lineHeight: 20, fontStyle: "italic" },

  tipsBox:     { backgroundColor: "#f0e8da", borderRadius: 12, padding: 14, gap: 8 },
  tipsTitle:   { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  tipText:     { fontSize: 13, color: "#46392c", lineHeight: 20 },

  loadingBox:  { alignItems: "center", gap: 8, paddingVertical: 16 },
  loadingText: { color: "#8d6b4c", fontSize: 13 },
  errorBox:    { gap: 8 },
  errorText:   { color: "#c0392b", fontSize: 13, lineHeight: 20 },
  retryBtn:    { backgroundColor: "#f0e8da", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  retryText:   { color: "#2a2118", fontWeight: "700" },
  aiDesc:      { fontSize: 13, color: "#5a4a3c", lineHeight: 20 },
  aiBtn:       { backgroundColor: "#8d6b4c", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  aiBtnText:   { color: "#fff", fontWeight: "800", fontSize: 16 },
  aiText:      { fontSize: 14, color: "#2a2118", lineHeight: 24 },

  saveBtn:     { backgroundColor: "#2a2118", borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  quickModeBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff3e0", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#e8c890",
  },
  quickModeIcon:  { fontSize: 22 },
  quickModeTitle: { fontSize: 14, fontWeight: "800", color: "#8d6b4c" },
  quickModeDesc:  { fontSize: 12, color: "#5a4a3c", lineHeight: 18, marginTop: 2 },
  quickModeArrow: { fontSize: 24, color: "#8d6b4c", fontWeight: "300" },
})
