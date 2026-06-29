import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

export default function MemberMeals() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { meals } = useData();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";
  const memberMeals = meals
    .filter((m) => m.memberId === memberId && m.date.startsWith(month))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalMorning = memberMeals.filter((m) => m.morning).length;
  const totalNight = memberMeals.filter((m) => m.night).length;
  const totalMeals = totalMorning + totalNight;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.monthNav, { marginTop: insets.top + 12 }]}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.summaryRow]}>
        {[
          { label: "Morning", count: totalMorning, color: "#D4500A" },
          { label: "Night", count: totalNight, color: "#7C3AED" },
          { label: "Total", count: totalMeals, color: "#0891B2" },
        ].map(({ label, count, color }) => (
          <View key={label} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryCount, { color }]}>{count}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.tableHeader, { backgroundColor: colors.muted }]}>
        <Text style={[styles.colDate, { color: colors.mutedForeground }]}>DATE</Text>
        <Text style={[styles.colMeal, { color: "#D4500A" }]}>MORNING</Text>
        <Text style={[styles.colMeal, { color: "#7C3AED" }]}>NIGHT</Text>
        <Text style={[styles.colTotal, { color: colors.mutedForeground }]}>TOTAL</Text>
      </View>

      <FlatList
        data={memberMeals}
        keyExtractor={(m) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No meal records this month</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const total = (m.morning ? 1 : 0) + (m.night ? 1 : 0);
          const dayName = new Date(m.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
          const dayNum = m.date.split("-")[2];
          return (
            <View style={[styles.mealRow, { borderBottomColor: colors.border }]}>
              <View style={styles.dateCol}>
                <Text style={[styles.dayNum, { color: colors.foreground }]}>{dayNum}</Text>
                <Text style={[styles.dayName, { color: colors.mutedForeground }]}>{dayName}</Text>
              </View>
              <View style={styles.mealCol}>
                <View style={[styles.mealBadge, { backgroundColor: m.morning ? "#D4500A20" : colors.muted }]}>
                  <Feather name={m.morning ? "check" : "x"} size={16} color={m.morning ? "#D4500A" : colors.mutedForeground} />
                </View>
              </View>
              <View style={styles.mealCol}>
                <View style={[styles.mealBadge, { backgroundColor: m.night ? "#7C3AED20" : colors.muted }]}>
                  <Feather name={m.night ? "check" : "x"} size={16} color={m.night ? "#7C3AED" : colors.mutedForeground} />
                </View>
              </View>
              <View style={[styles.totalBadge, { backgroundColor: total > 0 ? "#0891B220" : colors.muted }]}>
                <Text style={[styles.totalText, { color: total > 0 ? "#0891B2" : colors.mutedForeground }]}>{total}</Text>
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
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 12,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: "700" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  summaryCount: { fontSize: 26, fontWeight: "700" },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 16,
  },
  colDate: { width: 64, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colMeal: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colTotal: { width: 52, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  mealRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dateCol: { width: 64 },
  dayNum: { fontSize: 16, fontWeight: "700" },
  dayName: { fontSize: 11 },
  mealCol: { flex: 1, alignItems: "center" },
  mealBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  totalBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  totalText: { fontSize: 15, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
