/**
 * 住户命卦 — 出生年份 + 性别 → 命卦（八宅人宅匹配用）
 */
import { router } from "expo-router"
import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { calcKuaNumber, calcKuaGroup } from "@/lib/fengshui/kua-number"
import { personalDirections } from "@/lib/fengshui/personal"
import { Button, Card, Chip, Field, Notice, Screen } from "@/components/ui"
import { C } from "@/lib/theme"

const CURRENT_YEAR = new Date().getFullYear()

export default function SetupScreen() {
  const profile    = useAppStore((s) => s.profile)
  const setProfile = useAppStore((s) => s.setProfile)

  const initYear   = (profile && !profile.isQuickMode) ? profile.birthYear : 0
  const initGender = (profile && !profile.isQuickMode) ? profile.gender    : null

  const [yearStr, setYearStr] = useState<string>(initYear ? String(initYear) : "")
  const [gender,  setGender]  = useState<"male" | "female" | null>(initGender)

  const year = parseInt(yearStr, 10)
  const yearValid = !isNaN(year) && year >= 1900 && year <= CURRENT_YEAR

  const preview = useMemo(() => {
    if (!yearValid || !gender) return null
    const kua = calcKuaNumber(year, gender)
    return { kua, info: personalDirections(kua) }
  }, [year, gender, yearValid])

  const canSave = yearValid && !!gender

  const handleSave = () => {
    if (!canSave) return
    const kua = calcKuaNumber(year, gender!)
    setProfile({
      birthYear:    year,
      gender:       gender!,
      birthDetails: `公历 ${year}`,
      kuaNumber:    kua,
      kuaGroup:     calcKuaGroup(kua),
      isQuickMode:  false,
    })
    router.back()
  }

  return (
    <Screen>
      <Text style={styles.title}>住户命卦</Text>
      <Text style={styles.copy}>
        八宅派讲究「人宅相配」：用宅主（一般为家中主要经济支柱）的出生年份与性别算出命卦，判断房子的大门、主卧是否落在对你有利的方位。
      </Text>
      <Notice tone="good">🔒 只保存在本机，不会上传。</Notice>

      <Field
        label="出生年份（公历）"
        value={yearStr}
        onChangeText={setYearStr}
        placeholder="如 1985"
        keyboardType="number-pad"
        maxLength={4}
        error={!yearValid && yearStr.length === 4 ? `请输入 1900–${CURRENT_YEAR} 之间的年份` : null}
      />
      <Text style={styles.hint}>1 月或 2 月初（立春前）出生的，命理上算上一年，请填「出生年 − 1」。</Text>

      <View style={{ gap: 8 }}>
        <Text style={styles.label}>性别</Text>
        <View style={styles.genderRow}>
          <Chip label="男" active={gender === "male"} onPress={() => setGender("male")} style={styles.genderChip} />
          <Chip label="女" active={gender === "female"} onPress={() => setGender("female")} style={styles.genderChip} />
        </View>
      </View>

      {preview && preview.info && (
        <Card tone="gold" style={{ alignItems: "center" }}>
          <Text style={styles.previewLabel}>你的命卦</Text>
          <Text style={styles.previewKua}>{preview.kua}</Text>
          <Text style={styles.previewGroup}>{preview.info.gua}卦 · {preview.info.group}</Text>
          <Text style={styles.previewDirs}>
            吉方：{preview.info.directions.filter((d) => d.good).map((d) => `${d.label}(${d.energy})`).join("  ")}
          </Text>
        </Card>
      )}

      <Button title="保存" onPress={handleSave} disabled={!canSave} />
      <Button title="暂不填写（只做环境分析）" variant="ghost" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "900", color: C.text },
  copy:  { fontSize: 14, color: C.textSub, lineHeight: 22 },
  hint:  { fontSize: 12, color: C.textMuted, marginTop: -8 },
  label: { fontSize: 13, fontWeight: "700", color: C.textSub },
  genderRow:  { flexDirection: "row", gap: 10 },
  genderChip: { flex: 1, justifyContent: "center", paddingVertical: 12 },
  previewLabel: { fontSize: 12, color: C.textMuted, fontWeight: "700", letterSpacing: 2 },
  previewKua:   { fontSize: 56, fontWeight: "900", color: C.goldBright },
  previewGroup: { fontSize: 16, color: C.text, fontWeight: "800" },
  previewDirs:  { fontSize: 12, color: C.textSub, textAlign: "center", lineHeight: 18 },
})
