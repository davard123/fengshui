/**
 * NineGrid — 通用九宫格（北在上），每格内容由 renderCell 决定
 */
import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"
import { PALACE_ORDER_GRID, PALACE_INFO } from "@/lib/fengshui/palaces"
import { C } from "@/lib/theme"
import type { PalaceId } from "@/types/fengshui"

export function NineGrid({
  renderCell, cellStyle, onPress, showCompass = true,
}: {
  renderCell: (p: PalaceId) => ReactNode
  cellStyle?: (p: PalaceId) => ViewStyle | null | undefined | false
  onPress?: (p: PalaceId) => void
  showCompass?: boolean
}) {
  return (
    <View style={{ gap: 6 }}>
      {showCompass && <Text style={styles.north}>北 ↑</Text>}
      <View style={styles.grid}>
        {PALACE_ORDER_GRID.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((p) => (
              <Pressable
                key={p}
                disabled={!onPress}
                onPress={() => onPress?.(p)}
                style={({ pressed }) => [
                  styles.cell, p === "CENTER" && styles.center,
                  cellStyle?.(p) || null, pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.dir}>{PALACE_INFO[p].label}</Text>
                {renderCell(p)}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  north: { textAlign: "center", fontSize: 11, color: C.goldBright, fontWeight: "800" },
  grid:  { gap: 5 },
  row:   { flexDirection: "row", gap: 5 },
  cell: {
    flex: 1, aspectRatio: 1, borderRadius: 12, padding: 4, gap: 2,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line,
    alignItems: "center", justifyContent: "center",
  },
  center: { backgroundColor: "#2a2116", borderColor: C.goldDeep },
  dir:    { fontSize: 11, color: C.textMuted, fontWeight: "700" },
})
