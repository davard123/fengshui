/**
 * CompassCheck — 罗盘单次测量弹层
 * 用途：① 大门口验证朝向 ② 房间单项测量 ③ 站在太极点格定房间宫位
 *
 * 读数来源（优先级）：
 *   1. expo-location watchHeadingAsync —— iOS 原生罗盘融合输出：
 *      倾斜补偿 + 磁偏角校正（trueHeading=真北），精度远高于裸磁力计
 *   2. expo-sensors Magnetometer —— 原生罗盘不可用时的兜底（磁北，未补偿）
 *   3. 手动输入度数 —— Web/无传感器环境
 */
import { useEffect, useRef, useState } from "react"
import { Modal, View, Text, Pressable, StyleSheet, TextInput } from "react-native"
import * as Location from "expo-location"
import { Magnetometer } from "expo-sensors"
import { LuopanView } from "@/components/LuopanView"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"

type Props = {
  visible: boolean
  title: string
  hint: string
  onConfirm: (degree: number, mountain: string) => void
  onClose: () => void
}

type SourceKind = "ios-true" | "ios-mag" | "magnetometer" | "none"

function computeHeadingFromMag(x: number, y: number): number {
  const radians = Math.atan2(-y, x)
  const degrees = radians * (180 / Math.PI)
  return (degrees - 90 + 360) % 360
}

export function CompassCheck({ visible, title, hint, onConfirm, onClose }: Props) {
  const [degree, setDegree] = useState(0)
  const [source, setSource] = useState<SourceKind | null>(null)
  const [stable, setStable] = useState(false)
  const [manualDeg, setManualDeg] = useState("")
  const readingsRef = useRef<number[]>([])

  useEffect(() => {
    if (!visible) return
    let mounted = true
    let headingSub: Location.LocationSubscription | null = null
    let magSub: { remove: () => void } | null = null
    readingsRef.current = []
    setStable(false)

    const pushReading = (heading: number) => {
      readingsRef.current = [...readingsRef.current.slice(-2), heading]
      setDegree(heading)
      const r = readingsRef.current
      // 环形稳定判定（避免 359/1 跨界误判不稳）
      if (r.length >= 3) {
        const spread = Math.max(...r.map((a) => Math.min(
          Math.abs(a - r[0]),
          360 - Math.abs(a - r[0]),
        )))
        setStable(spread < 5)
      }
    }

    const start = async () => {
      // ① iOS/Android 原生罗盘（需定位权限，trueHeading 自动做磁偏角校正）
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (mounted && status === "granted") {
          headingSub = await Location.watchHeadingAsync((h) => {
            if (!mounted) return
            // trueHeading >= 0 表示真北可用（iOS 自动磁偏角校正）；-1 = 不可用
            if (h.trueHeading >= 0) {
              setSource("ios-true")
              pushReading(h.trueHeading)
            } else if (h.magHeading >= 0) {
              setSource("ios-mag")
              pushReading(h.magHeading)
            }
          })
          return
        }
      } catch {}

      // ② 磁力计兜底
      try {
        const available = await Magnetometer.isAvailableAsync()
        if (!mounted) return
        if (available) {
          setSource("magnetometer")
          Magnetometer.setUpdateInterval(100)
          magSub = Magnetometer.addListener(({ x, y }) => {
            pushReading(computeHeadingFromMag(x, y))
          })
          return
        }
      } catch {}

      // ③ 都没有 → 手动输入
      if (mounted) setSource("none")
    }
    void start()

    return () => {
      mounted = false
      headingSub?.remove()
      magSub?.remove()
    }
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

  const sourceLabel =
    source === "ios-true" ? "✓ 系统罗盘（真北，已磁偏角校正）" :
    source === "ios-mag" ? "系统罗盘（磁北）" :
    source === "magnetometer" ? "磁力计（磁北，建议画 8 字校准）" : null

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>

          {source === "none" ? (
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
              {sourceLabel && <Text style={styles.sourceText}>{sourceLabel}</Text>}
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
  sourceText: { fontSize: 11, color: "#2d6a3f", fontWeight: "600" },

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
