import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  subtitle?: string;
  rightElement?: React.ReactNode;
  /** Optional content rendered inside the gradient below the title row */
  bottomElement?: React.ReactNode;
};

export function ScreenHeader({ title, icon, subtitle, rightElement, bottomElement }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#E25C14", "#AD3806"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 14 }]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <View style={styles.iconBadge}>
            <Feather name={icon} size={18} color="#fff" />
          </View>
          <View style={styles.textGroup}>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
        {rightElement ? <View>{rightElement}</View> : null}
      </View>
      {bottomElement ? <View style={styles.bottomSlot}>{bottomElement}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: "#8B2200",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  textGroup: {
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    fontWeight: "500",
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  bottomSlot: {
    marginTop: 14,
  },
});
