import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native"
import { router } from "expo-router"
import { useAppStore } from "@/store/useAppStore"
import type { HistoryItem } from "@/types/fengshui"
import { POINT_CONFIGS } from "@/lib/fengshui/ai-prompts"

function itemLabel(item: HistoryItem): string {
  if (item.format === "v2") return item.data.address || "未填写地址"
  return item.data.address || "未填写地址"
}

function itemMeta(item: HistoryItem): string {
  if (item.format === "v2") {
    const pts = item.data.standingPoints.length
    const analyzed = item.data.standingPoints.filter((p) => p.aiAnalysis).length
    return `${pts} 个站点 · ${analyzed} 个已分析`
  }
  return `总分 ${item.data.totalScore}/100`
}

function itemDate(item: HistoryItem): string {
  const raw = item.format === "v2" ? item.data.createdAt : item.data.createdAt
  return raw ? new Date(raw).toLocaleDateString("zh-CN") : ""
}

export default function HistoryScreen() {
  const history                    = useAppStore((s) => s.history)
  const setCurrentFullAssessment   = useAppStore((s) => s.setCurrentFullAssessment)

  const handlePress = (item: HistoryItem) => {
    if (item.format === "v2") {
      setCurrentFullAssessment(item.data)
      // 恢复站点到 store 以便继续操作
      useAppStore.setState({
        standingPoints: item.data.standingPoints,
        address: item.data.address,
      })
      router.push("/synthesis")
    } else {
      // 旧格式：直接跳报告页（report.tsx 已保留旧逻辑）
      router.push("/report")
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>历史记录</Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
          <Text style={styles.settingsBtnText}>⚙</Text>
        </Pressable>
      </View>

      {history.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>还没有保存过评估记录。</Text>
        </View>
      ) : (
        history.map((item, i) => (
          <Pressable
            key={`${item.format}-${i}`}
            style={styles.card}
            onPress={() => handlePress(item)}
          >
            <View style={styles.row}>
              <Text style={[styles.formatBadge, item.format === "v2" && styles.formatBadgeV2]}>
                {item.format === "v2" ? "多站点" : "旧版"}
              </Text>
            </View>
            <Text style={styles.itemTitle}>{itemLabel(item)}</Text>
            <Text style={styles.meta}>{itemMeta(item)}</Text>
            <Text style={styles.date}>{itemDate(item)}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:   { padding: 24, backgroundColor: "#fffaf3", gap: 14 },
  titleRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title:       { fontSize: 28, fontWeight: "800", color: "#2a2118" },
  settingsBtn: { padding: 8 },
  settingsBtnText: { fontSize: 22, color: "#8d6b4c" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 6,
  },
  row:         { flexDirection: "row" },
  formatBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8d6b4c",
    backgroundColor: "#f0e8da",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  formatBadgeV2: { backgroundColor: "#d4edda", color: "#2d6a3f" },
  itemTitle:   { fontSize: 16, fontWeight: "800", color: "#2a2118" },
  meta:        { color: "#5a4a3c", fontSize: 13 },
  date:        { color: "#9b8878", fontSize: 12 },
  empty:       { color: "#5a4a3c" },
})
