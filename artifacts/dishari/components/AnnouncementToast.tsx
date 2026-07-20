/**
 * AnnouncementToast — Premium slide-in notification card
 * Clean white glassmorphism card with a blue gradient accent.
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

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const H_MARGIN = 14;
const AUTO_DISMISS_MS = 4000;
const IS_IOS = Platform.OS === "ios";

// Design tokens
const NAVY       = "#1E293B";
const SLATE      = "#475569";
const SLATE_LIGHT = "#94A3B8";
const BLUE_PRIMARY = "#4F46E5";
const BLUE_DEEP    = "#2563EB";
const ICON_BG      = "#EFF6FF";   // very light blue circle
const ICON_COLOR   = "#3B82F6";   // medium blue icon
const PROGRESS_BG  = "#EFF6FF";

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

  // ── Animation values ──────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(SCREEN_W + 60)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const scale      = useRef(new Animated.Value(0.95)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;

  const dismissedRef   = useRef(false);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim   = useRef<Animated.CompositeAnimation | null>(null);

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
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateX, opacity]);

  useEffect(() => {
    // ── Entrance — spring with slight bounce ──────────────────────────────
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
        duration: 200,
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
        },
      ]}
    >
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <View style={styles.card}>

        {/* iOS blur layer */}
        {IS_IOS && (
          <BlurView
            intensity={90}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Blue gradient left accent bar */}
        <LinearGradient
          colors={[BLUE_PRIMARY, BLUE_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        {/* Body row */}
        <View style={styles.body}>

          {/* Circular icon */}
          <View style={styles.iconCircle}>
            <Feather name="bell" size={20} color={ICON_COLOR} />
          </View>

          {/* Text stack */}
          <View style={styles.textStack}>

            {/* Title + NEW badge */}
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {announcement.title}
              </Text>
              {fresh && (
                <LinearGradient
                  colors={["#22C55E", "#16A34A"]}
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
              <Feather name="calendar" size={11} color={SLATE_LIGHT} />
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
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
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

  // ── Outer wrapper (carries the shadow) ────────────────────────────────────
  wrapper: {
    position: "absolute",
    left: H_MARGIN,
    right: H_MARGIN,
    zIndex: 9999,
    borderRadius: 18,
    // Premium shadow — indigo-tinted, elevated
    shadowColor: BLUE_PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },

  // ── Card shell ────────────────────────────────────────────────────────────
  card: {
    flexDirection: "row",
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 92,
    backgroundColor: IS_IOS ? "transparent" : "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(226,232,240,0.9)",   // cool-gray border
  },

  // ── Left accent bar ───────────────────────────────────────────────────────
  accentBar: {
    width: 6,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },

  // ── Body row ──────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  // ── Circular icon ─────────────────────────────────────────────────────────
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    // Inner ring
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  // ── Text stack ────────────────────────────────────────────────────────────
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
    color: NAVY,
    lineHeight: 21,
    letterSpacing: -0.3,
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
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },

  message: {
    fontSize: 13,
    color: SLATE,
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
    color: SLATE_LIGHT,
    fontWeight: "500",
  },

  // ── Close button ──────────────────────────────────────────────────────────
  closeBtn: {
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressTrack: {
    height: 3.5,
    backgroundColor: PROGRESS_BG,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BLUE_PRIMARY,
    borderBottomLeftRadius: 18,
  },
});
