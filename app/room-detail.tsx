/**
 * 第 5 步 — 房间细节清单（可选）
 * 拓扑 yes/no 问题（镜对床？开门见灶？）+ 罗盘单项测量（床头朝向等）
 */
import { router } from "expo-router"
import { useState } from "react"
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { ROOM_CHECKLISTS } from "@/lib/fengshui/interior-rules"
import { ROOM_INFO, type RoomType } from "@/lib/fengshui/palaces"
import { CompassCheck } from "@/components/CompassCheck"

// 罗盘单项测量项
const MEASURE_ITEMS: Record<string, { item: string; hint: string }[]> = {
  "master-bedroom": [{ item: "床头朝向", hint: "站在床尾面朝床头方向，手机水平测量。" }],
  "kitchen":        [{ item: "灶口朝向", hint: "站在灶台前，面朝做饭时面对的方向测量。" }],
  "study":          [{ item: "书桌朝向", hint: "坐在书桌前，面朝书桌的方向测量。" }],
}

const CHECKLIST_ROOMS = Object.keys(ROOM_CHECKLISTS) as string[]

export default function RoomDetailScreen() {
  const assessment   = useAppStore((s) => s.assessment)
  const setChecklist = useAppStore((s) => s.setChecklist)

  const [openRoom, setOpenRoom] = useState<string | null>("front-door")
  const [measuring, setMeasuring] = useState<{ room: string; item: string; hint: string } | null>(null)

  const checklists = assessment?.checklists ?? []

  const getAnswers = (room: string) =>
    checklists.find((c) => c.room === room)?.answers ?? {}
  const getMeasurements = (room: string) =>
    checklists.find((c) => c.room === room)?.measurements ?? []

  const setAnswer = (room: string, key: string, value: boolean) => {
    const cur = checklists.find((c) => c.room === room)
    setChecklist({
      room,
      answers: { ...(cur?.answers ?? {}), [key]: value },
      measurements: cur?.measurements,
    })
  }

  const addMeasurement = (room: string, item: string, degree: number, mountain: string) => {
    const cur = checklists.find((c) => c.room === room)
    const rest = (cur?.measurements ?? []).filter((m) => m.item !== item)
    setChecklist({
      room,
      answers: cur?.answers ?? {},
      measurements: [...rest, { item, degree, mountain }],
    })
  }

  const answeredCount = (room: string) => Object.keys(getAnswers(room)).length

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>第 5 步 · 房间细节（可选）</Text>
      <Text style={styles.copy}>
        逐房间回答几个简单问题；不确定的可以跳过。床头/灶口朝向可用罗盘现场测量。
      </Text>

      {CHECKLIST_ROOMS.map((room) => {
        const questions = ROOM_CHECKLISTS[room]
        const answers = getAnswers(room)
        const measurements = getMeasurements(room)
        const info = ROOM_INFO[room as RoomType]
        const open = openRoom === room
        const measures = MEASURE_ITEMS[room] ?? []
        return (
          <View key={room} style={styles.roomCard}>
            <Pressable onPress={() => setOpenRoom(open ? null : room)} style={styles.roomHead}>
              <Text style={styles.roomIcon}>{info?.icon ?? "🏠"}</Text>
              <Text style={styles.roomLabel}>{info?.label ?? room}</Text>
              <Text style={styles.roomMeta}>
                {answeredCount(room)}/{questions.length} 已答
              </Text>
              <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
            </Pressable>

            {open && (
              <View style={styles.roomBody}>
                {questions.map((q) => {
                  const a = answers[q.key]
                  return (
                    <View key={q.key} style={styles.qRow}>
                      <Text style={styles.qText}>{q.question}</Text>
                      <View style={styles.qBtns}>
                        <Pressable
                          onPress={() => setAnswer(room, q.key, true)}
                          style={[styles.qBtn, a === true && styles.qBtnYes]}
                        >
                          <Text style={[styles.qBtnText, a === true && styles.qBtnTextOn]}>是</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setAnswer(room, q.key, false)}
                          style={[styles.qBtn, a === false && styles.qBtnNo]}
                        >
                          <Text style={[styles.qBtnText, a === false && styles.qBtnTextOn]}>否</Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                })}

                {measures.map((m) => {
                  const done = measurements.find((x) => x.item === m.item)
                  return (
                    <Pressable
                      key={m.item}
                      onPress={() => setMeasuring({ room, ...m })}
                      style={styles.measureBtn}
                    >
                      <Text style={styles.measureText}>
                        🧭 {m.item}{done ? `：${Math.round(done.degree)}°（${done.mountain}山）` : "（点击测量）"}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        )
      })}

      <Pressable onPress={() => router.push("/report")} style={styles.nextBtn}>
        <Text style={styles.nextBtnText}>生成综合报告 →</Text>
      </Pressable>

      <CompassCheck
        visible={!!measuring}
        title={measuring?.item ?? ""}
        hint={measuring?.hint ?? ""}
        onConfirm={(deg, mountain) => {
          if (measuring) addMeasurement(measuring.room, measuring.item, deg, mountain)
        }}
        onClose={() => setMeasuring(null)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fffaf3", gap: 12, flexGrow: 1 },
  title:     { fontSize: 24, fontWeight: "800", color: "#2a2118" },
  copy:      { fontSize: 14, color: "#5a4a3c", lineHeight: 22 },

  roomCard: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#eadfce", overflow: "hidden",
  },
  roomHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  roomIcon:  { fontSize: 20 },
  roomLabel: { fontSize: 15, fontWeight: "800", color: "#2a2118", flex: 1 },
  roomMeta:  { fontSize: 12, color: "#8d6b4c" },
  chevron:   { fontSize: 11, color: "#9b8878" },

  roomBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 12, borderTopWidth: 1, borderTopColor: "#f0e8da", paddingTop: 12 },
  qRow:   { gap: 8 },
  qText:  { fontSize: 14, color: "#46392c", lineHeight: 20 },
  qBtns:  { flexDirection: "row", gap: 8 },
  qBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: "#d9cbbb",
    alignItems: "center", backgroundColor: "#faf6f0",
  },
  qBtnYes: { backgroundColor: "#c0392b", borderColor: "#c0392b" },
  qBtnNo:  { backgroundColor: "#2d6a3f", borderColor: "#2d6a3f" },
  qBtnText:   { fontSize: 14, fontWeight: "700", color: "#8d6b4c" },
  qBtnTextOn: { color: "#fff" },

  measureBtn: {
    backgroundColor: "#fdf5ea", borderRadius: 10,
    borderWidth: 1, borderColor: "#e3d0b0", padding: 12,
  },
  measureText: { fontSize: 13, fontWeight: "700", color: "#6b3e1a" },

  nextBtn:     { backgroundColor: "#2a2118", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
})
