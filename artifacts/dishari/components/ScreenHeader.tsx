import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MemberAvatar } from "@/components/MemberAvatar";

type Props = {
  title: string;
  /** Feather icon shown in the badge when no avatar props are supplied */
  icon?: React.ComponentProps<typeof Feather>["name"];
  subtitle?: string;
  rightElement?: React.ReactNode;
  /** Optional content rendered inside the gradient below the title row */
  bottomElement?: React.ReactNode;
  /** When set, replaces the icon badge with a name-initials / photo avatar */
  avatarName?: string;
  avatarUrl?: string;
};

export function ScreenHeader({ title, icon, subtitle, rightElement, bottomElement, avatarName, avatarUrl }: Props) {
  const insets = useSafeAreaInsets();
  const showAvatar = avatarName !== undefined || avatarUrl !== undefined;

  return (
    <LinearGradient
      colors={["#2563EB", "#1D4ED8"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 14 }]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          {showAvatar ? (
            <MemberAvatar
              name={avatarName}
              photoUrl={avatarUrl}
              size={44}
              borderRadius={14}
              bgColor="rgba(255,255,255,0.2)"
              textColor="#fff"
            />
          ) : (
            <View style={styles.iconBadge}>
              <Feather name={icon ?? "home"} size={18} color="#fff" />
            </View>
          )}
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 12,
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
    borderColor: "rgba(255,255,255,0.25)",
  },
  textGroup: {
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
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
