import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = [
  { key: "all", label: "All", icon: "list", color: "#374151" },
  { key: "grocery", label: "Grocery", icon: "shopping-bag", color: "#D4500A" },
  { key: "vegetable", label: "Veg", icon: "box", color: "#16A34A" },
  { key: "fish", label: "Fish", icon: "droplet", color: "#0891B2" },
  { key: "meat", label: "Meat", icon: "heart", color: "#DC2626" },
  { key: "gas", label: "Gas", icon: "zap", color: "#D97706" },
  { key: "other", label: "Other", icon: "more-horizontal", color: "#7C3AED" },
];

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

export default function MemberExpenses() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, settings, members } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [category, setCategory] = useState("all");

  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
  const filtered = category === "all" ? monthExpenses : monthExpenses.filter((e) => e.type === category);
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const activeCount = members.filter((m) => m.status === "active").length;
  const cookTotal = settings.cookSalary * activeCount;
  const grandTotal = total + cookTotal;

  const getCat = (type: string) => CATEGORIES.find((c) => c.key === type) ?? CATEGORIES[CATEGORIES.length - 1];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Expenses"
        icon="dollar-sign"
        subtitle="Mess expense breakdown"
        bottomElement={
          <View style={styles.headerMonthNav}>
            <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.headerNavBtn}>
              <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerMonthText}>{monthLabel(month)}</Text>
              <Text style={styles.headerMonthSub}>Total: ₹{grandTotal.toFixed(0)}</Text>
            </View>
            <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.headerNavBtn}>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        }
      />

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{total.toFixed(0)}</Text>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Market Exp.</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: "#F2E6DF" }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{cookTotal.toFixed(0)}</Text>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Cook Salary</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: "#F2E6DF" }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: "#D4500A" }]}>₹{grandTotal.toFixed(0)}</Text>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Grand Total</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c.key}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: c }) => (
          <Pressable
            style={[styles.catChip, { backgroundColor: category === c.key ? c.color : colors.card }]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.catText, { color: category === c.key ? "#fff" : colors.mutedForeground }]}>{c.label}</Text>
          </Pressable>
        )}
      />

      <FlatList
        data={filtered.slice().reverse()}
        keyExtractor={(e) => e.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses this month</Text>
          </View>
        }
        renderItem={({ item: e }) => {
          const cat = getCat(e.type);
          return (
            <View style={[styles.expenseRow, { backgroundColor: colors.card }]}>
              <View style={[styles.expIcon, { backgroundColor: cat.color + "20" }]}>
                <Feather name={cat.icon as "list"} size={20} color={cat.color} />
              </View>
              <View style={styles.expInfo}>
                <Text style={[styles.expName, { color: colors.foreground }]}>
                  {cat.label}{e.shopName ? ` · ${e.shopName}` : ""}
                </Text>
                {e.items ? <Text style={[styles.expMeta, { color: colors.mutedForeground }]}>{e.items}</Text> : null}
                <Text style={[styles.expDate, { color: colors.mutedForeground }]}>{e.date}</Text>
              </View>
              <Text style={[styles.expAmount, { color: colors.foreground }]}>₹{e.amount}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  summaryCard: {
    flexDirection: "row", marginHorizontal: 20, marginVertical: 16,
    borderRadius: 20, padding: 20,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 20, fontWeight: "700" },
  summaryKey: { fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, marginVertical: 4 },
  catScroll: { flexGrow: 0 },
  catContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  catChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  catText: { fontSize: 13, fontWeight: "600" },
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  expIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  expInfo: { flex: 1 },
  expName: { fontSize: 15, fontWeight: "700" },
  expMeta: { fontSize: 13, marginTop: 1 },
  expDate: { fontSize: 11, marginTop: 4 },
  expAmount: { fontSize: 17, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  headerMonthNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerMonthText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  headerMonthSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
});