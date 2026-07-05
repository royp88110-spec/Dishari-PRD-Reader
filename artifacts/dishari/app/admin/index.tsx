import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { MemberAvatar } from "@/components/MemberAvatar";

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
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "25" }]}>
        <Feather name={icon as "home"} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: color }]}>{sub}</Text> : null}
    </View>
  );
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { members, expenses, payments, paymentsError, getMonthTotals, calculateAllMonthlyBills, markPaid, markUnpaid } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const getPayment = (memberId: string) =>
    payments.find((p) => p.memberId === memberId && p.month === month);

  const handleTogglePayment = async (memberId: string, dueAmount: number) => {
    if (payingIds.has(memberId)) return;
    const payment = getPayment(memberId);
    setPayError(null);
    setPaySuccess(null);
    setMemberPaying(memberId, true);
    try {
      if (payment?.paid) {
        await markUnpaid(memberId, month);
        setPaySuccess("Payment marked as unpaid.");
      } else {
        await markPaid(memberId, month, dueAmount);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPaySuccess("Payment recorded successfully.");
      }
      // Auto-dismiss success banner after 3 seconds; cancel any prior timer first
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setPaySuccess(null), 3000);
    } catch (err) {
      const msg = (err as Error).message ?? "";
      setPayError(msg || "Failed to update payment status. Please try again.");
    } finally {
      setMemberPaying(memberId, false);
    }
  };

  const paidCount = bills.filter((b) => getPayment(b.memberId)?.paid === true).length;

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Dashboard"
        icon="home"
        subtitle={todayLabel}
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
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-left" size={22} color="#D4500A" />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-right" size={22} color="#D4500A" />
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Active Members" value={String(activeMembers)} icon="users" color="#D4500A" />
          <StatCard label="Total Meals" value={String(totalMeals)} icon="grid" color="#7C3AED" />
          <StatCard label="Expenses" value={`₹${rawExpense.toFixed(0)}`} icon="dollar-sign" color="#0891B2" />
          <StatCard label="Per Meal Rate" value={`₹${perMealCost.toFixed(1)}`} icon="trending-up" color="#16A34A" />
        </View>

        {paySuccess && (
          <View style={[styles.errorBanner, { backgroundColor: "#16A34A15", borderColor: "#16A34A" }]}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={[styles.errorBannerText, { color: "#16A34A" }]}>{paySuccess}</Text>
            <Pressable onPress={() => setPaySuccess(null)}>
              <Feather name="x" size={16} color="#16A34A" />
            </Pressable>
          </View>
        )}

        {paymentsError && (
          <View style={[styles.errorBanner, { backgroundColor: "#DC262615", borderColor: "#DC2626" }]}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorBannerText, { color: "#DC2626", fontWeight: "700" }]}>
                bill_payments table not accessible
              </Text>
              <Text style={[styles.errorBannerText, { color: "#DC2626", fontSize: 11, marginTop: 2 }]}>
                {paymentsError}
              </Text>
              <Text style={[styles.errorBannerText, { color: "#DC262690", fontSize: 11, marginTop: 4 }]}>
                Go to Supabase → SQL Editor and re-run the bill_payments migration SQL.
              </Text>
            </View>
          </View>
        )}

        {payError && (
          <View style={[styles.errorBanner, { backgroundColor: "#DC262615", borderColor: "#DC2626" }]}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorBannerText, { color: "#DC2626", flex: 1 }]}>{payError}</Text>
            </View>
            <Pressable onPress={() => setPayError(null)}>
              <Feather name="x" size={16} color="#DC2626" />
            </Pressable>
          </View>
        )}

        {bills.length > 0 && (
          <View style={[styles.paymentBanner, { backgroundColor: colors.card }]}>
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

        <View style={[styles.section, { backgroundColor: colors.card }]}>
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

        <View style={[styles.section, { backgroundColor: colors.card }]}>
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
                  <MemberAvatar
                    name={b.memberName}
                    size={42}
                    bgColor={isPaid ? "#16A34A20" : "#D4500A20"}
                    textColor={isPaid ? "#16A34A" : "#D4500A"}
                  />
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

                <View style={styles.paymentRow}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: isPaid ? "#16A34A18" : "#DC262618" }
                  ]}>
                    <Text style={{ fontSize: 13 }}>{isPaid ? "✅" : "❌"}</Text>
                    <Text style={[styles.statusBadgeText, { color: isPaid ? "#16A34A" : "#DC2626" }]}>
                      {isPaid
                        ? `Paid${payment?.paidAt ? ` · ${shortDate(payment.paidAt)}` : ""}`
                        : "Unpaid"}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.payToggleBtnWrapper,
                      { opacity: pressed || isProcessing ? 0.75 : 1 }
                    ]}
                    onPress={() => handleTogglePayment(b.memberId, b.dueAmount)}
                    disabled={isProcessing}
                  >
                    {isPaid ? (
                      <View style={[styles.payToggleBtn, { backgroundColor: "#DC262618" }]}>
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <>
                            <Feather name="x-circle" size={14} color="#DC2626" />
                            <Text style={[styles.payToggleBtnText, { color: "#DC2626" }]}>Mark Unpaid</Text>
                          </>
                        )}
                      </View>
                    ) : (
                      <LinearGradient
                        colors={["#16A34A", "#15803D"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.payToggleBtn}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Feather name="check-circle" size={14} color="#fff" />
                            <Text style={[styles.payToggleBtnText, { color: "#fff" }]}>Mark as Paid</Text>
                          </>
                        )}
                      </LinearGradient>
                    )}
                  </Pressable>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>
            );
          })}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
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
    marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 16,
    padding: 8,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20,
    gap: 12, marginBottom: 16,
  },
  statCard: {
    width: "47%", borderRadius: 20, padding: 18, gap: 6,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  statSub: { fontSize: 11, fontWeight: "600" },
  paymentBanner: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20,
    padding: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  paymentBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  paymentBannerText: { fontSize: 14, fontWeight: "600" },
  paymentPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  paymentPillText: { fontSize: 12, fontWeight: "700" },
  section: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20,
    padding: 18,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryKey: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 2 },
  memberBillRow: { flexDirection: "row", alignItems: "center", paddingTop: 10, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
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
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  payToggleBtnWrapper: { borderRadius: 20, overflow: "hidden" },
  payToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    minWidth: 110, justifyContent: "center",
  },
  payToggleBtnText: { fontSize: 12, fontWeight: "700" },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  expenseIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
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