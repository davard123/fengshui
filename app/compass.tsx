import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Magnetometer } from "expo-sensors";
import { LuopanView } from "@/components/LuopanView";
import { useAppStore } from "@/store/useAppStore";
import { degreeToDirection, directionToChinese, isFacingStable } from "@/lib/fengshui/direction";
import type { StandingPointType } from "@/types/fengshui";

const MANUAL_DIRECTIONS = [
  { direction: "N", degree: 0 },
  { direction: "NE", degree: 45 },
  { direction: "E", degree: 90 },
  { direction: "SE", degree: 135 },
  { direction: "S", degree: 180 },
  { direction: "SW", degree: 225 },
  { direction: "W", degree: 270 },
  { direction: "NW", degree: 315 },
] as const;

function computeHeading(x: number, y: number): number {
  const radians = Math.atan2(-y, x);
  const degrees = radians * (180 / Math.PI);
  return (degrees - 90 + 360) % 360;
}

// ── 各站点专属引导语 ──────────────────────────────────────────────────────────
const POINT_INSTRUCTIONS: Record<StandingPointType | "default", { copy: string; tip: string }> = {
  outdoor: {
    copy: "站在房子大门外（Front Door），背对大门，手机水平，对准您面向的方向锁定——记录的是房子大门朝向。如果有院子，院门请在「院子中心」站点单独标记。",
    tip:  "提示：先在空中画 8 字校准。大门 = 房子入户门，不是院门。",
  },
  "house-center": {
    copy: "站在全屋几何中心（通常是客厅中间），手机保持水平，面朝大门方向，等读数稳定后锁定。",
    tip:  "提示：全屋中心的朝向应与大门朝向一致。",
  },
  "living-room": {
    copy: "站在客厅中心，手机保持水平，面朝客厅主墙或电视墙方向，等读数稳定后锁定。",
    tip:  "提示：客厅朝向通常与大门相近。",
  },
  "master-bedroom": {
    copy: "站在主卧中心，手机保持水平，面朝床头方向，等读数稳定后锁定。",
    tip:  "提示：床头朝向对健康与婚姻影响最大。",
  },
  kitchen: {
    copy: "站在厨房中心，手机保持水平，面朝灶台方向，等读数稳定后锁定。",
    tip:  "提示：灶台朝向（厨师面朝的方向）是厨房风水的关键。",
  },
  study: {
    copy: "站在书房中心，手机保持水平，面朝书桌方向，等读数稳定后锁定。",
    tip:  "提示：书桌朝向影响文昌与学业运。",
  },
  "front-door-inside": {
    copy: "站在大门内侧（进门后的玄关处），手机保持水平，背对大门，等读数稳定后锁定。",
    tip:  "提示：记录的是进门后气流走向的方向。",
  },
  yard: {
    copy: "站在院子中心，手机保持水平，面朝院门（Yard Gate）方向，等读数稳定后锁定。这是「外太极」，记录的是院子整体气口。",
    tip:  "提示：院门与房子大门方向不同时尤其重要；若无院子或院门，可跳过此站点。",
  },
  garage: {
    copy: "站在车库中心，手机保持水平，面朝车库大门方向，等读数稳定后锁定。",
    tip:  "提示：车库门朝向影响动财与出行运势。",
  },
  custom: {
    copy: "站在该位置中心，手机保持水平，面朝主要出入方向，等读数稳定后锁定。",
    tip:  "提示：先在空中画 8 字有助于校准。",
  },
  default: {
    copy: "站在该位置中心，手机保持水平，面朝主要方向，等读数稳定后锁定。",
    tip:  "提示：先在空中画 8 字有助于校准罗盘。",
  },
}

