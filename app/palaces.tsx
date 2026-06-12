/**
 * 第 4 步 — 九宫内局（核心页面）
 * 3×3 正北对齐九宫格覆盖房屋平面 → 选房间芯片 → 点宫位放置
 * 宫位上同时标注：方位 + 八宅游年星 + 飞星（若有建造年代）
 */
import { router } from "expo-router"
import { useMemo, useState } from "react"
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { PALACE_ORDER_GRID, PALACE_INFO, ROOM_INFO, ALL_ROOMS, type RoomType } from "@/lib/fengshui/palaces"
import { computeFlyingStarChart, yearToPeriod } from "@/lib/fengshui/flying-stars"
import type { PalaceId } from "@/types/fengshui"

// 24山坐山 → 8方位（八宅游年表用）
const MOUNTAIN_TO_DIR8: Record<string, string> = {
  壬: "N", 子: "N", 癸: "N", 丑: "NE", 艮: "NE", 寅: "NE",
  甲: "E", 卯: "E", 乙: "E", 辰: "SE", 巽: "SE", 巳: "SE",
  丙: "S", 午: "S", 丁: "S", 未: "SW", 坤: "SW", 申: "SW",
  庚: "W", 酉: "W", 辛: "W", 戌: "NW", 乾: "NW", 亥: "NW",
}

// 游年星速查（与 bazhai-rules.ts 修正后的表一致）
const EIGHT_MANSIONS: Record<string, Record<string, string>> = {
  N:  { N: "伏位", NE: "五鬼", E: "天医", SE: "生气", S: "延年", SW: "绝命", W: "祸害", NW: "六煞" },
  NE: { NE: "伏位", E: "六煞", SE: "绝命", S: "祸害", SW: "生气", W: "延年", NW: "天医", N: "五鬼" },
  E:  { E: "伏位", SE: "延年", S: "生气", SW: "祸害", W: "绝命", NW: "五鬼", N: "天医", NE: "六煞" },
  SE: { SE: "伏位", S: "天医", SW: "五鬼", W: "六煞", NW: "祸害", N: "生气", NE: "绝命", E: "延年" },
  S:  { S: "伏位", SW: "六煞", W: "五鬼", NW: "绝命", N: "延年", NE: "祸害", E: "生气", SE: "天医" },
  SW: { SW: "伏位", W: "天医", NW: "延年", N: "绝命", NE: "生气", E: "祸害", SE: "五鬼", S: "六煞" },
  W:  { W: "伏位", NW: "生气", N: "祸害", NE: "延年", E: "绝命", SE: "六煞", S: "五鬼", SW: "天医" },
  NW: { NW: "伏位", N: "六煞", NE: "天医", E: "五鬼", SE: "祸害", S: "绝命", SW: "延年", W: "生气" },
}
const GOOD_STARS = new Set(["生气", "延年", "天医", "伏位"])

