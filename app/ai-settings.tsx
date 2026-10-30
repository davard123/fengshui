/**
 * 高级设置 — 自备 AI Key（可选）
 * 正常情况下深度报告走开发者服务器，无需任何配置；这里只给想用自己 Key 的高级用户。
 */
import { useEffect, useState } from "react"
import { Alert, Platform, StyleSheet, Text, View } from "react-native"
import {
  setMinimaxKey, removeMinimaxKey, hasMinimaxKey,
  getMinimaxModel, setMinimaxModel,
  getClaudeKey, setClaudeKey, removeClaudeKey,
} from "@/lib/ai-client"
import { Badge, Button, Card, Field, Notice, Screen, SectionTitle } from "@/components/ui"
import { C } from "@/lib/theme"

function confirmRemove(title: string, onYes: () => void) {
  if (Platform.OS === "web") { if (window.confirm(title)) onYes(); return }
  Alert.alert(title, "确认删除？", [
    { text: "取消", style: "cancel" },
    { text: "删除", style: "destructive", onPress: onYes },
  ])
}

export default function AiSettingsScreen() {
  const [mmKey, setMmKey]       = useState("")
  const [mmHas, setMmHas]       = useState(false)
  const [model, setModel]       = useState("")
  const [curModel, setCurModel] = useState("")
  const [claudeKey, setClaude]  = useState("")
  const [claudeHas, setClaudeHas] = useState(false)
  const [saved, setSaved]       = useState<string | null>(null)

  useEffect(() => {
    hasMinimaxKey().then(setMmHas)
    getMinimaxModel().then(setCurModel)
    getClaudeKey().then((k) => setClaudeHas(!!k))
  }, [])

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(null), 2000) }

  return (
    <Screen>
      <Notice tone="info">
        一般用户无需设置：深度报告默认由我们的服务器生成。只有服务器不可用时，才会依次尝试你在这里填写的 Key；全部失败时自动使用离线规则版报告。
      </Notice>
      {saved && <Notice tone="good">{saved}</Notice>}

      <Card>
        <SectionTitle right={mmHas ? <Badge label="已配置" tone="good" /> : undefined}>MiniMax API Key</SectionTitle>
        <Text style={styles.desc}>Key 只保存在本机。申请：platform.minimaxi.com</Text>
        <Field
          value={mmKey} onChangeText={setMmKey}
          placeholder={mmHas ? "输入新 Key 替换" : "粘贴 Key"}
          secureTextEntry autoCapitalize="none" autoCorrect={false}
        />
        <View style={styles.row}>
          <Button small title="保存" style={{ flex: 1 }} disabled={!mmKey.trim()}
            onPress={async () => { await setMinimaxKey(mmKey); setMmKey(""); setMmHas(true); flash("MiniMax Key 已保存") }} />
          {mmHas && (
            <Button small variant="danger" title="删除" style={{ flex: 1 }}
              onPress={() => confirmRemove("删除 MiniMax Key", async () => { await removeMinimaxKey(); setMmHas(false) })} />
          )}
        </View>
        <Field
          label={`模型名（当前：${curModel}）`}
          value={model} onChangeText={setModel}
          placeholder="如 MiniMax-M2.7-highspeed" autoCapitalize="none" autoCorrect={false}
        />
        <Button small variant="secondary" title="更新模型名" disabled={!model.trim()}
          onPress={async () => { await setMinimaxModel(model); setCurModel(model.trim()); setModel(""); flash("模型名已更新") }} />
      </Card>

      <Card>
        <SectionTitle right={claudeHas ? <Badge label="已配置" tone="good" /> : undefined}>Claude API Key（备用）</SectionTitle>
        <Field
          value={claudeKey} onChangeText={setClaude}
          placeholder="sk-ant-…" secureTextEntry autoCapitalize="none" autoCorrect={false}
        />
        <View style={styles.row}>
          <Button small title="保存" style={{ flex: 1 }} disabled={!claudeKey.trim()}
            onPress={async () => { await setClaudeKey(claudeKey); setClaude(""); setClaudeHas(true); flash("Claude Key 已保存") }} />
          {claudeHas && (
            <Button small variant="danger" title="删除" style={{ flex: 1 }}
              onPress={() => confirmRemove("删除 Claude Key", async () => { await removeClaudeKey(); setClaudeHas(false) })} />
          )}
        </View>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  desc: { fontSize: 12, color: C.textMuted },
  row:  { flexDirection: "row", gap: 10 },
})
