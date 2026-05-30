import { useState, useEffect } from "react"
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native"
import {
  getMinimaxKey, setMinimaxKey, removeMinimaxKey, hasMinimaxKey,
  getMinimaxModel, setMinimaxModel,
  getClaudeKey,  setClaudeKey,  removeClaudeKey,
} from "@/lib/ai-client"

export default function SettingsScreen() {
  const [mmKey,    setMmKey]    = useState("")
  const [mmModel,  setMmModel]  = useState("")
  const [claudeKey, setClaudeKeyState] = useState("")
  const [mmHas,    setMmHas]    = useState(false)
  const [mmSaved,  setMmSaved]  = useState(false)
  const [modelSaved, setModelSaved] = useState(false)
  const [masked,   setMasked]   = useState(true)
  const [currentModel, setCurrentModel] = useState("MiniMax-M2.7-highspeed")

  useEffect(() => {
    hasMinimaxKey().then(setMmHas)
    getMinimaxModel().then(setCurrentModel)
  }, [])

  const handleSaveMM = async () => {
    if (!mmKey.trim()) return
    await setMinimaxKey(mmKey.trim())
    setMmKey("")
    setMmHas(true)
    setMmSaved(true)
    setTimeout(() => setMmSaved(false), 2000)
  }

  const handleRemoveMM = () => {
    Alert.alert("删除 MiniMax Key", "确认删除？", [
      { text: "取消", style: "cancel" },
      { text: "确认删除", style: "destructive", onPress: async () => {
        await removeMinimaxKey(); setMmHas(false)
      }},
    ])
  }

  const handleSaveModel = async () => {
    if (!mmModel.trim()) return
    await setMinimaxModel(mmModel.trim())
    setCurrentModel(mmModel.trim())
    setMmModel("")
    setModelSaved(true)
    setTimeout(() => setModelSaved(false), 2000)
  }

  const handleSaveClaude = async () => {
    if (!claudeKey.trim()) return
    await setClaudeKey(claudeKey.trim())
    setClaudeKeyState("")
    Alert.alert("已保存", "Claude API Key 已保存（备用）")
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>设置</Text>

      {/* MiniMax（主要） */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>MiniMax API Key</Text>
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>主要</Text>
          </View>
        </View>
        <Text style={styles.cardDesc}>
          用于 AI 风水分析。Key 仅保存在本机，不上传服务器。
        </Text>
        <Text style={styles.link}>申请地址：platform.minimaxi.com</Text>
        <Text style={styles.link}>API 地址：api.minimaxi.com/v1</Text>

        {mmHas && (
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>已配置 MiniMax Key</Text>
            <Pressable onPress={handleRemoveMM} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>删除</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={mmKey}
            onChangeText={setMmKey}
            placeholder={mmHas ? "输入新 Key 替换" : "eyJ..."}
            placeholderTextColor="#bfad9c"
            secureTextEntry={masked}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable onPress={() => setMasked(v => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{masked ? "显示" : "隐藏"}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleSaveMM}
          disabled={!mmKey.trim()}
          style={[styles.saveBtn, !mmKey.trim() && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveBtnText}>
            {mmSaved ? "已保存 ✓" : "保存 MiniMax Key"}
          </Text>
        </Pressable>

        {/* 模型名配置 */}
        <View style={styles.divider}/>
        <Text style={styles.subTitle}>模型名称</Text>
        <Text style={styles.cardDesc}>
          当前：<Text style={styles.modelName}>{currentModel}</Text>
        </Text>
        <Text style={styles.cardDesc}>
          可选模型：{"\n"}
          · MiniMax-M2.7-highspeed（推荐，速度快）{"\n"}
          · MiniMax-M2.7（更强，速度稍慢）{"\n"}
          · MiniMax-M2.5-highspeed{"\n"}
          · MiniMax-M2.5
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={mmModel}
            onChangeText={setMmModel}
            placeholder="输入模型名，如 MiniMax-Text-01"
            placeholderTextColor="#bfad9c"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>
        <Pressable
          onPress={handleSaveModel}
          disabled={!mmModel.trim()}
          style={[styles.saveBtn, styles.saveBtnSecondary, !mmModel.trim() && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveBtnText}>
            {modelSaved ? "已更新 ✓" : "更新模型名"}
          </Text>
        </Pressable>
      </View>

      {/* Claude（备用） */}
      <View style={[styles.card, styles.cardSecondary]}>
        <Text style={styles.cardTitle}>Claude API Key（备用）</Text>
        <Text style={styles.cardDesc}>
          未配置 MiniMax 时自动使用 Claude。两个都配置则优先 MiniMax。
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={claudeKey}
            onChangeText={setClaudeKeyState}
            placeholder="sk-ant-api03-…"
            placeholderTextColor="#bfad9c"
            secureTextEntry={masked}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </View>
        <Pressable
          onPress={handleSaveClaude}
          disabled={!claudeKey.trim()}
          style={[styles.saveBtn, styles.saveBtnSecondary, !claudeKey.trim() && styles.saveBtnDisabled]}
        >
          <Text style={styles.saveBtnText}>保存 Claude Key</Text>
        </Pressable>
      </View>

      {/* 关于 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>关于本应用</Text>
        <Text style={styles.cardDesc}>
          本报告基于传统风水文化与简化环境判断，仅供娱乐参考，不构成购房、投资或居住决策建议。
        </Text>
        <Text style={styles.cardDesc}>
          所有数据保存在本机设备，不上传任何服务器（AI 分析请求除外）。
        </Text>
        <Text style={styles.version}>v2.1.0 · Fengshui Reference App</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:      { padding: 24, backgroundColor: "#fffaf3", gap: 16 },
  title:          { fontSize: 28, fontWeight: "800", color: "#2a2118" },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: "#eadfce", gap: 12,
  },
  cardSecondary:  { opacity: 0.85 },
  cardTitleRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle:      { fontSize: 17, fontWeight: "800", color: "#2a2118" },
  primaryBadge:   { backgroundColor: "#2a2118", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBadgeText: { color: "#f0d060", fontSize: 11, fontWeight: "700" },
  cardDesc:       { fontSize: 13, color: "#5a4a3c", lineHeight: 20 },
  link:           { fontSize: 13, color: "#8d6b4c", fontWeight: "600" },
  statusRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4a7c59" },
  statusText:     { fontSize: 13, color: "#4a7c59", fontWeight: "700", flex: 1 },
  removeBtn:      { backgroundColor: "#f0e8da", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  removeBtnText:  { color: "#c0392b", fontWeight: "700", fontSize: 12 },
  inputRow:       { flexDirection: "row", gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: "#d9cbbb", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#faf6f0",
    fontSize: 13, color: "#2a2118",
  },
  eyeBtn:         { justifyContent: "center", paddingHorizontal: 12 },
  eyeText:        { color: "#8d6b4c", fontWeight: "700", fontSize: 13 },
  saveBtn:        { backgroundColor: "#2a2118", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  saveBtnSecondary: { backgroundColor: "#8d6b4c" },
  saveBtnDisabled:{ backgroundColor: "#bfad9c" },
  saveBtnText:    { color: "#fff", fontWeight: "800" },
  version:        { fontSize: 11, color: "#bfad9c", marginTop: 4 },
  divider:        { height: 1, backgroundColor: "#f0e8da" },
  subTitle:       { fontSize: 14, fontWeight: "800", color: "#2a2118" },
  modelName:      { color: "#8d6b4c", fontWeight: "700" },
})
