import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useRefresh } from "@/hooks/useRefresh";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 340);

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

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, sub, enterDelay = 0,
}: {
  label: string; value: string; icon: string;
  color: string; sub?: string; enterDelay?: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(400)}
      style={[styles.statCard, { backgroundColor: colors.card }, pressStyle]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as "home"} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: color }]}>{sub}</Text> : null}
    </Animated.View>
  );
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const {
    members, expenses, payments, paymentsError, announcements, deleteAnnouncement,
    getMonthTotals, calculateAllMonthlyBills, markPaid, markUnpaid,
  } = useData();
  const [month, setMonth] = useState(getCurrentMonth());
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { refreshing, onRefresh } = useRefresh();

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebarX = useSharedValue(SIDEBAR_WIDTH);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const openSidebar = () => {
    setSidebarVisible(true);
    sidebarX.value = withSpring(0, { damping: 22, stiffness: 200, mass: 0.8 });
  };
  const closeSidebar = () => {
    sidebarX.value = withSpring(SIDEBAR_WIDTH, { damping: 22, stiffness: 200, mass: 0.8 });
    setTimeout(() => setSidebarVisible(false), 320);
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sidebarX.value, [0, SIDEBAR_WIDTH], [1, 0], Extrapolation.CLAMP),
  }));

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
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={openSidebar} style={styles.headerBtn}>
              <Feather name="bell" size={18} color="rgba(255,255,255,0.9)" />
              {announcements.length > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {announcements.length > 9 ? "9+" : String(announcements.length)}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => logout().then(() => router.replace("/"))}
              style={styles.headerBtn}
            >
              <Feather name="log-out" size={18} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
      >
        {/* Month navigator */}
        <Animated.View entering={FadeInDown.delay(0).duration(350)}>
          <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
            <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
              <Feather name="chevron-left" size={22} color="#2563EB" />
            </Pressable>
            <Text style={[styles.monthText, { color: colors.foreground }]}>
              {monthLabel(month)}
            </Text>
            <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
              <Feather name="chevron-right" size={22} color="#2563EB" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Stat cards — staggered entrance */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Active Members" value={String(activeMembers)}
            icon="users" color="#2563EB" enterDelay={80}
          />
          <StatCard
            label="Total Meals" value={String(totalMeals)}
            icon="grid" color="#7C3AED" enterDelay={150}
          />
          <StatCard
            label="Expenses" value={`₹${rawExpense.toFixed(0)}`}
            icon="dollar-sign" color="#0891B2" enterDelay={220}
          />
          <StatCard
            label="Per Meal Rate" value={`₹${perMealCost.toFixed(1)}`}
            icon="trending-up" color="#16A34A" enterDelay={290}
          />
        </View>

        {/* Status banners */}
        {paySuccess && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.errorBanner, { backgroundColor: "#16A34A15", borderColor: "#16A34A" }]}>
              <Feather name="check-circle" size={16} color="#16A34A" />
              <Text style={[styles.errorBannerText, { color: "#16A34A" }]}>{paySuccess}</Text>
              <Pressable onPress={() => setPaySuccess(null)}>
                <Feather name="x" size={16} color="#16A34A" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {paymentsError && (
          <View style={[styles.errorBanner, { backgroundColor: "#EF444415", borderColor: "#EF4444" }]}>
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorBannerText, { color: "#EF4444", fontWeight: "700" }]}>
                bill_payments table not accessible
              </Text>
              <Text style={[styles.errorBannerText, { color: "#EF4444", fontSize: 11, marginTop: 2 }]}>
                {paymentsError}
              </Text>
              <Text style={[styles.errorBannerText, { color: "#EF444490", fontSize: 11, marginTop: 4 }]}>
                Go to Supabase → SQL Editor and re-run the bill_payments migration SQL.
              </Text>
            </View>
          </View>
        )}

        {payError && (
          <View style={[styles.errorBanner, { backgroundColor: "#EF444415", borderColor: "#EF4444" }]}>
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorBannerText, { color: "#EF4444", flex: 1 }]}>{payError}</Text>
            </View>
            <Pressable onPress={() => setPayError(null)}>
              <Feather name="x" size={16} color="#EF4444" />
            </Pressable>
          </View>
        )}

        {/* Payment status banner */}
        {bills.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).duration(400)}>
            <View style={[styles.paymentBanner, { backgroundColor: colors.card }]}>
              <View style={styles.paymentBannerLeft}>
                <Feather
                  name="check-circle"
                  size={20}
                  color={paidCount === bills.length ? "#16A34A" : "#F59E0B"}
                />
                <Text style={[styles.paymentBannerText, { color: colors.foreground }]}>
                  {paidCount} / {bills.length} members paid
                </Text>
              </View>
              <View style={[
                styles.paymentPill,
                { backgroundColor: paidCount === bills.length ? "#16A34A20" : "#F59E0B20" },
              ]}>
                <Text style={[
                  styles.paymentPillText,
                  { color: paidCount === bills.length ? "#16A34A" : "#F59E0B" },
                ]}>
                  {paidCount === bills.length ? "All Settled" : "Pending"}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Monthly summary */}
        <Animated.View entering={FadeInUp.delay(380).duration(400)}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly Summary</Text>
            {[
              ["Total Monthly Expense", `₹${totalExpense.toFixed(0)}`, colors.foreground],
              ["Total Meals Served",    String(totalMeals),            colors.foreground],
              ["Total Due from Members",`₹${totalDue.toFixed(0)}`,     "#EF4444"],
              ["Total Credit Balance",  `₹${totalCredit.toFixed(0)}`,  "#16A34A"],
            ].map(([key, val, clr], i) => (
              <View key={key}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>{key}</Text>
                  <Text style={[styles.summaryVal, { color: clr }]}>{val}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Member bills */}
        <Animated.View entering={FadeInUp.delay(450).duration(400)}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Member Bills</Text>
            {bills.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No active members
              </Text>
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
                      bgColor={isPaid ? "#16A34A20" : "#2563EB20"}
                      textColor={isPaid ? "#16A34A" : "#2563EB"}
                    />
                    <View style={styles.memberBillInfo}>
                      <Text style={[styles.memberBillName, { color: colors.foreground }]}>
                        {b.memberName}
                      </Text>
                      <Text style={[styles.memberBillSub, { color: colors.mutedForeground }]}>
                        {b.mealCount} meals · {b.eggCount} eggs
                      </Text>
                    </View>
                    <View style={styles.memberBillRight}>
                      <Text style={[styles.memberBillAmount, { color: b.dueAmount > 0 ? "#EF4444" : "#16A34A" }]}>
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
                      { backgroundColor: isPaid ? "#16A34A18" : "#EF444418" },
                    ]}>
                      <Text style={{ fontSize: 13 }}>{isPaid ? "✅" : "❌"}</Text>
                      <Text style={[styles.statusBadgeText, { color: isPaid ? "#16A34A" : "#EF4444" }]}>
                        {isPaid
                          ? `Paid${payment?.paidAt ? ` · ${shortDate(payment.paidAt)}` : ""}`
                          : "Unpaid"}
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.payToggleBtnWrapper,
                        { opacity: pressed || isProcessing ? 0.75 : 1 },
                      ]}
                      onPress={() => handleTogglePayment(b.memberId, b.dueAmount)}
                      disabled={isProcessing}
                    >
                      {isPaid ? (
                        <View style={[styles.payToggleBtn, { backgroundColor: "#EF444418" }]}>
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <>
                              <Feather name="x-circle" size={14} color="#EF4444" />
                              <Text style={[styles.payToggleBtnText, { color: "#EF4444" }]}>
                                Mark Unpaid
                              </Text>
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
                              <Text style={[styles.payToggleBtnText, { color: "#fff" }]}>
                                Mark as Paid
                              </Text>
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
        </Animated.View>

        {/* Recent expenses */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Expenses
            </Text>
            {monthExpenses.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No expenses this month
              </Text>
            ) : monthExpenses.slice(-5).reverse().map((e) => (
              <View key={e.id}>
                <View style={styles.expenseRow}>
                  <View style={[styles.expenseIcon, { backgroundColor: "#2563EB18" }]}>
                    <Feather name="shopping-bag" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.expenseName, { color: colors.foreground }]}>
                      {e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                      {e.shopName ? ` · ${e.shopName}` : ""}
                    </Text>
                    <Text style={[styles.expenseDate, { color: colors.mutedForeground }]}>
                      {e.date}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmount, { color: colors.foreground }]}>
                    ₹{e.amount}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Announcement Sidebar ── */}
      {sidebarVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[styles.backdrop, backdropStyle]}
            pointerEvents="auto"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sidebar,
              { backgroundColor: colors.card, paddingTop: insets.top },
              sidebarStyle,
            ]}
            pointerEvents="auto"
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarTitleRow}>
                <View style={[styles.sidebarIconWrap, { backgroundColor: "#2563EB18" }]}>
                  <Feather name="bell" size={18} color="#2563EB" />
                </View>
                <Text style={[styles.sidebarTitle, { color: colors.foreground }]}>
                  Announcements
                </Text>
              </View>
              <Pressable onPress={closeSidebar} style={styles.sidebarClose}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={[styles.sidebarDivider, { backgroundColor: colors.border }]} />

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
              showsVerticalScrollIndicator={false}
            >
              {announcements.length === 0 ? (
                <View style={styles.sidebarEmpty}>
                  <Feather name="bell-off" size={40} color={colors.mutedForeground} />
                  <Text style={[styles.sidebarEmptyText, { color: colors.mutedForeground }]}>
                    No announcements yet
                  </Text>
                  <Text style={[styles.sidebarEmptyHint, { color: colors.mutedForeground }]}>
                    Post one from More → News
                  </Text>
                </View>
              ) : announcements.map((a) => (
                <View key={a.id} style={[styles.annCard, { backgroundColor: colors.background }]}>
                  <View style={styles.annCardHeader}>
                    <Text
                      style={[styles.annCardTitle, { color: colors.foreground }]}
                      numberOfLines={2}
                    >
                      {a.title}
                    </Text>
                    <Pressable
                      onPress={() =>
                        Alert.alert("Delete", `Remove "${a.title}"?`, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete", style: "destructive",
                            onPress: async () => {
                              try { await deleteAnnouncement(a.id); }
                              catch (err) { Alert.alert("Error", (err as Error).message); }
                            },
                          },
                        ])
                      }
                      style={{ padding: 4 }}
                    >
                      <Feather name="trash-2" size={15} color="#EF4444" />
                    </Pressable>
                  </View>
                  <Text style={[styles.annCardBody, { color: colors.mutedForeground }]}>
                    {a.body}
                  </Text>
                  <View style={styles.annCardFooter}>
                    <Feather name="clock" size={11} color="#2563EB" />
                    <Text style={styles.annCardDate}>
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBtn: {
    padding: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  bellBadge: {
    position: "absolute", top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sidebar: {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    shadowColor: "#000", shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 24,
  },
  sidebarHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 16,
  },
  sidebarTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sidebarIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  sidebarTitle: { fontSize: 18, fontWeight: "800" },
  sidebarClose: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  sidebarDivider: { height: 1, marginHorizontal: 16 },
  sidebarEmpty: { alignItems: "center", paddingTop: 60, gap: 12 },
  sidebarEmptyText: { fontSize: 15, fontWeight: "600" },
  sidebarEmptyHint: { fontSize: 12 },
  annCard: {
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: "#2563EB",
  },
  annCardHeader: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 8, marginBottom: 6,
  },
  annCardTitle: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  annCardBody: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  annCardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  annCardDate: { fontSize: 11, fontWeight: "600", color: "#2563EB" },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 16, padding: 8,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 20, gap: 12, marginBottom: 16,
  },
  statCard: {
    width: "47%", borderRadius: 20, padding: 18, gap: 6,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  statSub: { fontSize: 11, fontWeight: "600" },
  paymentBanner: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  paymentBannerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  paymentBannerText: { fontSize: 14, fontWeight: "600" },
  paymentPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  paymentPillText: { fontSize: 12, fontWeight: "700" },
  section: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 18,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryKey: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 2 },
  memberBillRow: { flexDirection: "row", alignItems: "center", paddingTop: 10, gap: 12 },
  memberBillInfo: { flex: 1 },
  memberBillName: { fontSize: 15, fontWeight: "600" },
  memberBillSub: { fontSize: 12, marginTop: 2 },
  memberBillRight: { alignItems: "flex-end" },
  memberBillAmount: { fontSize: 16, fontWeight: "700" },
  memberBillStatus: { fontSize: 11, marginTop: 2 },
  paymentRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 8, gap: 8,
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  payToggleBtnWrapper: {},
  payToggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  payToggleBtnText: { fontSize: 12, fontWeight: "700" },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  expenseIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: "600" },
  expenseDate: { fontSize: 11, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 12 },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
  },
  errorBannerText: { fontSize: 13, flex: 1 },
});
