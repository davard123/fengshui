/**
 * 首页 — 免责声明 + 四步流程入口
 */
import { router } from "expo-router"
import { View, Text, Pressable, StyleSheet } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { Disclaimer } from "@/components/Disclaimer"

export default function HomeScreen() {
  const hydrated = useAppStore((s) => s.hydrated)
  const hasAccepted = useAppStore((s) => s.hasAcceptedDisclaimer)
  const assessment = useAppStore((s) => s.assessment)
  const resetAssessment = useAppStore((s) => s.resetAssessment)

  if (!hydrated) return <View style={styles.container} />

  if (!hasAccepted) {
    return <Disclaimer />
  }

  const startNew = () => {
    resetAssessment()
    router.push("/address")
  }

  return (
    <View style={styles.container}>
      {/* 设置入口（API Key）*/}
      <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
        <Text style={styles.settingsBtnText}>⚙ 设置</Text>
      </Pressable>

      <Text style={styles.title}>九宫风水参考</Text>
      <Text style={styles.subtitle}>
        定向 · 外局 · 九宫内局 · 玄空飞星{"\n"}美国阳宅 · 离线规则 · 仅供娱乐参考
      </Text>

      {/* 四步流程示意 */}
      <View style={styles.stepsCard}>
        {[
          ["1", "定位", "卫星图找轮廓，定太极点"],
          ["2", "定向", "选大门立面，得坐向（可罗盘验证）"],
          ["3", "外局", "三距离环看周边形势"],
          ["4", "内局", "房间拖入九宫，飞星+八宅判定"],
        ].map(([n, t, d]) => (
          <View key={n} style={styles.stepRow}>
            <Text style={styles.stepNum}>{n}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{t}</Text>
              <Text style={styles.stepDesc}>{d}</Text>
            </View>
          </View>
        ))}
      </View>

      {assessment && (
        <Pressable onPress={() => router.push("/report")} style={styles.continueBtn}>
          <Text style={styles.continueBtnText}>继续：{assessment.address || "未命名评估"}</Text>
        </Pressable>
      )}

      <Pressable onPress={startNew} style={styles.startBtn}>
        <Text style={styles.startBtnText}>开始新评估</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/history")} style={styles.historyBtn}>
        <Text style={styles.historyBtnText}>历史记录</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#faf7f0", gap: 14 },
  settingsBtn: {
    position: "absolute", top: 48, right: 24, zIndex: 10,
    backgroundColor: "#f0e8da", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  settingsBtnText: { color: "#8d6b4c", fontWeight: "700", fontSize: 13 },

  title:    { fontSize: 32, fontWeight: "900", color: "#2a2118", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#8d6b4c", textAlign: "center", lineHeight: 20 },

  stepsCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: "#eadfce", gap: 14, marginVertical: 8,
  },
  stepRow:  { flexDirection: "row", gap: 12, alignItems: "center" },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#2a2118", color: "#f0d060",
    textAlign: "center", lineHeight: 28, fontWeight: "900", fontSize: 14,
    overflow: "hidden",
  },
  stepTitle: { fontSize: 15, fontWeight: "800", color: "#2a2118" },
  stepDesc:  { fontSize: 12, color: "#8d6b4c", marginTop: 1 },

  continueBtn:     { backgroundColor: "#8d6b4c", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  continueBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  startBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  historyBtn:     { paddingVertical: 10, alignItems: "center" },
  historyBtnText: { color: "#8d6b4c", fontSize: 14, textDecorationLine: "underline" },
})
