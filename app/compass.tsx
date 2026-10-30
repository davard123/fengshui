/**
 * 罗盘 — 独立实时罗盘：度数、二十四山、八卦方位，可锁定读数
 */
import { useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { LuopanView } from "@/components/LuopanView"
import { Button, Card, Notice, Screen } from "@/components/ui"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"
import { useHeading, headingSourceLabel } from "@/lib/useHeading"
import { C } from "@/lib/theme"

const GUA: Record<string, string> = {
  北: "坎", 东北: "艮", 东: "震", 东南: "巽", 南: "离", 西南: "坤", 西: "兑", 西北: "乾",
}

export default function CompassScreen() {
  const { degree, source, stable } = useHeading(true)
  const [locked, setLocked] = useState<number | null>(null)
  const shown = locked ?? degree
  const m = degreeToMountain24(shown)
  const sitting = degreeToMountain24((shown + 180) % 360)

  return (
    <Screen>
      {source === "none" ? (
        <Notice tone="warn">当前设备没有罗盘传感器（网页版或模拟器）。请在 iPhone 上使用此功能。</Notice>
      ) : (
        <View style={{ alignItems: "center" }}>
          <LuopanView degree={shown} isStable={stable} locked={locked != null} />
          {headingSourceLabel(source) && <Text style={styles.source}>{headingSourceLabel(source)}</Text>}
        </View>
      )}

      <Card tone="gold">
        <View style={styles.readRow}>
          <View style={styles.readCell}>
            <Text style={styles.readBig}>{Math.round(shown)}°</Text>
            <Text style={styles.readLabel}>度数</Text>
          </View>
          <View style={styles.readCell}>
            <Text style={styles.readBig}>{m.name}</Text>
            <Text style={styles.readLabel}>二十四山</Text>
          </View>
          <View style={styles.readCell}>
            <Text style={styles.readBig}>{m.sector}</Text>
            <Text style={styles.readLabel}>{GUA[m.sector]}卦 · {m.element}</Text>
          </View>
        </View>
        <Text style={styles.sitting}>若此为房屋朝向：坐{sitting.name}向{m.name}</Text>
      </Card>

      <Button
        title={locked != null ? "解除锁定" : "锁定当前读数"}
        variant={locked != null ? "secondary" : "primary"}
        disabled={locked == null && !stable}
        onPress={() => setLocked(locked != null ? null : degree)}
      />

      <Card>
        <Text style={styles.tipTitle}>测量小贴士</Text>
        <Text style={styles.tip}>· 手机平放，远离铁门、冰箱、汽车等金属物 1 米以上</Text>
        <Text style={styles.tip}>· 测大门朝向：站在门口，背对屋内、面朝屋外</Text>
        <Text style={styles.tip}>· 读数跳动时，拿手机在空中画几次「8」字校准</Text>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  source:   { fontSize: 11, color: C.good, marginTop: 6 },
  readRow:  { flexDirection: "row" },
  readCell: { flex: 1, alignItems: "center", gap: 2 },
  readBig:  { fontSize: 26, fontWeight: "900", color: C.goldBright },
  readLabel:{ fontSize: 11, color: C.textMuted },
  sitting:  { textAlign: "center", fontSize: 13, color: C.textSub },
  tipTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  tip:      { fontSize: 12, color: C.textMuted, lineHeight: 19 },
})
