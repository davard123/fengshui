/**
 * 第 3 步 — 外局（峦头）
 * 有宅中心：三距离环地图 + Overpass 自动识别地物 → 用户逐项确认/补充（点地图添加）
 * 无地图（公寓模式）：按「方位 + 距离」手动添加
 * 几何敏感格局（路冲/反弓/玉带/天斩）自动识别不了，必须人工添加
 */
import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  Platform, ActivityIndicator, Modal,
} from "react-native"
import WebView from "react-native-webview"
import { useAppStore } from "@/store/useAppStore"
import { queryExternalFeaturesV3, rawToExternalFeature } from "@/lib/geo/overpass"
import { buildExteriorMapHTML } from "@/lib/geo/map-html"
import { distanceToRing, bearingToRelative, severityBaseOf, RELATIVE_LABEL, RING_CONFIG, type DistanceRing } from "@/lib/fengshui/palaces"
import { Button, Chip, Notice, Screen, SectionTitle, StepHeader } from "@/components/ui"
import { C } from "@/lib/theme"
import type { ExternalFeatureV3 } from "@/types/fengshui"

// 手动补充时可选的地物类型（含几何敏感型）
const MANUAL_KINDS = [
  "T字路口正对", "弯道朝向大门(玉带)", "弯道背离大门(反弓)", "两楼夹缝(天斩)",
  "尖顶/尖角建筑", "高速公路", "主干道", "水(湖河海)", "小溪水渠",
  "山/高地", "高楼", "低矮建筑", "空地/开阔", "树林", "墓地", "高压线", "加油站",
]

const DIR8: { label: string; deg: number }[] = [
  { label: "北", deg: 0 }, { label: "东北", deg: 45 }, { label: "东", deg: 90 }, { label: "东南", deg: 135 },
  { label: "南", deg: 180 }, { label: "西南", deg: 225 }, { label: "西", deg: 270 }, { label: "西北", deg: 315 },
]
const RING_DISTANCE: Record<DistanceRing, number> = { near: 30, mid: 120, far: 500 }

