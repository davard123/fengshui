// This screen is kept for backwards compatibility with legacy history items.
// New assessments use synthesis.tsx instead.
import { router } from "expo-router"
import { View, Text, Pressable, StyleSheet } from "react-native"

export default function ReportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>报告页</Text>
      <Text style={styles.copy}>
        旧版评估报告。新版请使用综合报告页面。
      </Text>
      <Pressable onPress={() => router.push("/point-select")} style={styles.btn}>
        <Text style={styles.btnText}>返回站点列表</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fffaf3", gap: 16, justifyContent: "center" },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  copy:      { color: "#5a4a3c", lineHeight: 22 },
  btn:       { backgroundColor: "#2a2118", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  btnText:   { color: "#fff", fontWeight: "800" },
})
