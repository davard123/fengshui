import { router } from "expo-router"
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { StandingPointCard } from "@/components/StandingPointCard"
import { POINT_CONFIGS } from "@/lib/fengshui/ai-prompts"
import { precisionForType } from "@/lib/fengshui/mountains-24"
import { isQuickModeProfile } from "@/lib/fengshui/quickmode"
import type { StandingPointType } from "@/types/fengshui"

// 室内站点（室外已在地址页自动完成，不在此重复）
const POINT_OPTIONS: { type: StandingPointType; icon: string }[] = [
  { type: "house-center",      icon: "⊙" },
  { type: "living-room",       icon: "🛋️" },
  { type: "master-bedroom",    icon: "🛏️" },
  { type: "kitchen",           icon: "🍳" },
  { type: "study",             icon: "📚" },
  { type: "front-door-inside", icon: "🚪" },
  { type: "yard",              icon: "🌿" },
  { type: "garage",            icon: "🚗" },
]

export default function PointSelectScreen() {
  const standingPoints  = useAppStore((s) => s.standingPoints)
  const startNewPoint   = useAppStore((s) => s.startNewPoint)
  const removePoint     = useAppStore((s) => s.removeStandingPoint)
  const address         = useAppStore((s) => s.address)
  const profile         = useAppStore((s) => s.profile)

  const profileFilled = !isQuickModeProfile(profile)

  const handleSelectType = (type: StandingPointType) => {
    const config = POINT_CONFIGS[type]
    startNewPoint({
      id: `point-${Date.now()}`,
      type,
      label: config.label,
      theme: config.theme,
      precision: precisionForType(type),
      directions: [],
    })
    router.push("/compass")
  }

  const handleViewPoint = (id: string) => {
    router.push({ pathname: "/point-analysis", params: { id } })
  }

  const allAnalyzed = standingPoints.length > 0 &&
    standingPoints.every((p) => p.aiAnalysis)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>选择勘察站点</Text>
      <Text style={styles.address}>{address || "未填写地址"}</Text>

      {/* ─── 命主信息卡片（可选）─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>命主信息（可选）</Text>
        <Pressable
          onPress={() => router.push("/setup")}
          style={[styles.ownerCard, profileFilled && styles.ownerCardFilled]}
        >
          <Text style={styles.ownerIcon}>👤</Text>
          <View style={styles.ownerBody}>
            <Text style={styles.ownerTitle}>
              {profileFilled ? "本宅住户信息" : "添加本宅住户信息"}
            </Text>
            {profileFilled && profile ? (
              <Text style={styles.ownerSub}>
                {profile.birthYear}年 · {profile.gender === "male" ? "男" : "女"} · 命卦 {profile.kuaNumber}（{profile.kuaGroup === "east" ? "东四命" : "西四命"}）
              </Text>
            ) : (
              <Text style={styles.ownerSubHint}>
                填写后可获得命卦、八宅、人宅匹配等个人化分析
              </Text>
            )}
          </View>
          {profileFilled
            ? <Text style={styles.ownerEdit}>编辑 ›</Text>
            : <Text style={styles.ownerAdd}>添加 ›</Text>}
        </Pressable>
      </View>

      {/* 已完成的站点 */}
      {standingPoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>已完成站点</Text>
          {standingPoints.map((p) => (
            <StandingPointCard
              key={p.id}
              point={p}
              onPress={() => handleViewPoint(p.id)}
              onDelete={() => removePoint(p.id)}
            />
          ))}
        </View>
      )}

      {/* 添加新站点 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>添加室内站点</Text>
        <View style={styles.grid}>
          {POINT_OPTIONS.map(({ type, icon }) => {
            const config = POINT_CONFIGS[type]
            const done = standingPoints.some((p) => p.type === type)
            return (
              <Pressable
                key={type}
                onPress={() => handleSelectType(type)}
                style={[styles.option, done && styles.optionDone]}
              >
                <Text style={styles.optionIcon}>{icon}</Text>
                <Text style={styles.optionLabel}>{config.label}</Text>
                {done && <Text style={styles.doneTag}>✓</Text>}
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* 生成综合报告 */}
      {standingPoints.length >= 1 && (
        <Pressable
          onPress={() => router.push("/synthesis")}
          style={[styles.synthesisBtn, !allAnalyzed && styles.synthesisBtnSecondary]}
        >
          <Text style={styles.synthesisBtnText}>
            {allAnalyzed ? "生成综合报告" : `生成综合报告（${standingPoints.length} 个站点）`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fffaf3", gap: 20 },
  title:     { fontSize: 28, fontWeight: "800", color: "#2a2118" },
  address:   { fontSize: 13, color: "#8d6b4c", marginTop: -12 },
  section:   { gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#8d6b4c", textTransform: "uppercase", letterSpacing: 1 },

  // 命主信息卡片
  ownerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#eadfce",
  },
  ownerCardFilled: { borderColor: "#8d6b4c", backgroundColor: "#fdf5ea" },
  ownerIcon:       { fontSize: 36 },
  ownerBody:       { flex: 1, gap: 2 },
  ownerTitle:      { fontSize: 15, fontWeight: "800", color: "#2a2118" },
  ownerSub:        { fontSize: 12, color: "#8d6b4c", fontWeight: "600" },
  ownerSubHint:    { fontSize: 12, color: "#9b8878", lineHeight: 16 },
  ownerEdit:       { fontSize: 13, color: "#8d6b4c", fontWeight: "700" },
  ownerAdd:        { fontSize: 13, color: "#cc6600", fontWeight: "700" },

  // 站点网格
  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 4,
  },
  optionDone:  { borderColor: "#8d6b4c", backgroundColor: "#fdf5ea" },
  optionIcon:  { fontSize: 22 },
  optionLabel: { fontSize: 15, fontWeight: "800", color: "#2a2118" },
  doneTag:     { position: "absolute", top: 10, right: 12, fontSize: 16, color: "#4a7c59", fontWeight: "900" },

  synthesisBtn:          { backgroundColor: "#2a2118", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  synthesisBtnSecondary: { backgroundColor: "#8d6b4c" },
  synthesisBtnText:      { color: "#fff", fontWeight: "800", fontSize: 16 },
})
