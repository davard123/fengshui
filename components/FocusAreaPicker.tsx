import { View, Text, Pressable, StyleSheet } from "react-native"
import { FOCUS_AREA_OPTIONS, type FocusArea } from "@/types/fengshui"
import { C } from "@/lib/theme"

type Props = {
  selected:  FocusArea[]
  onChange:  (areas: FocusArea[]) => void
}

export function FocusAreaPicker({ selected, onChange }: Props) {
  const toggle = (area: FocusArea) => {
    onChange(
      selected.includes(area)
        ? selected.filter((a) => a !== area)
        : [...selected, area]
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>你最关心哪些方面？</Text>
      <Text style={styles.hint}>可多选，下方只显示相关格局（不选则显示全部）</Text>
      <View style={styles.grid}>
        {FOCUS_AREA_OPTIONS.map(({ area, icon, desc }) => {
          const on = selected.includes(area)
          return (
            <Pressable
              key={area}
              onPress={() => toggle(area)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={styles.icon}>{icon}</Text>
              <Text style={[styles.label, on && styles.labelOn]}>{area}</Text>
              <Text style={[styles.desc,  on && styles.descOn]}>{desc}</Text>
            </Pressable>
          )
        })}
      </View>

      {selected.length > 0 && (
        <Pressable onPress={() => onChange([])} style={styles.clearBtn}>
          <Text style={styles.clearText}>清除选择，显示完整报告</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  title:     { fontSize: 15, fontWeight: "800", color: C.text },
  hint:      { fontSize: 12, color: C.textMuted, marginTop: -4 },
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: "47%", flexGrow: 1, backgroundColor: C.surface2, borderRadius: 12,
    borderWidth: 1, borderColor: C.line, padding: 10, gap: 1,
  },
  chipOn:  { backgroundColor: "#2e2414", borderColor: C.gold },
  icon:    { fontSize: 18 },
  label:   { fontSize: 13, fontWeight: "800", color: C.text },
  labelOn: { color: C.goldBright },
  desc:    { fontSize: 11, color: C.textMuted },
  descOn:  { color: C.textSub },
  clearBtn:  { alignSelf: "center", paddingVertical: 6, paddingHorizontal: 16 },
  clearText: { fontSize: 12, color: C.textMuted, textDecorationLine: "underline" },
})
