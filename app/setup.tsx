import { router } from "expo-router"
import { useMemo, useState } from "react"
import {
  ScrollView, View, Text, Pressable, StyleSheet, TextInput,
} from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { calcKuaNumber, calcKuaGroup } from "@/lib/fengshui/kua-number"

const CURRENT_YEAR = 2026

export default function SetupScreen() {
  const profile    = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)

  // 如果已有真实档案，预填
  const initYear   = (profile && !profile.isQuickMode) ? profile.birthYear : 0
  const initGender = (profile && !profile.isQuickMode) ? profile.gender    : null

  const [yearStr, setYearStr]  = useState<string>(initYear ? String(initYear) : "")
  const [gender,  setGender]   = useState<"male" | "female" | null>(initGender)

  const year = parseInt(yearStr, 10)
  const yearValid = !isNaN(year) && year >= 1900 && year <= CURRENT_YEAR

  // 实时预览命卦
  const preview = useMemo(() => {
    if (!yearValid || !gender) return null
    const kua = calcKuaNumber(year, gender)
    const grp = calcKuaGroup(kua)
    return { kua, group: grp === "east" ? "东四命" : grp === "west" ? "西四命" : "未知" }
  }, [year, gender, yearValid])

  const canSave = yearValid && !!gender

  const handleSave = () => {
    if (!canSave) return
    const kua = calcKuaNumber(year, gender!)
    setProfile({
      birthYear:   year,
      gender:      gender!,
      birthDetails:`公历 ${year}`,
      kuaNumber:   kua,
      kuaGroup:    calcKuaGroup(kua),
      isQuickMode: false,   // 真实数据
    })
    router.back()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>个人信息</Text>
      <Text style={styles.copy}>
        填写真实出生年份与性别，用于计算您的命卦（八卦数），从而提供个人化的八宅、文昌、人宅匹配等分析。
      </Text>
      <Text style={styles.privacy}>
        🔒 所有信息只保存在本机设备，绝不上传。
      </Text>

      {/* 出生年份 */}
      <View style={styles.section}>
        <Text style={styles.label}>出生年份（公历）</Text>
        <TextInput
          value={yearStr}
          onChangeText={setYearStr}
          placeholder="如 1985"
          placeholderTextColor="#bfad9c"
          keyboardType="number-pad"
          maxLength={4}
          style={[styles.input, !yearValid && yearStr.length > 0 && styles.inputError]}
        />
        {!yearValid && yearStr.length > 0 && (
          <Text style={styles.errorHint}>请输入 1900–{CURRENT_YEAR} 之间的年份</Text>
        )}
      </View>

      {/* 性别 */}
      <View style={styles.section}>
        <Text style={styles.label}>性别</Text>
        <View style={styles.genderRow}>
          <Pressable
            onPress={() => setGender("male")}
            style={[styles.genderBtn, gender === "male" && styles.genderBtnActive]}
          >
            <Text style={[styles.genderText, gender === "male" && styles.genderTextActive]}>男</Text>
          </Pressable>
          <Pressable
            onPress={() => setGender("female")}
            style={[styles.genderBtn, gender === "female" && styles.genderBtnActive]}
          >
            <Text style={[styles.genderText, gender === "female" && styles.genderTextActive]}>女</Text>
          </Pressable>
        </View>
      </View>

      {/* 命卦预览 */}
      {preview && (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>您的命卦</Text>
          <Text style={styles.previewKua}>{preview.kua}</Text>
          <Text style={styles.previewGroup}>{preview.group}</Text>
        </View>
      )}

      {/* 保存 */}
      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
      >
        <Text style={styles.saveBtnText}>保存</Text>
      </Pressable>

      {/* 跳过 */}
      <Pressable onPress={() => router.back()} style={styles.skipBtn}>
        <Text style={styles.skipText}>暂不填写（仅环境分析）</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#fffaf3", gap: 16, flexGrow: 1 },
  title:     { fontSize: 28, fontWeight: "800", color: "#2a2118" },
  copy:      { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },
  privacy:   { fontSize: 12, color: "#8d6b4c", marginTop: -8 },

  section:   { gap: 8 },
  label:     { fontSize: 14, fontWeight: "700", color: "#2a2118" },
  input: {
    borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: "#fff", fontSize: 16, color: "#2a2118",
  },
  inputError:{ borderColor: "#c0392b" },
  errorHint: { fontSize: 12, color: "#c0392b" },

  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: "#f0e8da", alignItems: "center",
    borderWidth: 1, borderColor: "#eadfce",
  },
  genderBtnActive: { backgroundColor: "#2a2118", borderColor: "#2a2118" },
  genderText:      { color: "#5a4a3c", fontWeight: "700", fontSize: 16 },
  genderTextActive:{ color: "#f0d060" },

  previewCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#eadfce",
  },
  previewLabel:{ fontSize: 12, color: "#8d6b4c", fontWeight: "700",
                  textTransform: "uppercase", letterSpacing: 1 },
  previewKua:  { fontSize: 56, fontWeight: "900", color: "#2a2118" },
  previewGroup:{ fontSize: 16, color: "#8d6b4c", fontWeight: "700" },

  saveBtn: {
    backgroundColor: "#2a2118", paddingVertical: 16,
    borderRadius: 16, alignItems: "center", marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: "#bfad9c" },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  skipBtn:   { alignSelf: "center", paddingVertical: 12 },
  skipText:  { fontSize: 13, color: "#8d6b4c", textDecorationLine: "underline" },
})
