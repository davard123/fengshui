/**
 * 第 1 步 — 定位房屋
 * 输入地址 → Nominatim 定位 → Overpass 拉建筑轮廓 → 卫星图确认/手描 → 太极点确定
 * 公寓或地图找不到时：可跳过地图，直接到第 2 步用罗盘定向（外局改为手动添加）
 */
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { View, Text, Platform, StyleSheet } from "react-native"
import WebView from "react-native-webview"
import { useAppStore } from "@/store/useAppStore"
import { geocodeAddress, type Coords } from "@/lib/geo/nominatim"
import { fetchBuildingFootprint, manualFootprint, polygonCentroid } from "@/lib/geo/footprint"
import { buildFootprintMapHTML } from "@/lib/geo/map-html"
import { Button, Card, Em, Field, Notice, Screen, StepHeader } from "@/components/ui"
import { C } from "@/lib/theme"
import type { GeoPoint } from "@/types/fengshui"

type Tone = "info" | "good" | "bad"

export default function AddressScreen() {
  const assessment      = useAppStore((s) => s.assessment)
  const startAssessment = useAppStore((s) => s.startAssessment)
  const setFootprint    = useAppStore((s) => s.setFootprint)

  const [draft, setDraft]           = useState(assessment?.address ?? "")
  const [coords, setCoords]         = useState<Coords | null>(null)
  const [osmPolygon, setOsmPolygon] = useState<GeoPoint[] | null>(null)
  const [mapKey, setMapKey]         = useState(0)
  const [confirmed, setConfirmed]   = useState(!!assessment?.footprint)
  const [loading, setLoading]       = useState(false)
  const [notice, setNotice]         = useState<{ tone: Tone; text: string } | null>(null)

  const handleSearch = async () => {
    const q = draft.trim()
    if (!q) return
    setLoading(true)
    setNotice(null)
    setCoords(null)
    setOsmPolygon(null)
    setConfirmed(false)

    const c = await geocodeAddress(q)
    if (!c) {
      setNotice({ tone: "bad", text: "找不到这个地址。请加上城市和州/省（如 123 Main St, Irvine, CA），或使用下方「跳过地图」。" })
      setLoading(false)
      return
    }
    startAssessment(q)
    setCoords(c)
    setNotice({ tone: "info", text: "正在查找建筑轮廓…" })

    const fp = await fetchBuildingFootprint(c)
    if (fp) {
      setOsmPolygon(fp.polygon)
      setNotice({ tone: "good", text: "找到建筑轮廓。请在地图上确认是你的房子（红点为宅中心），不对可点右下角手描。" })
    } else {
      setNotice({ tone: "info", text: "地图数据里没有这栋房子的轮廓 —— 请在卫星图上沿房屋外墙四角依次点击，回到起点闭合。" })
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

  const skipMap = () => {
    startAssessment(draft.trim() || "我的住宅")
    router.push("/orientation")
  }

  const mapHtml = coords ? buildFootprintMapHTML({ lat: coords.lat, lon: coords.lon }, osmPolygon) : null

  return (
    <Screen>
      <StepHeader
        step={1}
        title="定位房屋"
        subtitle={<>输入地址，在卫星图上找到房屋轮廓，确定<Em>宅中心（太极点）</Em>——之后所有方位都从这一点量起。</>}
      />

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <Field
            value={draft} onChangeText={setDraft}
            onSubmitEditing={handleSearch} returnKeyType="search"
            placeholder="123 Main St, Irvine, CA"
            autoCapitalize="words" autoCorrect={false}
            style={{ fontSize: 15 }}
          />
        </View>
        <Button title="查找" onPress={handleSearch} loading={loading} disabled={!draft.trim()} style={styles.searchBtn} />
      </View>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

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
        <>
          <Notice tone="good">✓ 太极点已确定</Notice>
          <Button title="下一步：定向 →" onPress={() => router.push("/orientation")} />
        </>
      )}

      {!confirmed && (
        <Card>
          <Text style={styles.altTitle}>住公寓，或地图上找不到？</Text>
          <Text style={styles.altText}>
            可以跳过地图，直接到大门口用手机罗盘测朝向。周边环境改为手动添加，其余分析不受影响。
          </Text>
          <Button title="跳过地图，用罗盘定向" variant="secondary" small onPress={skipMap} />
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  searchBtn: { minWidth: 76 },
  mapCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.line },
  mapBox:  { width: "100%", height: 420 } as object,
  altTitle:{ fontSize: 14, fontWeight: "800", color: C.text },
  altText: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
})
