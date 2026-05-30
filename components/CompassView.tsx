import { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet } from "react-native";
import { getDirectionLabel } from "@/lib/direction";

type Props = {
  degree: number;
  direction: string;
  isStable: boolean;
  locked: boolean;
};

const CARDINALS = [
  { label: "N", angle: 0 },
  { label: "E", angle: 90 },
  { label: "S", angle: 180 },
  { label: "W", angle: 270 },
];

const RING = 240;
const RADIUS = RING / 2 - 20;

export function CompassView({ degree, direction, isStable, locked }: Props) {
  const label = getDirectionLabel(direction);
  const animValue = useRef(new Animated.Value(0)).current;
  const prevDegreeRef = useRef(degree);
  const cumulativeRef = useRef(0);

  useEffect(() => {
    let delta = degree - prevDegreeRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    cumulativeRef.current += delta;
    prevDegreeRef.current = degree;

    Animated.timing(animValue, {
      toValue: cumulativeRef.current,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [animValue, degree]);

  const rotate = animValue.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ["-3600deg", "3600deg"],
  });

  const ringColor = locked ? "#8d6b4c" : isStable ? "#4a7c59" : "#eadfce";

  return (
    <View style={styles.wrapper}>
      <View style={[styles.outerRing, { borderColor: ringColor }]}>
        <Animated.View style={[styles.disc, { transform: [{ rotate }] }]}>
          {CARDINALS.map(({ label: cardinalLabel, angle }) => {
            const rad = (angle * Math.PI) / 180;
            const x = RADIUS * Math.sin(rad);
            const y = -RADIUS * Math.cos(rad);

            return (
              <View
                key={cardinalLabel}
                style={[
                  styles.cardinalDot,
                  {
                    transform: [{ translateX: x }, { translateY: y }],
                  },
                ]}
              >
                <Text style={[styles.cardinalText, cardinalLabel === "N" && styles.cardinalNorth]}>
                  {cardinalLabel}
                </Text>
              </View>
            );
          })}

          <View style={styles.needleContainer}>
            <View style={styles.needleNorth} />
            <View style={styles.needleSouth} />
          </View>
        </Animated.View>

        <View style={styles.center} pointerEvents="none">
          <Text style={styles.degreeText}>{Math.round(degree)}°</Text>
          <Text style={styles.directionText}>{label}</Text>
        </View>

        <View style={styles.topMarker} />
      </View>

      <Text style={[styles.status, { color: ringColor }]}>
        {locked ? "已锁定" : isStable ? "方向稳定，可继续" : "正在校准..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 12,
  },
  outerRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 4,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: RING - 16,
    height: RING - 16,
    borderRadius: (RING - 16) / 2,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  cardinalDot: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cardinalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8d6b4c",
  },
  cardinalNorth: {
    color: "#c0392b",
    fontSize: 15,
  },
  needleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 8,
    height: RING - 80,
  },
  needleNorth: {
    flex: 1,
    width: 4,
    backgroundColor: "#c0392b",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  needleSouth: {
    flex: 1,
    width: 4,
    backgroundColor: "#bfad9c",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fcf8f1",
  },
  degreeText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2a2118",
  },
  directionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8d6b4c",
    marginTop: 2,
  },
  topMarker: {
    position: "absolute",
    top: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2a2118",
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
  },
});
