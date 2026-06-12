/**
 * 第 3 步 — 外局（峦头）
 * 以宅中心为原点显示三距离环 + Overpass 自动识别地物 → 用户逐项确认/补充
 * 几何敏感格局（路冲/反弓/玉带/天斩）必须人工添加确认
 */
import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  Platform, ActivityIndicator, Modal,
} from "react-native"
import WebView from "react-native-webview"
import { useAppStore } from "@/store/useAppStore"
import { queryExternalFeaturesV3, rawToExternalFeature, type RawExternalFeature } from "@/lib/geo/overpass"
import { buildExteriorMapHTML } from "@/lib/geo/map-html"
import { distanceToRing, bearingToRelative, severityBaseOf, RELATIVE_LABEL, RING_CONFIG } from "@/lib/fengshui/palaces"
import type { ExternalFeatureV3 } from "@/types/fengshui"

// 手动补充时可选的地物类型（含几何敏感型）
const MANUAL_KINDS = [
  "T字路口正对", "弯道朝向大门(玉带)", "弯道背离大门(反弓)", "两楼夹缝(天斩)",
  "尖顶/尖角建筑", "高速公路", "主干道", "水(湖河海)", "小溪水渠",
  "山/高地", "高楼", "低矮建筑", "空地/开阔", "树林", "墓地", "高压线", "加油站",
]

