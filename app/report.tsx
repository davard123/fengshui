/**
 * 第 6 步 — 综合报告
 * 总评仪表 → 分层得分 → 运势雷达 → 飞星盘 → 流年 → 格局明细 → 改善行动 → 深度报告（付费）→ 导出
 */
import { router } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { useAppStore } from "@/store/useAppStore"
import { generateReportV3 } from "@/lib/fengshui/report-v3"
import { PATTERN_MEANING } from "@/lib/fengshui/flying-stars"
import { computeAnnualChart, annualNotes, ANNUAL_STAR_INFO } from "@/lib/fengshui/annual-stars"
import { ROOM_INFO, type RoomType } from "@/lib/fengshui/palaces"
import { buildV3DeepPrompt, V3_DEEP_SYSTEM_PROMPT } from "@/lib/fengshui/ai-prompts-v3"
import { buildPrintHTML } from "@/lib/fengshui/print-report"
import { generateOfflineDeepReport } from "@/lib/fengshui/offline-deep-report"
import { purchaseDeepReport, getDeepReportPrice, isPurchaseTestMode } from "@/lib/purchases"
import { analyzeWithAI } from "@/lib/ai-client"
import { FocusAreaPicker } from "@/components/FocusAreaPicker"
import { NineGrid } from "@/components/NineGrid"
import { Badge, Button, Card, Notice, ScoreBar, Screen, SectionTitle } from "@/components/ui"
import { C, RATING_TONE } from "@/lib/theme"
import { FOCUS_AREA_OPTIONS, type FocusArea } from "@/types/fengshui"

type AnyFinding = {
  id: string; name: string; score: number
  location: string; description: string
  classic?: string; suggestion?: string
  affects?: FocusArea[]
}

/** 总评仪表：-10..+10 映射为圆环进度 */
function ScoreDial({ score, rating }: { score: number; rating: string }) {
  const tone = RATING_TONE[rating] ?? RATING_TONE["中平"]
  const size = 148, stroke = 10, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = (Math.max(-10, Math.min(10, score)) + 10) / 20
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={tone.fg} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.dialRating, { color: tone.fg }]}>{rating}</Text>
      <Text style={styles.dialScore}>{score > 0 ? `+${score}` : score} 分</Text>
    </View>
  )
}

function FindingItem({ f, good }: { f: AnyFinding; good: boolean }) {
  return (
    <View style={[styles.finding, { borderLeftColor: good ? C.good : C.bad }]}>
      <Text style={styles.fName}>{f.name} <Text style={styles.fLoc}>{f.location}</Text></Text>
      <Text style={styles.fDesc}>{f.description}</Text>
      {f.classic ? <Text style={styles.fClassic}>📜 {f.classic}</Text> : null}
      {!good && f.suggestion ? <Text style={styles.fSug}>💡 {f.suggestion}</Text> : null}
    </View>
  )
}

