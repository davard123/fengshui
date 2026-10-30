/**
 * 第 2 步 — 定向
 * 有轮廓：由建筑主轴算出立面法向候选 → 用户选大门所在边 → 坐向（24山），可罗盘验证
 * 无轮廓（跳过地图）：直接罗盘实测 / 手动输入度数
 * 另含：建造年代（定元运）+ 住户命卦入口
 */
import { router } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { computeFacadeCandidates } from "@/lib/geo/footprint"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"
import { yearToPeriod, periodLabel } from "@/lib/fengshui/flying-stars"
import { isQuickModeProfile } from "@/lib/fengshui/quickmode"
import { CompassCheck } from "@/components/CompassCheck"
import { Button, Card, Em, Field, ListRow, Notice, Screen, SectionTitle, StepHeader } from "@/components/ui"
import { C } from "@/lib/theme"

const DIR_NAME = (deg: number) => {
  const names = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"]
  return names[Math.round(deg / 45) % 8]
}

export default function OrientationScreen() {
  const assessment     = useAppStore((s) => s.assessment)
  const profile        = useAppStore((s) => s.profile)
  const setOrientation = useAppStore((s) => s.setOrientation)
  const setBuiltYear   = useAppStore((s) => s.setBuiltYear)

  // 坐向直接取自 store（页面可能先于本地数据加载完成而挂载）
  const selectedDeg = assessment?.orientation?.facingDegree ?? null
  const verified    = assessment?.orientation?.compassVerified ?? false
  const [compassOpen, setCompassOpen] = useState(false)
  const [yearStr, setYearStr]         = useState(assessment?.builtYear ? String(assessment.builtYear) : "")
  useEffect(() => {
    if (assessment?.builtYear && !yearStr) setYearStr(String(assessment.builtYear))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment?.builtYear])

  const footprint = assessment?.footprint
  const candidates = useMemo(() => {
    if (!footprint) return []
    return computeFacadeCandidates(footprint.polygon, footprint.center)
  }, [footprint])

  // 近正方形/L形：候选 confidence 差距小说明主轴不稳定，提醒务必罗盘验证
  const ambiguous = candidates.length >= 2 && (candidates[0].confidence - candidates[1].confidence) < 0.1

  if (!assessment) {
    return (
      <Screen>
        <Notice tone="warn">请先完成第 1 步定位房屋。</Notice>
        <Button title="去定位 →" onPress={() => router.replace("/address")} />
      </Screen>
    )
  }

  const applyOrientation = (deg: number, source: "footprint" | "compass" | "manual", isVerified: boolean, edgeIndex?: number) => {
    setOrientation({
      facingDegree: deg,
      facingMountain: degreeToMountain24(deg).name,
      sittingMountain: degreeToMountain24((deg + 180) % 360).name,
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
    applyOrientation(deg, "footprint", false, edgeIndex)
  }

  const onCompassConfirm = (deg: number) => {
    applyOrientation(deg, "compass", true)
  }

  const year = parseInt(yearStr, 10)
  const yearValid = !isNaN(year) && year >= 1900 && year <= 2043
  const facing  = selectedDeg != null ? degreeToMountain24(selectedDeg) : null
  const sitting = selectedDeg != null ? degreeToMountain24((selectedDeg + 180) % 360) : null

  const handleNext = () => {
    if (selectedDeg == null) return
    setBuiltYear(yearValid ? year : undefined)
    router.push("/exterior")
  }

  const hasProfile = !isQuickModeProfile(profile) && !!profile

  return (
    <Screen>
      <StepHeader
        step={2}
        title="定向"
        subtitle={footprint
          ? <>房屋轮廓的每条边都是一个朝向候选。<Em>大门开在哪条边，房子就朝哪个方向。</Em></>
          : <>站在大门口，<Em>背对屋内、面朝屋外</Em>，用手机罗盘测出房屋朝向。</>}
      />

      {footprint && (
        <>
          {ambiguous && (
            <Notice tone="warn">房屋接近正方形或形状不规则，各候选差距很小——选完后强烈建议到大门口用罗盘实测。</Notice>
          )}
          <View style={styles.candGrid}>
            {candidates.map((c) => {
              const m = degreeToMountain24(c.normalDegree)
              const active = selectedDeg != null && Math.abs(selectedDeg - c.normalDegree) < 12
              return (
                <Pressable
                  key={c.edgeIndex}
                  onPress={() => selectCandidate(c.normalDegree, c.edgeIndex)}
                  style={({ pressed }) => [styles.cand, active && styles.candActive, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.candDir, active && { color: C.onGold }]}>朝{DIR_NAME(c.normalDegree)}</Text>
                  <Text style={[styles.candDeg, active && { color: C.onGold }]}>{Math.round(c.normalDegree)}° · {m.name}向</Text>
                  <Text style={[styles.candConf, active && { color: "#3a2a12" }]}>
                    边长 {Math.round(c.length)}m · 可信 {Math.round(c.confidence * 100)}%
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </>
      )}

      {facing && sitting ? (
        <Card tone="gold" style={{ alignItems: "center" }}>
          <Text style={styles.resultMain}>坐{sitting.name} 向{facing.name}</Text>
          <Text style={styles.resultSub}>
            朝向 {Math.round(selectedDeg!)}°（{facing.sector}方）· {verified ? "✓ 罗盘实测" : "轮廓推算"}
          </Text>
          <Button
            small variant={verified ? "ghost" : "secondary"}
            title={verified ? "重新测量" : "🧭 到大门口用罗盘验证（推荐）"}
            onPress={() => setCompassOpen(true)}
          />
        </Card>
      ) : !footprint ? (
        <Button title="🧭 打开罗盘测量朝向" onPress={() => setCompassOpen(true)} />
      ) : null}

      <Card>
        <SectionTitle>建成 / 入住年份（可选）</SectionTitle>
        <Text style={styles.hint}>用于玄空飞星排盘：以房屋建成或最近一次大装修后入住的年份为准。不填则只做八宅与峦头分析。</Text>
        <Field
          value={yearStr} onChangeText={setYearStr}
          keyboardType="number-pad" maxLength={4}
          placeholder="如 2015" style={{ textAlign: "center" }}
        />
        {yearValid && <Text style={styles.period}>→ {periodLabel(yearToPeriod(year))}宅</Text>}
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <ListRow
          icon="👤"
          title={hasProfile ? `住户命卦 ${profile!.kuaNumber}` : "住户出生信息（可选）"}
          subtitle={hasProfile ? `${profile!.birthYear} 年 · 点击修改` : "填写后可做人宅匹配、个人吉凶方分析"}
          onPress={() => router.push("/setup")}
        />
      </Card>

      <Button
        title={selectedDeg == null ? "请先确定大门朝向" : "下一步：外局 →"}
        onPress={handleNext}
        disabled={selectedDeg == null}
      />

      <CompassCheck
        visible={compassOpen}
        title="大门口测朝向"
        hint="站在大门口，背靠大门、面朝屋外，手机水平放平，待读数稳定后锁定。"
        onConfirm={onCompassConfirm}
        onClose={() => setCompassOpen(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  candGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cand: {
    width: "47%", flexGrow: 1, backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.line, padding: 14, alignItems: "center", gap: 3,
  },
  candActive: { backgroundColor: C.gold, borderColor: C.goldBright },
  candDir:  { fontSize: 18, fontWeight: "900", color: C.text },
  candDeg:  { fontSize: 12, color: C.textSub },
  candConf: { fontSize: 10, color: C.textMuted },
  resultMain: { fontSize: 30, fontWeight: "900", color: C.goldBright, letterSpacing: 2 },
  resultSub:  { fontSize: 13, color: C.textSub },
  hint:   { fontSize: 12, color: C.textMuted, lineHeight: 18 },
  period: { fontSize: 15, fontWeight: "800", color: C.goldBright, textAlign: "center" },
})
