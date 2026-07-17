import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { type Announcement, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useRefresh } from "@/hooks/useRefresh";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const names = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${names[parseInt(mo) - 1]} ${y}`;
}
function friendlyDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ─── BillRow ──────────────────────────────────────────────────────────────────

function BillRow({ label, value, color, bold }: {
  label: string; value: string; color?: string; bold?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billKey, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.billVal, { color: color ?? colors.foreground, fontWeight: bold ? "700" : "500" }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── NotificationCard ────────────────────────────────────────────────────────

function NotificationCard({ ann, index, onDismiss }: {
  ann: Announcement; index: number; onDismiss: (id: string) => void;
}) {
  const translateY   = useRef(new Animated.Value(-72)).current;
  const opacity      = useRef(new Animated.Value(0)).current;
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0, duration: 420, delay: index * 90,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 380, delay: index * 90, useNativeDriver: true,
      }),
    ]).start();

    const ping = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale,   { toValue: 2.6, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0,   duration: 1300, useNativeDriver: true }),
      ]),
    );
    ping.start();
    return () => ping.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -48, duration: 220,
        easing: Easing.in(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 0, duration: 190, useNativeDriver: true }),
    ]).start(() => onDismiss(ann.id));
  }, [ann.id, onDismiss, translateY, opacity]);

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity, marginBottom: 10 }}>
      <View style={nStyles.card}>
        {/* Left blue accent bar */}
        <View style={nStyles.accentBar} />
        {/* Pulsing unread dot */}
        <View style={nStyles.dotWrap}>
          <Animated.View style={[nStyles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
          <View style={nStyles.dot} />
        </View>
        <View style={nStyles.textWrap}>
          <Text style={nStyles.title} numberOfLines={1}>{ann.title}</Text>
          <Text style={nStyles.body} numberOfLines={2}>{ann.body}</Text>
          <Text style={nStyles.date}>
            {new Date(ann.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={({ pressed }) => [nStyles.dismissBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={nStyles.dismissCircle}>
            <Feather name="x" size={11} color="#2563EB" />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function NotificationHeader({ count }: { count: number }) {
  return (
    <View style={nStyles.sectionHeader}>
      <View style={nStyles.bellWrap}>
        <Feather name="bell" size={13} color="#2563EB" />
      </View>
      <Text style={nStyles.sectionTitle}>Notifications</Text>
      <View style={nStyles.badge}>
        <Text style={nStyles.badgeText}>{count}</Text>
      </View>
    </View>
  );
}

// ─── MemberHome ───────────────────────────────────────────────────────────────

export default function MemberHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { calculateMonthlyBill, getMonthTotals, settings, payments, announcements } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const [month, setMonth] = useState(getCurrentMonth());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const memberId = user?.memberId ?? "";
  const bill = calculateMonthlyBill(memberId, month);
  const { perMealCost, totalExpense, totalMeals } = getMonthTotals(month);

  const payment = payments.find((p) => p.memberId === memberId && p.month === month);
  const isPaid = payment?.paid === true;

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.has(a.id));
  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={user?.name ?? "My Bill"}
        avatarName={user?.name}
        avatarUrl={user?.photoUrl}
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
        {/* ── Notifications ─────────────────────────────────────────────── */}
        {visibleAnnouncements.length > 0 && (
          <View style={nStyles.section}>
            <NotificationHeader count={visibleAnnouncements.length} />
            {visibleAnnouncements.slice(0, 5).map((ann, i) => (
              <NotificationCard key={ann.id} ann={ann} index={i} onDismiss={handleDismiss} />
            ))}
          </View>
        )}

        {/* ── Month navigator ───────────────────────────────────────────── */}
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-left" size={22} color="#2563EB" />
          </Pressable>
          <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
            <Feather name="chevron-right" size={22} color="#2563EB" />
          </Pressable>
        </View>

        {/* ── Payment Status Card ───────────────────────────────────────── */}
        <View style={[
          styles.paymentCard,
          {
            backgroundColor: isPaid ? "#16A34A08" : "#EF444408",
            borderColor: isPaid ? "#16A34A" : "#EF4444",
            borderWidth: 2.5,
          },
        ]}>
          <View style={styles.paymentCardInner}>
            <Text style={styles.paymentEmoji}>{isPaid ? "✅" : "❌"}</Text>
            <View style={styles.paymentCardText}>
              <Text style={[styles.paymentStatus, { color: isPaid ? "#16A34A" : "#EF4444" }]}>
                {isPaid ? "Bill Paid" : "Bill Unpaid"}
              </Text>
              <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>
                {isPaid
                  ? `Payment received on ${friendlyDate(payment?.paidAt ?? null)}`
                  : "Contact admin after paying your bill"}
              </Text>
            </View>
          </View>
          {isPaid && bill.grossBill > 0 && (
            <View style={[styles.paidAmountBadge, { backgroundColor: "#16A34A18" }]}>
              <Text style={[styles.paidAmountText, { color: "#16A34A" }]}>
                ₹{bill.grossBill.toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Due / Credit card ─────────────────────────────────────────── */}
        <View style={[
          styles.dueCard,
          {
            backgroundColor: bill.dueAmount > 0 ? "#EF444405" : "#16A34A05",
            borderColor: bill.dueAmount > 0 ? "#EF4444" : "#16A34A",
            borderWidth: 2.5,
          },
        ]}>
          <Text style={[styles.dueLabel, { color: bill.dueAmount > 0 ? "#EF4444" : "#16A34A" }]}>
            {bill.dueAmount > 0 ? "Amount Due" : "Credit Balance"}
          </Text>
          <Text style={[styles.dueAmount, { color: bill.dueAmount > 0 ? "#EF4444" : "#16A34A" }]}>
            ₹{(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(2)}
          </Text>
          <Text style={[styles.dueSub, { color: colors.mutedForeground }]}>
            {bill.dueAmount > 0 ? "Please pay to admin" : "Carry forward to next month"}
          </Text>
        </View>

        {/* ── Bill Breakdown ────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="file-text" size={16} color="#2563EB" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Bill Breakdown</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Meals Taken"     value={`${bill.mealCount}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Per Meal Rate"   value={`₹${bill.perMealCost.toFixed(2)}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Meal Bill"       value={`₹${bill.mealBill.toFixed(2)}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Eggs Consumed"   value={`${bill.eggCount} × ₹${settings.eggPrice}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Egg Bill"        value={`₹${bill.eggBill.toFixed(2)}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Cook Salary"     value={`₹${settings.cookSalary.toFixed(2)}`} />
          {bill.fineTotal > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BillRow label="Fine" value={`₹${bill.fineTotal.toFixed(2)}`} color="#EF4444" />
            </>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Gross Bill"      value={`₹${bill.grossBill.toFixed(2)}`} bold />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Advance Paid"    value={`- ₹${bill.totalAdvance.toFixed(2)}`} color="#16A34A" />
          <View style={[styles.bigDivider, { backgroundColor: colors.border }]} />
          <BillRow
            label={bill.dueAmount > 0 ? "Amount Due" : "Credit Balance"}
            value={`₹${(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(2)}`}
            color={bill.dueAmount > 0 ? "#EF4444" : "#16A34A"}
            bold
          />
        </View>

        {/* ── Mess Summary ──────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="bar-chart-2" size={16} color="#2563EB" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mess Summary</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Total Monthly Expense" value={`₹${totalExpense.toFixed(0)}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Total Meals Served" value={String(totalMeals)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Per Meal Cost" value={`₹${perMealCost.toFixed(2)}`} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <BillRow label="Cook Salary" value={`₹${settings.cookSalary} / member`} />
        </View>

        {/* ── Quick Stats ───────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: "Meals",   value: String(bill.mealCount),                 icon: "grid"        as const, color: "#2563EB" },
            { label: "Eggs",    value: String(bill.eggCount),                  icon: "circle"      as const, color: "#F59E0B" },
            { label: "Advance", value: `₹${bill.totalAdvance.toFixed(0)}`,     icon: "credit-card" as const, color: "#16A34A" },
          ].map(({ label, value, icon, color }) => (
            <View key={label} style={[styles.miniStat, { backgroundColor: colors.card }]}>
              <View style={[styles.miniStatIcon, { backgroundColor: color + "18" }]}>
                <Feather name={icon} size={16} color={color} />
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

// ─── Notification styles ──────────────────────────────────────────────────────

const nStyles = StyleSheet.create({
  section: { marginHorizontal: 20, marginTop: 16, marginBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  bellWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: "#0F172A",
    textTransform: "uppercase", letterSpacing: 0.6, flex: 1,
  },
  badge: {
    backgroundColor: "#2563EB", borderRadius: 12,
    minWidth: 22, height: 22, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderRadius: 16, overflow: "hidden",
    paddingVertical: 13, paddingRight: 12,
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  accentBar: { width: 4, alignSelf: "stretch", backgroundColor: "#2563EB", marginRight: 14, borderRadius: 2 },
  dotWrap: { width: 12, height: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  pulseRing: {
    position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: "#2563EB",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB" },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 3 },
  body: { fontSize: 12, color: "#64748B", lineHeight: 18, marginBottom: 4 },
  date: { fontSize: 10, color: "#2563EB", fontWeight: "600" },
  dismissBtn: { marginLeft: 10, padding: 4 },
  dismissCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#BFDBFE",
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  logoutBtn: {
    padding: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  monthNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginTop: 16, marginBottom: 16,
    borderRadius: 16, padding: 8,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  paymentCard: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20, padding: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  paymentCardInner: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  paymentEmoji: { fontSize: 28 },
  paymentCardText: { flex: 1 },
  paymentStatus: { fontSize: 16, fontWeight: "700" },
  paymentSub: { fontSize: 12, marginTop: 4 },
  paidAmountBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  paidAmountText: { fontSize: 15, fontWeight: "700" },
  dueCard: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 20, padding: 24, alignItems: "center",
  },
  dueLabel: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  dueAmount: { fontSize: 42, fontWeight: "800", marginVertical: 8 },
  dueSub: { fontSize: 13 },
  section: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 20, padding: 20,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 4,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  billKey: { fontSize: 14 },
  billVal: { fontSize: 14 },
  divider: { height: 1, marginVertical: 2 },
  bigDivider: { height: 2, marginVertical: 6 },
  statsRow: { flexDirection: "row", marginHorizontal: 20, gap: 12, marginBottom: 20 },
  miniStat: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 4,
  },
  miniStatIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  miniStatVal: { fontSize: 16, fontWeight: "700" },
  miniStatLabel: { fontSize: 11 },
});
