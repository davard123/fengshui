/**
 * CompassCheck — 罗盘单次测量弹层
 * 用途：① 大门口验证朝向 ② 房间内单项测量（床头/灶口/书桌朝向）
 * 无传感器时提供手动度数输入。
 */
import { useEffect, useRef, useState } from "react"
import { Modal, View, Text, Pressable, StyleSheet, TextInput } from "react-native"
import { Magnetometer } from "expo-sensors"
import { LuopanView } from "@/components/LuopanView"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"

type Props = {
  visible: boolean
  title: string            // 如 "大门口验证朝向" / "床头朝向"
  hint: string             // 操作说明
  onConfirm: (degree: number, mountain: string) => void
  onClose: () => void
}

function computeHeading(x: number, y: number): number {
  const radians = Math.atan2(-y, x)
  const degrees = radians * (180 / Math.PI)
  return (degrees - 90 + 360) % 360
}

export function CompassCheck({ visible, title, hint, onConfirm, onClose }: Props) {
  const [degree, setDegree] = useState(0)
  const [hasSensor, setHasSensor] = useState<boolean | null>(null)
  const [stable, setStable] = useState(false)
  const [manualDeg, setManualDeg] = useState("")
  const readingsRef = useRef<number[]>([])

  useEffect(() => {
    if (!visible) return
    let mounted = true
    let sub: { remove: () => void } | null = null

    const start = async () => {
      const available = await Magnetometer.isAvailableAsync()
      if (!mounted) return
      setHasSensor(available)
      if (!available) return
      Magnetometer.setUpdateInterval(100)
      sub = Magnetometer.addListener(({ x, y }) => {
        const heading = computeHeading(x, y)
        readingsRef.current = [...readingsRef.current.slice(-2), heading]
        setDegree(heading)
        const r = readingsRef.current
        setStable(r.length >= 3 && Math.max(...r) - Math.min(...r) < 5)
      })
    }
    void start()
    return () => { mounted = false; sub?.remove() }
  }, [visible])

  const mountain = degreeToMountain24(degree)

  const confirmSensor = () => {
    onConfirm(degree, mountain.name)
    onClose()
  }
  const confirmManual = () => {
    const d = parseFloat(manualDeg)
    if (isNaN(d) || d < 0 || d >= 360) return
    onConfirm(d, degreeToMountain24(d).name)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>

          {hasSensor === false ? (
            <View style={styles.manualBox}>
              <Text style={styles.manualLabel}>当前环境无罗盘传感器，手动输入度数（0-359）：</Text>
              <TextInput
                value={manualDeg} onChangeText={setManualDeg}
                keyboardType="number-pad" maxLength={5}
                placeholder="如 184" placeholderTextColor="#bfad9c"
                style={styles.manualInput}
              />
              <Pressable
                onPress={confirmManual}
                disabled={!manualDeg.trim()}
                style={[styles.confirmBtn, !manualDeg.trim() && styles.btnDisabled]}
              >
                <Text style={styles.confirmText}>确认</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <LuopanView degree={degree} isStable={stable} locked={false} />
              <Pressable
                onPress={confirmSensor}
                disabled={!stable}
                style={[styles.confirmBtn, !stable && styles.btnDisabled]}
              >
                <Text style={styles.confirmText}>
                  {stable ? `锁定 ${Math.round(degree)}°（${mountain.name}山）` : "等待读数稳定…"}
                </Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fcf8f1",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, gap: 14, alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#2a2118" },
  hint:  { fontSize: 13, color: "#5a4a3c", lineHeight: 20, textAlign: "center" },

  manualBox:   { width: "100%", gap: 10 },
  manualLabel: { fontSize: 13, color: "#5a4a3c" },
  manualInput: {
    borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 12,
    padding: 14, fontSize: 18, textAlign: "center",
    backgroundColor: "#fff", color: "#2a2118",
  },

  confirmBtn: {
    width: "100%", backgroundColor: "#2a2118",
    paddingVertical: 14, borderRadius: 14, alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#bfad9c" },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  cancelBtn:   { paddingVertical: 8 },
  cancelText:  { color: "#8d6b4c", fontSize: 14, textDecorationLine: "underline" },
})
