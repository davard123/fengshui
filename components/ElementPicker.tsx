import { useState } from "react"
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, TextInput,
} from "react-native"
import type { ElementGroup } from "@/lib/fengshui/elements"

type Props = {
  visible: boolean
  direction: string        // 山名或方位名，如 "子" / "N"
  elementGroups: ElementGroup[]
  selected: string[]       // 已选中的元素
  onConfirm: (selected: string[]) => void
  onClose: () => void
}

export function ElementPicker({ visible, direction, elementGroups, selected, onConfirm, onClose }: Props) {
  const [current, setCurrent] = useState<string[]>(selected)

  const toggle = (item: string) => {
    setCurrent((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    )
  }

  const handleConfirm = () => {
    onConfirm(current)
    onClose()
  }

  const handleClear = () => setCurrent([])

  // 同步外部 selected 变化（每次打开重置）
  const handleShow = () => setCurrent(selected)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onShow={handleShow}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>{direction} 方向</Text>
          <Pressable onPress={handleClear}>
            <Text style={styles.clearBtn}>清空</Text>
          </Pressable>
        </View>

        {/* 已选标签预览 */}
        {current.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagRow}>
            {current.map((tag) => (
              <Pressable key={tag} onPress={() => toggle(tag)} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{tag} ×</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* 元素分组列表 */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {elementGroups.map((group) => (
            <View key={group.group} style={styles.group}>
              <Text style={styles.groupTitle}>{group.group}</Text>
              <View style={styles.chipRow}>
                {group.items.map((item) => {
                  const isOn = current.includes(item)
                  return (
                    <Pressable
                      key={item}
                      onPress={() => toggle(item)}
                      style={[styles.chip, isOn && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, isOn && styles.chipTextOn]}>
                        {item}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* 确认按钮 */}
        <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
          <Text style={styles.confirmText}>
            确认（{current.length} 项）
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2a2118",
  },
  clearBtn: {
    color: "#8d6b4c",
    fontWeight: "700",
  },
  tagRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
    maxHeight: 40,
  },
  selectedTag: {
    backgroundColor: "#2a2118",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 16,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8d6b4c",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#d9cbbb",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#faf6f0",
  },
  chipOn: {
    backgroundColor: "#8d6b4c",
    borderColor: "#8d6b4c",
  },
  chipText: {
    fontSize: 13,
    color: "#46392c",
  },
  chipTextOn: {
    color: "#fff",
    fontWeight: "700",
  },
  confirmBtn: {
    margin: 16,
    backgroundColor: "#2a2118",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
})
