import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
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
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

function BillRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billKey, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.billVal, { color: color ?? colors.foreground, fontWeight: bold ? "700" : "500" }]}>{value}</Text>
    </View>
  );
}

export default function MemberHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { calculateMonthlyBill, getMonthTotals, settings } = useData();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";
  const bill = calculateMonthlyBill(memberId, month);
  const { perMealCost, totalExpense, totalMeals } = getMonthTotals(month);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}>
        <View>
          <Text style={[styles.welcome, { color: colors.mutedForeground }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{user?.name ?? "Member"}</Text>
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

      <View style={[styles.dueCard, {
        backgroundColor: bill.dueAmount > 0 ? "#DC262608" : "#16A34A08",
        borderColor: bill.dueAmount > 0 ? "#DC2626" : "#16A34A",
      }]}>
        <Text style={[styles.dueLabel, { color: bill.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
          {bill.dueAmount > 0 ? "Amount Due" : "Credit Balance"}
        </Text>
        <Text style={[styles.dueAmount, { color: bill.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
          ₹{(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(2)}
        </Text>
        <Text style={[styles.dueSub, { color: colors.mutedForeground }]}>
          {bill.dueAmount > 0 ? "Please pay to admin" : "Carry forward to next month"}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Bill Breakdown</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Meals Taken" value={`${bill.mealCount}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Per Meal Rate" value={`₹${bill.perMealCost.toFixed(2)}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Meal Bill" value={`₹${bill.mealBill.toFixed(2)}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Eggs Consumed" value={`${bill.eggCount} × ₹${settings.eggPrice}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Egg Bill" value={`₹${bill.eggBill.toFixed(2)}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Gross Bill" value={`₹${bill.grossBill.toFixed(2)}`} bold />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Advance Paid" value={`- ₹${bill.totalAdvance.toFixed(2)}`} color="#16A34A" />
        <View style={[styles.bigDivider, { backgroundColor: colors.border }]} />
        <BillRow
          label={bill.dueAmount > 0 ? "Amount Due" : "Credit Balance"}
          value={`₹${(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(2)}`}
          color={bill.dueAmount > 0 ? "#DC2626" : "#16A34A"}
          bold
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mess Summary</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Total Monthly Expense" value={`₹${totalExpense.toFixed(0)}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Total Meals Served" value={String(totalMeals)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Per Meal Cost" value={`₹${perMealCost.toFixed(2)}`} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BillRow label="Cook Salary" value={`₹${settings.cookSalary} / member`} />
      </View>

      <View style={[styles.statsRow]}>
        {[
          { label: "Meals", value: String(bill.mealCount), icon: "grid", color: "#D4500A" },
          { label: "Eggs", value: String(bill.eggCount), icon: "circle", color: "#D97706" },
          { label: "Advance", value: `₹${bill.totalAdvance.toFixed(0)}`, icon: "credit-card", color: "#16A34A" },
        ].map(({ label, value, icon, color }) => (
          <View key={label} style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: color + "20" }]}>
              <Feather name={icon as "grid"} size={16} color={color} />
            </View>
            <Text style={[styles.miniStatVal, { color: colors.foreground }]}>{value}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20, paddingBottom: 12,
  },
  welcome: { fontSize: 13 },
  name: { fontSize: 22, fontWeight: "700" },
  logoutBtn: { padding: 10, borderRadius: 12 },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginBottom: 16, borderRadius: 14, padding: 8, borderWidth: 1,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  dueCard: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20,
    padding: 24, alignItems: "center", borderWidth: 2,
  },
  dueLabel: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  dueAmount: { fontSize: 42, fontWeight: "700", marginVertical: 8 },
  dueSub: { fontSize: 13 },
  section: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9 },
  billKey: { fontSize: 14 },
  billVal: { fontSize: 14 },
  divider: { height: 1 },
  bigDivider: { height: 2, marginVertical: 4 },
  statsRow: { flexDirection: "row", marginHorizontal: 20, gap: 10, marginBottom: 16 },
  miniStat: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: 1 },
  miniStatIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  miniStatVal: { fontSize: 16, fontWeight: "700" },
  miniStatLabel: { fontSize: 11 },
});
