/**
 * 第 6 步 — 综合报告
 * 定向卡 → 飞星盘九宫图 → 外局 → 八宅 → 细节 → 总评 → 可选 AI 综合
 */
import { router } from "expo-router"
import { useMemo, useState } from "react"
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { generateReportV3, RATING_COLOR_V3, RATING_BG_V3 } from "@/lib/fengshui/report-v3"
import { PATTERN_MEANING } from "@/lib/fengshui/flying-stars"
import { PALACE_ORDER_GRID, PALACE_INFO } from "@/lib/fengshui/palaces"
import { buildV3SynthesisPrompt, V3_SYSTEM_PROMPT } from "@/lib/fengshui/ai-prompts-v3"
import { analyzeWithAI } from "@/lib/ai-client"
import { FocusAreaPicker } from "@/components/FocusAreaPicker"
import type { FocusArea } from "@/types/fengshui"

type AnyFinding = {
  id: string; name: string; score: number
  location: string; description: string
  classic?: string; suggestion?: string
  affects?: FocusArea[]
}

export default function ReportScreen() {
  const assessment    = useAppStore((s) => s.assessment)
  const setReportText = useAppStore((s) => s.setReportText)
  const saveToHistory = useAppStore((s) => s.saveToHistory)

  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState<string | null>(null)

  const report = useMemo(() => assessment ? generateReportV3(assessment) : null, [assessment])

  if (!assessment || !report) {
    return (
      <View style={styles.container}>
        <Text style={styles.copy}>暂无评估数据。</Text>
        <Pressable onPress={() => router.replace("/address")} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>开始新评估 →</Text>
        </Pressable>
      </View>
    )
  }

  const runAI = async () => {
    setAiLoading(true); setAiError(null)
    const result = await analyzeWithAI(V3_SYSTEM_PROMPT, buildV3SynthesisPrompt(assessment, report))
    if (result.ok) setReportText(result.text)
    else setAiError(result.error)
    setAiLoading(false)
  }

  // 按关注运势过滤 findings
  const allFindings: AnyFinding[] = [
    ...report.exterior,
    ...(report.bazhai?.findings ?? []),
    ...report.interior,
  ]
  const relevant = focusAreas.length === 0
    ? allFindings
    : allFindings.filter((f) => f.affects?.some((a) => focusAreas.includes(a)))
  const negatives = relevant.filter((f) => f.score < 0).sort((a, b) => a.score - b.score)
  const positives = relevant.filter((f) => f.score > 0).sort((a, b) => b.score - a.score)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>综合风水报告</Text>
      <Text style={styles.address}>{assessment.address}</Text>

      {/* ── 总评 ── */}
      <View style={[styles.ratingCard, { backgroundColor: RATING_BG_V3[report.overallRating] }]}>
        <Text style={[styles.ratingBig, { color: RATING_COLOR_V3[report.overallRating] }]}>
          {report.overallRating}
        </Text>
        <Text style={styles.ratingSummary}>{report.summary}</Text>
      </View>

      {/* ── 定向 ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧭 定向</Text>
        <Text style={styles.cardBody}>{report.orientationText}</Text>
      </View>

      {/* ── 玄空飞星盘 ── */}
      {report.flyingStars && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ 玄空飞星</Text>
          <Text style={styles.cardBody}>{report.flyingStarSummary}</Text>
          <Text style={styles.patternAdvice}>
            {PATTERN_MEANING[report.flyingStars.pattern].advice}
          </Text>

          {/* 九宫飞星图 */}
          <View style={styles.starGrid}>
            {PALACE_ORDER_GRID.map((row, ri) => (
              <View key={ri} style={styles.starRow}>
                {row.map((p) => {
                  const s = report.flyingStars!.palaces[p]
                  return (
                    <View key={p} style={[styles.starCell, p === "CENTER" && styles.starCellCenter]}>
                      <Text style={styles.starDir}>{PALACE_INFO[p].label}</Text>
                      <Text style={styles.starNums}>
                        <Text style={styles.starMountain}>{s.mountain}</Text>
                        {"  "}
                        <Text style={styles.starFacing}>{s.facing}</Text>
                      </Text>
                      <Text style={styles.starBase}>{s.base}</Text>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
          <Text style={styles.starLegend}>每宫：左=山星 右=向星 下=运星</Text>

          {report.palaceNotes.length > 0 && (
            <View style={styles.notesBox}>
              {report.palaceNotes.map((n, i) => (
                <Text key={i} style={[styles.noteText, n.good ? styles.noteGood : styles.noteBad]}>
                  {n.good ? "✓" : "⚠"} {n.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 运势关注 ── */}
      <View style={styles.card}>
        <FocusAreaPicker selected={focusAreas} onChange={setFocusAreas} />
      </View>

      {/* ── 问题 ── */}
      {negatives.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠ 不利格局（{negatives.length}）</Text>
          {negatives.map((f) => (
            <View key={f.id} style={[styles.findingRow, styles.findingBad]}>
              <Text style={styles.findingName}>{f.name} <Text style={styles.findingLoc}>{f.location}</Text></Text>
              <Text style={styles.findingDesc}>{f.description}</Text>
              {f.classic && <Text style={styles.findingClassic}>📜 {f.classic}</Text>}
              {f.suggestion && <Text style={styles.findingSug}>💡 {f.suggestion}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* ── 优势 ── */}
      {positives.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✓ 有利格局（{positives.length}）</Text>
          {positives.map((f) => (
            <View key={f.id} style={[styles.findingRow, styles.findingGood]}>
              <Text style={styles.findingName}>{f.name} <Text style={styles.findingLoc}>{f.location}</Text></Text>
              <Text style={styles.findingDesc}>{f.description}</Text>
              {f.classic && <Text style={styles.findingClassic}>📜 {f.classic}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* ── 优先行动 ── */}
      {report.topActions.length > 0 && (
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>优先改善行动</Text>
          {report.topActions.map((t, i) => (
            <Text key={i} style={styles.tipText}>{i + 1}. {t}</Text>
          ))}
        </View>
      )}

      {/* ── AI 综合（可选）── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🤖 AI 深度综合（可选）</Text>
        {aiLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#8d6b4c" />
            <Text style={styles.loadingText}>分析中…</Text>
          </View>
        )}
        {aiError && (
          <>
            <Text style={styles.errorText}>{aiError}</Text>
            <Pressable onPress={runAI} style={styles.aiBtn}>
              <Text style={styles.aiBtnText}>重试</Text>
            </Pressable>
          </>
        )}
        {!aiLoading && !aiError && assessment.reportText && (
          <Text style={styles.aiText}>{assessment.reportText}</Text>
        )}
        {!aiLoading && !aiError && !assessment.reportText && (
          <Pressable onPress={runAI} style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>生成 AI 综合分析</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => { saveToHistory(); router.push("/history") }}
        style={styles.saveBtn}
      >
        <Text style={styles.saveBtnText}>保存到历史记录</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 14, flexGrow: 1 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  address:   { fontSize: 13, color: "#8d6b4c", marginTop: -8 },
  copy:      { fontSize: 14, color: "#5a4a3c" },

  ratingCard: { borderRadius: 18, padding: 18, alignItems: "center", gap: 6 },
  ratingBig:  { fontSize: 48, fontWeight: "900" },
  ratingSummary: { fontSize: 14, color: "#2a2118", textAlign: "center", lineHeight: 22 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#eadfce", gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#2a2118" },
  cardBody:  { fontSize: 14, color: "#46392c", lineHeight: 22 },
  patternAdvice: { fontSize: 13, color: "#6b3e1a", lineHeight: 20, fontStyle: "italic" },

  starGrid: { gap: 4, marginTop: 4 },
  starRow:  { flexDirection: "row", gap: 4 },
  starCell: {
    flex: 1, aspectRatio: 1.1,
    backgroundColor: "#fdf5ea", borderRadius: 8,
    borderWidth: 1, borderColor: "#e3d0b0",
    alignItems: "center", justifyContent: "center", gap: 1,
  },
  starCellCenter: { backgroundColor: "#f0e4cc" },
  starDir:   { fontSize: 10, color: "#8d6b4c" },
  starNums:  { fontSize: 17, fontWeight: "900" },
  starMountain: { color: "#6b3e1a" },
  starFacing:   { color: "#1a4b6b" },
  starBase:  { fontSize: 10, color: "#9b8878" },
  starLegend:{ fontSize: 11, color: "#9b8878", textAlign: "center" },

  notesBox: { gap: 5, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0e8da" },
  noteText: { fontSize: 12, lineHeight: 18 },
  noteGood: { color: "#2d6a3f" },
  noteBad:  { color: "#c0392b" },

  findingRow: { borderLeftWidth: 4, borderRadius: 10, padding: 12, gap: 4, backgroundColor: "#faf6f0" },
  findingBad:  { borderLeftColor: "#c0392b" },
  findingGood: { borderLeftColor: "#2d6a3f" },
  findingName: { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  findingLoc:  { fontSize: 11, fontWeight: "400", color: "#9b8878" },
  findingDesc: { fontSize: 13, color: "#46392c", lineHeight: 19 },
  findingClassic: { fontSize: 12, color: "#8d6b4c", fontStyle: "italic" },
  findingSug:  { fontSize: 13, color: "#2d6a3f", lineHeight: 19 },

  tipsBox:   { backgroundColor: "#f0e8da", borderRadius: 14, padding: 14, gap: 8 },
  tipsTitle: { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  tipText:   { fontSize: 13, color: "#46392c", lineHeight: 20 },

  loadingRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  loadingText:{ color: "#8d6b4c", fontSize: 13 },
  errorText:  { color: "#c0392b", fontSize: 13, lineHeight: 19 },
  aiBtn:      { backgroundColor: "#8d6b4c", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  aiBtnText:  { color: "#fff", fontWeight: "800", fontSize: 15 },
  aiText:     { fontSize: 14, color: "#2a2118", lineHeight: 23 },

  saveBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