export default function ReportScreen() {
  const assessment    = useAppStore((s) => s.assessment)
  const setReportText = useAppStore((s) => s.setReportText)
  const setAiUnlocked = useAppStore((s) => s.setAiUnlocked)
  const saveToHistory = useAppStore((s) => s.saveToHistory)

  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])
  const [aiLoading, setAiLoading]   = useState(false)
  const [buying, setBuying]         = useState(false)
  const [price, setPrice]           = useState("$1.99")
  const [exporting, setExporting]   = useState(false)

  const report = useMemo(() => assessment ? generateReportV3(assessment) : null, [assessment])
  const annual = useMemo(() => computeAnnualChart(new Date().getFullYear()), [])

  // 报告页即自动保存到记录（同 id 覆盖）
  useEffect(() => {
    if (assessment?.orientation) saveToHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment?.updatedAt])

  useEffect(() => { getDeepReportPrice().then(setPrice) }, [])

  if (!assessment || !report) {
    return (
      <Screen>
        <Notice tone="warn">暂无评估数据。</Notice>
        <Button title="开始新评估 →" onPress={() => router.replace("/address")} />
      </Screen>
    )
  }

  const runAI = async () => {
    setAiLoading(true)
    // 三级通道：Worker 代理 → 本机 Key → 全失败时离线规则版兜底
    const result = await analyzeWithAI(V3_DEEP_SYSTEM_PROMPT, buildV3DeepPrompt(assessment, report), 4000)
    setReportText(result.ok ? result.text : generateOfflineDeepReport(assessment, report))
    setAiLoading(false)
  }

  const handleBuy = async () => {
    setBuying(true)
    const res = await purchaseDeepReport()
    setBuying(false)
    if (res.ok) {
      setAiUnlocked(true)
      void runAI()
    } else if (res.reason !== "cancelled") {
      const msg = res.message ?? "购买未完成，请稍后再试。"
      if (Platform.OS === "web") window.alert(msg)
      else Alert.alert("购买未完成", msg)
    }
  }

  const handleExport = async () => {
    const html = buildPrintHTML(assessment, report)
    if (Platform.OS === "web") {
      const w = typeof window !== "undefined" ? window.open("", "_blank") : null
      if (w) { w.document.write(html); w.document.close() }
      return
    }
    setExporting(true)
    try {
      const { uri } = await Print.printToFileAsync({ html })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "分享风水报告" })
      } else {
        await Print.printAsync({ uri })
      }
    } catch {}
    setExporting(false)
  }

  // 按关注运势过滤 findings
  const allFindings: AnyFinding[] = [...report.exterior, ...(report.bazhai?.findings ?? []), ...report.interior]
  const relevant = focusAreas.length === 0
    ? allFindings
    : allFindings.filter((f) => f.affects?.some((a) => focusAreas.includes(a)))
  const negatives = relevant.filter((f) => f.score < 0).sort((a, b) => a.score - b.score)
  const positives = relevant.filter((f) => f.score > 0).sort((a, b) => b.score - a.score)

  const placements = assessment.placements.map((p) => ({ room: p.room, palaces: p.palaces ?? [p.primaryPalace] }))
  const annualList = annualNotes(annual, placements, (r) => ROOM_INFO[r as RoomType]?.label ?? r)
  const fs = report.flyingStars
  const focusEntries = FOCUS_AREA_OPTIONS.filter((o) => report.focusScores[o.area] !== undefined)

  return (
    <Screen>
      {/* ── 总评 ── */}
      <Card tone="gold" style={{ alignItems: "center", gap: 10 }}>
        <Text style={styles.addr} numberOfLines={2}>{assessment.address}</Text>
        <Text style={styles.orient}>{report.orientationText}</Text>
        <ScoreDial score={Math.round(report.overallScore)} rating={report.overallRating} />
        <Text style={styles.summary}>{report.summary}</Text>
      </Card>

      {/* ── 分层得分 ── */}
      <Card>
        <SectionTitle>分层得分</SectionTitle>
        <ScoreBar label="定向" score={report.sections.orientation.score} />
        {fs && <ScoreBar label="玄空飞星" score={report.sections.flyingStars.score} />}
        <ScoreBar label="外局峦头" score={report.sections.exterior.score} />
        {report.bazhai && <ScoreBar label="八宅内局" score={report.sections.bazhai.score} />}
        <ScoreBar label="室内细节" score={report.sections.interior.score} />
      </Card>

      {focusEntries.length > 0 && (
        <Card>
          <SectionTitle>各方面运势倾向</SectionTitle>
          {focusEntries.map((o) => (
            <ScoreBar key={o.area} label={`${o.icon} ${o.area.slice(0, 2)}`} score={report.focusScores[o.area] ?? 0} />
          ))}
        </Card>
      )}

      {/* ── 玄空飞星盘 ── */}
      {fs && (
        <Card>
          <SectionTitle right={<Badge label={fs.pattern} tone={PATTERN_MEANING[fs.pattern].rating === "凶" ? "bad" : "good"} />}>
            玄空飞星
          </SectionTitle>
          <Text style={styles.body}>{report.flyingStarSummary}</Text>
          <Text style={styles.advice}>{PATTERN_MEANING[fs.pattern].advice}</Text>
          <NineGrid
            renderCell={(p) => {
              const s = fs.palaces[p]
              return (
                <>
                  <Text style={styles.starNums}>
                    <Text style={{ color: C.mountainStar }}>{s.mountain}</Text>
                    {"  "}
                    <Text style={{ color: C.facingStar }}>{s.facing}</Text>
                  </Text>
                  <Text style={styles.starBase}>{s.base}</Text>
                </>
              )
            }}
          />
          <Text style={styles.legend}>每宫：山星（金，管人丁健康）· 向星（蓝，管财运）· 下方为运星</Text>
          {report.palaceNotes.length > 0 && (
            <View style={styles.notes}>
              {report.palaceNotes.map((n, i) => (
                <Text key={i} style={[styles.note, { color: n.good ? C.good : C.bad }]}>{n.good ? "✓" : "⚠"} {n.text}</Text>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* ── 流年 ── */}
      <Card>
        <SectionTitle right={<Text style={styles.link} onPress={() => router.push("/annual")}>详情 ›</Text>}>
          {annual.year} {annual.ganzhi}年流年 · {ANNUAL_STAR_INFO[annual.centerStar].short}入中
        </SectionTitle>
        {annualList.slice(0, 6).map((n, i) => (
          <Text key={i} style={[styles.note, { color: n.good ? C.good : C.textSub }]}>{n.good ? "✓" : "⚠"} {n.text}</Text>
        ))}
      </Card>

      {/* ── 运势关注筛选 ── */}
      <Card>
        <FocusAreaPicker selected={focusAreas} onChange={setFocusAreas} />
      </Card>

      {negatives.length > 0 && (
        <Card>
          <SectionTitle right={<Badge label={`${negatives.length}`} tone="bad" />}>需要注意</SectionTitle>
          {negatives.map((f) => <FindingItem key={f.id} f={f} good={false} />)}
        </Card>
      )}

      {positives.length > 0 && (
        <Card>
          <SectionTitle right={<Badge label={`${positives.length}`} tone="good" />}>有利格局</SectionTitle>
          {positives.map((f) => <FindingItem key={f.id} f={f} good />)}
        </Card>
      )}

      {negatives.length + positives.length === 0 && (
        <Notice tone="info">{focusAreas.length ? "所选方面没有明显的吉凶格局。" : "暂无具体格局。放置更多房间、确认外局地物后结果会更完整。"}</Notice>
      )}

      {report.topActions.length > 0 && (
        <Card tone="warn">
          <SectionTitle>优先改善行动</SectionTitle>
          {report.topActions.map((t, i) => (
            <Text key={i} style={styles.action}>{i + 1}. {t}</Text>
          ))}
        </Card>
      )}

      {/* ── 深度报告（付费）── */}
      {!assessment.aiUnlocked ? (
        <Card tone="gold" style={styles.paywall}>
          <Text style={styles.payTitle}>深度风水报告</Text>
          <Text style={styles.payPrice}>{price}<Text style={styles.paySub}>  · 本套房产一次性</Text></Text>
          {[
            "资深顾问视角的 800–1000 字七节深度分析",
            "逐房间布置建议：颜色、材质、摆放",
            "五行调理方案 + 今年流年宜忌",
            "改善行动按「立刻 / 一月内 / 装修时」排期",
            "PDF 报告附飞星盘、房间布局、外局方位三张图",
          ].map((f) => <Text key={f} style={styles.payFeat}>✓ {f}</Text>)}
          <Button title={`解锁深度报告 ${price}`} onPress={handleBuy} loading={buying} />
          {isPurchaseTestMode() && <Text style={styles.testNote}>演示/开发模式：不会真实扣款</Text>}
        </Card>
      ) : (
        <Card>
          <SectionTitle right={<Badge label="已解锁" tone="good" />}>深度风水报告</SectionTitle>
          {aiLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={C.gold} />
              <Text style={styles.loadingText}>顾问撰写中，约 30–60 秒…</Text>
            </View>
          ) : assessment.reportText ? (
            <>
              <Text style={styles.aiText}>{assessment.reportText}</Text>
              <Button small variant="ghost" title="↻ 重新生成（不再收费）" onPress={runAI} />
            </>
          ) : (
            <Button title="生成深度报告" onPress={runAI} />
          )}
        </Card>
      )}

      <Button
        variant="secondary"
        title={Platform.OS === "web" ? "🖨 打印 / 导出 PDF" : "📄 导出 PDF 报告并分享"}
        onPress={handleExport}
        loading={exporting}
      />
      <Button title="返回首页" variant="ghost" onPress={() => router.dismissAll()} />
      <Text style={styles.disclaimer}>本报告基于传统风水文化自动生成，仅供文化娱乐参考，不构成任何决策建议。报告已自动保存到「记录」。</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  addr:    { fontSize: 16, fontWeight: "800", color: C.text, textAlign: "center" },
  orient:  { fontSize: 12, color: C.textSub, textAlign: "center" },
  summary: { fontSize: 14, color: C.text, textAlign: "center", lineHeight: 22 },
  dialRating: { fontSize: 34, fontWeight: "900", letterSpacing: 2 },
  dialScore:  { fontSize: 12, color: C.textMuted },

  body:     { fontSize: 14, color: C.textSub, lineHeight: 22 },
  advice:   { fontSize: 13, color: C.goldBright, lineHeight: 20 },
  starNums: { fontSize: 18, fontWeight: "900" },
  starBase: { fontSize: 10, color: C.textMuted },
  legend:   { fontSize: 11, color: C.textMuted, textAlign: "center" },
  notes:    { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  note:     { fontSize: 12, lineHeight: 19 },
  link:     { fontSize: 12, color: C.goldBright, fontWeight: "700" },

  finding: { borderLeftWidth: 3, borderRadius: 8, padding: 12, gap: 4, backgroundColor: C.surface2 },
  fName:    { fontSize: 14, fontWeight: "800", color: C.text },
  fLoc:     { fontSize: 11, fontWeight: "400", color: C.textMuted },
  fDesc:    { fontSize: 13, color: C.textSub, lineHeight: 19 },
  fClassic: { fontSize: 12, color: C.goldDeep, fontStyle: "italic" },
  fSug:     { fontSize: 13, color: C.good, lineHeight: 19 },

  action: { fontSize: 13, color: C.text, lineHeight: 20 },

  paywall:  { borderWidth: 1.5, borderColor: C.gold },
  payTitle: { fontSize: 19, fontWeight: "900", color: C.goldBright, textAlign: "center", letterSpacing: 2 },
  payPrice: { fontSize: 30, fontWeight: "900", color: C.text, textAlign: "center" },
  paySub:   { fontSize: 13, fontWeight: "600", color: C.textMuted },
  payFeat:  { fontSize: 13, color: C.textSub, lineHeight: 20 },
  testNote: { fontSize: 11, color: C.textFaint, textAlign: "center" },

  loadingRow:  { flexDirection: "row", gap: 8, alignItems: "center" },
  loadingText: { color: C.textSub, fontSize: 13 },
  aiText:      { fontSize: 14, color: C.text, lineHeight: 24 },
  disclaimer:  { fontSize: 11, color: C.textFaint, textAlign: "center", lineHeight: 17 },
})