export default function CompassScreen() {
  const compass = useAppStore((state) => state.compass);
  const setCompass = useAppStore((state) => state.setCompass);
  const updateCurrentPointDraft = useAppStore((state) => state.updateCurrentPointDraft);
  const currentPointDraft = useAppStore((state) => state.currentPointDraft);

  // 根据当前站点类型取引导语
  const pointType = (currentPointDraft?.type ?? "default") as StandingPointType | "default";
  const instruction = POINT_INSTRUCTIONS[pointType] ?? POINT_INSTRUCTIONS.default;

  const [isStable, setIsStable] = useState(false);
  const [hasSensor, setHasSensor] = useState<boolean | null>(null);
  const readingsRef = useRef<number[]>([]);
  const lockedRef = useRef(compass.locked);

  useEffect(() => {
    lockedRef.current = compass.locked;
  }, [compass.locked]);

  useEffect(() => {
    let mounted = true;
    let subscription: { remove: () => void } | null = null;

    const start = async () => {
      const available = await Magnetometer.isAvailableAsync();
      if (!mounted) return;

      setHasSensor(available);
      if (!available) return;

      Magnetometer.setUpdateInterval(100);
      subscription = Magnetometer.addListener(({ x, y }) => {
        if (lockedRef.current) return;

        const heading = computeHeading(x, y);
        readingsRef.current = [...readingsRef.current.slice(-2), heading];

        setCompass({
          degree: heading,
          direction: degreeToDirection(heading),
        });
        setIsStable(isFacingStable(readingsRef.current, 3));
      });
    };

    void start();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [setCompass]);

  const lockCompass = () => {
    const canLock = hasSensor === false ? !!compass.direction : isStable;
    if (!canLock) return;
    setCompass({ locked: true });
    // 把朝向写入当前站点草稿
    updateCurrentPointDraft({
      compassDegree: compass.degree,
      compassDirection: compass.direction,
    });
    router.push("/direction-map");
  };

  const buttonDisabled = compass.locked || (hasSensor === false ? !compass.direction : !isStable);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>罗盘采集</Text>
      {currentPointDraft?.label && (
        <Text style={styles.pointLabel}>📍 {currentPointDraft.label}</Text>
      )}
      <Text style={styles.copy}>{instruction.copy}</Text>
      <Text style={styles.tip}>{instruction.tip}</Text>

      {hasSensor === false ? (
        <View style={styles.manualBox}>
          <Text style={styles.manualTitle}>手动选择朝向</Text>
          <Text style={styles.manualCopy}>
            当前预览环境无法访问罗盘传感器。请选择房屋大门朝向，继续完成整套看房流程。
          </Text>
          <View style={styles.manualGrid}>
            {MANUAL_DIRECTIONS.map((option) => {
              const selected = compass.direction === option.direction;
              return (
                <Pressable
                  key={option.direction}
                  onPress={() =>
                    setCompass({
                      degree: option.degree,
                      direction: option.direction,
                      locked: false,
                    })
                  }
                  style={[styles.manualPill, selected && styles.manualPillActive]}
                >
                  <Text style={[styles.manualPillText, selected && styles.manualPillTextActive]}>
                    {directionToChinese(option.direction)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <LuopanView
          degree={compass.degree}
          isStable={isStable}
          locked={compass.locked}
        />
      )}

      <Pressable
        onPress={lockCompass}
        disabled={buttonDisabled}
        style={[styles.button, buttonDisabled && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {compass.locked
            ? `已锁定：${directionToChinese(compass.direction as any)}（${Math.round(compass.degree)}°）`
            : hasSensor === false
              ? `使用 ${directionToChinese(compass.direction as any)} 继续`
              : isStable
                ? "锁定当前朝向"
                : "等待读数稳定..."}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fcf8f1",
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2a2118",
  },
  pointLabel: {
    fontSize: 13,
    color: "#8d6b4c",
    fontWeight: "700",
    marginTop: -6,
  },
  copy: {
    color: "#5a4a3c",
    lineHeight: 22,
  },
  tip: {
    color: "#8d6b4c",
    fontSize: 13,
    fontStyle: "italic",
  },
  manualBox: {
    minHeight: 280,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 14,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2a2118",
  },
  manualCopy: {
    color: "#5a4a3c",
    lineHeight: 22,
  },
  manualGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  manualPill: {
    minWidth: "47%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#efe4d4",
    alignItems: "center",
  },
  manualPillActive: {
    backgroundColor: "#2a2118",
  },
  manualPillText: {
    color: "#3a2f25",
    fontWeight: "700",
  },
  manualPillTextActive: {
    color: "#fff",
  },
  button: {
    marginTop: "auto",
    backgroundColor: "#2a2118",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#bfad9c",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
