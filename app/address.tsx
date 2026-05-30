import { router } from "expo-router"
import { useState, useEffect } from "react"
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Platform, Linking, ScrollView, ActivityIndicator,
} from "react-native"
import WebView from "react-native-webview"
import { useAppStore } from "@/store/useAppStore"
import { calcKuaGroup, calcKuaNumber } from "@/lib/fengshui/kua-number"
import { geocodeAddress, type Coords } from "@/lib/geo/nominatim"
import {
  querySurroundings, surroundingToDirectionEntries, formatDirectionFeatures,
  type Dir8, type SurroundingFeature,
} from "@/lib/geo/overpass"
import { buildDoorPickerHTML } from "@/lib/geo/door-picker-html"
import { ElementPicker } from "@/components/ElementPicker"
import { getElementsForPoint } from "@/lib/fengshui/elements"
import type { StandingPoint } from "@/types/fengshui"

const ALL_DIRS: Dir8[] = ["N","NE","E","SE","S","SW","W","NW"]
const DIR_LABELS: Record<Dir8, string> = {
  N:"北", NE:"东北", E:"东", SE:"东南", S:"南", SW:"西南", W:"西", NW:"西北",
}

function degToCardinal(deg: number): Dir8 {
  return ALL_DIRS[Math.round(deg / 45) % 8]
}