export default function ExteriorScreen() {
  const assessment  = useAppStore((s) => s.assessment)
  const setFeatures = useAppStore((s) => s.setExternalFeatures)
  const upsert      = useAppStore((s) => s.upsertExternalFeature)
  const remove      = useAppStore((s) => s.removeExternalFeature)

  const [loading, setLoading] = useState(false)
  const [rawFeatures, setRawFeatures] = useState<RawExternalFeature[]>([])
  const [pendingTap, setPendingTap] = useState<{ bearing: number; distance: number } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const center = assessment?.footprint?.center
  const facing = assessment?.orientation?.facingDegree ?? 0
  const features = assessment?.external ?? []

  // 首次进入自动查询
  useEffect(() => {
    if (!center || loaded || features.length > 0) { setLoaded(true); return }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const raw = await queryExternalFeaturesV3(center)
      if (cancelled) return
      setRawFeatures(raw)
      const fs = raw
        .map((r) => rawToExternalFeature(r, facing))
        .filter((f): f is ExternalFeatureV3 => f !== null)
      setFeatures(fs)
      setLoading(false)
      setLoaded(true)
    }
    void run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center])

  // 地图点击回传 → 弹类型选择
  const handleMapMessage = (raw: string) => {
    let data: any
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw } catch { return }
    if (data.tapAdd) {
      setPendingTap({ bearing: data.tapAdd.bearing, distance: data.tapAdd.distance })
    }
  }

  useEffect(() => {
    if (Platform.OS !== "web") return
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && e.data.tapAdd) handleMapMessage(JSON.stringify(e.data))
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const addManual = (kind: string) => {
    if (!pendingTap) return
    const ring = distanceToRing(pendingTap.distance, kind)
    if (!ring) { setPendingTap(null); return }
    upsert({
      id: `manual-${Date.now()}`,
      kind,
      bearingFromCenter: pendingTap.bearing,
      distance: pendingTap.distance,
      ring,
      relative: bearingToRelative(pendingTap.bearing, facing),
      source: "manual",
      confirmed: true,
      severityBase: severityBaseOf(kind),
    })
    setPendingTap(null)
  }

  if (!center) {
    return (
      <View style={styles.container}>
        <Text style={styles.copy}>请先完成定位与定向。</Text>
        <Pressable onPress={() => router.replace("/address")} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>返回 →</Text>
        </Pressable>
      </View>
    )
  }

  const mapHtml = buildExteriorMapHTML(
    center, facing,
    features.map((f) => {
      // 用方位角+距离反推坐标（仅显示用）
      const rad = f.bearingFromCenter * Math.PI / 180
      const lat = center.lat + (f.distance / 110540) * Math.cos(rad)
      const lon = center.lon + (f.distance / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(rad)
      return { id: f.id, kind: f.kind, lat, lon }
    }),
  )

  const sorted = [...features].sort((a, b) => a.distance - b.distance)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>第 3 步 · 外局</Text>
      <Text style={styles.copy}>
        以宅中心为原点的三个距离环：近 50m / 中 200m / 远 1km。
        <Text style={styles.bold}>距离越近影响越大；自动识别项需确认后才参与判定。</Text>
      </Text>

      <View style={styles.mapCard}>
        {Platform.OS === "web" ? (
          <View style={styles.mapBox}>
            <iframe srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} title="Exterior Map" />
          </View>
        ) : (
          <WebView
            source={{ html: mapHtml }}
            style={styles.mapBox}
            onMessage={(e) => handleMapMessage(e.nativeEvent.data)}
            originWhitelist={["*"]}
            javaScriptEnabled
          />
        )}
        <Text style={styles.mapHint}>💡 路冲/反弓/玉带/天斩这类形态，自动识别不了——在地图上点击该位置手动添加</Text>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#8d6b4c" />
          <Text style={styles.loadingText}>正在识别周边地物…</Text>
        </View>
      )}

      {/* 地物清单 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>周边地物（{features.filter((f) => f.confirmed).length}/{features.length} 已确认）</Text>
        {sorted.map((f) => (
          <View key={f.id} style={[styles.featRow, f.confirmed && styles.featRowOn]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.featKind}>{f.kind}</Text>
              <Text style={styles.featMeta}>
                {RELATIVE_LABEL[f.relative]} · {f.distance}m · {RING_CONFIG[f.ring].label}
                {f.source === "manual" ? " · 手动" : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => upsert({ ...f, confirmed: !f.confirmed })}
              style={[styles.confirmPill, f.confirmed && styles.confirmPillOn]}
            >
              <Text style={[styles.confirmPillText, f.confirmed && styles.confirmPillTextOn]}>
                {f.confirmed ? "✓ 已确认" : "确认"}
              </Text>
            </Pressable>
            <Pressable onPress={() => remove(f.id)} style={styles.delBtn} hitSlop={8}>
              <Text style={styles.delText}>×</Text>
            </Pressable>
          </View>
        ))}
        {features.length === 0 && !loading && (
          <Text style={styles.emptyText}>未识别到地物，可在地图上点击补充。</Text>
        )}
      </View>

      <Pressable onPress={() => router.push("/palaces")} style={styles.nextBtn}>
        <Text style={styles.nextBtnText}>下一步：九宫内局 →</Text>
      </Pressable>

      {/* 手动添加类型选择 */}
      <Modal visible={!!pendingTap} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              这个位置是什么？（{pendingTap ? `${Math.round(pendingTap.distance)}m` : ""}）
            </Text>
            <View style={styles.kindGrid}>
              {MANUAL_KINDS.map((k) => (
                <Pressable key={k} onPress={() => addManual(k)} style={styles.kindChip}>
                  <Text style={styles.kindChipText}>{k}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setPendingTap(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 14, flexGrow: 1 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  copy:      { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },
  bold:      { fontWeight: "800", color: "#6b3e1a" },

  mapCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#eadfce" },
  mapBox:  { width: "100%", height: 360 } as object,
  mapHint: { fontSize: 12, color: "#8d6b4c", padding: 10, backgroundColor: "#fff" },

  loadingRow:  { flexDirection: "row", gap: 8, alignItems: "center" },
  loadingText: { color: "#8d6b4c", fontSize: 13 },

  section:      { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#2a2118" },
  featRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1, borderColor: "#eadfce", padding: 12,
  },
  featRowOn:  { borderColor: "#8d6b4c", backgroundColor: "#fdf5ea" },
  featKind:   { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  featMeta:   { fontSize: 11, color: "#8d6b4c", marginTop: 2 },
  confirmPill:{ borderRadius: 999, borderWidth: 1, borderColor: "#d9cbbb", paddingHorizontal: 12, paddingVertical: 6 },
  confirmPillOn:  { backgroundColor: "#2d6a3f", borderColor: "#2d6a3f" },
  confirmPillText:{ fontSize: 12, fontWeight: "700", color: "#8d6b4c" },
  confirmPillTextOn:{ color: "#fff" },
  delBtn:  { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f0e8da", alignItems: "center", justifyContent: "center" },
  delText: { color: "#8d6b4c", fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#9b8878", fontStyle: "italic" },

  nextBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 14, maxHeight: "70%",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#2a2118" },
  kindGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kindChip: {
    borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#faf6f0",
  },
  kindChipText: { fontSize: 13, color: "#46392c" },
  cancelBtn:  { alignSelf: "center", paddingVertical: 8 },
  cancelText: { color: "#8d6b4c", textDecorationLine: "underline" },
})
