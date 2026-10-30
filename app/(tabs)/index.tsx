/**
 * 首页「勘宅」— 主视觉 + 继续评估 + 六步流程 + 今年流年速览
 */
import { router } from "expo-router"
import { useMemo } from "react"
import { Alert, Platform, StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { Disclaimer } from "@/components/Disclaimer"
import { LuopanMark } from "@/components/LuopanMark"
import { Badge, Button, Card, FLOW_STEPS, Screen, SectionTitle } from "@/components/ui"
import { computeAnnualChart, ANNUAL_STAR_INFO, PALACE_CN } from "@/lib/fengshui/annual-stars"
import { C } from "@/lib/theme"

const STEP_DESC: Record<string, string> = {
  定位: "输入地址，卫星图找到房屋轮廓与宅中心",
  定向: "选大门所在立面，罗盘验证坐向",
  外局: "50m / 200m / 1km 三环看周边形势",
  内局: "房间放入九宫，八宅 + 飞星判定",
  细节: "床、灶、镜、门等居家细节自查",
  报告: "综合评级、改善建议、PDF 报告",
}

/** 评估进行到第几步（用于「继续」卡片） */
function progressOf(a: NonNullable<ReturnType<typeof useAppStore.getState>["assessment"]>) {
  if (!a.footprint && !a.orientation) return { step: 1, route: "/address" as const }
  if (!a.orientation) return { step: 2, route: "/orientation" as const }
  if (a.placements.length === 0) return { step: a.external.length ? 4 : 3, route: (a.external.length ? "/palaces" : "/exterior") as "/palaces" | "/exterior" }
  return { step: 6, route: "/report" as const }
}

export default function HomeScreen() {
  const hydrated        = useAppStore((s) => s.hydrated)
  const hasAccepted     = useAppStore((s) => s.hasAcceptedDisclaimer)
  const assessment      = useAppStore((s) => s.assessment)
  const resetAssessment = useAppStore((s) => s.resetAssessment)

  const year = new Date().getFullYear()
  const annual = useMemo(() => computeAnnualChart(year), [year])

  if (!hydrated) return <View style={styles.blank} />
  if (!hasAccepted) return <Disclaimer />

  const startNew = () => {
    const go = () => { resetAssessment(); router.push("/address") }
    if (!assessment || assessment.placements.length === 0) return go()
    const msg = "当前评估尚未保存的进度会被替换（已保存到记录的不受影响）。"
    if (Platform.OS === "web") { if (window.confirm(msg)) go(); return }
    Alert.alert("开始新评估？", msg, [{ text: "取消", style: "cancel" }, { text: "开始", onPress: go }])
  }

  const prog = assessment ? progressOf(assessment) : null
  const fiveYellow = (Object.keys(annual.palaces) as (keyof typeof annual.palaces)[])
    .find((p) => p !== "CENTER" && annual.palaces[p] === 5)
  const twoBlack = (Object.keys(annual.palaces) as (keyof typeof annual.palaces)[])
    .find((p) => p !== "CENTER" && annual.palaces[p] === 2)

  return (
    <Screen topInset>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.brand}>九宫风水</Text>
          <Text style={styles.tagline}>定向 · 外局 · 九宫 · 飞星</Text>
        </View>
        <LuopanMark size={118} needle={12} />
      </View>

      {assessment && prog && (
        <Card tone="gold" onPress={() => router.push(prog.route)}>
          <View style={styles.rowBetween}>
            <Badge label={prog.step >= 6 ? "报告已就绪" : `进行中 · 第 ${prog.step} 步`} />
            <Text style={styles.continueArrow}>继续 ›</Text>
          </View>
          <Text style={styles.continueAddr} numberOfLines={2}>{assessment.address || "未命名住宅"}</Text>
          {assessment.orientation && (
            <Text style={styles.continueMeta}>
              坐{assessment.orientation.sittingMountain}向{assessment.orientation.facingMountain}
              {" · "}{assessment.placements.length} 个房间已入宫
            </Text>
          )}
        </Card>
      )}

      <Button title={assessment ? "开始新的勘宅评估" : "开始勘宅评估"} onPress={startNew} />

      <Card>
        <SectionTitle>六步完成一次专业勘宅</SectionTitle>
        {FLOW_STEPS.map((name, i) => (
          <View key={name} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{name}</Text>
              <Text style={styles.stepDesc}>{STEP_DESC[name]}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card onPress={() => router.push("/annual")}>
        <SectionTitle right={<Text style={styles.more}>详情 ›</Text>}>
          {annual.year} {annual.ganzhi}{annual.zodiac}年 · 流年提醒
        </SectionTitle>
        <View style={styles.annualRow}>
          {fiveYellow && (
            <View style={[styles.annualPill, styles.annualBad]}>
              <Text style={styles.annualStar}>五黄</Text>
              <Text style={styles.annualDir}>{PALACE_CN[fiveYellow]}方</Text>
            </View>
          )}
          {twoBlack && (
            <View style={[styles.annualPill, styles.annualBad]}>
              <Text style={styles.annualStar}>二黑</Text>
              <Text style={styles.annualDir}>{PALACE_CN[twoBlack]}方</Text>
            </View>
          )}
          <View style={[styles.annualPill, styles.annualWarn]}>
            <Text style={styles.annualStar}>太岁</Text>
            <Text style={styles.annualDir}>{PALACE_CN[annual.taisui.palace]}方</Text>
          </View>
          <View style={[styles.annualPill, styles.annualGood]}>
            <Text style={[styles.annualStar, { color: C.good }]}>{ANNUAL_STAR_INFO[annual.centerStar].short}</Text>
            <Text style={styles.annualDir}>入中</Text>
          </View>
        </View>
        <Text style={styles.annualHint}>今年这些方位宜静、忌动土装修。</Text>
      </Card>

      <View style={styles.quickRow}>
        {([
          ["🧭", "罗盘", "/compass"],
          ["☯", "命卦", "/kua"],
          ["📖", "入门", "/learn"],
        ] as const).map(([icon, label, route]) => (
          <Card key={label} style={styles.quick} onPress={() => router.push(route)}>
            <Text style={styles.quickIcon}>{icon}</Text>
            <Text style={styles.quickLabel}>{label}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.footer}>传统文化参考 · 不构成任何决策建议</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: C.bg },
  hero:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  heroText: { gap: 6, flex: 1 },
  brand:    { fontSize: 34, fontWeight: "900", color: C.goldBright, letterSpacing: 6 },
  tagline:  { fontSize: 13, color: C.textSub, letterSpacing: 2 },

  rowBetween:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  continueArrow: { color: C.goldBright, fontWeight: "800" },
  continueAddr:  { fontSize: 17, fontWeight: "800", color: C.text },
  continueMeta:  { fontSize: 12, color: C.textSub },

  stepRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: C.goldDeep,
    alignItems: "center", justifyContent: "center", backgroundColor: "#211a10",
  },
  stepNumText: { color: C.goldBright, fontWeight: "900", fontSize: 13 },
  stepTitle:   { fontSize: 15, fontWeight: "800", color: C.text },
  stepDesc:    { fontSize: 12, color: C.textMuted, marginTop: 1 },

  more:       { color: C.goldBright, fontSize: 12, fontWeight: "700" },
  annualRow:  { flexDirection: "row", gap: 8 },
  annualPill: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 2, borderWidth: 1 },
  annualBad:  { backgroundColor: C.badBg, borderColor: "#5a2c20" },
  annualWarn: { backgroundColor: C.warnBg, borderColor: "#5a4520" },
  annualGood: { backgroundColor: C.goodBg, borderColor: "#2c4a38" },
  annualStar: { fontSize: 15, fontWeight: "900", color: C.bad },
  annualDir:  { fontSize: 11, color: C.textSub },
  annualHint: { fontSize: 12, color: C.textMuted },

  quickRow:   { flexDirection: "row", gap: 10 },
  quick:      { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  quickIcon:  { fontSize: 24 },
  quickLabel: { fontSize: 13, fontWeight: "800", color: C.text },

  footer: { textAlign: "center", fontSize: 11, color: C.textFaint, marginTop: 4 },
})
