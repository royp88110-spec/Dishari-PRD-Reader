/**
 * AnnouncementToast — Premium slide-in notification card
 *
 * Accent colour is inferred from the announcement title:
 *   🔴 Red     — "important" | "urgent" | "critical" | "required"
 *   🟠 Orange  — "warning"   | "notice" | "reminder" | "attention"
 *   🟢 Green   — "success"   | "done"   | "completed"| "resolved"
 *   🔵 Blue    — everything else (default)
 */

import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Announcement } from "@/context/DataContext";
import {
  EMERALD,
  ORANGE,
  PRIMARY,
  PRIMARY2,
  RED,
  SKY,
} from "@/constants/colors";

// ─── Accent palette ───────────────────────────────────────────────────────────

type AccentKind = "info" | "success" | "warning" | "important";

const ACCENT: Record<
  AccentKind,
  { bar: string; gradientStart: string; gradientEnd: string; icon: string; iconBg: string; shadow: string }
> = {
  info: {
    bar: PRIMARY,
    gradientStart: PRIMARY,
    gradientEnd: PRIMARY2,
    icon: "bell",
    iconBg: `${PRIMARY}18`,
    shadow: PRIMARY,
  },
  success: {
    bar: EMERALD,
    gradientStart: "#10B981",
    gradientEnd: "#059669",
    icon: "check-circle",
    iconBg: `${EMERALD}18`,
    shadow: EMERALD,
  },
  warning: {
    bar: ORANGE,
    gradientStart: ORANGE,
    gradientEnd: "#EA580C",
    icon: "alert-triangle",
    iconBg: `${ORANGE}18`,
    shadow: ORANGE,
  },
  important: {
    bar: RED,
    gradientStart: RED,
    gradientEnd: "#BE123C",
    icon: "alert-circle",
    iconBg: `${RED}18`,
    shadow: RED,
  },
};

function inferKind(title: string): AccentKind {
  const t = title.toLowerCase();
  if (/important|urgent|critical|required|mandatory/.test(t)) return "important";
  if (/warning|notice|reminder|attention|caution/.test(t)) return "warning";
  if (/success|done|completed|resolved|approved/.test(t)) return "success";
  return "info";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const H_MARGIN = 14;
const AUTO_DISMISS_MS = 4000;
const IS_IOS = Platform.OS === "ios";

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
  const kind = inferKind(announcement.title);
  const accent = ACCENT[kind];

  // ── Animation values ──────────────────────────────────────────────────────
  // Slide: starts off-screen right, springs in
  const translateX = useRef(new Animated.Value(SCREEN_W + 60)).current;
  // Lift (Y) for a subtle drop-in feel
  const translateY = useRef(new Animated.Value(-12)).current;
  // Scale for the slight pop
  const scale = useRef(new Animated.Value(0.94)).current;
  // Opacity
  const opacity = useRef(new Animated.Value(0)).current;
  // Progress bar (non-native, drives width %)
  const progress = useRef(new Animated.Value(1)).current;

  const dismissedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        damping: 26,
        stiffness: 280,
        mass: 0.75,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateX, opacity]);

  useEffect(() => {
    // ── Entrance: spring slide + pop ──────────────────────────────────────
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 140,
        mass: 0.85,
        velocity: 4,
        overshootClamping: false,   // allows the bounce
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
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

    // ── Progress bar drain ────────────────────────────────────────────────
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

  const fresh = isNew(announcement.createdAt);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 10,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
          shadowColor: accent.shadow,
        },
      ]}
    >
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <View style={styles.card}>

        {/* iOS blur background */}
        {IS_IOS && (
          <BlurView
            intensity={85}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* ── Coloured left accent bar ──────────────────────────────────── */}
        <LinearGradient
          colors={[accent.gradientStart, accent.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Circular icon */}
          <View style={[styles.iconCircle, { backgroundColor: accent.iconBg }]}>
            <Feather name={accent.icon as any} size={20} color={accent.bar} />
          </View>

          {/* Text stack */}
          <View style={styles.textStack}>

            {/* Title row */}
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {announcement.title}
              </Text>
              {fresh && (
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.newBadge}
                >
                  <Text style={styles.newBadgeText}>✦ NEW</Text>
                </LinearGradient>
              )}
            </View>

            {/* Message */}
            {!!announcement.body && (
              <Text style={styles.message} numberOfLines={2}>
                {announcement.body}
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

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <View style={[styles.progressTrack, { backgroundColor: `${accent.bar}1A` }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: accent.bar,
              width: progress.interpolate({
                inputRange: [0, 1],
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
    // Shadow set dynamically (shadowColor from accent)
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 22,
    borderRadius: 18,
  },

  // ── Card shell ──────────────────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: IS_IOS ? "transparent" : "rgba(255,255,255,0.97)",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.75)",
    minHeight: 92,
  },

  accentBar: {
    width: 6,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },

  // ── Body row ────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  // ── Circular icon ───────────────────────────────────────────────────────────
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Text area ───────────────────────────────────────────────────────────────
  textStack: {
    flex: 1,
    gap: 4,
  },

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
    color: "#1E1B4B",
    lineHeight: 21,
    letterSpacing: -0.2,
  },

  newBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },

  message: {
    fontSize: 13,
    color: "#374151",
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

  // ── Close button ────────────────────────────────────────────────────────────
  closeBtn: {
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  closeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(100,116,139,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Progress bar ────────────────────────────────────────────────────────────
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
