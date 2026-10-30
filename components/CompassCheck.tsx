/**
 * CompassCheck — 罗盘单次测量弹层
 * 用途：① 大门口验证朝向 ② 房间单项测量 ③ 站在太极点定房间宫位
 */
import { useState } from "react"
import { Modal, View, Text, StyleSheet } from "react-native"
import { LuopanView } from "@/components/LuopanView"
import { Button, Field } from "@/components/ui"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"
import { useHeading, headingSourceLabel } from "@/lib/useHeading"
import { C } from "@/lib/theme"

type Props = {
  visible: boolean
  title: string
  hint: string
  onConfirm: (degree: number, mountain: string) => void
  onClose: () => void
}

export function CompassCheck({ visible, title, hint, onConfirm, onClose }: Props) {
  const { degree, source, stable } = useHeading(visible)
  const [manualDeg, setManualDeg] = useState("")
  const [manualMode, setManualMode] = useState(false)

  const mountain = degreeToMountain24(degree)
  const showManual = source === "none" || manualMode

  const confirmSensor = () => {
    onConfirm(degree, mountain.name)
    onClose()
  }
  const manualVal = parseFloat(manualDeg)
  const manualValid = !isNaN(manualVal) && manualVal >= 0 && manualVal < 360
  const confirmManual = () => {
    if (!manualValid) return
    onConfirm(manualVal, degreeToMountain24(manualVal).name)
    setManualDeg("")
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>

          {showManual ? (
            <View style={styles.manualBox}>
              <Field
                label={source === "none" ? "当前设备没有罗盘传感器，请手动输入度数（0–359）" : "手动输入度数（0–359，可用其他罗盘读数）"}
                value={manualDeg}
                onChangeText={setManualDeg}
                keyboardType="number-pad"
                maxLength={5}
                placeholder="如 184"
                style={{ textAlign: "center", fontSize: 20 }}
              />
              {manualValid && (
                <Text style={styles.manualPreview}>
                  {Math.round(manualVal)}° · {degreeToMountain24(manualVal).name}山 · {degreeToMountain24(manualVal).sector}方
                </Text>
              )}
              <Button title="确认" onPress={confirmManual} disabled={!manualValid} />
            </View>
          ) : (
            <>
              <LuopanView degree={degree} isStable={stable} locked={false} />
              {headingSourceLabel(source) && <Text style={styles.sourceText}>{headingSourceLabel(source)}</Text>}
              <Button
                title={stable ? `锁定 ${Math.round(degree)}°（${mountain.name}山）` : "等待读数稳定…"}
                onPress={confirmSensor}
                disabled={!stable}
                style={{ alignSelf: "stretch" }}
              />
            </>
          )}

          {source !== "none" && (
            <Button
              small variant="ghost"
              title={manualMode ? "改用手机罗盘" : "手动输入度数"}
              onPress={() => setManualMode((v) => !v)}
            />
          )}
          <Button small variant="ghost" title="取消" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: C.line,
    padding: 22, paddingBottom: 34, gap: 12, alignItems: "center",
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.lineStrong, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "800", color: C.text },
  hint:  { fontSize: 13, color: C.textSub, lineHeight: 20, textAlign: "center" },
  sourceText: { fontSize: 11, color: C.good, fontWeight: "600" },
  manualBox:  { width: "100%", gap: 10 },
  manualPreview: { textAlign: "center", color: C.goldBright, fontWeight: "800" },
})
