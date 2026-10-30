/**
 * 个人吉凶方 — 命卦 → 八方游年星 + 罗盘方位图 + 生活用法
 */
import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg"
import { useAppStore } from "@/store/useAppStore"
import { isQuickModeProfile } from "@/lib/fengshui/quickmode"
import { personalDirections, type PersonalDirection } from "@/lib/fengshui/personal"
import { Button, Card, Screen, SectionTitle } from "@/components/ui"
import { LuopanMark } from "@/components/LuopanMark"
import { C } from "@/lib/theme"

const DIR_DEG: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 }

function DirectionWheel({ dirs }: { dirs: PersonalDirection[] }) {
  const c = 110, r1 = 40, r2 = 104
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const p = (r: number, d: number) => `${c + r * Math.cos(rad(d))},${c + r * Math.sin(rad(d))}`
  return (
    <Svg width={240} height={240} viewBox="0 0 220 220">
      {dirs.map((d) => {
        const a = DIR_DEG[d.dir]
        const s = a - 22.5, e = a + 22.5
        const path = `M${p(r2, s)} A${r2},${r2} 0 0,1 ${p(r2, e)} L${p(r1, e)} A${r1},${r1} 0 0,0 ${p(r1, s)} Z`
        const tp = p(74, a).split(",").map(Number)
        const lp = p(94, a).split(",").map(Number)
        return (
          <G key={d.dir}>
            <Path d={path} fill={d.good ? "#1f3a2a" : "#3a1f18"} stroke={C.bg} strokeWidth={2} />
            <SvgText x={tp[0]} y={tp[1] + 5} fontSize={13} fontWeight="800" textAnchor="middle" fill={d.good ? C.good : C.bad}>{d.energy}</SvgText>
            <SvgText x={lp[0]} y={lp[1] + 4} fontSize={10} textAnchor="middle" fill={C.textSub}>{d.label}</SvgText>
          </G>
        )
      })}
      <Circle cx={c} cy={c} r={r1 - 3} fill={C.surface} stroke={C.goldDeep} />
      <SvgText x={c} y={c - 2} fontSize={12} textAnchor="middle" fill={C.textMuted}>北在上</SvgText>
      <SvgText x={c} y={c + 14} fontSize={11} textAnchor="middle" fill={C.textFaint}>↑</SvgText>
    </Svg>
  )
}

export default function KuaScreen() {
  const profile = useAppStore((s) => s.profile)
  const has = !!profile && !isQuickModeProfile(profile)
  const info = has ? personalDirections(profile!.kuaNumber) : null

  if (!has || !info) {
    return (
      <Screen style={{ alignItems: "center", justifyContent: "center" }}>
        <LuopanMark size={160} />
        <Text style={styles.emptyTitle}>先填写出生年份与性别</Text>
        <Text style={styles.emptySub}>算出命卦后，这里会显示你的四吉四凶方位</Text>
        <Button title="填写命卦" onPress={() => router.push("/setup")} style={{ alignSelf: "stretch" }} />
      </Screen>
    )
  }

  const good = info.directions.filter((d) => d.good)
  const bad = info.directions.filter((d) => !d.good).sort((a, b) => a.rank - b.rank)

  return (
    <Screen>
      <Card tone="gold" style={{ alignItems: "center" }}>
        <Text style={styles.kua}>命卦 {profile!.kuaNumber} · {info.gua}卦</Text>
        <Text style={styles.group}>{info.group}　·　宜住{info.group === "东四命" ? "东四宅（坐北/东/东南/南）" : "西四宅（坐西北/西南/西/东北）"}</Text>
        <DirectionWheel dirs={info.directions} />
      </Card>

      <Card>
        <SectionTitle>四吉方 · 多用</SectionTitle>
        {good.map((d) => (
          <View key={d.dir} style={styles.row}>
            <Text style={[styles.dir, { color: C.good }]}>{d.label}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.energy}>{d.energy}</Text>
              <Text style={styles.use}>{d.use}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>四凶方 · 少用或压制</SectionTitle>
        {bad.map((d) => (
          <View key={d.dir} style={styles.row}>
            <Text style={[styles.dir, { color: C.bad }]}>{d.label}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.energy}>{d.energy}</Text>
              <Text style={styles.use}>{d.use}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.foot}>「朝向」指人面对的方向：如坐在书桌前面朝的方向、躺下时头顶所指的床头方向。可用「罗盘」工具测量。</Text>
      <Button title="打开罗盘测方向" variant="secondary" onPress={() => router.push("/compass")} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginTop: 8 },
  emptySub:   { fontSize: 13, color: C.textMuted, marginBottom: 8 },
  kua:   { fontSize: 22, fontWeight: "900", color: C.goldBright },
  group: { fontSize: 12, color: C.textSub, textAlign: "center" },
  row:   { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  dir:   { width: 44, fontSize: 16, fontWeight: "900" },
  energy:{ fontSize: 14, fontWeight: "800", color: C.text },
  use:   { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  foot:  { fontSize: 12, color: C.textMuted, lineHeight: 18 },
})
