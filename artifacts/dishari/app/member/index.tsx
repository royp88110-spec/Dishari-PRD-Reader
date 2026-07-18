import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
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
import { GradientBackground } from "@/components/GradientBackground";
import { useRefresh } from "@/hooks/useRefresh";
import { PRIMARY, EMERALD, RED, CYAN, ORANGE, YELLOW } from "@/constants/colors";

// ── Month helpers ─────────────────────────────────────────────────────────────
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

/** Safe toFixed: returns "0" for NaN / non-finite inputs. */
function safeFix(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "0";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MemberHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { calculateMonthlyBill, announcements, payments, settings, isLoaded } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const bill = calculateMonthlyBill(memberId, month);
  const payment = payments.find((p) => p.memberId === memberId && p.month === month);
  const isPaid = payment?.paid ?? false;
  const recentAnnouncements = announcements.slice(0, 3);

  const handleLogout = () =>
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => { void logout(); } },
    ]);

  const miniStats = [
    { label: "Meals",      val: `${bill.mealCount}`,                icon: "grid",         color: CYAN,    bg: `${CYAN}20`    },
    { label: "Meal Cost",  val: `₹${safeFix(bill.mealBill)}`,       icon: "dollar-sign",  color: ORANGE,  bg: `${ORANGE}20` },
    { label: "Egg Cost",   val: `₹${safeFix(bill.eggBill)}`,        icon: "sun",          color: YELLOW,  bg: `${YELLOW}20` },
    { label: "Fine",       val: `₹${safeFix(bill.fineTotal)}`,      icon: "alert-circle", color: RED,     bg: `${RED}20`    },
    { label: "Advance",    val: `₹${safeFix(bill.totalAdvance)}`,   icon: "credit-card",  color: EMERALD, bg: `${EMERALD}20` },
    { label: "Amount Due", val: `₹${safeFix(bill.dueAmount)}`,      icon: "trending-up",  color: PRIMARY, bg: `${PRIMARY}20` },
  ] as const;

  // Card / text tokens that adapt to light ↔ dark
  const card        = colors.card;         // rgba(255,255,255,0.92) light  |  #111827 dark
  const cardText    = colors.cardForeground; // #1E1B4B light  |  #E2E8F0 dark
  const muted       = colors.mutedForeground;
  const borderColor = colors.border;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <GradientBackground>
      <ScreenHeader
        title={`Hi, ${user?.name?.split(" ")[0] ?? "Member"} 👋`}
        subtitle="Your monthly overview"
        avatarName={user?.name}
        avatarUrl={user?.photoUrl}
        rightElement={
          <Pressable onPress={handleLogout} style={styles.logoutBtn} hitSlop={10}>
            <Feather name="log-out" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>
        }
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

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      >
        {/* ── Payment Status Banner ─────────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: 20, marginTop: 20 }}
        >
          <LinearGradient
            colors={isPaid ? [EMERALD, "#10B981"] : [ORANGE, "#EA580C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentBanner}
          >
            <View style={styles.paymentBannerLeft}>
              <View style={styles.paymentBannerBadge}>
                <Feather name={isPaid ? "check-circle" : "clock"} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentBannerTitle}>
                  {isPaid ? "Payment Received ✓" : "Payment Pending"}
                </Text>
                <Text style={styles.paymentBannerSub}>
                  {isPaid
                    ? `Paid ₹${safeFix(payment?.amount ?? 0)} · ${payment?.paidAt?.slice(0, 10) ?? ""}`
                    : `₹${safeFix(bill.dueAmount)} due for ${monthLabel(month)}`}
                </Text>
              </View>
            </View>
            <View style={styles.paymentBannerPill}>
              <Text style={styles.paymentBannerPillText}>{isPaid ? "PAID" : "DUE"}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Amount Due / Credit card ─────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: 20, marginTop: 14 }}
        >
          <LinearGradient
            colors={bill.dueAmount > 0 ? [RED, "#E11D48"] : [EMERALD, "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dueCard}
          >
            <View style={styles.dueCardInner}>
              <View style={styles.dueCardLeft}>
                <Text style={styles.dueCardLabel}>
                  {bill.dueAmount > 0 ? "Amount Due" : "Credit Balance"}
                </Text>
                <Text style={styles.dueCardAmount}>
                  ₹{safeFix(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance, 2)}
                </Text>
                <Text style={styles.dueCardSub}>{monthLabel(month)}</Text>
              </View>
              <View style={styles.dueCardIcon}>
                <Feather
                  name={bill.dueAmount > 0 ? "alert-circle" : "check-circle"}
                  size={48}
                  color="rgba(255,255,255,0.35)"
                />
              </View>
            </View>
            {/* 5-column breakdown strip */}
            <View style={styles.breakdownStrip}>
              {[
                { key: "Meals", val: `₹${safeFix(bill.mealBill)}` },
                { key: "Eggs",  val: `₹${safeFix(bill.eggBill)}`  },
                { key: "Cook",  val: `₹${safeFix(bill.cookShare)}` },
                { key: "Fines", val: `₹${safeFix(bill.fineTotal)}` },
                { key: "Paid",  val: `₹${safeFix(bill.totalAdvance)}` },
              ].map(({ key, val }, i) => (
                <React.Fragment key={key}>
                  {i > 0 && <View style={styles.breakdownDivider} />}
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownVal}>{val}</Text>
                    <Text style={styles.breakdownKey}>{key}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* ── Mini stats (6 cards, 2-per-row) ──────────────────────────────── */}
        <View>
          <View style={styles.miniStatsRow}>
            {miniStats.map(({ label, val, icon, color, bg }) => (
              <View key={label} style={[styles.miniStatCard, { backgroundColor: card }]}>
                <View style={[styles.miniStatIcon, { backgroundColor: bg }]}>
                  <Feather name={icon as "grid"} size={18} color={color} />
                </View>
                <Text style={[styles.miniStatVal, { color: cardText }]}>{val}</Text>
                <Text style={[styles.miniStatLabel, { color: muted }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Full Monthly Bill Breakdown ───────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: card }]}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionCardIcon, { backgroundColor: `${PRIMARY}15` }]}>
                <Feather name="file-text" size={18} color={PRIMARY} />
              </View>
              <Text style={[styles.sectionCardTitle, { color: cardText }]}>Monthly Bill</Text>
            </View>

            {/* Rate info */}
            {[
              { label: "Meal Rate",   val: `₹${safeFix(bill.perMealCost, 2)} / meal` },
              { label: "Meals Eaten", val: `${bill.mealCount} meal${bill.mealCount !== 1 ? "s" : ""}` },
            ].map(({ label, val }) => (
              <View key={label} style={[styles.billRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.billLabel, { color: muted }]}>{label}</Text>
                <Text style={[styles.billVal, { color: cardText }]}>{val}</Text>
              </View>
            ))}

            {/* Section divider */}
            <View style={[styles.billSectionDivider, { borderBottomColor: borderColor }]}>
              <Text style={[styles.billSectionLabel, { color: muted }]}>Components</Text>
            </View>

            {/* Component line items */}
            {[
              { label: "Meal Cost",   val: `₹${safeFix(bill.mealBill, 2)}`,  icon: "dollar-sign",  color: ORANGE },
              { label: `Eggs (${bill.eggCount} × ₹${settings.eggPrice})`,
                                      val: `₹${safeFix(bill.eggBill, 2)}`,   icon: "sun",          color: YELLOW },
              { label: "Cook Salary", val: `₹${safeFix(bill.cookShare, 2)}`, icon: "users",        color: CYAN   },
              { label: "Fine",        val: `₹${safeFix(bill.fineTotal, 2)}`, icon: "alert-circle", color: RED    },
            ].map(({ label, val, icon, color }) => (
              <View key={label} style={[styles.billRow, { borderBottomColor: borderColor }]}>
                <View style={styles.billLabelRow}>
                  <View style={[styles.billIconDot, { backgroundColor: `${color}18` }]}>
                    <Feather name={icon as "grid"} size={12} color={color} />
                  </View>
                  <Text style={[styles.billLabel, { color: muted }]}>{label}</Text>
                </View>
                <Text style={[styles.billVal, { color: cardText }]}>{val}</Text>
              </View>
            ))}

            {/* Gross Bill */}
            <View style={[styles.billRow, { borderBottomColor: borderColor }]}>
              <Text style={[styles.billLabel, { color: cardText, fontWeight: "700" }]}>Gross Bill</Text>
              <Text style={[styles.billVal, { color: PRIMARY, fontWeight: "800", fontSize: 16 }]}>
                ₹{safeFix(bill.grossBill, 2)}
              </Text>
            </View>

            {/* Advance deduction */}
            <View style={[styles.billRow, { borderBottomColor: borderColor }]}>
              <View style={styles.billLabelRow}>
                <View style={[styles.billIconDot, { backgroundColor: `${EMERALD}18` }]}>
                  <Feather name="minus-circle" size={12} color={EMERALD} />
                </View>
                <Text style={[styles.billLabel, { color: muted }]}>Advance Deduction</Text>
              </View>
              <Text style={[styles.billVal, { color: EMERALD, fontWeight: "600" }]}>
                − ₹{safeFix(bill.totalAdvance, 2)}
              </Text>
            </View>

            {/* Final payable */}
            <View style={[styles.billRowFinal, { borderTopColor: borderColor }]}>
              <Text style={[styles.billLabel, { color: cardText, fontWeight: "700", fontSize: 15 }]}>
                {bill.dueAmount > 0 ? "Final Payable" : "Credit Balance"}
              </Text>
              <Text style={[styles.billVal, {
                color: bill.dueAmount > 0 ? RED : EMERALD,
                fontWeight: "900", fontSize: 20,
              }]}>
                ₹{safeFix(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance, 2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Egg Bill Card ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: card }]}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionCardIcon, { backgroundColor: `${YELLOW}20` }]}>
                <Feather name="sun" size={18} color={YELLOW} />
              </View>
              <Text style={[styles.sectionCardTitle, { color: cardText }]}>Egg Bill</Text>
            </View>
            {[
              { label: "Total Eggs Consumed", val: `${bill.eggCount} egg${bill.eggCount !== 1 ? "s" : ""}` },
              { label: "Egg Price",            val: `₹${settings.eggPrice} / egg` },
              { label: "Egg Total Cost",        val: `₹${safeFix(bill.eggBill, 2)}` },
            ].map(({ label, val }) => (
              <View key={label} style={[styles.billRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.billLabel, { color: muted }]}>{label}</Text>
                <Text style={[styles.billVal, { color: cardText }]}>{val}</Text>
              </View>
            ))}
            <View style={[styles.eggNote, { backgroundColor: `${YELLOW}12`, borderColor: `${YELLOW}30` }]}>
              <Feather name="info" size={13} color={YELLOW} />
              <Text style={[styles.eggNoteText, { color: muted }]}>
                Egg cost is included in your monthly gross bill.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Announcements ─────────────────────────────────────────────────── */}
        {recentAnnouncements.length > 0 && (
          <View
            style={[styles.section, { marginBottom: 8 }]}
          >
            <Text style={[styles.sectionTitle, { color: cardText }]}>📣 Announcements</Text>
            {recentAnnouncements.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.announcementCard,
                  { marginTop: i === 0 ? 12 : 10, backgroundColor: card, borderColor: `${PRIMARY}18` },
                ]}
              >
                <View style={[styles.announcementDot, { backgroundColor: PRIMARY }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.announcementTitle, { color: cardText }]}>{a.title}</Text>
                  {a.body ? (
                    <Text style={[styles.announcementBody, { color: muted }]}>{a.body}</Text>
                  ) : null}
                  <Text style={[styles.announcementDate, { color: muted }]}>
                    {a.createdAt?.slice(0, 10) ?? ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  logoutBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  headerMonthNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerMonthText: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#fff" },

  // Payment banner
  paymentBanner: {
    borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  paymentBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  paymentBannerBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  paymentBannerTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  paymentBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 2 },
  paymentBannerPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  paymentBannerPillText: { fontSize: 11, fontWeight: "900", color: "#fff", letterSpacing: 1 },

  // Due card
  dueCard: {
    borderRadius: 28, overflow: "hidden",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 14,
  },
  dueCardInner: { flexDirection: "row", alignItems: "center", padding: 24, paddingBottom: 20 },
  dueCardLeft: { flex: 1 },
  dueCardLabel: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginBottom: 6 },
  dueCardAmount: { fontSize: 40, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  dueCardSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6 },
  dueCardIcon: { opacity: 0.8 },
  breakdownStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingVertical: 12, paddingHorizontal: 16,
  },
  breakdownItem: { flex: 1, alignItems: "center" },
  breakdownVal: { fontSize: 13, fontWeight: "700", color: "#fff" },
  breakdownKey: { fontSize: 9, color: "rgba(255,255,255,0.72)", marginTop: 2, fontWeight: "500" },
  breakdownDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 2 },

  // Mini stats — background supplied inline via colors.card
  miniStatsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
    paddingHorizontal: 20, marginTop: 20, marginBottom: 4,
  },
  miniStatCard: {
    width: "47%", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.22)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
    alignItems: "center",
  },
  miniStatIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  // color supplied inline
  miniStatVal: { fontSize: 20, fontWeight: "800" },
  miniStatLabel: { fontSize: 12, marginTop: 3 },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  // background supplied inline via colors.card
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.22)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
    padding: 18,
  },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionCardIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionCardTitle: { fontSize: 16, fontWeight: "700" },

  // Bill rows — colors supplied inline
  billRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, borderBottomWidth: 1,
  },
  billRowFinal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderTopWidth: 1.5, marginTop: 4,
  },
  billSectionDivider: { paddingBottom: 6, borderBottomWidth: 1, marginTop: 6, marginBottom: 2 },
  billSectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  billLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  billIconDot: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  billLabel: { fontSize: 14 },
  billVal: { fontSize: 15, fontWeight: "600" },

  // Egg note
  eggNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 10,
  },
  eggNoteText: { fontSize: 12, flex: 1, lineHeight: 17 },

  // Announcements — background supplied inline via colors.card
  announcementCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
  },
  announcementDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  announcementTitle: { fontSize: 15, fontWeight: "700" },
  announcementBody: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  announcementDate: { fontSize: 11, marginTop: 5 },
});
