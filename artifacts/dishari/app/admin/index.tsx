import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

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

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string; icon: string; color: string; sub?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as "home"} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: color }]}>{sub}</Text> : null}
    </View>
  );
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const { members, expenses, getMonthTotals, calculateAllMonthlyBills } = useData();
  const [month, setMonth] = useState(getCurrentMonth());

  const { totalExpense, totalMeals, perMealCost } = getMonthTotals(month);
  const activeMembers = members.filter((m) => m.status === "active").length;
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
  const rawExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const bills = calculateAllMonthlyBills(month);
  const totalDue = bills.reduce((s, b) => s + b.dueAmount, 0);
  const totalCredit = bills.reduce((s, b) => s + b.creditBalance, 0);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Welcome back,</Text>
          <Text style={[styles.adminName, { color: colors.foreground }]}>Admin</Text>
        </View>
        <Pressable
          onPress={() => logout().then(() => router.replace("/"))}
          style={[styles.logoutBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
        </Pressable>
      </View>

      <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Active Members" value={String(activeMembers)} icon="users" color="#D4500A" />
        <StatCard label="Total Meals" value={String(totalMeals)} icon="grid" color="#7C3AED" />
        <StatCard label="Expenses" value={`₹${rawExpense.toFixed(0)}`} icon="dollar-sign" color="#0891B2" />
        <StatCard label="Per Meal Rate" value={`₹${perMealCost.toFixed(1)}`} icon="trending-up" color="#16A34A" />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Total Monthly Expense</Text>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{totalExpense.toFixed(0)}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Total Meals Served</Text>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>{totalMeals}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Total Due from Members</Text>
          <Text style={[styles.summaryVal, { color: "#DC2626" }]}>₹{totalDue.toFixed(0)}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Total Credit Balance</Text>
          <Text style={[styles.summaryVal, { color: "#16A34A" }]}>₹{totalCredit.toFixed(0)}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Member Bills</Text>
        {bills.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active members</Text>
        ) : bills.map((b) => (
          <View key={b.memberId}>
            <View style={styles.memberBillRow}>
              <View style={[styles.avatar, { backgroundColor: "#D4500A20" }]}>
                <Text style={[styles.avatarText, { color: "#D4500A" }]}>
                  {b.memberName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberBillInfo}>
                <Text style={[styles.memberBillName, { color: colors.foreground }]}>{b.memberName}</Text>
                <Text style={[styles.memberBillSub, { color: colors.mutedForeground }]}>
                  {b.mealCount} meals · {b.eggCount} eggs
                </Text>
              </View>
              <View style={styles.memberBillRight}>
                <Text style={[styles.memberBillAmount, { color: b.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
                  ₹{b.dueAmount > 0 ? b.dueAmount.toFixed(0) : b.creditBalance.toFixed(0)}
                </Text>
                <Text style={[styles.memberBillStatus, { color: colors.mutedForeground }]}>
                  {b.dueAmount > 0 ? "Due" : "Credit"}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Expenses</Text>
        {monthExpenses.slice(-5).reverse().map((e) => (
          <View key={e.id}>
            <View style={styles.expenseRow}>
              <View style={[styles.expenseIcon, { backgroundColor: colors.muted }]}>
                <Feather name="shopping-bag" size={16} color={colors.primary} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={[styles.expenseName, { color: colors.foreground }]}>
                  {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                  {e.shopName ? ` · ${e.shopName}` : ""}
                </Text>
                <Text style={[styles.expenseDate, { color: colors.mutedForeground }]}>{e.date}</Text>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.foreground }]}>₹{e.amount}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
        ))}
        {monthExpenses.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No expenses this month</Text>
        )}
      </View>
    </ScrollView>
  );
}

import { Platform } from "react-native";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20, paddingBottom: 12,
  },
  greeting: { fontSize: 13 },
  adminName: { fontSize: 22, fontWeight: "700" },
  logoutBtn: { padding: 10, borderRadius: 12 },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginBottom: 16, borderRadius: 14,
    padding: 8, borderWidth: 1,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20,
    gap: 12, marginBottom: 16,
  },
  statCard: {
    width: "47%", borderRadius: 16, padding: 16,
    borderWidth: 1, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  statSub: { fontSize: 11, fontWeight: "600" },
  section: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 16,
    padding: 16, borderWidth: 1,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryKey: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 2 },
  memberBillRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700" },
  memberBillInfo: { flex: 1 },
  memberBillName: { fontSize: 15, fontWeight: "600" },
  memberBillSub: { fontSize: 12, marginTop: 2 },
  memberBillRight: { alignItems: "flex-end" },
  memberBillAmount: { fontSize: 16, fontWeight: "700" },
  memberBillStatus: { fontSize: 11 },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  expenseIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: "600" },
  expenseDate: { fontSize: 12, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 8 },
});
