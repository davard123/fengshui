import { useEffect, useState } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { analyzeStandingPoint } from "@/lib/ai-client"
import { POINT_CONFIGS } from "@/lib/fengshui/ai-prompts"
import { runRuleEngine, type RuleEngineResult } from "@/lib/fengshui/rule-engine"
import { isQuickModeProfile } from "@/lib/fengshui/quickmode"

export default function PointAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const standingPoints  = useAppStore((s) => s.standingPoints)
  const profile         = useAppStore((s) => s.profile)
  const address         = useAppStore((s) => s.address)
  const updatePoint     = useAppStore((s) => s.updateStandingPoint)

  const point = standingPoints.find((p) => p.id === id)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const config      = point ? POINT_CONFIGS[point.type] ?? POINT_CONFIGS.custom : null
  const ruleResult: RuleEngineResult | null = (point && profile)
    ? runRuleEngine(standingPoints, profile)
    : null

  const runAnalysis = async () => {
    if (!point || !profile) return
    setLoading(true)
    setError(null)

    const result = await analyzeStandingPoint(point, profile, address, standingPoints)
    if (result.ok) {
      updatePoint(point.id, {
        aiAnalysis: result.text,
        analyzedAt: new Date().toISOString(),
      })
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  // 如果还没有分析结果，自动触发
  useEffect(() => {
    if (point && !point.aiAnalysis && !loading) {
      void runAnalysis()
    }
  }, [point?.id])

  if (!point || !config) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>找不到该站点记录</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>返回</Text>
        </Pressable>
      </View>
    )
  }

  const filledCount = point.directions.filter((d) => d.elements.length > 0).length

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 站点信息 */}
      <View style={styles.pointHeader}>
        <Text style={styles.label}>{config.label}</Text>
        <Text style={styles.theme}>{config.theme}</Text>
        <Text style={styles.meta}>
          {point.precision} · 朝向 {Math.round(point.compassDegree)}°（{point.compassDirection}）· {filledCount} 个方位已标记
        </Text>
      </View>

      {/* 方位标记摘要 */}
      {filledCount > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>方位标记</Text>
          {point.directions
            .filter((d) => d.elements.length > 0)
            .map((d) => (
              <View key={d.direction} style={styles.dirRow}>
                <Text style={styles.dirName}>{d.direction}</Text>
                <Text style={styles.dirElements}>{d.elements.join("、")}</Text>
              </View>
            ))}
        </View>
      )}

      {/* 规则引擎推算结果 */}
      {ruleResult && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>风水规则推算</Text>

          {/* 人宅匹配（仅真实命卦时显示）*/}
          {!isQuickModeProfile(profile) && ruleResult.groupMatch !== undefined && (
            <View style={[styles.matchBadge,
              ruleResult.groupMatch ? styles.matchGood : styles.matchBad]}>
              <Text style={[styles.matchText,
                ruleResult.groupMatch ? styles.matchTextGood : styles.matchTextBad]}>
                {ruleResult.groupMatch
                  ? `✓ 人宅相配（均属${ruleResult.kuaGroup.slice(0,3)}）`
                  : `⚠ 人宅不配（${ruleResult.kuaGroup} × ${ruleResult.houseGroup}）`}
              </Text>
            </View>
          )}

          {/* 坐向（永远显示，不依赖命卦）*/}
          {ruleResult.houseSitting && (
            <Text style={styles.ruleRow}>
              坐向：坐{ruleResult.houseSitting}朝{ruleResult.houseFacing}
              {!isQuickModeProfile(profile) && ruleResult.houseGroup ? `（${ruleResult.houseGroup}）` : ""}
            </Text>
          )}

          {/* 个人吉凶方（仅真实命卦时显示）*/}
          {!isQuickModeProfile(profile) && (
            <>
              <View style={styles.dirRow}>
                <Text style={styles.ruleLabel}>个人吉方</Text>
                <Text style={[styles.ruleValue, styles.goodText]}>
                  {ruleResult.personalAuspicious.join("  ")}
                </Text>
              </View>
              <View style={styles.dirRow}>
                <Text style={styles.ruleLabel}>个人凶方</Text>
                <Text style={[styles.ruleValue, styles.badText]}>
                  {ruleResult.personalInauspicious.join("  ")}
                </Text>
              </View>
            </>
          )}

          {/* 快速模式提示 */}
          {isQuickModeProfile(profile) && (
            <View style={styles.quickHint}>
              <Text style={styles.quickHintText}>
                ℹ 未填写出生信息 — 仅显示环境格局分析，个人吉凶方、人宅匹配需在"⚙ 设置"或"个人信息"中填写真实命卦。
              </Text>
            </View>
          )}

          {/* 形势问题 */}
          {ruleResult.warnings.length > 0 && (
            <View style={styles.flagBox}>
              <Text style={styles.flagTitle}>⚠ 检测到问题</Text>
              {ruleResult.warnings.map((w, i) => (
                <Text key={i} style={styles.flagBad}>• {w}</Text>
              ))}
            </View>
          )}

          {/* 形势优点 */}
          {ruleResult.positives.length > 0 && (
            <View style={styles.flagBox}>
              <Text style={styles.flagTitle}>✓ 有利因素</Text>
              {ruleResult.positives.map((p, i) => (
                <Text key={i} style={styles.flagGood}>• {p}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* AI 分析区 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>AI 风水分析</Text>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#8d6b4c" />
            <Text style={styles.loadingText}>正在分析中…</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={runAnalysis} style={styles.retryBtn}>
              <Text style={styles.retryText}>重试</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && point.aiAnalysis && (
          <Text style={styles.analysisText}>{point.aiAnalysis}</Text>
        )}

        {!loading && !error && !point.aiAnalysis && (
          <Pressable onPress={runAnalysis} style={styles.analyzeBtn}>
            <Text style={styles.analyzeBtnText}>发送 AI 分析</Text>
          </Pressable>
        )}
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        <Pressable onPress={() => router.push("/point-select")} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>继续添加站点</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/synthesis")} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>生成综合报告</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { padding: 24, backgroundColor: "#fffaf3", gap: 16 },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  pointHeader:  { gap: 4 },
  label:        { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  theme:        { fontSize: 13, color: "#8d6b4c", fontWeight: "600" },
  meta:         { fontSize: 12, color: "#9b8878" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#2a2118", textTransform: "uppercase", letterSpacing: 0.5 },
  dirRow:       { flexDirection: "row", gap: 10 },
  dirName:      { fontSize: 14, fontWeight: "700", color: "#8d6b4c", width: 36 },
  dirElements:  { fontSize: 14, color: "#46392c", flex: 1, lineHeight: 20 },
  loadingBox:   { alignItems: "center", gap: 8, paddingVertical: 12 },
  loadingText:  { color: "#8d6b4c", fontSize: 13 },
  errorBox:     { gap: 8 },
  errorText:    { color: "#c0392b", fontSize: 13, lineHeight: 20 },
  retryBtn:     { backgroundColor: "#f0e8da", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  retryText:    { color: "#2a2118", fontWeight: "700" },
  analyzeBtn:   { backgroundColor: "#8d6b4c", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  analyzeBtnText: { color: "#fff", fontWeight: "800" },
  analysisText: { fontSize: 14, color: "#2a2118", lineHeight: 22 },
  actions:      { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, backgroundColor: "#f0e8da", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  secondaryBtnText: { color: "#2a2118", fontWeight: "700" },
  primaryBtn:   { flex: 1, backgroundColor: "#2a2118", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  backBtn:      { backgroundColor: "#f0e8da", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText:  { color: "#2a2118", fontWeight: "700" },

  // 规则引擎 UI
  matchBadge:   { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  matchGood:    { backgroundColor: "#d4edda" },
  matchBad:     { backgroundColor: "#fdecea" },
  matchText:    { fontSize: 13, fontWeight: "700" },
  matchTextGood:{ color: "#2d6a3f" },
  matchTextBad: { color: "#c0392b" },
  ruleRow:      { fontSize: 13, color: "#5a4a3c" },
  ruleLabel:    { fontSize: 12, color: "#8d6b4c", fontWeight: "700", width: 56 },
  ruleValue:    { fontSize: 13, fontWeight: "700", flex: 1 },
  goodText:     { color: "#2d6a3f" },
  badText:      { color: "#c0392b" },
  flagBox:      { gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#f0e8da" },
  flagTitle:    { fontSize: 12, fontWeight: "700", color: "#8d6b4c", textTransform: "uppercase", letterSpacing: 0.5 },
  flagBad:      { fontSize: 12, color: "#c0392b", lineHeight: 18 },
  flagGood:     { fontSize: 12, color: "#2d6a3f", lineHeight: 18 },
  quickHint:    { backgroundColor: "#fff8eb", borderRadius: 10,
                   borderWidth: 1, borderColor: "#e8d4a0", padding: 10 },
  quickHintText:{ fontSize: 12, color: "#8d6b4c", lineHeight: 18 },
})
