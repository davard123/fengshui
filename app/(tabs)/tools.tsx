/**
 * 工具 — 不需要完整勘宅也能用的独立功能
 */
import { router } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { Card, Screen } from "@/components/ui"
import { useAppStore } from "@/store/useAppStore"
import { C } from "@/lib/theme"

const TOOLS = [
  { icon: "🧭", title: "罗盘", desc: "实时读取朝向，显示二十四山、八卦方位", route: "/compass" },
  { icon: "☯", title: "个人命卦 · 吉凶方", desc: "出生年份算命卦，查自己的四吉四凶方位", route: "/kua" },
  { icon: "✨", title: "流年飞星", desc: "今年/明年九宫飞星、五黄二黑、太岁三煞方位", route: "/annual" },
  { icon: "📖", title: "风水入门", desc: "八宅、玄空、峦头等术语一页看懂", route: "/learn" },
] as const

export default function ToolsScreen() {
  const accepted = useAppStore((s) => s.hasAcceptedDisclaimer)
  return (
    <Screen topInset>
      <Text style={styles.title}>风水工具</Text>
      <Text style={styles.sub}>不必完整勘宅，也能随手查</Text>
      <View style={styles.grid}>
        {TOOLS.map((t) => (
          <Card key={t.title} style={styles.tile} onPress={accepted ? () => router.push(t.route) : undefined}>
            <Text style={styles.icon}>{t.icon}</Text>
            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileDesc}>{t.desc}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", color: C.text },
  sub:   { fontSize: 13, color: C.textMuted, marginTop: -10 },
  grid:  { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile:  { width: "47%", flexGrow: 1, minHeight: 150, gap: 6 },
  icon:  { fontSize: 30 },
  tileTitle: { fontSize: 16, fontWeight: "800", color: C.goldBright },
  tileDesc:  { fontSize: 12, color: C.textMuted, lineHeight: 18 },
})
