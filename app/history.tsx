/**
 * 历史记录 — v3 主格式；v1/v2 旧记录只读摘要展示
 */
import { router } from "expo-router"
import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import type { HistoryItemV3 } from "@/types/fengshui"

export default function HistoryScreen() {
  const history = useAppStore((s) => s.history)
  const resetAssessment = useAppStore((s) => s.resetAssessment)

  const openV3 = (item: Extract<HistoryItemV3, { format: "v3" }>) => {
    useAppStore.setState({ assessment: item.data })
    router.push("/report")
  }

  const startNew = () => {
    resetAssessment()
    router.push("/address")
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headRow}>
        <Text style={styles.title}>历史记录</Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.gearBtn} hitSlop={8}>
          <Text style={styles.gearText}>⚙</Text>
        </Pressable>
      </View>

      <Pressable onPress={startNew} style={styles.newBtn}>
        <Text style={styles.newBtnText}>＋ 开始新评估</Text>
      </Pressable>

      {history.length === 0 && (
        <Text style={styles.empty}>暂无历史记录</Text>
      )}

      {history.map((item, idx) => {
        if (item.format === "v3") {
          const a = item.data
          return (
            <Pressable key={a.id} onPress={() => openV3(item)} style={styles.card}>
              <Text style={styles.cardAddr}>{a.address}</Text>
              <Text style={styles.cardMeta}>
                {a.orientation
                  ? `坐${a.orientation.sittingMountain}向${a.orientation.facingMountain}`
                  : "未定向"}
                {a.builtYear ? ` · ${a.builtYear}年建` : ""}
                {" · "}{a.placements.length} 房间 · {a.external.filter((f) => f.confirmed).length} 外局地物
              </Text>
              <Text style={styles.cardDate}>
                {new Date(a.updatedAt).toLocaleDateString("zh-CN")} · v3
              </Text>
            </Pressable>
          )
        }
        // v1 / v2 旧格式：只读摘要
        const addr = item.data.address
        const date = item.data.createdAt
        return (
          <Pressable
            key={`legacy-${idx}`}
            onPress={() => Alert.alert("旧版记录", "这是旧版本的评估记录，仅保留摘要。建议用新流程重新评估。")}
            style={[styles.card, styles.cardLegacy]}
          >
            <Text style={styles.cardAddr}>{addr}</Text>
            <Text style={styles.cardDate}>
              {new Date(date).toLocaleDateString("zh-CN")} · 旧版（{item.format}）只读
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 12, flexGrow: 1 },
  headRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  gearBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f0e8da", alignItems: "center", justifyContent: "center" },
  gearText:  { fontSize: 18 },

  newBtn:     { backgroundColor: "#2a2118", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  newBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  empty: { fontSize: 14, color: "#9b8878", textAlign: "center", marginTop: 30 },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#eadfce", gap: 4,
  },
  cardLegacy: { opacity: 0.65 },
  cardAddr:   { fontSize: 15, fontWeight: "800", color: "#2a2118" },
  cardMeta:   { fontSize: 12, color: "#5a4a3c" },
  cardDate:   { fontSize: 11, color: "#9b8878" },
})
