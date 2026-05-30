import { View, Text, Pressable, StyleSheet } from "react-native"
import type { StandingPoint } from "@/types/fengshui"
import { POINT_CONFIGS } from "@/lib/fengshui/ai-prompts"

type Props = {
  point: StandingPoint
  onPress?: () => void
  onDelete?: () => void
}

export function StandingPointCard({ point, onPress, onDelete }: Props) {
  const config = POINT_CONFIGS[point.type] ?? POINT_CONFIGS.custom
  const filledCount = point.directions.filter((d) => d.elements.length > 0).length
  const hasAnalysis = !!point.aiAnalysis

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.meta}>
          <Text style={styles.label}>{config.label}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, hasAnalysis && styles.badgeAnalyzed]}>
            <Text style={[styles.badgeText, hasAnalysis && styles.badgeTextAnalyzed]}>
              {hasAnalysis ? "已分析" : "待分析"}
            </Text>
          </View>
          {onDelete && (
            <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
              <Text style={styles.deleteText}>×</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          朝向 {Math.round(point.compassDegree)}° · {point.compassDirection}
        </Text>
        <Text style={styles.infoText}>
          {point.precision} · {filledCount} 个方位已标记
        </Text>
      </View>

      {hasAnalysis && (
        <Text style={styles.preview} numberOfLines={2}>
          {point.aiAnalysis}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 8,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  meta: {
    gap: 2,
    flex: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2a2118",
  },
  theme: {
    fontSize: 12,
    color: "#8d6b4c",
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#f0e8da",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeAnalyzed: {
    backgroundColor: "#d4edda",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8d6b4c",
  },
  badgeTextAnalyzed: {
    color: "#2d6a3f",
  },
  info: {
    gap: 2,
  },
  infoText: {
    fontSize: 12,
    color: "#9b8878",
  },
  preview: {
    fontSize: 13,
    color: "#46392c",
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: "#f0e8da",
    paddingTop: 8,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0e8da",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    fontSize: 16,
    color: "#8d6b4c",
    fontWeight: "700",
  },
})
