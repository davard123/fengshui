/**
 * 第 1 步 — 定位房屋
 * 输入地址 → Nominatim 定位 → Overpass 拉建筑轮廓 → 卫星图确认/手描 → 太极点确定
 */
import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Platform, ScrollView, ActivityIndicator,
} from "react-native"
import WebView from "react-native-webview"
import { useAppStore } from "@/store/useAppStore"
import { geocodeAddress, type Coords } from "@/lib/geo/nominatim"
import { fetchBuildingFootprint, manualFootprint, polygonCentroid } from "@/lib/geo/footprint"
import { buildFootprintMapHTML } from "@/lib/geo/map-html"
import type { GeoPoint } from "@/types/fengshui"

export default function AddressScreen() {
  const assessment      = useAppStore((s) => s.assessment)
  const startAssessment = useAppStore((s) => s.startAssessment)
  const setFootprint    = useAppStore((s) => s.setFootprint)

  const [draft, setDraft]       = useState(assessment?.address ?? "")
  const [coords, setCoords]     = useState<Coords | null>(null)
  const [osmPolygon, setOsmPolygon] = useState<GeoPoint[] | null>(null)
  const [mapKey, setMapKey]     = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [notice, setNotice]     = useState("")

  const handleSearch = async () => {
    const q = draft.trim()
    if (!q) return
    setLoading(true)
    setNotice("")
    setCoords(null)
    setOsmPolygon(null)
    setConfirmed(false)

    const c = await geocodeAddress(q)
    if (!c) {
      setNotice("⚠ 找不到该地址，请加上城市/州（如 123 Main St, Irvine CA）")
      setLoading(false)
      return
    }
    startAssessment(q)
    setCoords(c)
    setNotice("正在查找建筑轮廓…")

    const fp = await fetchBuildingFootprint(c)
    if (fp) {
      setOsmPolygon(fp.polygon)
      setNotice("✓ 找到建筑轮廓。地图上确认是你的房子（红点=太极点），不对就点右下角手描")
    } else {
      setNotice("OSM 无此建筑轮廓 — 请在卫星图上沿房屋四角手描（点回起点闭合）")
    }
    setMapKey((k) => k + 1)
    setLoading(false)
  }

  // 接收地图回传（确认轮廓 / 手描完成）
  const handleMapMessage = (raw: string) => {
    let data: any
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw } catch { return }
    if (data.reset) { setConfirmed(false); return }
    if (data.polygon && data.confirmed) {
      const polygon: GeoPoint[] = data.polygon.map((p: { lat: number; lng: number }) => ({
        lat: p.lat, lon: p.lng,
      }))
      const fp = osmPolygon
        ? { center: polygonCentroid(polygon), polygon, facadeNormals: manualFootprint(polygon).facadeNormals, source: "osm" as const }
        : manualFootprint(polygon)
      setFootprint({ center: fp.center, polygon: fp.polygon, source: fp.source })
      setConfirmed(true)
    }
  }

  // Web 平台 iframe postMessage 监听
  useEffect(() => {
    if (Platform.OS !== "web") return
    const handler = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && (e.data.polygon || e.data.reset)) {
        handleMapMessage(JSON.stringify(e.data))
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osmPolygon])

  const mapHtml = coords ? buildFootprintMapHTML(
    { lat: coords.lat, lon: coords.lon },
    osmPolygon,
  ) : null

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>第 1 步 · 定位房屋</Text>
      <Text style={styles.copy}>
        输入地址后，系统在卫星图上找到房屋轮廓并确定<Text style={styles.bold}>宅中心（太极点）</Text>——
        这是后续所有方位判断的唯一原点。
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          value={draft} onChangeText={setDraft}
          onSubmitEditing={handleSearch} returnKeyType="search"
          placeholder="123 Main St, Irvine, CA"
          placeholderTextColor="#bfad9c"
          style={styles.input} autoCapitalize="words" autoCorrect={false}
        />
        <Pressable
          onPress={handleSearch}
          disabled={loading || !draft.trim()}
          style={[styles.searchBtn, (loading || !draft.trim()) && styles.btnDisabled]}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>查找</Text>}
        </Pressable>
      </View>

      {!!notice && (
        <Text style={[styles.notice,
          notice.startsWith("✓") ? styles.noticeGood :
          notice.startsWith("⚠") ? styles.noticeWarn : styles.noticeInfo]}>
          {notice}
        </Text>
      )}

      {mapHtml && (
        <View style={styles.mapCard}>
          {Platform.OS === "web" ? (
            <View style={styles.mapBox}>
              <iframe key={mapKey} srcDoc={mapHtml}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Footprint Map" />
            </View>
          ) : (
            <WebView
              key={mapKey}
              source={{ html: mapHtml }}
              style={styles.mapBox}
              onMessage={(e) => handleMapMessage(e.nativeEvent.data)}
              originWhitelist={["*"]}
              javaScriptEnabled
            />
          )}
        </View>
      )}

      {confirmed && (
        <Pressable onPress={() => router.push("/orientation")} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>太极点已定 · 下一步：定向 →</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 14, flexGrow: 1 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  copy:      { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },
  bold:      { fontWeight: "800", color: "#6b3e1a" },

  searchRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: "#fff", fontSize: 14, color: "#2a2118",
  },
  searchBtn:    { backgroundColor: "#2a2118", borderRadius: 14, paddingHorizontal: 18, justifyContent: "center" },
  btnDisabled:  { backgroundColor: "#bfad9c" },
  searchBtnText:{ color: "#fff", fontWeight: "800", fontSize: 14 },

  notice:     { fontSize: 13, lineHeight: 18 },
  noticeGood: { color: "#2d6a3f" },
  noticeWarn: { color: "#c0392b" },
  noticeInfo: { color: "#5a4a3c" },

  mapCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#eadfce" },
  mapBox:  { width: "100%", height: 420 } as object,

  nextBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
