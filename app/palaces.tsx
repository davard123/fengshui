/**
 * 第 4 步 — 九宫内局（核心页面）
 * 选房间 → 点宫位放置（可多格跨宫），或站在宅中心用罗盘定宫
 * 宫格内同时标注：方位 · 八宅游年星 · 飞星（有建成年份时）
 */
import { router } from "expo-router"
import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { PALACE_INFO, ROOM_INFO, ALL_ROOMS, type RoomType } from "@/lib/fengshui/palaces"
import { computeFlyingStarChart, yearToPeriod } from "@/lib/fengshui/flying-stars"
import { EIGHT_MANSIONS, ENERGY_INFO } from "@/lib/fengshui/bazhai-rules"
import { CompassCheck } from "@/components/CompassCheck"
import { NineGrid } from "@/components/NineGrid"
import { Button, Chip, Em, Notice, Screen, SectionTitle, StepHeader } from "@/components/ui"
import { C } from "@/lib/theme"
import type { PalaceId } from "@/types/fengshui"

/** 方位角 → 宫位（8 个 45° 扇区，N 居 337.5°-22.5°） */
function bearingToPalace(deg: number): PalaceId {
  const dirs: PalaceId[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

// 24山坐山 → 8方位（八宅游年表用）
const MOUNTAIN_TO_DIR8: Record<string, string> = {
  壬: "N", 子: "N", 癸: "N", 丑: "NE", 艮: "NE", 寅: "NE",
  甲: "E", 卯: "E", 乙: "E", 辰: "SE", 巽: "SE", 巳: "SE",
  丙: "S", 午: "S", 丁: "S", 未: "SW", 坤: "SW", 申: "SW",
  庚: "W", 酉: "W", 辛: "W", 戌: "NW", 乾: "NW", 亥: "NW",
}

export default function PalacesScreen() {
  const assessment = useAppStore((s) => s.assessment)
  const placeRoom  = useAppStore((s) => s.placeRoom)

  const [activeRoom, setActiveRoom] = useState<RoomType>("front-door")
  const [compassOpen, setCompassOpen] = useState(false)
  const [lastCompassResult, setLastCompassResult] = useState<string | null>(null)

  const placements  = assessment?.placements ?? []
  const orientation = assessment?.orientation

  const sittingDir8 = orientation ? MOUNTAIN_TO_DIR8[orientation.sittingMountain] : null
  const energies = sittingDir8 ? EIGHT_MANSIONS[sittingDir8] : null

  const flyingChart = useMemo(() => {
    if (!orientation || !assessment?.builtYear) return null
    try {
      return computeFlyingStarChart(yearToPeriod(assessment.builtYear), orientation.sittingMountain, orientation.facingMountain)
    } catch { return null }
  }, [orientation, assessment?.builtYear])

  if (!orientation) {
    return (
      <Screen>
        <Notice tone="warn">请先完成定向。</Notice>
        <Button title="去定向 →" onPress={() => router.replace("/orientation")} />
      </Screen>
    )
  }

  const palacesOfRoom = (room: RoomType): PalaceId[] => {
    const pl = placements.find((p) => p.room === room)
    return pl ? (pl.palaces ?? [pl.primaryPalace]) : []
  }
  const roomsInPalace = (palace: PalaceId): RoomType[] =>
    placements.filter((p) => (p.palaces ?? [p.primaryPalace]).includes(palace)).map((p) => p.room as RoomType)

  // 点宫位 = 切换该宫是否属于当前房间（支持横跨多宫；第一次点的为主宫）
  const tapPalace = (palace: PalaceId) => {
    const cur = palacesOfRoom(activeRoom)
    const next = cur.includes(palace) ? cur.filter((p) => p !== palace) : [...cur, palace]
    placeRoom(activeRoom, next.length > 0 ? next : null)
  }

  // 罗盘定宫：站在太极点，手机指向房间 → bearing → 宫位（设为主宫，已有跨宫保留）
  const onCompassPlace = (deg: number) => {
    const palace = bearingToPalace(deg)
    const cur = palacesOfRoom(activeRoom).filter((p) => p !== palace)
    placeRoom(activeRoom, [palace, ...cur])
    setLastCompassResult(`${ROOM_INFO[activeRoom].label} → ${Math.round(deg)}° → ${PALACE_INFO[palace].label}宫`)
  }

  const keyDone = ["front-door", "master-bedroom"].every((r) => placements.some((p) => p.room === r))
  const activePalaces = palacesOfRoom(activeRoom)

  return (
    <Screen>
      <StepHeader
        step={4}
        title="九宫内局"
        subtitle={<>先在下方选一个房间，再点它所在的宫格（跨多格就点多格）。也可以<Em>站在房子中心，用罗盘指向房间</Em>自动入宫。</>}
      />

      <View style={styles.chips}>
        {ALL_ROOMS.map((room) => {
          const placed = palacesOfRoom(room)
          return (
            <Chip
              key={room}
              icon={ROOM_INFO[room].icon}
              label={`${ROOM_INFO[room].label}${placed.length ? ` · ${placed.map((p) => PALACE_INFO[p].label).join("+")}` : ""}`}
              active={activeRoom === room}
              onPress={() => setActiveRoom(room)}
              style={placed.length && activeRoom !== room ? styles.chipPlaced : undefined}
            />
          )
        })}
      </View>

      <NineGrid
        onPress={tapPalace}
        cellStyle={(p) => activePalaces.includes(p) ? styles.cellActive : null}
        renderCell={(p) => {
          const energy = p !== "CENTER" && energies ? energies[p] : null
          const stars = flyingChart && p !== "CENTER" ? flyingChart.palaces[p] : null
          const rooms = roomsInPalace(p)
          return (
            <>
              {energy && (
                <Text style={[styles.energy, { color: ENERGY_INFO[energy].good ? C.good : C.bad }]}>{energy}</Text>
              )}
              {stars && (
                <Text style={styles.stars}>
                  <Text style={{ color: C.mountainStar }}>{stars.mountain}</Text>
                  {"  "}
                  <Text style={{ color: C.facingStar }}>{stars.facing}</Text>
                </Text>
              )}
              <Text style={styles.roomIcons}>{rooms.map((r) => ROOM_INFO[r].icon).join("")}</Text>
            </>
          )
        }}
      />
      <Text style={styles.legend}>
        宫内：八宅星（绿吉 红凶）{flyingChart ? " · 飞星 山星(金) 向星(蓝)" : ""}
      </Text>

      <Button
        variant="secondary"
        title={`🧭 用罗盘定「${ROOM_INFO[activeRoom].label}」的宫位`}
        onPress={() => setCompassOpen(true)}
      />
      {lastCompassResult && <Notice tone="good">✓ {lastCompassResult}</Notice>}

      <View style={{ gap: 6 }}>
        <SectionTitle>进度</SectionTitle>
        <Text style={styles.progress}>已放置 {placements.length}/{ALL_ROOMS.length} 个房间 · 至少需要大门和主卧</Text>
      </View>

      <Button
        title={keyDone ? "下一步：房间细节 →" : "请至少放置大门和主卧"}
        onPress={() => router.push("/room-detail")}
        disabled={!keyDone}
      />

      <CompassCheck
        visible={compassOpen}
        title={`定「${ROOM_INFO[activeRoom].label}」的宫位`}
        hint={`站到房子的大致中心（太极点），手机水平，屏幕顶端指向「${ROOM_INFO[activeRoom].label}」的方向，待读数稳定后锁定。`}
        onConfirm={onCompassPlace}
        onClose={() => setCompassOpen(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  chips:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipPlaced: { borderColor: C.goldDeep, backgroundColor: "#211a10" },
  cellActive: { borderColor: C.goldBright, borderWidth: 2, backgroundColor: "#2e2414" },
  energy:     { fontSize: 12, fontWeight: "800" },
  stars:      { fontSize: 12, fontWeight: "900" },
  roomIcons:  { fontSize: 14, minHeight: 18 },
  legend:     { fontSize: 11, color: C.textMuted, textAlign: "center" },
  progress:   { fontSize: 13, color: C.textSub },
})
