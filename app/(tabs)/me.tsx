/**
 * 我的 — 住户命卦档案 · 数据管理 · 隐私与关于
 */
import Constants from "expo-constants"
import { router } from "expo-router"
import { Alert, Platform, StyleSheet, Text, View } from "react-native"
import { useAppStore } from "@/store/useAppStore"
import { isQuickModeProfile } from "@/lib/fengshui/quickmode"
import { personalDirections } from "@/lib/fengshui/personal"
import { Card, Divider, ListRow, Screen, SectionTitle } from "@/components/ui"
import { C } from "@/lib/theme"

export default function MeScreen() {
  const profile      = useAppStore((s) => s.profile)
  const history      = useAppStore((s) => s.history)
  const clearAllData = useAppStore((s) => s.clearAllData)

  const hasProfile = !!profile && !isQuickModeProfile(profile)
  const dirs = hasProfile ? personalDirections(profile!.kuaNumber) : null
  const version = Constants.expoConfig?.version ?? "1.0.0"

  const onClear = () => {
    const msg = "将删除本机上的住户档案、当前评估和全部记录，且无法恢复。"
    if (Platform.OS === "web") { if (window.confirm(msg)) clearAllData(); return }
    Alert.alert("清除全部数据？", msg, [
      { text: "取消", style: "cancel" },
      { text: "全部清除", style: "destructive", onPress: clearAllData },
    ])
  }

  return (
    <Screen topInset>
      <Text style={styles.title}>我的</Text>

      <Card tone="gold" onPress={() => router.push("/setup")}>
        <View style={styles.profileRow}>
          <View style={styles.kuaCircle}>
            <Text style={styles.kuaNum}>{hasProfile ? profile!.kuaNumber : "?"}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.profileTitle}>{hasProfile ? `${dirs?.gua}卦 · ${dirs?.group}` : "填写住户命卦"}</Text>
            <Text style={styles.profileSub}>
              {hasProfile
                ? `${profile!.birthYear} 年 · ${profile!.gender === "male" ? "男" : "女"} · 点此修改`
                : "出生年份 + 性别，解锁人宅匹配和个人吉凶方"}
            </Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </View>
      </Card>

      <Card style={{ gap: 0 }}>
        <SectionTitle>常用</SectionTitle>
        <ListRow icon="☯" title="我的吉凶方" subtitle="床头、书桌、大门宜朝哪里" onPress={() => router.push("/kua")} />
        <Divider />
        <ListRow icon="✨" title="流年飞星" onPress={() => router.push("/annual")} />
        <Divider />
        <ListRow icon="📖" title="风水入门" onPress={() => router.push("/learn")} />
      </Card>

      <Card style={{ gap: 0 }}>
        <SectionTitle>数据与隐私</SectionTitle>
        <ListRow icon="🔒" title="隐私政策" onPress={() => router.push("/privacy")} />
        <Divider />
        <ListRow icon="⚙" title="高级设置" subtitle="自定义 AI 接口（一般无需设置）" onPress={() => router.push("/ai-settings")} />
        <Divider />
        <ListRow
          icon="🗑"
          title="清除本机全部数据"
          subtitle={`${history.length} 条记录`}
          onPress={onClear}
        />
      </Card>

      <Card>
        <SectionTitle>关于</SectionTitle>
        <Text style={styles.about}>
          九宫风水以传统阳宅理论（八宅、玄空飞星、峦头）为依据，结合卫星地图与手机罗盘做环境判断。所有内容仅供文化娱乐参考，不构成购房、投资、装修或健康决策建议。
        </Text>
        <Text style={styles.version}>版本 {version}</Text>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", color: C.text },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  kuaCircle: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: C.gold,
    alignItems: "center", justifyContent: "center", backgroundColor: "#16110b",
  },
  kuaNum:       { fontSize: 26, fontWeight: "900", color: C.goldBright },
  profileTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  profileSub:   { fontSize: 12, color: C.textSub },
  chev:    { fontSize: 24, color: C.textFaint },
  about:   { fontSize: 13, color: C.textSub, lineHeight: 20 },
  version: { fontSize: 11, color: C.textFaint },
})
