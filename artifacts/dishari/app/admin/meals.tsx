import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Member, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useRefresh } from "@/hooks/useRefresh";

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// ─── Memoised row — only re-renders when its own meal values change ───────────
type RowColors = ReturnType<typeof useColors>;

const MemberRow = React.memo(function MemberRow({
  member,
  morning,
  night,
  toggle,
  colors,
}: {
  member: Member;
  morning: boolean;
  night: boolean;
  toggle: (memberId: string, type: "morning" | "night") => void;
  colors: RowColors;
}) {
  const total = (morning ? 1 : 0) + (night ? 1 : 0);
  return (
    <View style={styles.memberRow}>
      <MemberAvatar name={member.name} size={36} bgColor="#D4500A20" textColor="#D4500A" />
      <View style={styles.colMemberInfo}>
        <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>
          {member.name}
        </Text>
        {member.roomNumber ? (
          <Text style={[styles.memberRoom, { color: colors.mutedForeground }]}>
            Room {member.roomNumber}
          </Text>
        ) : null}
      </View>
      <View style={styles.switchWrap}>
        <Switch
          value={morning}
          onValueChange={() => toggle(member.id, "morning")}
          trackColor={{ false: colors.muted, true: "#D4500A60" }}
          thumbColor={morning ? "#D4500A" : "#ccc"}
        />
      </View>
      <View style={styles.switchWrap}>
        <Switch
          value={night}
          onValueChange={() => toggle(member.id, "night")}
          trackColor={{ false: colors.muted, true: "#7C3AED60" }}
          thumbColor={night ? "#7C3AED" : "#ccc"}
        />
      </View>
      <View style={[styles.totalBadge, { backgroundColor: total > 0 ? "#D4500A20" : colors.muted }]}>
        <Text style={[styles.totalText, { color: total > 0 ? "#D4500A" : colors.mutedForeground }]}>
          {total}
        </Text>
      </View>
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { members, meals, setMeal, setMealsBatch } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const activeMembers = members.filter((m) => m.status === "active");

  // Stable refs so callbacks never go stale without recreating
  const mealsRef = useRef(meals);
  mealsRef.current = meals;
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const setMealRef = useRef(setMeal);
  setMealRef.current = setMeal;
  const setMealsBatchRef = useRef(setMealsBatch);
  setMealsBatchRef.current = setMealsBatch;
  const activeMembersRef = useRef(activeMembers);
  activeMembersRef.current = activeMembers;

  // Instant toggle — optimistic update fires in setMeal; haptic is synchronous.
  // Failures surface via Alert so the user knows to retry if the DB write failed.
  const toggle = useCallback((memberId: string, type: "morning" | "night") => {
    const date = selectedDateRef.current;
    const existing = mealsRef.current.find((m) => m.memberId === memberId && m.date === date);
    const morning = existing?.morning ?? false;
    const night = existing?.night ?? false;
    setMealRef.current(
      memberId,
      date,
      type === "morning" ? !morning : morning,
      type === "night" ? !night : night,
    ).catch((err: Error) => {
      Alert.alert("Sync Failed", err.message || "Meal toggle could not be saved. The display has been reverted.");
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []); // empty deps — all reads go through refs

  // Bulk actions: single batch write, single optimistic state update.
  const bulkMark = useCallback((type: "morning" | "night" | "clear") => {
    const date = selectedDateRef.current;
    const entries = activeMembersRef.current.map((m) => {
      const existing = mealsRef.current.find((r) => r.memberId === m.id && r.date === date);
      return {
        memberId: m.id,
        date,
        morning: type === "clear" ? false : type === "morning" ? true : existing?.morning ?? false,
        night:   type === "clear" ? false : type === "night"   ? true : existing?.night   ?? false,
      };
    });
    setMealsBatchRef.current(entries).catch((err: Error) => {
      Alert.alert("Sync Failed", err.message || "Bulk meal update could not be saved. The display has been reverted.");
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []); // empty deps — all reads go through refs

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  // Derive totals directly from context meals (updated optimistically)
  const todayMeals = meals.filter((m) => m.date === selectedDate);
  const totalMorning = todayMeals.filter((m) => m.morning).length;
  const totalNight = todayMeals.filter((m) => m.night).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Meal Entry"
        icon="grid"
        subtitle="Mark daily meals for members"
        bottomElement={
          <View style={styles.headerDateNav}>
            <Pressable onPress={() => changeDate(-1)} style={styles.headerNavBtn}>
              <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={styles.headerDateText}>{displayDate(selectedDate)}</Text>
              <Text style={styles.headerDateSub}>Morning: {totalMorning} · Night: {totalNight}</Text>
            </View>
            <Pressable onPress={() => changeDate(1)} style={styles.headerNavBtn}>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        }
      />

      <View style={[styles.bulkBar, { backgroundColor: colors.card }]}>
        <Text style={[styles.bulkLabel, { color: colors.mutedForeground }]}>Bulk Mark</Text>
        <View style={styles.bulkBtns}>
          <Pressable
            style={[styles.bulkBtn, { backgroundColor: "#D4500A20" }]}
            onPress={() => bulkMark("morning")}
          >
            <Text style={[styles.bulkBtnText, { color: "#D4500A" }]}>All Morning</Text>
          </Pressable>
          <Pressable
            style={[styles.bulkBtn, { backgroundColor: "#7C3AED20" }]}
            onPress={() => bulkMark("night")}
          >
            <Text style={[styles.bulkBtnText, { color: "#7C3AED" }]}>All Night</Text>
          </Pressable>
          <Pressable
            style={[styles.bulkBtn, { backgroundColor: colors.muted }]}
            onPress={() => bulkMark("clear")}
          >
            <Text style={[styles.bulkBtnText, { color: colors.mutedForeground }]}>Clear All</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.tableHeader, { backgroundColor: colors.muted }]}>
        <Text style={[styles.colMember, { color: colors.mutedForeground }]}>MEMBER</Text>
        <Text style={[styles.colMeal, { color: "#D4500A" }]}>MORNING</Text>
        <Text style={[styles.colMeal, { color: "#7C3AED" }]}>NIGHT</Text>
        <Text style={[styles.colTotal, { color: colors.mutedForeground }]}>TOTAL</Text>
      </View>

      <FlatList
        data={activeMembers}
        keyExtractor={(m) => m.id}
        style={{ flex: 1, backgroundColor: colors.card }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D4500A"]} tintColor="#D4500A" />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F2E6DF" }} />}
        // Prevent the FlatList itself from re-rendering when parent re-renders
        // due to unrelated state changes (e.g. date navigation)
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.muted} />
            <Text style={[{ color: colors.mutedForeground, fontSize: 15 }]}>No active members</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const meal = meals.find((r) => r.memberId === m.id && r.date === selectedDate);
          return (
            <MemberRow
              member={m}
              morning={meal?.morning ?? false}
              night={meal?.night ?? false}
              toggle={toggle}
              colors={colors}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bulkBar: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    padding: 18,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  bulkLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  bulkBtns: { flexDirection: "row", gap: 8 },
  bulkBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  bulkBtnText: { fontSize: 12, fontWeight: "700" },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 16,
  },
  colMember: { flex: 1.2, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colMeal: { width: 74, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colTotal: { width: 48, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  memberRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "700" },
  colMemberInfo: { flex: 1.2 - 0.1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberRoom: { fontSize: 11 },
  switchWrap: { width: 74, alignItems: "center" },
  totalBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  totalText: { fontSize: 15, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  headerDateNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerDateText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  headerDateSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
});