import { Pressable, Text, View, StyleSheet } from "react-native";
import { useAppStore } from "@/store/useAppStore";

export function Disclaimer() {
  const acceptDisclaimer = useAppStore((state) => state.acceptDisclaimer);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>免责声明</Text>
      <Text style={styles.copy}>
        本报告基于传统风水文化与简化环境判断，仅供娱乐参考，不构成购房、投资或居住决策建议。
      </Text>
      <Text style={styles.copy}>
        如后续启用地址联想、地图或坐标展示，相关地址与坐标信息可能会发送给第三方地图服务商以完成展示。
      </Text>
      <Pressable onPress={acceptDisclaimer} style={styles.button}>
        <Text style={styles.buttonText}>我已知晓并同意</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2a2118",
  },
  copy: {
    color: "#5a4a3c",
    lineHeight: 22,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#2a2118",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
