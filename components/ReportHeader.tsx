import { View, Text, StyleSheet } from "react-native"
import { useAppStore } from "@/store/useAppStore"

// ReportHeader 现在显示 FullAssessment 的综合信息
export function ReportHeader() {
  const assessment     = useAppStore((s) => s.currentFullAssessment)
  const standingPoints = useAppStore((s) => s.standingPoints)

  const pts      = (assessment?.standingPoints ?? standingPoints).length
  const analyzed = (assessment?.standingPoints ?? standingPoints).filter((p) => p.aiAnalysis).length
  const hasSynthesis = !!assessment?.overallSynthesis

  return (
    <View style={styles.card}>
      <Text style={styles.title}>风水综合评估</Text>
      <Text style={styles.count}>{pts}</Text>
      <Text style={styles.countLabel}>个勘察站点</Text>
      <Text style={styles.subtitle}>
        {hasSynthesis
          ? "已生成 AI 综合报告"
          : analyzed > 0
          ? `${analyzed}/${pts} 个站点已完成 AI 分析`
          : "添加站点后可生成分析报告"}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#2a2118",
    borderRadius: 22,
    padding: 20,
    gap: 6,
    alignItems: "center",
  },
  title:      { color: "#e9ddcc", fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  count:      { color: "#fff", fontSize: 64, fontWeight: "900", lineHeight: 72 },
  countLabel: { color: "#a89070", fontSize: 13 },
  subtitle:   { color: "#d6c4ae", lineHeight: 20, textAlign: "center", marginTop: 4 },
})
