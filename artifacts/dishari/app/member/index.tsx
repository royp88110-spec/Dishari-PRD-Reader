import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { GradientBackground } from "@/components/GradientBackground";
import { useRefresh } from "@/hooks/useRefresh";
import { PRIMARY, PRIMARY2, EMERALD, RED, CYAN, ORANGE } from "@/constants/colors";

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

export default function MemberHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { calculateMonthlyBill, announcements, isLoaded } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const bill     = calculateMonthlyBill(memberId, month);
  const recentAnnouncements = announcements.slice(0, 3);

  const miniStats = [
    { label: "Meals",    val: bill.mealCount.toString(),         icon: "grid",         color: CYAN,   bg: `${CYAN}20`    },
    { label: "Meal Cost", val: `₹${bill.mealBill.toFixed(0)}`,  icon: "dollar-sign",  color: ORANGE, bg: `${ORANGE}20` },
    { label: "Fines",    val: `₹${bill.fineTotal.toFixed(0)}`,  icon: "alert-circle", color: RED,    bg: `${RED}20`    },
    { label: "Advance",  val: `₹${bill.totalAdvance.toFixed(0)}`, icon: "credit-card", color: EMERALD, bg: `${EMERALD}20` },
  ];

  return (
    <GradientBackground>
      <ScreenHeader
        title={`Hi, ${user?.name?.split(" ")[0] ?? "Member"} 👋`}
        subtitle="Your monthly overview"
        avatarName={user?.name}
        avatarUrl={user?.photoUrl}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />}
      >
        {/* ── Due / Credit card ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={{ paddingHorizontal: 20, marginTop: 24 }}>
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
                  ₹{(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(2)}
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
            {/* Bill breakdown strip */}
            <View style={styles.breakdownStrip}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownVal}>₹{bill.mealBill.toFixed(0)}</Text>
                <Text style={styles.breakdownKey}>Meal Cost</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownVal}>₹{bill.cookShare.toFixed(0)}</Text>
                <Text style={styles.breakdownKey}>Cook</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownVal}>₹{bill.fineTotal.toFixed(0)}</Text>
                <Text style={styles.breakdownKey}>Fines</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownVal}>₹{bill.totalAdvance.toFixed(0)}</Text>
                <Text style={styles.breakdownKey}>Paid</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Mini stats ── */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <View style={styles.miniStatsRow}>
            {miniStats.map(({ label, val, icon, color, bg }) => (
              <View key={label} style={[styles.miniStatCard]}>
                <View style={[styles.miniStatIcon, { backgroundColor: bg }]}>
                  <Feather name={icon as "grid"} size={18} color={color} />
                </View>
                <Text style={[styles.miniStatVal, { color: colors.foreground }]}>{val}</Text>
                <Text style={[styles.miniStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Gross bill detail ── */}
        <Animated.View entering={FadeInDown.delay(230).duration(380)} style={styles.section}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <View style={[styles.sectionCardIcon, { backgroundColor: `${PRIMARY}15` }]}>
                <Feather name="file-text" size={18} color={PRIMARY} />
              </View>
              <Text style={[styles.sectionCardTitle, { color: colors.foreground }]}>Bill Breakdown</Text>
            </View>
            {[
              { label: "Meal Rate",   val: `₹${bill.perMealCost.toFixed(2)} / meal` },
              { label: "Meals Eaten", val: `${bill.mealCount} meals` },
              { label: "Meal Cost",   val: `₹${bill.mealBill.toFixed(2)}` },
              { label: "Cook Share",  val: `₹${bill.cookShare.toFixed(2)}` },
              { label: "Fines",       val: `₹${bill.fineTotal.toFixed(2)}` },
            ].map(({ label, val }) => (
              <View key={label} style={[styles.billRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.billLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.billVal, { color: colors.foreground }]}>{val}</Text>
              </View>
            ))}
            <View style={[styles.billRow, styles.billRowTotal, { borderBottomColor: "transparent" }]}>
              <Text style={[styles.billLabel, { color: colors.foreground, fontWeight: "700" }]}>Gross Bill</Text>
              <Text style={[styles.billVal, { color: PRIMARY, fontWeight: "800", fontSize: 18 }]}>
                ₹{bill.grossBill.toFixed(2)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Announcements ── */}
        {recentAnnouncements.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).duration(380)} style={[styles.section, { marginBottom: 8 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📣 Announcements</Text>
            {recentAnnouncements.map((a, i) => (
              <View key={a.id} style={[styles.announcementCard, { marginTop: i === 0 ? 12 : 10 }]}>
                <View style={[styles.announcementDot, { backgroundColor: PRIMARY }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.announcementTitle, { color: colors.foreground }]}>{a.title}</Text>
                  {a.body ? <Text style={[styles.announcementBody, { color: colors.mutedForeground }]}>{a.body}</Text> : null}
                  <Text style={[styles.announcementDate, { color: colors.mutedForeground }]}>{a.createdAt?.slice(0, 10) ?? ""}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  dueCard: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 14,
  },
  dueCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingBottom: 20,
  },
  dueCardLeft: { flex: 1 },
  dueCardLabel: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginBottom: 6 },
  dueCardAmount: { fontSize: 40, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  dueCardSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 6 },
  dueCardIcon: { opacity: 0.8 },
  breakdownStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  breakdownItem: { flex: 1, alignItems: "center" },
  breakdownVal: { fontSize: 14, fontWeight: "700", color: "#fff" },
  breakdownKey: { fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2, fontWeight: "500" },
  breakdownDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4 },

  miniStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  miniStatCard: {
    width: "47%",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
    alignItems: "center",
  },
  miniStatIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  miniStatVal: { fontSize: 20, fontWeight: "800" },
  miniStatLabel: { fontSize: 12, marginTop: 3 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 6,
    padding: 18, gap: 0,
  },
  sectionCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionCardIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionCardTitle: { fontSize: 16, fontWeight: "700" },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1 },
  billRowTotal: { paddingTop: 14 },
  billLabel: { fontSize: 14 },
  billVal: { fontSize: 15, fontWeight: "600" },

  announcementCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 16, padding: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.6)",
  },
  announcementDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  announcementTitle: { fontSize: 15, fontWeight: "700" },
  announcementBody: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  announcementDate: { fontSize: 11, marginTop: 5 },

  headerMonthNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerMonthText: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#fff" },
});
