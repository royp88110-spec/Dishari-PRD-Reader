import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function MealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { members, meals, setMeal } = useData();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const activeMembers = members.filter((m) => m.status === "active");

  const getMeal = (memberId: string) =>
    meals.find((m) => m.memberId === memberId && m.date === selectedDate);

  const toggle = async (memberId: string, type: "morning" | "night") => {
    const existing = getMeal(memberId);
    const morning = existing?.morning ?? false;
    const night = existing?.night ?? false;
    if (type === "morning") {
      await setMeal(memberId, selectedDate, !morning, night);
    } else {
      await setMeal(memberId, selectedDate, morning, !night);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const bulkToggle = async (type: "morning" | "night", value: boolean) => {
    for (const m of activeMembers) {
      const existing = getMeal(m.id);
      if (type === "morning") {
        await setMeal(m.id, selectedDate, value, existing?.night ?? false);
      } else {
        await setMeal(m.id, selectedDate, existing?.morning ?? false, value);
      }
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  const totalMorning = activeMembers.filter((m) => getMeal(m.id)?.morning).length;
  const totalNight = activeMembers.filter((m) => getMeal(m.id)?.night).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.dateNav, { marginTop: insets.top + 12 }]}>
        <Pressable onPress={() => changeDate(-1)} style={styles.navArrow}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateText, { color: colors.foreground }]}>{displayDate(selectedDate)}</Text>
          <Text style={[styles.dateSub, { color: colors.mutedForeground }]}>
            Morning: {totalMorning} · Night: {totalNight}
          </Text>
        </View>
        <Pressable onPress={() => changeDate(1)} style={styles.navArrow}>
          <Feather name="chevron-right" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.bulkBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.bulkLabel, { color: colors.mutedForeground }]}>Bulk Mark</Text>
        <View style={styles.bulkBtns}>
          <Pressable style={[styles.bulkBtn, { backgroundColor: "#D4500A20" }]} onPress={() => bulkToggle("morning", true)}>
            <Text style={[styles.bulkBtnText, { color: "#D4500A" }]}>All Morning</Text>
          </Pressable>
          <Pressable style={[styles.bulkBtn, { backgroundColor: "#7C3AED20" }]} onPress={() => bulkToggle("night", true)}>
            <Text style={[styles.bulkBtnText, { color: "#7C3AED" }]}>All Night</Text>
          </Pressable>
          <Pressable style={[styles.bulkBtn, { backgroundColor: colors.muted }]} onPress={() => { bulkToggle("morning", false); bulkToggle("night", false); }}>
            <Text style={[styles.bulkBtnText, { color: colors.mutedForeground }]}>Clear All</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.tableHeader, { backgroundColor: colors.muted }]}>
        <Text style={[styles.colMember, { color: colors.mutedForeground }]}>MEMBER</Text>
        <Text style={[styles.colMeal, { color: "#D4500A" }]}>MORNING</Text>
        <Text style={[styles.colMeal, { color: "#7C3AED" }]}>NIGHT</Text>
        <Text style={[styles.colTotal, { color: colors.mutedForeground }]}>TOTAL</Text>
      </View>

      <FlatList
        data={activeMembers}
        keyExtractor={(m) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.muted} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>No active members</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const meal = getMeal(m.id);
          const total = (meal?.morning ? 1 : 0) + (meal?.night ? 1 : 0);
          return (
            <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: "#D4500A20" }]}>
                <Text style={[styles.avatarText, { color: "#D4500A" }]}>
                  {m.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.colMemberInfo}>
                <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>{m.name}</Text>
                {m.roomNumber ? <Text style={[styles.memberRoom, { color: colors.mutedForeground }]}>Room {m.roomNumber}</Text> : null}
              </View>
              <View style={styles.switchWrap}>
                <Switch
                  value={meal?.morning ?? false}
                  onValueChange={() => toggle(m.id, "morning")}
                  trackColor={{ false: colors.muted, true: "#D4500A60" }}
                  thumbColor={meal?.morning ? "#D4500A" : "#ccc"}
                />
              </View>
              <View style={styles.switchWrap}>
                <Switch
                  value={meal?.night ?? false}
                  onValueChange={() => toggle(m.id, "night")}
                  trackColor={{ false: colors.muted, true: "#7C3AED60" }}
                  thumbColor={meal?.night ? "#7C3AED" : "#ccc"}
                />
              </View>
              <View style={[styles.totalBadge, { backgroundColor: total > 0 ? "#D4500A20" : colors.muted }]}>
                <Text style={[styles.totalText, { color: total > 0 ? "#D4500A" : colors.mutedForeground }]}>{total}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  dateNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 12,
  },
  navArrow: { padding: 8 },
  dateCenter: { alignItems: "center", flex: 1 },
  dateText: { fontSize: 17, fontWeight: "700" },
  dateSub: { fontSize: 12, marginTop: 2 },
  bulkBar: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14,
    padding: 12, borderWidth: 1,
  },
  bulkLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  bulkBtns: { flexDirection: "row", gap: 8 },
  bulkBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  bulkBtnText: { fontSize: 12, fontWeight: "700" },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 16,
  },
  colMember: { flex: 1.2, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colMeal: { width: 74, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colTotal: { width: 48, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  memberRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, gap: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "700" },
  colMemberInfo: { flex: 1.2 - 0.1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberRoom: { fontSize: 11 },
  switchWrap: { width: 74, alignItems: "center" },
  totalBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  totalText: { fontSize: 15, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
});
