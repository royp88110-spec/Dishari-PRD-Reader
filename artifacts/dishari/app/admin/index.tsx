import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

/** Format ISO timestamp to a short local date string like "29 Jun" */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { members, expenses, payments, getMonthTotals, calculateAllMonthlyBills, markPaid, markUnpaid } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  // Track in-flight payment mutations per member so rows stay disabled independently
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
  const [payError, setPayError] = useState<string | null>(null);

  const setMemberPaying = (id: string, paying: boolean) =>
    setPayingIds((prev) => {
      const next = new Set(prev);
      paying ? next.add(id) : next.delete(id);
      return next;
    });

  const { totalExpense, totalMeals, perMealCost } = getMonthTotals(month);
  const activeMembers = members.filter((m) => m.status === "active").length;
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));
  const rawExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const bills = calculateAllMonthlyBills(month);
  const totalDue = bills.reduce((s, b) => s + b.dueAmount, 0);
  const totalCredit = bills.reduce((s, b) => s + b.creditBalance, 0);

  // Payment helpers
  const getPayment = (memberId: string) =>
    payments.find((p) => p.memberId === memberId && p.month === month);

  const handleTogglePayment = async (memberId: string, dueAmount: number) => {
    if (payingIds.has(memberId)) return; // already in-flight for this member
    const payment = getPayment(memberId);
    setPayError(null);
    setMemberPaying(memberId, true);
    try {
      if (payment?.paid) {
        await markUnpaid(memberId, month);
      } else {
        await markPaid(memberId, month, dueAmount);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setPayError("Failed to update payment status. Please try again.");
    } finally {
      setMemberPaying(memberId, false);
    }
  };

  // Count paid members this month
  const paidCount = bills.filter((b) => getPayment(b.memberId)?.paid === true).length;

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

      {/* Payment error banner */}
      {payError && (
        <View style={[styles.errorBanner, { backgroundColor: "#DC262615", borderColor: "#DC2626" }]}>
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <Text style={[styles.errorBannerText, { color: "#DC2626" }]}>{payError}</Text>
          <Pressable onPress={() => setPayError(null)}>
            <Feather name="x" size={16} color="#DC2626" />
          </Pressable>
        </View>
      )}

      {/* Payment progress banner */}
      {bills.length > 0 && (
        <View style={[styles.paymentBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.paymentBannerLeft}>
            <Feather name="check-circle" size={20} color={paidCount === bills.length ? "#16A34A" : "#D97706"} />
            <Text style={[styles.paymentBannerText, { color: colors.foreground }]}>
              {paidCount} / {bills.length} members paid
            </Text>
          </View>
          <View style={[
            styles.paymentPill,
            { backgroundColor: paidCount === bills.length ? "#16A34A20" : "#D9770620" }
          ]}>
            <Text style={[
              styles.paymentPillText,
              { color: paidCount === bills.length ? "#16A34A" : "#D97706" }
            ]}>
              {paidCount === bills.length ? "All Settled" : "Pending"}
            </Text>
          </View>
        </View>
      )}

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

      {/* Member Bills with payment status */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Member Bills</Text>
        {bills.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active members</Text>
        ) : bills.map((b) => {
          const payment = getPayment(b.memberId);
          const isPaid = payment?.paid === true;
          const isProcessing = payingIds.has(b.memberId);

          return (
            <View key={b.memberId}>
              <View style={styles.memberBillRow}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: isPaid ? "#16A34A20" : "#D4500A20" }]}>
                  <Text style={[styles.avatarText, { color: isPaid ? "#16A34A" : "#D4500A" }]}>
                    {b.memberName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Name + meals */}
                <View style={styles.memberBillInfo}>
                  <Text style={[styles.memberBillName, { color: colors.foreground }]}>{b.memberName}</Text>
                  <Text style={[styles.memberBillSub, { color: colors.mutedForeground }]}>
                    {b.mealCount} meals · {b.eggCount} eggs
                  </Text>
                </View>

                {/* Amount + payment toggle */}
                <View style={styles.memberBillRight}>
                  <Text style={[styles.memberBillAmount, { color: b.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
                    ₹{b.dueAmount > 0 ? b.dueAmount.toFixed(0) : b.creditBalance.toFixed(0)}
                  </Text>
                  <Text style={[styles.memberBillStatus, { color: colors.mutedForeground }]}>
                    {b.dueAmount > 0 ? "Due" : "Credit"}
                  </Text>
                </View>
              </View>

              {/* Payment status row */}
              <View style={styles.paymentRow}>
                {/* Status badge */}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isPaid ? "#16A34A15" : "#DC262615" }
                ]}>
                  <Text style={{ fontSize: 13 }}>{isPaid ? "✅" : "❌"}</Text>
                  <Text style={[styles.statusBadgeText, { color: isPaid ? "#16A34A" : "#DC2626" }]}>
                    {isPaid
                      ? `Paid${payment?.paidAt ? ` · ${shortDate(payment.paidAt)}` : ""}`
                      : "Unpaid"}
                  </Text>
                </View>

                {/* Toggle button — admin only */}
                <Pressable
                  style={({ pressed }) => [
                    styles.payToggleBtn,
                    {
                      backgroundColor: isPaid ? "#DC262615" : "#16A34A",
                      opacity: pressed || isProcessing ? 0.75 : 1,
                    },
                  ]}
                  onPress={() => handleTogglePayment(b.memberId, b.dueAmount)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={isPaid ? "#DC2626" : "#fff"} />
                  ) : (
                    <>
                      <Feather
                        name={isPaid ? "x-circle" : "check-circle"}
                        size={14}
                        color={isPaid ? "#DC2626" : "#fff"}
                      />
                      <Text style={[styles.payToggleBtnText, { color: isPaid ? "#DC2626" : "#fff" }]}>
                        {isPaid ? "Mark Unpaid" : "Mark as Paid"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>
          );
        })}
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
  paymentBanner: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 14,
    padding: 14, borderWidth: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  paymentBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  paymentBannerText: { fontSize: 14, fontWeight: "600" },
  paymentPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  paymentPillText: { fontSize: 12, fontWeight: "700" },
  section: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 16,
    padding: 16, borderWidth: 1,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryKey: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 2 },
  memberBillRow: { flexDirection: "row", alignItems: "center", paddingTop: 10, gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700" },
  memberBillInfo: { flex: 1 },
  memberBillName: { fontSize: 15, fontWeight: "600" },
  memberBillSub: { fontSize: 12, marginTop: 2 },
  memberBillRight: { alignItems: "flex-end" },
  memberBillAmount: { fontSize: 16, fontWeight: "700" },
  memberBillStatus: { fontSize: 11 },
  paymentRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 8, gap: 8,
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  payToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    minWidth: 110, justifyContent: "center",
  },
  payToggleBtnText: { fontSize: 12, fontWeight: "700" },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  expenseIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: "600" },
  expenseDate: { fontSize: 12, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 8 },
  errorBanner: {
    marginHorizontal: 20, marginBottom: 12, borderRadius: 12,
    padding: 12, borderWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontWeight: "600" },
});
