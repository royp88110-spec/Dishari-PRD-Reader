import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MemberAvatar } from "@/components/MemberAvatar";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Member, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useRefresh } from "@/hooks/useRefresh";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

type RowColors = ReturnType<typeof useColors>;

// ─── MealToggleButton ─────────────────────────────────────────────────────────
//
// Replaces React Native's Switch component. Switch.onValueChange can fire
// multiple times on a single tap (OS-level gesture coalescing issue),
// causing the toggle to flip on then immediately flip off. A custom Pressable
// fires exactly one onPress per tap and gives us full control over loading
// state and animation.

function MealToggleButton({
  active,
  loading,
  color,
  onToggle,
}: {
  active: boolean;
  loading: boolean;
  color: string;
  onToggle: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.86,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 12,
    }).start();
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onToggle}
      disabled={loading}
      hitSlop={8}
      style={styles.toggleCell}
    >
      <Animated.View
        style={[
          styles.toggleBtn,
          active
            ? { backgroundColor: color + "18", borderColor: color }
            : { backgroundColor: "#F5EDE8", borderColor: "#E0CFC7" },
          { transform: [{ scale }] },
          // Coloured glow when active (visible on iOS; elevation handles Android)
          active && {
            shadowColor: color,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.28,
            shadowRadius: 7,
            elevation: 4,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <View style={[styles.toggleIconCircle, { backgroundColor: active ? color : "#C8B8B0" }]}>
            <Feather name={active ? "check" : "minus"} size={13} color="#fff" />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── MemberRow ────────────────────────────────────────────────────────────────
//
// Each row owns its own loading state and in-flight guards, so toggles for
// different members (and morning vs. night within the same member) are
// completely independent. React.memo ensures the row only re-renders when
// its own meal values change, not on unrelated sibling updates.

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
  /** Parent returns the raw Promise — row catches errors and manages loading. */
  toggle: (memberId: string, type: "morning" | "night") => Promise<void>;
  colors: RowColors;
}) {
  // Visual loading indicators — one per slot
  const [morningLoading, setMorningLoading] = useState(false);
  const [nightLoading, setNightLoading] = useState(false);

  // In-flight guards stored as refs so the guard check never re-renders the row.
  // Only one request per slot is allowed at a time — any taps while a request
  // is in progress are silently dropped.
  const morningInFlight = useRef(false);
  const nightInFlight = useRef(false);

  // handleToggle deps: member.id (stable string) + toggle (stable useCallback)
  // → this callback is created once per row mount and never changes.
  const handleToggle = useCallback(
    (type: "morning" | "night") => {
      const inFlight = type === "morning" ? morningInFlight : nightInFlight;
      // Guard: drop the tap if a save is already in progress for this slot
      if (inFlight.current) return;
      inFlight.current = true;

      const setLoading = type === "morning" ? setMorningLoading : setNightLoading;
      setLoading(true);

      toggle(member.id, type)
        .catch((err: Error) => {
          // setMeal already reverted the optimistic update; show why it failed
          Alert.alert(
            "Sync Failed",
            err.message || "Meal toggle could not be saved. The display has been reverted.",
          );
        })
        .finally(() => {
          inFlight.current = false;
          setLoading(false);
        });
    },
    [member.id, toggle],
  );

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

      <MealToggleButton
        active={morning}
        loading={morningLoading}
        color="#D4500A"
        onToggle={() => handleToggle("morning")}
      />
      <MealToggleButton
        active={night}
        loading={nightLoading}
        color="#7C3AED"
        onToggle={() => handleToggle("night")}
      />

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

  // Stable refs — callbacks read the latest values without becoming stale
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

  // toggle returns the raw Promise so MemberRow can manage loading state.
  // The parent no longer catches here — MemberRow.handleToggle does that.
  // Haptic fires synchronously before the async work begins.
  const toggle = useCallback(
    (memberId: string, type: "morning" | "night"): Promise<void> => {
      const date = selectedDateRef.current;
      const existing = mealsRef.current.find((m) => m.memberId === memberId && m.date === date);
      const morning = existing?.morning ?? false;
      const night = existing?.night ?? false;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return setMealRef.current(
        memberId,
        date,
        type === "morning" ? !morning : morning,
        type === "night" ? !night : night,
      );
    },
    [], // empty deps — all reads go through refs
  );

  // Bulk actions: single batch write, single optimistic state update
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
  }, []);

  const changeDate = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  };

  // Totals derived from optimistically-updated context meals — auto-refresh on save
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
              <Text style={styles.headerDateSub}>
                Morning: {totalMorning} · Night: {totalNight}
              </Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D4500A"]}
            tintColor="#D4500A"
          />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: "#F2E6DF" }} />
        )}
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.muted} />
            <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>No active members</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  headerDateNav: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 4,
  },
  headerNavBtn: { padding: 8 },
  headerDateText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  headerDateSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // Bulk bar
  bulkBar: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    padding: 18,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  bulkLabel: {
    fontSize: 11, fontWeight: "700", textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 8,
  },
  bulkBtns: { flexDirection: "row", gap: 8 },
  bulkBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  bulkBtnText: { fontSize: 12, fontWeight: "700" },

  // Table header
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 16,
  },
  colMember: { flex: 1, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colMeal: { width: 74, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  colTotal: { width: 48, textAlign: "center", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  // Member row
  memberRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 8,
  },
  colMemberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600" },
  memberRoom: { fontSize: 11 },

  // Toggle button (replaces Switch)
  toggleCell: { width: 74, alignItems: "center" },
  toggleBtn: {
    width: 66,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // Total badge
  totalBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  totalText: { fontSize: 15, fontWeight: "700" },

  // Empty state
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
});