export default function PalacesScreen() {
  const assessment = useAppStore((s) => s.assessment)
  const placeRoom  = useAppStore((s) => s.placeRoom)

  const [activeRoom, setActiveRoom] = useState<RoomType | null>("front-door")

  const placements = assessment?.placements ?? []
  const orientation = assessment?.orientation

  const sittingDir8 = orientation ? MOUNTAIN_TO_DIR8[orientation.sittingMountain] : null
  const energies = sittingDir8 ? EIGHT_MANSIONS[sittingDir8] : null

  const flyingChart = useMemo(() => {
    if (!orientation || !assessment?.builtYear) return null
    try {
      return computeFlyingStarChart(
        yearToPeriod(assessment.builtYear),
        orientation.sittingMountain,
        orientation.facingMountain,
      )
    } catch { return null }
  }, [orientation, assessment?.builtYear])

  if (!orientation) {
    return (
      <View style={styles.container}>
        <Text style={styles.copy}>请先完成定向。</Text>
        <Pressable onPress={() => router.replace("/orientation")} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>去定向 →</Text>
        </Pressable>
      </View>
    )
  }

  const roomsInPalace = (palace: PalaceId): RoomType[] =>
    placements
      .filter((p) => (p.palaces ?? [p.primaryPalace]).includes(palace))
      .map((p) => p.room as RoomType)

  const palacesOfRoom = (room: RoomType): PalaceId[] => {
    const pl = placements.find((p) => p.room === room)
    return pl ? (pl.palaces ?? [pl.primaryPalace]) : []
  }
  const primaryOfRoom = (room: RoomType): PalaceId | null =>
    (placements.find((p) => p.room === room)?.primaryPalace as PalaceId) ?? null

  // 点宫位 = 切换该宫是否属于当前房间（支持横跨多宫；第一次点的为主宫）
  const tapPalace = (palace: PalaceId) => {
    if (!activeRoom) return
    const cur = palacesOfRoom(activeRoom)
    const next = cur.includes(palace)
      ? cur.filter((p) => p !== palace)
      : [...cur, palace]
    placeRoom(activeRoom, next.length > 0 ? next : null)
  }

  const placedCount = placements.length
  const keyDone = ["front-door", "master-bedroom"].every((r) => placements.some((p) => p.room === r))

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>第 4 步 · 九宫内局</Text>
      <Text style={styles.copy}>
        想象俯视你的房子（上=北），九宫格盖在平面图上。
        <Text style={styles.bold}>先点下方房间，再点它所在的宫位格。</Text>
        大门和主卧最重要，必放。
      </Text>

      {/* ── 九宫格 ── */}
      <View style={styles.grid}>
        {PALACE_ORDER_GRID.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((palace) => {
              const info = PALACE_INFO[palace]
              const energy = palace !== "CENTER" && energies ? energies[palace] : null
              const stars = flyingChart && palace !== "CENTER" ? flyingChart.palaces[palace] : null
              const rooms = roomsInPalace(palace)
              const activeHere = activeRoom && palacesOfRoom(activeRoom).includes(palace)
              const isPrimaryHere = activeRoom && primaryOfRoom(activeRoom) === palace
              return (
                <Pressable
                  key={palace}
                  onPress={() => tapPalace(palace)}
                  style={[
                    styles.cell,
                    palace === "CENTER" && styles.cellCenter,
                    activeHere && styles.cellActive,
                  ]}
                >
                  <Text style={styles.cellDir}>{info.label}</Text>
                  {energy && (
                    <Text style={[styles.cellEnergy, GOOD_STARS.has(energy) ? styles.energyGood : styles.energyBad]}>
                      {energy}
                    </Text>
                  )}
                  {stars && (
                    <Text style={styles.cellStars}>{stars.mountain} {stars.facing}</Text>
                  )}
                  <View style={styles.cellRooms}>
                    {rooms.map((r) => (
                      <Text key={r} style={styles.cellRoomIcon}>{ROOM_INFO[r].icon}</Text>
                    ))}
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
      <Text style={styles.gridLegend}>
        宫格内：方位 · 八宅星{flyingChart ? " · 飞星(山 向)" : ""}　绿=吉星 红=凶星
      </Text>

      {/* ── 房间芯片 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择房间（{placedCount}/{ALL_ROOMS.length} 已放置）</Text>
        <View style={styles.chipGrid}>
          {ALL_ROOMS.map((room) => {
            const info = ROOM_INFO[room]
            const placedList = palacesOfRoom(room)
            const placed = placedList.length > 0 ? placedList[0] : null
            const active = activeRoom === room
            return (
              <Pressable
                key={room}
                onPress={() => setActiveRoom(room)}
                style={[styles.chip, placed && styles.chipPlaced, active && styles.chipActive]}
              >
                <Text style={styles.chipIcon}>{info.icon}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {info.label}{placed ? ` · ${placedList.map((pp) => PALACE_INFO[pp].label).join("+")}` : ""}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/room-detail")}
        disabled={!keyDone}
        style={[styles.nextBtn, !keyDone && styles.btnDisabled]}
      >
        <Text style={styles.nextBtnText}>
          {keyDone ? "下一步：房间细节 →" : "请至少放置大门和主卧"}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 14, flexGrow: 1 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  copy:      { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },
  bold:      { fontWeight: "800", color: "#6b3e1a" },

  grid:    { gap: 6 },
  gridRow: { flexDirection: "row", gap: 6 },
  cell: {
    flex: 1, aspectRatio: 1,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#eadfce",
    alignItems: "center", justifyContent: "center", gap: 2,
    padding: 4,
  },
  cellCenter: { backgroundColor: "#fdf5ea", borderColor: "#e3d0b0" },
  cellActive: { borderColor: "#6b3e1a", borderWidth: 2.5, backgroundColor: "#fdf0dc" },
  cellDir:    { fontSize: 13, fontWeight: "800", color: "#2a2118" },
  cellEnergy: { fontSize: 11, fontWeight: "700" },
  energyGood: { color: "#2d6a3f" },
  energyBad:  { color: "#c0392b" },
  cellStars:  { fontSize: 10, color: "#8d6b4c" },
  cellRooms:  { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", minHeight: 18 },
  cellRoomIcon: { fontSize: 14 },
  gridLegend: { fontSize: 11, color: "#9b8878", textAlign: "center" },

  section:      { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#2a2118" },
  chipGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#d9cbbb", borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff",
  },
  chipPlaced: { backgroundColor: "#fdf5ea", borderColor: "#8d6b4c" },
  chipActive: { backgroundColor: "#2a2118", borderColor: "#2a2118" },
  chipIcon:   { fontSize: 15 },
  chipLabel:  { fontSize: 13, fontWeight: "700", color: "#46392c" },
  chipLabelActive: { color: "#f0d060" },

  nextBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  btnDisabled: { backgroundColor: "#bfad9c" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
