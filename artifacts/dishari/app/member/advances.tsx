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
import Animated, { FadeInDown } from "react-native-reanimated";
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

export default function MemberAdvances() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { advances, calculateMonthlyBill } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId   = user?.memberId ?? "";
  const myAdvances = advances
    .filter((a) => a.memberId === memberId && a.date.startsWith(month))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalAdvance = myAdvances.reduce((s, a) => s + a.amount, 0);
  const bill = calculateMonthlyBill(memberId, month);

  const summaryItems = [
    { label: "Total Paid",  value: `₹${totalAdvance.toFixed(0)}`, color: "#16A34A", borderColor: "#16A34A", bg: "#16A34A05" },
    { label: "Gross Bill",  value: `₹${bill.grossBill.toFixed(0)}`, color: "#D4500A", borderColor: "#D4500A", bg: "#D4500A05" },
    {
      label: bill.dueAmount > 0 ? "Due" : "Credit",
      value: `₹${(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(0)}`,
      color: bill.dueAmount > 0 ? "#DC2626" : "#16A34A",
      borderColor: bill.dueAmount > 0 ? "#DC2626" : "#16A34A",
      bg: bill.dueAmount > 0 ? "#DC262605" : "#16A34A05",
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="My Advances"
        avatarName={user?.name}
        avatarUrl={user?.photoUrl}
        subtitle="Advance payment history"
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

      {/* Summary cards — staggered */}
      <View style={styles.summaryRow}>
        {summaryItems.map(({ label, value, color, borderColor, bg }, i) => (
          <Animated.View
            key={label}
            entering={FadeInDown.delay(60 + i * 70).duration(380)}
            style={[styles.summaryCard, { backgroundColor: bg, borderColor }]}
          >
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
            <Text style={[styles.summaryVal, { color }]}>{value}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Advance list */}
      <FlatList
        data={myAdvances}
        keyExtractor={(a) => a.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4500A"]}
            tintColor="#D4500A"
          />
        }
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="credit-card" size={44} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Advances</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Contact admin to record advance payments
            </Text>
          </View>
        }
        renderItem={({ item: a, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 10) * 60).duration(350)}
            style={{ marginBottom: 12 }}
          >
            <View style={[styles.advCard, { backgroundColor: colors.card }]}>
              <View style={[styles.advIcon, { backgroundColor: "#16A34A20" }]}>
                <Feather name="arrow-up-right" size={20} color="#16A34A" />
              </View>
              <View style={styles.advInfo}>
                <Text style={[styles.advAmount, { color: "#16A34A" }]}>
                  ₹{a.amount.toFixed(0)}
                </Text>
                <Text style={[styles.advMeta, { color: colors.mutedForeground }]}>
                  {a.date} · {a.method}
                </Text>
                {a.notes ? (
                  <Text style={[styles.advNotes, { color: colors.mutedForeground }]}>
                    {a.notes}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.paidBadge, { backgroundColor: "#16A34A18" }]}>
                <Text style={[styles.paidText, { color: "#16A34A" }]}>Paid</Text>
              </View>
            </View>
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  summaryRow: {
    flexDirection: "row", paddingHorizontal: 20,
    gap: 12, marginVertical: 20,
  },
  summaryCard: {
    flex: 1, borderRadius: 20, padding: 18, alignItems: "center", borderWidth: 2,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  summaryLabel: {
    fontSize: 11, marginBottom: 6, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  summaryVal: { fontSize: 24, fontWeight: "700" },
  advCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  advIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  advInfo: { flex: 1 },
  advAmount: { fontSize: 22, fontWeight: "700" },
  advMeta: { fontSize: 13, marginTop: 4 },
  advNotes: { fontSize: 12, marginTop: 2 },
  paidBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  paidText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
  headerMonthNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerMonthText: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#fff" },
});
