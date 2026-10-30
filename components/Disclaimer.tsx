/**
 * 首次启动欢迎页 + 免责声明（同意后才进入应用）
 */
import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { LuopanMark } from "@/components/LuopanMark"
import { Button, Card, Screen } from "@/components/ui"
import { C } from "@/lib/theme"

const POINTS: [string, string][] = [
  ["🛰", "卫星图定位房屋轮廓，自动求出宅中心"],
  ["🧭", "手机罗盘实测朝向，精确到二十四山"],
  ["☯", "八宅 · 玄空飞星 · 峦头形煞 · 流年 四法合参"],
  ["🔒", "资料只存本机，无需注册账号"],
]

export function Disclaimer() {
  const acceptDisclaimer = useAppStore((state) => state.acceptDisclaimer)

  return (
    <Screen topInset>
      <View style={styles.hero}>
        <LuopanMark size={200} needle={-18} />
        <Text style={styles.brand}>九宫风水</Text>
        <Text style={styles.tagline}>用一部手机，看懂你家的风水格局</Text>
      </View>

      <Card>
        {POINTS.map(([icon, text]) => (
          <View key={text} style={styles.point}>
            <Text style={styles.pointIcon}>{icon}</Text>
            <Text style={styles.pointText}>{text}</Text>
          </View>
        ))}
      </Card>

      <Card tone="warn">
        <Text style={styles.discTitle}>使用前请知悉</Text>
        <Text style={styles.discText}>
          本应用基于传统风水文化与简化的环境判断，内容仅供文化娱乐参考，不构成购房、投资、装修、健康或任何其他决策建议。
        </Text>
        <Text style={styles.discText}>
          定位时，你输入的地址与房屋坐标会发送给第三方地图服务（OpenStreetMap、Esri）以显示卫星图和周边地物；生成 AI 深度报告时，报告摘要会发送给 AI 服务。除此之外资料只保存在本机。
        </Text>
        <Text style={styles.link} onPress={() => router.push("/privacy")}>查看完整隐私政策 ›</Text>
      </Card>

      <Button title="我已知晓，开始使用" onPress={acceptDisclaimer} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero:    { alignItems: "center", gap: 10, paddingVertical: 12 },
  brand:   { fontSize: 34, fontWeight: "900", color: C.goldBright, letterSpacing: 8 },
  tagline: { fontSize: 14, color: C.textSub },
  point:     { flexDirection: "row", gap: 12, alignItems: "center" },
  pointIcon: { fontSize: 20, width: 28, textAlign: "center" },
  pointText: { fontSize: 14, color: C.text, flex: 1, lineHeight: 20 },
  discTitle: { fontSize: 15, fontWeight: "800", color: C.warn },
  discText:  { fontSize: 13, color: C.textSub, lineHeight: 20 },
  link:      { fontSize: 13, color: C.goldBright, fontWeight: "700" },
})
