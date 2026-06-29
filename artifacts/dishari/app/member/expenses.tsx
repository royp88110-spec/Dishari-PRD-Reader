import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
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
      <View style={[styles.monthNav, { marginTop: insets.top + 12 }]}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.monthCenter}>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
          <Text style={[styles.monthSub, { color: colors.primary }]}>Total: ₹{grandTotal.toFixed(0)}</Text>
        </View>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{total.toFixed(0)}</Text>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Market Exp.</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{cookTotal.toFixed(0)}</Text>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Cook Salary</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
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
            style={[styles.catChip, { backgroundColor: category === c.key ? c.color : colors.muted, borderColor: category === c.key ? c.color : colors.border }]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.catText, { color: category === c.key ? "#fff" : colors.mutedForeground }]}>{c.label}</Text>
          </Pressable>
        )}
      />

      <FlatList
        data={filtered.slice().reverse()}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses this month</Text>
          </View>
        }
        renderItem={({ item: e }) => {
          const cat = getCat(e.type);
          return (
            <View style={[styles.expenseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.expIcon, { backgroundColor: cat.color + "20" }]}>
                <Feather name={cat.icon as "list"} size={16} color={cat.color} />
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
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  navArrow: { padding: 8 },
  monthCenter: { alignItems: "center" },
  monthText: { fontSize: 18, fontWeight: "700" },
  monthSub: { fontSize: 13, fontWeight: "600" },
  summaryCard: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, padding: 16, borderWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 18, fontWeight: "700" },
  summaryKey: { fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, marginVertical: 4 },
  catScroll: { flexGrow: 0 },
  catContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: "600" },
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  expIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expInfo: { flex: 1 },
  expName: { fontSize: 14, fontWeight: "700" },
  expMeta: { fontSize: 12, marginTop: 1 },
  expDate: { fontSize: 11, marginTop: 2 },
  expAmount: { fontSize: 16, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
