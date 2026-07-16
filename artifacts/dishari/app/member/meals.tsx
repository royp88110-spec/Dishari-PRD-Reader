import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useRefresh } from "@/hooks/useRefresh";

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
  const { refreshing, onRefresh } = useRefresh();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";
  const memberMeals = meals
    .filter((m) => m.memberId === memberId && m.date.startsWith(month))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalMorning = memberMeals.filter((m) => m.morning).length;
  const totalNight   = memberMeals.filter((m) => m.night).length;
  const totalMeals   = totalMorning + totalNight;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="My Meals"
        avatarName={user?.name}
        avatarUrl={user?.photoUrl}
        subtitle="Your meal history"
        bottomElement={
          <View style={styles.headerMonthNav}>
            <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.headerNavBtn}>
              <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <Text style={styles.headerMonthText}>{monthLabel(month)}</Text>
            <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.headerNavBtn}>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        }
      />

      {/* Summary cards — staggered entrance */}
      <View style={styles.summaryRow}>
        {[
          { label: "Morning", count: totalMorning, color: "#D4500A", delay: 60 },
          { label: "Night",   count: totalNight,   color: "#7C3AED", delay: 130 },
          { label: "Total",   count: totalMeals,   color: "#0891B2", delay: 200 },
        ].map(({ label, count, color, delay }) => (
          <Animated.View
            key={label}
            entering={FadeInDown.delay(delay).duration(380)}
            style={[styles.summaryCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.summaryCount, { color }]}>{count}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Table header */}
      <Animated.View
        entering={FadeInUp.delay(240).duration(300)}
        style={[styles.tableHeader, { backgroundColor: colors.muted }]}
      >
        <Text style={[styles.colDate,  { color: colors.mutedForeground }]}>DATE</Text>
        <Text style={[styles.colMeal,  { color: "#D4500A" }]}>MORNING</Text>
        <Text style={[styles.colMeal,  { color: "#7C3AED" }]}>NIGHT</Text>
        <Text style={[styles.colTotal, { color: colors.mutedForeground }]}>TOTAL</Text>
      </Animated.View>

      <FlatList
        data={memberMeals}
        keyExtractor={(m) => m.id}
        style={{ flex: 1, backgroundColor: colors.card }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4500A"]}
            tintColor="#D4500A"
          />
        }
        removeClippedSubviews={false}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: colors.border }} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No meal records this month
            </Text>
          </View>
        }
        renderItem={({ item: m, index }) => {
          const total   = (m.morning ? 1 : 0) + (m.night ? 1 : 0);
          const dayName = new Date(m.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
          const dayNum  = m.date.split("-")[2];
          return (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index, 12) * 45).duration(320)}
            >
              <View style={styles.mealRow}>
                <View style={styles.dateCol}>
                  <Text style={[styles.dayNum, { color: colors.foreground }]}>{dayNum}</Text>
                  <Text style={[styles.dayName, { color: colors.mutedForeground }]}>{dayName}</Text>
                </View>
                <View style={styles.mealCol}>
                  <View style={[
                    styles.mealBadge,
                    { backgroundColor: m.morning ? "#D4500A20" : colors.muted },
                  ]}>
                    <Feather
                      name={m.morning ? "check" : "x"}
                      size={16}
                      color={m.morning ? "#D4500A" : colors.mutedForeground}
                    />
                  </View>
                </View>
                <View style={styles.mealCol}>
                  <View style={[
                    styles.mealBadge,
                    { backgroundColor: m.night ? "#7C3AED20" : colors.muted },
                  ]}>
                    <Feather
                      name={m.night ? "check" : "x"}
                      size={16}
                      color={m.night ? "#7C3AED" : colors.mutedForeground}
                    />
                  </View>
                </View>
                <View style={[
                  styles.totalBadge,
                  { backgroundColor: total > 0 ? "#0891B220" : colors.muted },
                ]}>
                  <Text style={[
                    styles.totalText,
                    { color: total > 0 ? "#0891B2" : colors.mutedForeground },
                  ]}>
                    {total}
                  </Text>
                </View>
              </View>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginVertical: 16 },
  summaryCard: {
    flex: 1, borderRadius: 20, padding: 18, alignItems: "center",
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  summaryCount: { fontSize: 26, fontWeight: "700" },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 16,
  },
  colDate:  { width: 64, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colMeal:  { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colTotal: { width: 52, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  mealRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  dateCol: { width: 64 },
  dayNum:  { fontSize: 16, fontWeight: "700" },
  dayName: { fontSize: 11 },
  mealCol: { flex: 1, alignItems: "center" },
  mealBadge: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  totalBadge: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  totalText: { fontSize: 15, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  headerMonthNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerMonthText: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#fff" },
});
