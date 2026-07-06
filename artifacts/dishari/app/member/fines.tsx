import { Feather } from "@expo/vector-icons";
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

export default function MemberFinesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { fines } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const [month, setMonth] = useState(getCurrentMonth());

  const memberId = user?.memberId ?? "";
  const myFines = fines.filter(
    (f) => f.memberId === memberId && f.date.startsWith(month)
  );
  const totalFine = myFines.reduce((s, f) => s + f.amount, 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="My Fines"
        icon="alert-circle"
        subtitle="Fine history and monthly total"
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D4500A"]} tintColor="#D4500A" />}
      >
        {/* Summary card */}
        <View style={[styles.summaryCard, {
          backgroundColor: totalFine > 0 ? "#DC262608" : "#16A34A08",
          borderColor: totalFine > 0 ? "#DC262640" : "#16A34A40",
        }]}>
          <View style={[styles.summaryIconWrap, {
            backgroundColor: totalFine > 0 ? "#DC262618" : "#16A34A18",
          }]}>
            <Feather
              name={totalFine > 0 ? "alert-circle" : "check-circle"}
              size={24}
              color={totalFine > 0 ? "#DC2626" : "#16A34A"}
            />
          </View>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              {totalFine > 0 ? "Total Fine This Month" : "No Fines This Month"}
            </Text>
            <Text style={[styles.summaryAmount, {
              color: totalFine > 0 ? "#DC2626" : "#16A34A",
            }]}>
              {totalFine > 0 ? `₹${totalFine.toFixed(2)}` : "₹0"}
            </Text>
            {totalFine > 0 && (
              <Text style={[styles.summaryNote, { color: colors.mutedForeground }]}>
                {myFines.length} fine{myFines.length !== 1 ? "s" : ""} · Added to your bill
              </Text>
            )}
          </View>
        </View>

        {/* Fine list */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Fine Records — {monthLabel(month)}
        </Text>

        {myFines.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: "#16A34A18" }]}>
              <Feather name="check-circle" size={32} color="#16A34A" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Fines</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              You have no fines recorded for {monthLabel(month)}.
            </Text>
          </View>
        ) : (
          myFines.map((fine) => (
            <View key={fine.id} style={[styles.fineCard, { backgroundColor: colors.card }]}>
              <View style={styles.fineCardTop}>
                <View style={[styles.fineIconWrap, { backgroundColor: "#DC262618" }]}>
                  <Feather name="alert-circle" size={20} color="#DC2626" />
                </View>
                <View style={styles.fineInfo}>
                  <Text style={[styles.fineReason, { color: colors.foreground }]}>
                    {fine.reason || "Fine"}
                  </Text>
                  <Text style={[styles.fineDate, { color: colors.mutedForeground }]}>
                    {fine.date}
                  </Text>
                </View>
                <View style={[styles.fineAmountBadge, { backgroundColor: "#DC262618" }]}>
                  <Text style={styles.fineAmount}>₹{fine.amount.toFixed(0)}</Text>
                </View>
              </View>
              {fine.notes ? (
                <View style={[styles.fineNotes, { borderTopColor: "#F2E6DF" }]}>
                  <Feather name="file-text" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.fineNotesText, { color: colors.mutedForeground }]}>
                    {fine.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          ))
        )}

        {/* Info note */}
        {totalFine > 0 && (
          <View style={[styles.infoBox, { backgroundColor: "#FFF4EE", borderColor: "#F4C5A0" }]}>
            <Feather name="info" size={14} color="#D4500A" />
            <Text style={[styles.infoText, { color: "#7A3F1E" }]}>
              Fines are applied when the minimum required meals are not consumed. Contact admin for details.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerMonthNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerMonthText: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#fff" },
  summaryCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    marginTop: 16, marginBottom: 20,
    borderRadius: 20, padding: 20, borderWidth: 2,
  },
  summaryIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: "800" },
  summaryNote: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  emptyState: { alignItems: "center", paddingTop: 32, paddingBottom: 24, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  fineCard: {
    borderRadius: 18, marginBottom: 12,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
    overflow: "hidden",
  },
  fineCardTop: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16,
  },
  fineIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  fineInfo: { flex: 1 },
  fineReason: { fontSize: 15, fontWeight: "700" },
  fineDate: { fontSize: 12, marginTop: 3 },
  fineAmountBadge: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  fineAmount: { fontSize: 15, fontWeight: "800", color: "#DC2626" },
  fineNotes: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1,
  },
  fineNotesText: { flex: 1, fontSize: 12, lineHeight: 17 },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
