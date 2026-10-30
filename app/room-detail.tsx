/**
 * 第 5 步 — 房间细节清单（可选）
 * 拓扑 是/否 问题（镜对床？开门见灶？）+ 罗盘单项测量（床头朝向等）
 */
import { router } from "expo-router"
import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { ROOM_CHECKLISTS } from "@/lib/fengshui/interior-rules"
import { ROOM_INFO, type RoomType } from "@/lib/fengshui/palaces"
import { CompassCheck } from "@/components/CompassCheck"
import { Button, Card, Screen, StepHeader } from "@/components/ui"
import { C } from "@/lib/theme"

// 罗盘单项测量项
const MEASURE_ITEMS: Record<string, { item: string; hint: string }[]> = {
  "master-bedroom": [{ item: "床头朝向", hint: "站在床尾，面朝床头方向，手机水平测量。" }],
  "kitchen":        [{ item: "灶口朝向", hint: "站在灶台前，面朝做饭时面对的方向测量。" }],
  "study":          [{ item: "书桌朝向", hint: "坐在书桌前，面朝书桌的方向测量。" }],
}

const CHECKLIST_ROOMS = Object.keys(ROOM_CHECKLISTS) as string[]

export default function RoomDetailScreen() {
  const assessment   = useAppStore((s) => s.assessment)
  const setChecklist = useAppStore((s) => s.setChecklist)

  const [openRoom, setOpenRoom]   = useState<string | null>("front-door")
  const [measuring, setMeasuring] = useState<{ room: string; item: string; hint: string } | null>(null)

  const checklists = assessment?.checklists ?? []
  const getAnswers = (room: string) => checklists.find((c) => c.room === room)?.answers ?? {}
  const getMeasurements = (room: string) => checklists.find((c) => c.room === room)?.measurements ?? []

  const setAnswer = (room: string, key: string, value: boolean) => {
    const cur = checklists.find((c) => c.room === room)
    const answers = { ...(cur?.answers ?? {}) }
    // 再点一次已选项 = 取消（回到「不确定」）
    if (answers[key] === value) delete answers[key]
    else answers[key] = value
    setChecklist({ room, answers, measurements: cur?.measurements })
  }

  const addMeasurement = (room: string, item: string, degree: number, mountain: string) => {
    const cur = checklists.find((c) => c.room === room)
    const rest = (cur?.measurements ?? []).filter((m) => m.item !== item)
    setChecklist({ room, answers: cur?.answers ?? {}, measurements: [...rest, { item, degree, mountain }] })
  }

  return (
    <Screen>
      <StepHeader
        step={5}
        title="房间细节"
        subtitle="逐个房间回答几个简单问题，不确定的可以跳过（再点一次可取消选择）。床头、灶口朝向可以用罗盘现场测量。"
      />

      {CHECKLIST_ROOMS.map((room) => {
        const questions = ROOM_CHECKLISTS[room]
        const answers = getAnswers(room)
        const measurements = getMeasurements(room)
        const info = ROOM_INFO[room as RoomType]
        const open = openRoom === room
        const measures = MEASURE_ITEMS[room] ?? []
        const answered = Object.keys(answers).length
        return (
          <Card key={room} style={{ padding: 0, gap: 0, overflow: "hidden" }}>
            <Pressable onPress={() => setOpenRoom(open ? null : room)} style={styles.head}>
              <Text style={styles.icon}>{info?.icon ?? "🏠"}</Text>
              <Text style={styles.label}>{info?.label ?? room}</Text>
              <Text style={[styles.meta, answered === questions.length && { color: C.good }]}>
                {answered}/{questions.length}
              </Text>
              <Text style={styles.chev}>{open ? "−" : "+"}</Text>
            </Pressable>

            {open && (
              <View style={styles.body}>
                {questions.map((q) => {
                  const a = answers[q.key]
                  return (
                    <View key={q.key} style={styles.q}>
                      <Text style={styles.qText}>{q.question}</Text>
                      <View style={styles.qBtns}>
                        <Pressable onPress={() => setAnswer(room, q.key, true)} style={[styles.qBtn, a === true && styles.qYes]}>
                          <Text style={[styles.qBtnText, a === true && { color: C.text }]}>是</Text>
                        </Pressable>
                        <Pressable onPress={() => setAnswer(room, q.key, false)} style={[styles.qBtn, a === false && styles.qNo]}>
                          <Text style={[styles.qBtnText, a === false && { color: C.text }]}>否</Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                })}

                {measures.map((m) => {
                  const done = measurements.find((x) => x.item === m.item)
                  return (
                    <Pressable key={m.item} onPress={() => setMeasuring({ room, ...m })} style={styles.measure}>
                      <Text style={styles.measureText}>
                        🧭 {m.item}{done ? `：${Math.round(done.degree)}°（${done.mountain}山）` : "（点击测量）"}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </Card>
        )
      })}

      <Button title="生成综合报告 →" onPress={() => router.push("/report")} />

      <CompassCheck
        visible={!!measuring}
        title={measuring?.item ?? ""}
        hint={measuring?.hint ?? ""}
        onConfirm={(deg, mountain) => { if (measuring) addMeasurement(measuring.room, measuring.item, deg, mountain) }}
        onClose={() => setMeasuring(null)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  head:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  icon:  { fontSize: 20 },
  label: { fontSize: 15, fontWeight: "800", color: C.text, flex: 1 },
  meta:  { fontSize: 12, color: C.textMuted, fontWeight: "700" },
  chev:  { fontSize: 18, color: C.textMuted, width: 18, textAlign: "center" },
  body:  { padding: 16, paddingTop: 14, gap: 14, borderTopWidth: 1, borderTopColor: C.line },
  q:     { gap: 8 },
  qText: { fontSize: 14, color: C.textSub, lineHeight: 20 },
  qBtns: { flexDirection: "row", gap: 8 },
  qBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.lineStrong,
    alignItems: "center", backgroundColor: C.surface2,
  },
  qYes: { backgroundColor: "#5a2c20", borderColor: "#7a3a2a" },
  qNo:  { backgroundColor: "#2c4a38", borderColor: "#3a6048" },
  qBtnText: { fontSize: 14, fontWeight: "700", color: C.textMuted },
  measure:  { backgroundColor: "#211a10", borderRadius: 10, borderWidth: 1, borderColor: C.goldDeep, padding: 12 },
  measureText: { fontSize: 13, fontWeight: "700", color: C.goldBright },
})
