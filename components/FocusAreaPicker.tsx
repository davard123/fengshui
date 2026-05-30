import { View, Text, Pressable, StyleSheet } from "react-native"
import { FOCUS_AREA_OPTIONS, type FocusArea } from "@/types/fengshui"

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
      <Text style={styles.title}>您最关注哪些运势？</Text>
      <Text style={styles.hint}>多选，报告将重点分析所选方向（不选则显示完整格局）</Text>
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
  title:     { fontSize: 17, fontWeight: "800", color: "#2a2118" },
  hint:      { fontSize: 12, color: "#8d6b4c" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#eadfce",
    padding: 12,
    gap: 2,
  },
  chipOn: {
    backgroundColor: "#2a2118",
    borderColor: "#2a2118",
  },
  icon:    { fontSize: 22 },
  label:   { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  labelOn: { color: "#f0d060" },
  desc:    { fontSize: 11, color: "#8d6b4c" },
  descOn:  { color: "#a89060" },
  clearBtn: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  clearText: { fontSize: 12, color: "#8d6b4c", textDecorationLine: "underline" },
})