export default function AddressScreen() {
  const address     = useAppStore((s) => s.address)
  const profile     = useAppStore((s) => s.profile)
  const setAddress  = useAppStore((s) => s.setAddress)
  const setProfile  = useAppStore((s) => s.setProfile)
  const commitPoint = useAppStore((s) => s.commitCurrentPoint)
  const clearPoints = useAppStore((s) => s.clearStandingPoints)

  const [draft,        setDraft]        = useState(address)
  const [coords,       setCoords]       = useState<Coords | null>(null)
  const [doorCoords,   setDoorCoords]   = useState<Coords | null>(null)
  const [bearing,      setBearing]      = useState<number | null>(null)
  const [cardinal,     setCardinal]     = useState<Dir8 | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [notice,       setNotice]       = useState("")

  const [dirData, setDirData] = useState<Record<Dir8, string[]>>({
    N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[],
  })
  const [surroundFeatures, setSurroundFeatures] = useState<Record<Dir8, SurroundingFeature[]>>({
    N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[],
  })
  const [pickerDir, setPickerDir] = useState<Dir8 | null>(null)

  const outdoorElements = getElementsForPoint("outdoor")

  // Web 平台监听 iframe postMessage（原生 WebView 走 onMessage 不走这里）
  useEffect(() => {
    if (Platform.OS !== "web") return
    const handler = (e: MessageEvent) => {
      const data = e.data
      if (!data || typeof data !== "object") return
      if (data.reset || (data.door && data.bearing != null)) {
        // 模拟 RN WebView 的事件结构
        handleDoorMessage({ nativeEvent: { data: JSON.stringify(data) } })
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 搜索地址 ────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const q = draft.trim()
    if (!q) return
    setLoading(true)
    setNotice("")
    setCoords(null)
    setDoorCoords(null)
    setBearing(null)
    setCardinal(null)
    setAddress(q)

    const c = await geocodeAddress(q)
    if (!c) {
      setNotice("找不到该地址，请加上城市/州（如 123 Main St, Sunnyvale CA）")
      setLoading(false)
      return
    }
    setCoords(c)
    setNotice("✓ 地图已加载。请在地图上：① 点击大门位置  ② 点击门面朝的方向")
    setLoading(false)
  }

  // ── 接收门拾取器结果 + 重新查询周边 ─────────────────────────────────────────
  const handleDoorMessage = async (event: any) => {
    let data: any
    try { data = JSON.parse(event.nativeEvent.data) } catch { return }
    if (data.reset) {
      setDoorCoords(null); setBearing(null); setCardinal(null)
      setDirData({ N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[] })
      setSurroundFeatures({ N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[] })
      return
    }
    if (data.door && data.bearing != null) {
      const door = { lat: data.door.lat, lon: data.door.lng }
      setDoorCoords(door)
      setBearing(data.bearing)
      setCardinal(data.cardinal as Dir8)

      // 使用门的精确位置重新查询周边
      setNotice("正在以大门位置为中心查询 500m 周边地物…")
      try {
        const result = await querySurroundings(door, 500)
        const stringData: Record<Dir8, string[]> = {
          N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[],
        }
        for (const dir of ALL_DIRS) {
          stringData[dir] = result.directions[dir].map((f) => f.element)
        }
        const filled = Object.values(stringData).flat().length
        setDirData(stringData)
        setSurroundFeatures(result.directions)
        setNotice(filled > 0
          ? `✓ 以大门为中心识别到 ${filled} 个地物（按距离排序）`
          : "周边 OSM 数据较少，请手动标记")
      } catch {
        setNotice("⚠ 周边查询失败，可手动标记")
      }
    }
  }

  // ── 方向元素手动编辑 ────────────────────────────────────────────────────────
  const handlePickerConfirm = (selected: string[]) => {
    if (!pickerDir) return
    setDirData((prev) => ({ ...prev, [pickerDir]: selected }))
  }

  // ── 确认进入室内勘察 ───────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!doorCoords || bearing == null || !cardinal) return

    if (!profile) {
      const kua = calcKuaNumber(1990, "male")
      setProfile({
        birthYear:1990, gender:"male", birthDetails:"快速模式（未填真实信息）",
        kuaNumber:kua, kuaGroup:calcKuaGroup(kua), isQuickMode: true,
      })
    }

    clearPoints()

    const finalDirs: Record<Dir8, SurroundingFeature[]> = {
      N:[], NE:[], E:[], SE:[], S:[], SW:[], W:[], NW:[],
    }
    for (const dir of ALL_DIRS) {
      finalDirs[dir] = dirData[dir].map((el) => ({ element: el, distance: 100 }))
    }
    const directions = surroundingToDirectionEntries({
      directions: finalDirs, warnings: [],
    })

    const outdoorPoint: StandingPoint = {
      id: `outdoor-${Date.now()}`,
      type: "outdoor", label: "室外大门", theme: "整体外部格局",
      compassDegree:    bearing,     // 精确角度（不再是 8 等分）
      compassDirection: cardinal,    // 衍生的 8 方位标签
      precision: "8方位",
      directions,
    }
    commitPoint(outdoorPoint)
    router.push("/point-select")
  }

  const canConfirm = !!doorCoords && bearing != null

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>房产地址</Text>
      <Text style={styles.copy}>
        输入地址后在地图上：① 点大门位置 ② 点门面朝的方向（如门外的路、院门），
        系统会以大门为中心精确分析周边。
      </Text>

      {/* 搜索 */}
      <View style={styles.searchRow}>
        <TextInput
          value={draft} onChangeText={setDraft}
          onSubmitEditing={handleSearch} returnKeyType="search"
          placeholder="123 Main St, Sunnyvale, CA"
          placeholderTextColor="#bfad9c"
          style={styles.input} autoCapitalize="words" autoCorrect={false}
        />
        <Pressable
          onPress={handleSearch}
          disabled={loading || !draft.trim()}
          style={[styles.searchBtn, (loading || !draft.trim()) && styles.btnDisabled]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small"/>
            : <Text style={styles.searchBtnText}>查找</Text>}
        </Pressable>
      </View>

      {!!notice && (
        <Text style={[
          styles.notice,
          notice.startsWith("✓") ? styles.noticeGood :
          notice.startsWith("⚠") ? styles.noticeWarn : styles.noticeInfo,
        ]}>{notice}</Text>
      )}

      {/* 大门标记地图 */}
      {coords && (
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapAddr} numberOfLines={1}>{address}</Text>
            {bearing != null && (
              <View style={styles.bearingBadge}>
                <Text style={styles.bearingText}>
                  朝向 {Math.round(bearing)}° {cardinal && `· ${DIR_LABELS[cardinal]}`}
                </Text>
              </View>
            )}
          </View>

          {Platform.OS === "web" ? (
            <View style={styles.mapBox}>
              <iframe
                srcDoc={buildDoorPickerHTML(coords.lat, coords.lon)}
                style={{ width:"100%", height:"100%", border:"none" }}
                title="Door Picker"
              />
            </View>
          ) : (
            <WebView
              source={{ html: buildDoorPickerHTML(coords.lat, coords.lon) }}
              style={styles.mapBox}
              onMessage={handleDoorMessage}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
            />
          )}

          <Text style={styles.mapHint}>
            🚪 大门位置 + 📍 面朝方向 = 精确朝向角度
          </Text>
        </View>
      )}

      {/* 各方向标记（以大门为中心） */}
      {doorCoords && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>大门周边 500m 各方向地物</Text>
          </View>
          <Text style={styles.sectionHint}>
            自动识别后可点击调整。距离 = 与大门的实际距离。
          </Text>

          <View style={styles.dirMarkGrid}>
            {ALL_DIRS.map((dir) => {
              const els = dirData[dir]
              const features = surroundFeatures[dir]
              const hasDat = els.length > 0
              const isFacingDir = cardinal === dir
              return (
                <Pressable key={dir}
                  onPress={() => setPickerDir(dir)}
                  style={[
                    styles.markBtn,
                    hasDat && styles.markBtnFilled,
                    isFacingDir && styles.markBtnFacing,
                  ]}
                >
                  <Text style={[
                    styles.markDir,
                    hasDat && styles.markDirFilled,
                    isFacingDir && styles.markDirFacing,
                  ]}>
                    {DIR_LABELS[dir]} {isFacingDir && "(朝向)"}
                  </Text>
                  {features && features.length > 0 ? (
                    <Text style={styles.markEls} numberOfLines={2}>
                      {formatDirectionFeatures(features)}
                    </Text>
                  ) : hasDat ? (
                    <Text style={styles.markEls} numberOfLines={1}>{els.join(" · ")}</Text>
                  ) : (
                    <Text style={styles.markEmpty}>点击标记</Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>
      )}

      {coords && (
        <Pressable
          onPress={handleConfirm}
          disabled={!canConfirm}
          style={[styles.confirmBtn, !canConfirm && styles.btnDisabled]}
        >
          <Text style={styles.confirmBtnText}>
            {!doorCoords ? "请在地图上标记大门位置" :
             bearing == null ? "请标记大门面朝方向" :
             "确认，开始室内勘察 →"}
          </Text>
        </Pressable>
      )}

      <ElementPicker
        visible={!!pickerDir}
        direction={pickerDir ? DIR_LABELS[pickerDir] : ""}
        elementGroups={outdoorElements}
        selected={pickerDir ? (dirData[pickerDir] ?? []) : []}
        onConfirm={handlePickerConfirm}
        onClose={() => setPickerDir(null)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { padding: 24, backgroundColor: "#fffaf3", gap: 14, flexGrow: 1 },
  title:        { fontSize: 28, fontWeight: "800", color: "#2a2118" },
  copy:         { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },

  searchRow:    { flexDirection: "row", gap: 10 },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: "#fff", fontSize: 14, color: "#2a2118",
  },
  searchBtn:    { backgroundColor: "#2a2118", borderRadius: 14, paddingHorizontal: 18, justifyContent: "center" },
  btnDisabled:  { backgroundColor: "#bfad9c" },
  searchBtnText:{ color: "#fff", fontWeight: "800", fontSize: 14 },

  notice:       { fontSize: 13, lineHeight: 18, paddingVertical: 6 },
  noticeGood:   { color: "#2d6a3f" },
  noticeWarn:   { color: "#c0392b" },
  noticeInfo:   { color: "#5a4a3c" },

  mapCard:      { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#eadfce" },
  mapHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                   padding: 12, backgroundColor: "#fff", gap: 8 },
  mapAddr:      { fontSize: 13, fontWeight: "700", color: "#2a2118", flex: 1 },
  bearingBadge: { backgroundColor: "#2a2118", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  bearingText:  { color: "#f0d060", fontSize: 12, fontWeight: "800" },
  mapBox:       { width: "100%", height: 380 } as any,
  mapHint:      { fontSize: 12, color: "#8d6b4c", padding: 10, backgroundColor: "#fffaf3" },

  section:      { gap: 8 },
  sectionHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#2a2118" },
  sectionHint:  { fontSize: 12, color: "#8d6b4c" },

  dirMarkGrid:  { gap: 8 },
  markBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#eadfce",
  },
  markBtnFilled:{ borderColor: "#8d6b4c", backgroundColor: "#fdf5ea" },
  markBtnFacing:{ borderColor: "#cc2200", borderWidth: 2, backgroundColor: "#fff5f0" },
  markDir:      { fontSize: 14, fontWeight: "800", color: "#8d6b4c", width: 80 },
  markDirFilled:{ color: "#2a2118" },
  markDirFacing:{ color: "#cc2200" },
  markEls:      { fontSize: 12, color: "#5a4a3c", flex: 1 },
  markEmpty:    { fontSize: 12, color: "#bfad9c", flex: 1 },

  confirmBtn: {
    backgroundColor: "#2a2118", paddingVertical: 16,
    borderRadius: 16, alignItems: "center", marginTop: 4,
  },
  confirmBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
