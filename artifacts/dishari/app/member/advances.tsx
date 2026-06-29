import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
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
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

export default function MemberAdvances() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { advances, calculateMonthlyBill } = useData();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";
  const myAdvances = advances
    .filter((a) => a.memberId === memberId && a.date.startsWith(month))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalAdvance = myAdvances.reduce((s, a) => s + a.amount, 0);
  const bill = calculateMonthlyBill(memberId, month);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.monthNav, { marginTop: insets.top + 12 }]}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthText, { color: colors.foreground }]}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.navArrow}>
          <Feather name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.summaryRow]}>
        <View style={[styles.summaryCard, { backgroundColor: "#16A34A10", borderColor: "#16A34A40" }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Paid</Text>
          <Text style={[styles.summaryVal, { color: "#16A34A" }]}>₹{totalAdvance.toFixed(0)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#D4500A10", borderColor: "#D4500A40" }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Gross Bill</Text>
          <Text style={[styles.summaryVal, { color: "#D4500A" }]}>₹{bill.grossBill.toFixed(0)}</Text>
        </View>
        <View style={[styles.summaryCard, {
          backgroundColor: bill.dueAmount > 0 ? "#DC262610" : "#16A34A10",
          borderColor: bill.dueAmount > 0 ? "#DC262640" : "#16A34A40",
        }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            {bill.dueAmount > 0 ? "Due" : "Credit"}
          </Text>
          <Text style={[styles.summaryVal, { color: bill.dueAmount > 0 ? "#DC2626" : "#16A34A" }]}>
            ₹{(bill.dueAmount > 0 ? bill.dueAmount : bill.creditBalance).toFixed(0)}
          </Text>
        </View>
      </View>

      <FlatList
        data={myAdvances}
        keyExtractor={(a) => a.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="credit-card" size={44} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Advances</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Contact admin to record advance payments
            </Text>
          </View>
        }
        renderItem={({ item: a }) => (
          <View style={[styles.advCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.advIcon, { backgroundColor: "#16A34A20" }]}>
              <Feather name="arrow-up-right" size={18} color="#16A34A" />
            </View>
            <View style={styles.advInfo}>
              <Text style={[styles.advAmount, { color: "#16A34A" }]}>₹{a.amount.toFixed(0)}</Text>
              <Text style={[styles.advMeta, { color: colors.mutedForeground }]}>
                {a.date} · {a.method}
              </Text>
              {a.notes ? <Text style={[styles.advNotes, { color: colors.mutedForeground }]}>{a.notes}</Text> : null}
            </View>
            <View style={[styles.paidBadge, { backgroundColor: "#16A34A20" }]}>
              <Text style={[styles.paidText, { color: "#16A34A" }]}>Paid</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  navArrow: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: "700" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1 },
  summaryLabel: { fontSize: 11, marginBottom: 4 },
  summaryVal: { fontSize: 20, fontWeight: "700" },
  advCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  advIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  advInfo: { flex: 1 },
  advAmount: { fontSize: 20, fontWeight: "700" },
  advMeta: { fontSize: 13, marginTop: 2 },
  advNotes: { fontSize: 12, marginTop: 2 },
  paidBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paidText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
});