export default function ExteriorScreen() {
  const assessment  = useAppStore((s) => s.assessment)
  const setFeatures = useAppStore((s) => s.setExternalFeatures)
  const upsert      = useAppStore((s) => s.upsertExternalFeature)
  const remove      = useAppStore((s) => s.removeExternalFeature)

  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded]   = useState(false)
  // 添加弹层：tap = 地图点选（已有方位距离）；manual = 需要选方位距离
  const [sheet, setSheet] = useState<
    | { mode: "tap"; bearing: number; distance: number }
    | { mode: "manual" }
    | null
  >(null)
  const [pickDir, setPickDir]   = useState<number | null>(null)
  const [pickRing, setPickRing] = useState<DistanceRing | null>(null)

  const center   = assessment?.footprint?.center
  const facing   = assessment?.orientation?.facingDegree ?? 0
  const features = assessment?.external ?? []

  // 首次进入自动查询
  useEffect(() => {
    if (!center || loaded || features.length > 0) { setLoaded(true); return }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const raw = await queryExternalFeaturesV3(center)
      if (cancelled) return
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

  const handleMapMessage = (raw: string) => {
    let data: any
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw } catch { return }
    if (data.tapAdd) setSheet({ mode: "tap", bearing: data.tapAdd.bearing, distance: data.tapAdd.distance })
  }

  useEffect(() => {
    if (Platform.OS !== "web") return
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && e.data.tapAdd) handleMapMessage(JSON.stringify(e.data))
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const closeSheet = () => { setSheet(null); setPickDir(null); setPickRing(null) }

  const addKind = (kind: string) => {
    if (!sheet) return
    let bearing: number, distance: number
    if (sheet.mode === "tap") {
      bearing = sheet.bearing; distance = sheet.distance
    } else {
      if (pickDir == null || !pickRing) return
      bearing = pickDir; distance = RING_DISTANCE[pickRing]
    }
    const ring = distanceToRing(distance, kind)
    if (!ring) { closeSheet(); return }
    upsert({
      id: `manual-${Date.now()}`,
      kind,
      bearingFromCenter: bearing,
      distance: Math.round(distance),
      ring,
      relative: bearingToRelative(bearing, facing),
      source: "manual",
      confirmed: true,
      severityBase: severityBaseOf(kind),
    })
    closeSheet()
  }

  if (!assessment?.orientation) {
    return (
      <Screen>
        <Notice tone="warn">请先完成定位与定向。</Notice>
        <Button title="返回定向 →" onPress={() => router.replace("/orientation")} />
      </Screen>
    )
  }

  const mapHtml = center ? buildExteriorMapHTML(
    center, facing,
    features.map((f) => {
      // 用方位角+距离反推坐标（仅显示用）
      const rad = f.bearingFromCenter * Math.PI / 180
      const lat = center.lat + (f.distance / 110540) * Math.cos(rad)
      const lon = center.lon + (f.distance / (111320 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(rad)
      return { id: f.id, kind: f.kind, lat, lon }
    }),
  ) : null

  const sorted = [...features].sort((a, b) => a.distance - b.distance)
  const manualReady = sheet?.mode === "tap" || (pickDir != null && !!pickRing)

  return (
    <Screen>
      <StepHeader
        step={3}
        title="外局形势"
        subtitle="以宅中心为原点看三个距离环：近 50m、中 200m、远 1km。距离越近影响越大；自动识别的地物需你确认后才参与判定。"
      />

      {mapHtml ? (
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
          <Text style={styles.mapHint}>💡 路冲、反弓、玉带、天斩这类形态无法自动识别 —— 点击地图上的位置手动添加</Text>
        </View>
      ) : (
        <Notice tone="info">未使用地图定位：请按实际情况手动添加周边的道路、水体、高楼等。没有明显地物也可直接下一步。</Notice>
      )}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={C.gold} />
          <Text style={styles.loadingText}>正在识别周边地物…</Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <SectionTitle right={<Text style={styles.count}>{features.filter((f) => f.confirmed).length}/{features.length} 已确认</Text>}>
          周边地物
        </SectionTitle>
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
              style={[styles.pill, f.confirmed && styles.pillOn]}
            >
              <Text style={[styles.pillText, f.confirmed && styles.pillTextOn]}>{f.confirmed ? "✓ 已确认" : "确认"}</Text>
            </Pressable>
            <Pressable onPress={() => remove(f.id)} style={styles.delBtn} hitSlop={8}>
              <Text style={styles.delText}>×</Text>
            </Pressable>
          </View>
        ))}
        {features.length === 0 && !loading && (
          <Text style={styles.emptyText}>暂无地物。</Text>
        )}
        <Button small variant="secondary" title="＋ 按方位手动添加" onPress={() => setSheet({ mode: "manual" })} />
      </View>

      <Button title="下一步：九宫内局 →" onPress={() => router.push("/palaces")} />

      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={{ gap: 14 }}>
              <Text style={styles.sheetTitle}>
                {sheet?.mode === "tap" ? `这个位置是什么？（约 ${Math.round(sheet.distance)}m）` : "添加周边地物"}
              </Text>

              {sheet?.mode === "manual" && (
                <>
                  <Text style={styles.sheetLabel}>在房子的哪个方位？</Text>
                  <View style={styles.wrap}>
                    {DIR8.map((d) => (
                      <Chip key={d.label} label={d.label} active={pickDir === d.deg} onPress={() => setPickDir(d.deg)} />
                    ))}
                  </View>
                  <Text style={styles.sheetLabel}>大约多远？</Text>
                  <View style={styles.wrap}>
                    {(Object.keys(RING_CONFIG) as DistanceRing[]).map((r) => (
                      <Chip key={r} label={RING_CONFIG[r].label} active={pickRing === r} onPress={() => setPickRing(r)} />
                    ))}
                  </View>
                  <Text style={styles.sheetLabel}>是什么？</Text>
                </>
              )}

              <View style={[styles.wrap, !manualReady && { opacity: 0.4 }]}>
                {MANUAL_KINDS.map((k) => (
                  <Chip key={k} label={k} onPress={manualReady ? () => addKind(k) : undefined} />
                ))}
              </View>
              <Button small variant="ghost" title="取消" onPress={closeSheet} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  mapCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  mapBox:  { width: "100%", height: 360 } as object,
  mapHint: { fontSize: 12, color: C.textSub, padding: 10 },

  loadingRow:  { flexDirection: "row", gap: 8, alignItems: "center" },
  loadingText: { color: C.textSub, fontSize: 13 },
  count: { fontSize: 12, color: C.textMuted },

  featRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.line, padding: 12,
  },
  featRowOn: { borderColor: C.goldDeep, backgroundColor: "#211a10" },
  featKind:  { fontSize: 14, fontWeight: "800", color: C.text },
  featMeta:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  pill:      { borderRadius: 999, borderWidth: 1, borderColor: C.lineStrong, paddingHorizontal: 12, paddingVertical: 6 },
  pillOn:    { backgroundColor: "#2c4a38", borderColor: "#2c4a38" },
  pillText:  { fontSize: 12, fontWeight: "700", color: C.textSub },
  pillTextOn:{ color: C.good },
  delBtn:  { width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface2, alignItems: "center", justifyContent: "center" },
  delText: { color: C.textMuted, fontWeight: "700" },
  emptyText: { fontSize: 13, color: C.textMuted, fontStyle: "italic" },

  backdrop: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: C.line, padding: 20, paddingBottom: 34, maxHeight: "80%",
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  sheetLabel: { fontSize: 13, fontWeight: "700", color: C.textSub },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
