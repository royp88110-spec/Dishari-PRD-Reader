/**
 * AnnouncementToast — slide-in notification card
 *
 * Supports two visual themes based on announcement.type:
 *  · general         → blue/indigo   (existing style)
 *  · payment_reminder→ amber/orange  (warm, urgent)
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Announcement } from "@/context/DataContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const H_MARGIN        = 14;
const AUTO_DISMISS_MS = 5000; // slightly longer for reminders so body is readable

// ─── Theme ────────────────────────────────────────────────────────────────────

function getTheme(type: Announcement["type"]) {
  if (type === "payment_reminder") {
    return {
      cardGrad:    ["#FFFBEB", "#FEF3C7", "#FFF9F0"] as [string, string, string],
      accentGrad:  ["#F59E0B", "#D97706"]             as [string, string],
      iconBg:      "#FFF7ED",
      iconBorder:  "#FCD34D",
      iconColor:   "#F59E0B",
      icon:        "bell"    as const,
      cardBorder:  "#FDE68A",
      progressBg:  "#FEF3C7",
      progressFg:  "#F59E0B",
      shadowColor: "#92400E",
    };
  }
  return {
    cardGrad:    ["#F8FAFC", "#EEF6FF", "#EAFBFF"] as [string, string, string],
    accentGrad:  ["#4F46E5", "#2563EB"]            as [string, string],
    iconBg:      "#EFF6FF",
    iconBorder:  "#BFDBFE",
    iconColor:   "#3B82F6",
    icon:        "bell"   as const,
    cardBorder:  "#DBEAFE",
    progressBg:  "#DBEAFE",
    progressFg:  "#3B82F6",
    shadowColor: "#1E40AF",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 48 * 3_600_000;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  announcement: Announcement;
  onDismiss: () => void;
}

export function AnnouncementToast({ announcement, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const theme  = getTheme(announcement.type);

  // ── Animation values ──────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(SCREEN_W + 60)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const scale      = useRef(new Animated.Value(0.95)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;

  const dismissedRef = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    progressAnim.current?.stop();

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: SCREEN_W + 60,
        useNativeDriver: true,
        damping: 28,
        stiffness: 300,
        mass: 0.75,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateX, opacity]);

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 135,
        mass: 0.85,
        velocity: 4,
        overshootClamping: false,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
        mass: 0.7,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 200,
        mass: 0.7,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();

    // Progress drain
    progressAnim.current = Animated.timing(progress, {
      toValue: 0,
      duration: AUTO_DISMISS_MS,
      useNativeDriver: false,
      easing: Easing.linear,
    });
    progressAnim.current.start();

    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fresh      = isNew(announcement.createdAt);
  const isReminder = announcement.type === "payment_reminder";

  // Truncate the body for display (reminders are long — show first line only in toast)
  const bodyPreview = isReminder
    ? announcement.body.split("\n").filter(Boolean)[2] ?? announcement.body // the "Outstanding…" line
    : announcement.body;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 10,
          shadowColor: theme.shadowColor,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    >
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <View style={[styles.card, { borderColor: theme.cardBorder }]}>

        {/* Background gradient */}
        <LinearGradient
          colors={theme.cardGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Left accent bar */}
        <LinearGradient
          colors={theme.accentGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        {/* Body row */}
        <View style={styles.body}>

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
            <Feather name={theme.icon} size={20} color={theme.iconColor} />
          </View>

          {/* Text stack */}
          <View style={styles.textStack}>

            {/* Title + badge */}
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {announcement.title}
              </Text>
              {isReminder ? (
                <LinearGradient
                  colors={["#F59E0B", "#D97706"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>DUE</Text>
                </LinearGradient>
              ) : fresh ? (
                <LinearGradient
                  colors={["#22C55E", "#16A34A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>✦ NEW</Text>
                </LinearGradient>
              ) : null}
            </View>

            {/* Message preview */}
            {!!bodyPreview && (
              <Text style={styles.message} numberOfLines={2}>
                {bodyPreview}
              </Text>
            )}

            {/* Date */}
            <View style={styles.dateRow}>
              <Feather name="calendar" size={11} color="#94A3B8" />
              <Text style={styles.dateText}>{fmtDate(announcement.createdAt)}</Text>
            </View>

          </View>

          {/* Close button */}
          <Pressable onPress={dismiss} hitSlop={12} style={styles.closeBtn}>
            <View style={styles.closeCircle}>
              <Feather name="x" size={13} color="#64748B" />
            </View>
          </Pressable>

        </View>
      </View>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <View style={[styles.progressTrack, { backgroundColor: theme.progressBg }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.progressFg,
              width: progress.interpolate({
                inputRange:  [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: H_MARGIN,
    right: H_MARGIN,
    zIndex: 9999,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },

  card: {
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 92,
    borderWidth: 1,
  },

  accentBar: { width: 6 },

  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  textStack: { flex: 1, gap: 4 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 7,
  },

  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 21,
    letterSpacing: -0.2,
  },

  badge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },

  message: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    fontWeight: "400",
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  closeBtn: { flexShrink: 0, alignSelf: "flex-start" },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  progressTrack: {
    height: 3.5,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderBottomLeftRadius: 18,
  },
});
