/**
 * 第 2 步 — 定向
 * 由建筑轮廓主轴算出 4 个立面法向候选 → 用户选大门在哪条边 → 坐向（24山）
 * 可选罗盘验证 + 建造年代（定元运）+ 住户命卦
 */
import { router } from "expo-router"
import { useMemo, useState } from "react"
import { ScrollView, View, Text, Pressable, StyleSheet, TextInput } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { computeFacadeCandidates } from "@/lib/geo/footprint"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"
import { yearToPeriod, periodLabel } from "@/lib/fengshui/flying-stars"
import { isQuickModeProfile } from "@/lib/fengshui/quickmode"
import { CompassCheck } from "@/components/CompassCheck"

const DIR_NAME = (deg: number) => {
  const names = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]
  return names[Math.round(deg / 45) % 8]
}

export default function OrientationScreen() {
  const assessment     = useAppStore((s) => s.assessment)
  const profile        = useAppStore((s) => s.profile)
  const setOrientation = useAppStore((s) => s.setOrientation)
  const setBuiltYear   = useAppStore((s) => s.setBuiltYear)

  const [selectedDeg, setSelectedDeg] = useState<number | null>(
    assessment?.orientation?.facingDegree ?? null,
  )
  const [verified, setVerified]   = useState(assessment?.orientation?.compassVerified ?? false)
  const [compassOpen, setCompassOpen] = useState(false)
  const [yearStr, setYearStr]     = useState(assessment?.builtYear ? String(assessment.builtYear) : "")

  const candidates = useMemo(() => {
    if (!assessment?.footprint) return []
    return computeFacadeCandidates(assessment.footprint.polygon, assessment.footprint.center)
  }, [assessment?.footprint])

  // 近正方形/L形提示：候选 confidence 差距小说明主轴不稳定，提醒用户务必罗盘验证
  const ambiguous = candidates.length >= 2 && (candidates[0].confidence - candidates[1].confidence) < 0.1

  if (!assessment?.footprint) {
    return (
      <View style={styles.container}>
        <Text style={styles.copy}>请先完成第 1 步定位房屋。</Text>
        <Pressable onPress={() => router.replace("/address")} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>去定位 →</Text>
        </Pressable>
      </View>
    )
  }

  const applyOrientation = (deg: number, source: "footprint" | "compass", isVerified: boolean, edgeIndex?: number) => {
    const facing = degreeToMountain24(deg)
    const sittingDeg = (deg + 180) % 360
    const sitting = degreeToMountain24(sittingDeg)
    setOrientation({
      facingDegree: deg,
      facingMountain: facing.name,
      sittingMountain: sitting.name,
      source,
      compassVerified: isVerified,
      selectedEdgeIndex: edgeIndex,
      candidates: candidates.map((c) => ({
        edgeIndex: c.edgeIndex, normalDegree: c.normalDegree,
        length: c.length, confidence: c.confidence,
      })),
    })
  }

  const selectCandidate = (deg: number, edgeIndex: number) => {
    setSelectedDeg(deg)
    setVerified(false)
    applyOrientation(deg, "footprint", false, edgeIndex)
  }

  const onCompassConfirm = (deg: number) => {
    // 罗盘实测：如与所选候选差 < 25° 视为验证通过并采用实测值；差太大提示用户用实测
    setSelectedDeg(deg)
    setVerified(true)
    applyOrientation(deg, "compass", true)
  }

  const year = parseInt(yearStr, 10)
  const yearValid = !isNaN(year) && year >= 1900 && year <= 2043
  const facing = selectedDeg != null ? degreeToMountain24(selectedDeg) : null
  const sitting = selectedDeg != null ? degreeToMountain24((selectedDeg + 180) % 360) : null

  const handleNext = () => {
    if (selectedDeg == null) return
    if (yearValid) setBuiltYear(year)
    else setBuiltYear(undefined)
    router.push("/exterior")
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>第 2 步 · 定向</Text>
      <Text style={styles.copy}>
        房屋轮廓有 4 个朝向候选（4 条边的垂直方向）。
        <Text style={styles.bold}>大门开在哪条边，朝向就是哪个</Text>。
      </Text>

      {/* 逐边立面候选（按可信度排序）*/}
      {ambiguous && (
        <Text style={styles.ambiguousWarn}>
          ⚠ 房屋接近正方形或形状不规则，各立面候选差距很小 —— 强烈建议选完后用罗盘到大门口实测验证。
        </Text>
      )}
      <View style={styles.candGrid}>
        {candidates.map((c) => {
          const m = degreeToMountain24(c.normalDegree)
          const active = selectedDeg != null && Math.abs(selectedDeg - c.normalDegree) < 12
          return (
            <Pressable
              key={c.edgeIndex}
              onPress={() => selectCandidate(c.normalDegree, c.edgeIndex)}
              style={[styles.candBtn, active && styles.candBtnActive]}
            >
              <Text style={[styles.candDir, active && styles.candTextActive]}>
                {DIR_NAME(c.normalDegree)}
              </Text>
              <Text style={[styles.candDeg, active && styles.candTextActive]}>
                {Math.round(c.normalDegree)}° · {m.name}山向
              </Text>
              <Text style={[styles.candConf, active && styles.candTextActive]}>
                边长{Math.round(c.length)}m · 可信{Math.round(c.confidence * 100)}%
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* 选中后的坐向卡 */}
      {facing && sitting && (
        <View style={styles.resultCard}>
          <Text style={styles.resultMain}>坐{sitting.name} 向{facing.name}</Text>
          <Text style={styles.resultSub}>
            朝向 {Math.round(selectedDeg!)}°（{facing.sector}方）
            {verified ? " · ✓ 罗盘已验证" : " · 轮廓推算"}
          </Text>
          {!verified && (
            <Pressable onPress={() => setCompassOpen(true)} style={styles.verifyBtn}>
              <Text style={styles.verifyBtnText}>🧭 去大门口用罗盘验证（推荐）</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 建造年代（玄空元运） */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>建造/入住年代（玄空飞星用，可选）</Text>
        <TextInput
          value={yearStr} onChangeText={setYearStr}
          keyboardType="number-pad" maxLength={4}
          placeholder="如 2015" placeholderTextColor="#bfad9c"
          style={styles.input}
        />
        {yearValid && (
          <Text style={styles.periodText}>→ {periodLabel(yearToPeriod(year))}宅</Text>
        )}
        <Text style={styles.hintSmall}>不填则跳过飞星盘，只做八宅+峦头分析。</Text>
      </View>

      {/* 住户命卦 */}
      <Pressable onPress={() => router.push("/setup")} style={styles.profileCard}>
        <Text style={styles.profileIcon}>👤</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileTitle}>
            {!isQuickModeProfile(profile) ? "住户信息已填写" : "住户出生信息（可选）"}
          </Text>
          <Text style={styles.profileSub}>
            {!isQuickModeProfile(profile) && profile
              ? `${profile.birthYear}年 · 命卦 ${profile.kuaNumber}`
              : "填写后可做人宅匹配、命卦吉凶方分析"}
          </Text>
        </View>
        <Text style={styles.profileArrow}>›</Text>
      </Pressable>

      <Pressable
        onPress={handleNext}
        disabled={selectedDeg == null}
        style={[styles.nextBtn, selectedDeg == null && styles.btnDisabled]}
      >
        <Text style={styles.nextBtnText}>
          {selectedDeg == null ? "请先选择大门朝向" : "下一步：外局 →"}
        </Text>
      </Pressable>

      <CompassCheck
        visible={compassOpen}
        title="大门口验证朝向"
        hint="站在大门口，背靠大门面朝外，手机水平，待读数稳定后锁定。"
        onConfirm={onCompassConfirm}
        onClose={() => setCompassOpen(false)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 14, flexGrow: 1 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  copy:      { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },
  bold:      { fontWeight: "800", color: "#6b3e1a" },

  candGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  candBtn: {
    width: "47%", flexGrow: 1,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#eadfce",
    padding: 14, alignItems: "center", gap: 2,
  },
  candBtnActive: { backgroundColor: "#2a2118", borderColor: "#2a2118" },
  candDir:  { fontSize: 18, fontWeight: "800", color: "#2a2118" },
  candDeg:  { fontSize: 12, color: "#8d6b4c" },
  candConf: { fontSize: 10, color: "#9b8878" },
  ambiguousWarn: { fontSize: 12, color: "#c87820", lineHeight: 18, backgroundColor: "#fff3e0", borderRadius: 10, padding: 10 },
  candTextActive: { color: "#f0d060" },

  resultCard: {
    backgroundColor: "#fdf5ea", borderRadius: 16,
    borderWidth: 1, borderColor: "#e3d0b0",
    padding: 16, alignItems: "center", gap: 6,
  },
  resultMain: { fontSize: 26, fontWeight: "900", color: "#6b3e1a" },
  resultSub:  { fontSize: 13, color: "#8d6b4c" },
  verifyBtn:  { marginTop: 8, backgroundColor: "#8d6b4c", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  section:     { gap: 8 },
  sectionTitle:{ fontSize: 14, fontWeight: "700", color: "#2a2118" },
  input: {
    borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 12,
    padding: 13, fontSize: 16, textAlign: "center",
    backgroundColor: "#fff", color: "#2a2118",
  },
  periodText: { fontSize: 15, fontWeight: "800", color: "#6b3e1a", textAlign: "center" },
  hintSmall:  { fontSize: 12, color: "#9b8878" },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#eadfce", padding: 14,
  },
  profileIcon:  { fontSize: 28 },
  profileTitle: { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  profileSub:   { fontSize: 12, color: "#8d6b4c", marginTop: 2 },
  profileArrow: { fontSize: 22, color: "#bfad9c" },

  nextBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  btnDisabled: { backgroundColor: "#bfad9c" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
