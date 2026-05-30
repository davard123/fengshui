import { router } from "expo-router"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { Disclaimer } from "@/components/Disclaimer"
import { useAppStore } from "@/store/useAppStore"

export default function HomeScreen() {
  const hasAcceptedDisclaimer   = useAppStore((s) => s.hasAcceptedDisclaimer)
  const address                 = useAppStore((s) => s.address)
  const standingPoints          = useAppStore((s) => s.standingPoints)
  const history                 = useAppStore((s) => s.history)
  const resetAssessmentFlow     = useAppStore((s) => s.resetAssessmentFlow)
  const clearStandingPoints     = useAppStore((s) => s.clearStandingPoints)

  // 继续当前评估的路由
  const continueRoute = !address ? "/address" : "/point-select"
  const continueLabel = !address
    ? "开始新评估"
    : standingPoints.length === 0
    ? "添加勘察站点"
    : `继续评估（${standingPoints.length} 个站点）`

  const handleReset = () => {
    resetAssessmentFlow()
    clearStandingPoints()
    router.push("/address")
  }

  return (
    <View style={styles.container}>
      {/* 设置按钮永远显示在右上角 */}
      <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
        <Text style={styles.settingsBtnText}>⚙ 设置 / API Key</Text>
      </Pressable>

      <Text style={styles.title}>风水评估</Text>
      <Text style={styles.subtitle}>
        多站点实地勘察 · AI 专题分析 · 本地运行
      </Text>

      {!hasAcceptedDisclaimer ? (
        <Disclaimer />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>房源评估中心</Text>
          <Text style={styles.cardCopy}>
            在房源的多个位置（大门外、客厅、主卧等）使用罗盘采集方向，标记所见环境，由 AI 按主题给出分析报告。
          </Text>

          <Pressable onPress={() => router.push(continueRoute)} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{continueLabel}</Text>
          </Pressable>

          <Pressable onPress={handleReset} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>重新开始新评估</Text>
          </Pressable>

          <View style={styles.linkRow}>
            {history.length > 0 && (
              <Pressable onPress={() => router.push("/history")} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>历史记录</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.push("/settings")} style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>⚙ 设置</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#faf7f0" },
  settingsBtn:{ position: "absolute", top: 48, right: 24, zIndex: 10,
                backgroundColor: "#f0e8da", borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 8 },
  settingsBtnText: { color: "#8d6b4c", fontWeight: "700", fontSize: 13 },
  title:      { fontSize: 34, fontWeight: "800", color: "#2a2118", marginBottom: 8 },
  subtitle:   { fontSize: 14, lineHeight: 22, color: "#8d6b4c", marginBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 12,
  },
  cardTitle:  { fontSize: 22, fontWeight: "800", color: "#2a2118" },
  cardCopy:   { color: "#5a4a3c", lineHeight: 22, fontSize: 14 },
  primaryBtn: { backgroundColor: "#2a2118", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryBtn: { backgroundColor: "#efe4d4", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  secondaryBtnText: { color: "#3a2f25", fontWeight: "800", fontSize: 16 },
  linkRow:    { flexDirection: "row", justifyContent: "center", gap: 24 },
  linkBtn:    { paddingVertical: 8 },
  linkBtnText:{ color: "#8d6b4c", fontWeight: "700" },
})
