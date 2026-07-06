import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { useRefresh } from "@/hooks/useRefresh";

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
  const { calculateMonthlyBill, getMonthTotals, settings, payments, announcements } = useData();
  const { refreshing, onRefresh } = useRefresh();
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D4500A"]} tintColor="#D4500A" />}
      >
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

        {/* Announcements */}
        {announcements.length > 0 && (
          <View style={styles.annSection}>
            <View style={styles.annHeadRow}>
              <Feather name="bell" size={14} color="#D4500A" />
              <Text style={[styles.annHeading, { color: colors.foreground }]}>Announcements</Text>
            </View>
            {announcements.slice(0, 5).map((a) => (
              <View key={a.id} style={[styles.annCard, { backgroundColor: "#FFF4EE" }]}>
                <Text style={styles.annTitle}>{a.title}</Text>
                <Text style={[styles.annBody, { color: colors.mutedForeground }]}>{a.body}</Text>
                <Text style={[styles.annDate, { color: "#D4500A" }]}>
                  {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Payment Status Card */}
        <View style={[
          styles.paymentCard,
          {
            backgroundColor: isPaid ? "#16A34A08" : "#DC262608",
            borderColor: isPaid ? "#16A34A" : "#DC2626",
            borderWidth: 2.5,
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
          {isPaid && bill.grossBill > 0 && (
            <View style={[styles.paidAmountBadge, { backgroundColor: "#16A34A18" }]}>
              <Text style={[styles.paidAmountText, { color: "#16A34A" }]}>
                ₹{bill.grossBill.toFixed(0)}
              </Text>
            </View>
          )}
        </View>

        {/* Due / Credit card */}
        <View style={[styles.dueCard, {
          backgroundColor: bill.dueAmount > 0 ? "#DC262605" : "#16A34A05",
          borderColor: bill.dueAmount > 0 ? "#DC2626" : "#16A34A",
          borderWidth: 2.5,
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

        <View style={[styles.section, { backgroundColor: colors.card }]}>
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
          {bill.fineTotal > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BillRow label="Fine" value={`₹${bill.fineTotal.toFixed(2)}`} color="#DC2626" />
            </>
          )}
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

        <View style={[styles.section, { backgroundColor: colors.card }]}>
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
            <View key={label} style={[styles.miniStat, { backgroundColor: colors.card }]}>
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
    marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 16,
    padding: 8,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  navArrow: { padding: 8 },
  monthText: { fontSize: 17, fontWeight: "700" },
  paymentCard: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 20,
    padding: 20,
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
    marginHorizontal: 20, marginBottom: 20, borderRadius: 20,
    padding: 24, alignItems: "center",
  },
  dueLabel: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  dueAmount: { fontSize: 42, fontWeight: "700", marginVertical: 8 },
  dueSub: { fontSize: 13 },
  section: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 20, padding: 20,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  billRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  billKey: { fontSize: 14 },
  billVal: { fontSize: 14 },
  divider: { height: 1, marginVertical: 2 },
  bigDivider: { height: 2, marginVertical: 6 },
  annSection: { marginHorizontal: 20, marginBottom: 16 },
  annHeadRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  annHeading: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  annCard: {
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: "#D4500A",
  },
  annTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  annBody: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  annDate: { fontSize: 11, fontWeight: "600" },
  statsRow: { flexDirection: "row", marginHorizontal: 20, gap: 12, marginBottom: 20 },
  miniStat: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  miniStatIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  miniStatVal: { fontSize: 16, fontWeight: "700" },
  miniStatLabel: { fontSize: 11 },
});