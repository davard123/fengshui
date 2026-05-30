import { useState } from "react"
import { router } from "expo-router"
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { DirectionRing } from "@/components/DirectionRing"
import { ElementPicker } from "@/components/ElementPicker"
import { get24MountainRing, get8DirectionRing } from "@/lib/fengshui/mountains-24"
import { getElementsForPoint } from "@/lib/fengshui/elements"
import { POINT_CONFIGS } from "@/lib/fengshui/ai-prompts"
import type { DirectionEntry, StandingPoint } from "@/types/fengshui"
import type { RingSegment } from "@/lib/fengshui/mountains-24"

export default function DirectionMapScreen() {
  const compass             = useAppStore((s) => s.compass)
  const currentPointDraft   = useAppStore((s) => s.currentPointDraft)
  const commitCurrentPoint  = useAppStore((s) => s.commitCurrentPoint)
  const updateCurrentPointDraft = useAppStore((s) => s.updateCurrentPointDraft)

  const [pickerSeg, setPickerSeg] = useState<RingSegment | null>(null)
  // Map: direction → elements[]
  const [filledMap, setFilledMap] = useState<Record<string, string[]>>({})

  if (!currentPointDraft) {
    router.replace("/point-select")
    return null
  }

  const precision = currentPointDraft.precision ?? "8方位"
  const segments = precision === "24山"
    ? get24MountainRing(compass.degree)
    : get8DirectionRing(compass.degree)

  const elementGroups = getElementsForPoint(currentPointDraft.type ?? "outdoor")
  const config = POINT_CONFIGS[currentPointDraft.type ?? "outdoor"]

  const handleSegmentPress = (seg: RingSegment) => setPickerSeg(seg)

  const handlePickerConfirm = (selected: string[]) => {
    if (!pickerSeg) return
    setFilledMap((prev) => ({ ...prev, [pickerSeg.direction]: selected }))
  }

  const handleCommit = () => {
    // 将 filledMap 转为 DirectionEntry[]
    const directions: DirectionEntry[] = segments.map((seg) => ({
      direction: seg.direction,
      degree: seg.degree,
      elements: filledMap[seg.direction] ?? [],
    }))

    const point: StandingPoint = {
      id: currentPointDraft.id ?? `point-${Date.now()}`,
      type: currentPointDraft.type ?? "outdoor",
      label: currentPointDraft.label ?? config.label,
      theme: currentPointDraft.theme ?? config.theme,
      compassDegree: compass.degree,
      compassDirection: currentPointDraft.compassDirection ?? compass.direction,
      precision,
      directions,
    }

    commitCurrentPoint(point)
    // 跳转到AI分析页
    router.replace({ pathname: "/point-analysis", params: { id: point.id } })
  }

  const filledCount = Object.values(filledMap).filter((v) => v.length > 0).length

  return (
    <View style={styles.container}>
      {/* 标题 */}
      <View style={styles.header}>
        <Text style={styles.title}>{config.label}</Text>
        <Text style={styles.theme}>{config.theme}</Text>
        <Text style={styles.meta}>
          罗盘 {Math.round(compass.degree)}° · {precision}
        </Text>
      </View>

      {/* 说明 */}
      <Text style={styles.hint}>
        点击圆环上的方位格，标记该方向有什么。朝向您正面的方向位于顶部。
      </Text>

      {/* 方向环 */}
      <View style={styles.ringWrap}>
        <DirectionRing
          segments={segments}
          filledMap={filledMap}
          onSegmentPress={handleSegmentPress}
          size={320}
        />
      </View>

      {/* 已标记摘要 */}
      {filledCount > 0 && (
        <Text style={styles.summary}>
          已标记 {filledCount} 个方位
        </Text>
      )}

      {/* 提交 */}
      <Pressable
        onPress={handleCommit}
        style={[styles.commitBtn, filledCount === 0 && styles.commitBtnSecondary]}
      >
        <Text style={styles.commitText}>
          {filledCount === 0 ? "跳过标记，直接提交" : "提交并分析"}
        </Text>
      </Pressable>

      {/* 元素选择器 */}
      <ElementPicker
        visible={!!pickerSeg}
        direction={pickerSeg?.label ?? ""}
        elementGroups={elementGroups}
        selected={pickerSeg ? (filledMap[pickerSeg.direction] ?? []) : []}
        onConfirm={handlePickerConfirm}
        onClose={() => setPickerSeg(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffaf3", padding: 20, gap: 12 },
  header:    { gap: 2 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  theme:     { fontSize: 13, color: "#8d6b4c", fontWeight: "600" },
  meta:      { fontSize: 12, color: "#9b8878" },
  hint:      { fontSize: 13, color: "#5a4a3c", lineHeight: 18 },
  ringWrap:  { alignItems: "center", marginVertical: 8 },
  summary:   { textAlign: "center", fontSize: 13, color: "#4a7c59", fontWeight: "700" },
  commitBtn: {
    marginTop: "auto",
    backgroundColor: "#2a2118",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  commitBtnSecondary: { backgroundColor: "#8d6b4c" },
  commitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
