/**
 * 记录 — 保存过的评估；点开查看报告，长按/删除按钮移除
 */
import { router } from "expo-router"
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { generateReportV3 } from "@/lib/fengshui/report-v3"
import { Badge, Button, Card, Screen } from "@/components/ui"
import { LuopanMark } from "@/components/LuopanMark"
import { C, RATING_TONE } from "@/lib/theme"
import type { AssessmentV3 } from "@/types/fengshui"

function confirm(title: string, msg: string, onYes: () => void) {
  if (Platform.OS === "web") { if (window.confirm(`${title}\n${msg}`)) onYes(); return }
  Alert.alert(title, msg, [{ text: "取消", style: "cancel" }, { text: "删除", style: "destructive", onPress: onYes }])
}

function ratingOf(a: AssessmentV3) {
  try { return generateReportV3(a).overallRating } catch { return null }
}

export default function HistoryScreen() {
  const history         = useAppStore((s) => s.history)
  const openFromHistory = useAppStore((s) => s.openFromHistory)
  const deleteHistory   = useAppStore((s) => s.deleteHistory)
  const resetAssessment = useAppStore((s) => s.resetAssessment)

  const v3 = history.filter((h): h is Extract<typeof h, { format: "v3" }> => h.format === "v3")
  const legacyCount = history.length - v3.length

  return (
    <Screen topInset>
      <Text style={styles.title}>评估记录</Text>

      {v3.length === 0 && (
        <View style={styles.empty}>
          <LuopanMark size={140} />
          <Text style={styles.emptyText}>还没有保存的评估</Text>
          <Text style={styles.emptySub}>完成一次勘宅后，报告会自动保存在这里</Text>
          <Button title="开始勘宅" onPress={() => { resetAssessment(); router.push("/address") }} style={{ alignSelf: "stretch" }} />
        </View>
      )}

      {v3.map(({ data: a }) => {
        const rating = ratingOf(a)
        const tone = rating ? RATING_TONE[rating] : null
        return (
          <Card
            key={a.id}
            onPress={() => { openFromHistory(a.id); router.push("/report") }}
          >
            <View style={styles.row}>
              {tone && rating && (
                <View style={[styles.rating, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.ratingText, { color: tone.fg }]}>{rating}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.addr} numberOfLines={2}>{a.address || "未命名住宅"}</Text>
                <Text style={styles.meta}>
                  {a.orientation ? `坐${a.orientation.sittingMountain}向${a.orientation.facingMountain}` : "未定向"}
                  {a.builtYear ? ` · ${a.builtYear}年` : ""}
                  {` · ${a.placements.length} 房间`}
                </Text>
                <View style={styles.row}>
                  <Text style={styles.date}>{new Date(a.updatedAt).toLocaleDateString("zh-CN")}</Text>
                  {a.aiUnlocked && <Badge label="深度报告" />}
                </View>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => confirm("删除这条记录？", a.address, () => deleteHistory(a.id))}
                style={styles.del}
              >
                <Text style={styles.delText}>删除</Text>
              </Pressable>
            </View>
          </Card>
        )
      })}

      {legacyCount > 0 && (
        <Text style={styles.legacy}>另有 {legacyCount} 条旧版本记录（格式已不兼容，建议重新评估）</Text>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", color: C.text },
  empty: { alignItems: "center", gap: 10, paddingTop: 30 },
  emptyText: { fontSize: 17, fontWeight: "800", color: C.text, marginTop: 6 },
  emptySub:  { fontSize: 13, color: C.textMuted, marginBottom: 10 },
  row:   { flexDirection: "row", alignItems: "center", gap: 10 },
  rating:{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  ratingText: { fontSize: 15, fontWeight: "900" },
  addr:  { fontSize: 15, fontWeight: "800", color: C.text },
  meta:  { fontSize: 12, color: C.textSub },
  date:  { fontSize: 11, color: C.textMuted },
  del:   { paddingHorizontal: 8, paddingVertical: 6 },
  delText: { fontSize: 12, color: C.bad, fontWeight: "700" },
  legacy:{ fontSize: 12, color: C.textFaint, textAlign: "center" },
})
