/**
 * 流年飞星 — 年星九宫 + 五黄/二黑/太岁/岁破/三煞；有当前评估时标出受影响的房间
 */
import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { computeAnnualChart, annualNotes, ANNUAL_STAR_INFO } from "@/lib/fengshui/annual-stars"
import { ROOM_INFO, type RoomType } from "@/lib/fengshui/palaces"
import { Card, Chip, Notice, Screen, SectionTitle } from "@/components/ui"
import { NineGrid } from "@/components/NineGrid"
import { C } from "@/lib/theme"

export default function AnnualScreen() {
  const assessment = useAppStore((s) => s.assessment)
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)

  const chart = useMemo(() => computeAnnualChart(year), [year])
  const placements = (assessment?.placements ?? []).map((p) => ({
    room: p.room, palaces: p.palaces ?? [p.primaryPalace],
  }))
  const notes = annualNotes(chart, placements, (r) => ROOM_INFO[r as RoomType]?.label ?? r)

  return (
    <Screen>
      <View style={styles.years}>
        {[thisYear, thisYear + 1].map((y) => (
          <Chip key={y} label={`${y} 年`} active={y === year} onPress={() => setYear(y)} style={{ flex: 1, justifyContent: "center" }} />
        ))}
      </View>

      <Card tone="gold" style={{ alignItems: "center", gap: 4 }}>
        <Text style={styles.ganzhi}>{chart.ganzhi}年 · 属{chart.zodiac}</Text>
        <Text style={styles.center}>{ANNUAL_STAR_INFO[chart.centerStar].name}入中宫</Text>
      </Card>

      <Card>
        <SectionTitle>流年九宫</SectionTitle>
        <NineGrid
          cellStyle={(p) => {
            const s = chart.palaces[p]
            if (p === "CENTER") return null
            if (s === 5 || s === 2) return { backgroundColor: C.badBg, borderColor: "#5a2c20" }
            if (ANNUAL_STAR_INFO[s].good) return { backgroundColor: C.goodBg, borderColor: "#2c4a38" }
            return null
          }}
          renderCell={(p) => {
            const s = chart.palaces[p]
            const info = ANNUAL_STAR_INFO[s]
            const rooms = placements.filter((pl) => pl.palaces.includes(p)).map((pl) => ROOM_INFO[pl.room as RoomType]?.icon ?? "")
            return (
              <>
                <Text style={[styles.star, { color: s === 5 || s === 2 ? C.bad : info.good ? C.good : C.warn }]}>{info.short}</Text>
                {p === chart.taisui.palace && <Text style={styles.tag}>太岁</Text>}
                {p === chart.suipo.palace && <Text style={styles.tag}>岁破</Text>}
                {rooms.length > 0 && <Text style={styles.rooms}>{rooms.join("")}</Text>}
              </>
            )
          }}
        />
        {placements.length > 0
          ? <Text style={styles.small}>图标为当前评估「{assessment?.address}」的房间位置</Text>
          : <Text style={styles.small}>完成一次勘宅后，这里会标出你家每个房间今年遇到的星</Text>}
      </Card>

      <Card>
        <SectionTitle>今年注意</SectionTitle>
        {notes.map((n, i) => (
          <Text key={i} style={[styles.note, { color: n.good ? C.good : C.textSub }]}>
            {n.good ? "✓" : "⚠"} {n.text}
          </Text>
        ))}
      </Card>

      <Card>
        <SectionTitle>九星速查</SectionTitle>
        {Object.entries(ANNUAL_STAR_INFO).map(([k, v]) => (
          <View key={k} style={styles.legendRow}>
            <Text style={[styles.legendStar, { color: v.good ? C.good : C.bad }]}>{v.name}</Text>
            <Text style={styles.legendText}>{v.meaning}</Text>
          </View>
        ))}
      </Card>

      <Notice tone="info">流年以立春（约 2 月 4 日）交接，1 月至立春前仍按上一年的星盘看。</Notice>
    </Screen>
  )
}

const styles = StyleSheet.create({
  years:  { flexDirection: "row", gap: 10 },
  ganzhi: { fontSize: 22, fontWeight: "900", color: C.goldBright, letterSpacing: 2 },
  center: { fontSize: 13, color: C.textSub },
  star:   { fontSize: 17, fontWeight: "900" },
  tag:    { fontSize: 9, color: C.warn, fontWeight: "800" },
  rooms:  { fontSize: 12 },
  small:  { fontSize: 11, color: C.textMuted, textAlign: "center" },
  note:   { fontSize: 13, lineHeight: 20 },
  legendRow:  { flexDirection: "row", gap: 10 },
  legendStar: { width: 72, fontSize: 13, fontWeight: "800" },
  legendText: { flex: 1, fontSize: 12, color: C.textMuted },
})
