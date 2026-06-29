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
import { ScreenHeader } from "@/components/ScreenHeader";

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

function friendlyDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function MemberHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { calculateMonthlyBill, getMonthTotals, settings, payments } = useData();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";
  const bill = calculateMonthlyBill(memberId, month);
  const { perMealCost, totalExpense, totalMeals } = getMonthTotals(month);

  const payment = payments.find((p) => p.memberId === memberId && p.month === month);
  const isPaid = payment?.paid === true;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={user?.name ?? "My Bill"}
        icon="file-text"
        subtitle="Welcome back"
        rightElement={
          <Pressable
            onPress={() => logout().then(() => router.replace("/"))}
            style={styles.logoutBtn}
          >
            <Feather name="log-out" size={18} color="rgba(255,255,255,0.9)" />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Month navigator */}
        <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Payment Status Card */}
        <View style={[
          styles.paymentCard,
          {
            backgroundColor: isPaid ? "#16A34A12" : "#DC262612",
            borderColor: isPaid ? "#16A34A" : "#DC2626",
          }
        ]}>
          <View style={styles.paymentCardInner}>
            <Text style={styles.paymentEmoji}>{isPaid ? "✅" : "❌"}</Text>
            <View style={styles.paymentCardText}>
              <Text style={[styles.paymentStatus, { color: isPaid ? "#16A34A" : "#DC2626" }]}>
                {isPaid ? "Bill Paid" : "Bill Unpaid"}
              </Text>
              <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>
                {isPaid
                  ? `Payment received on ${friendlyDate(payment?.paidAt ?? null)}`
                  : "Contact admin after paying your bill"}
              </Text>
            </View>
          </View>
          {isPaid && payment?.amount != null && payment.amount > 0 && (
            <View style={[styles.paidAmountBadge, { backgroundColor: "#16A34A20" }]}>
              <Text style={[styles.paidAmountText, { color: "#16A34A" }]}>
                ₹{payment.amount.toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        {/* Due / Credit card */}
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
          <BillRow label="Cook Salary" value={`₹${settings.cookSalary.toFixed(2)}`} />
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

        <View style={styles.statsRow}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  logoutBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 14,
    padding: 8, borderWidth: 1,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  paymentCard: {
    marginHorizontal: 20, marginBottom: 12, borderRadius: 16,
    padding: 16, borderWidth: 2,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  paymentCardInner: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  paymentEmoji: { fontSize: 28 },
  paymentCardText: { flex: 1 },
  paymentStatus: { fontSize: 16, fontWeight: "700" },
  paymentSub: { fontSize: 12, marginTop: 2 },
  paidAmountBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 },
  paidAmountText: { fontSize: 15, fontWeight: "700" },
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
