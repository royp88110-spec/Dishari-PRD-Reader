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
import { EMERALD, PRIMARY, PRIMARY2 } from "@/constants/colors";

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H_MARGIN = 12;
const AUTO_DISMISS_MS = 4000;

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

  // Slide: start fully off-screen to the right, spring to resting position
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  // Fade for enter/exit
  const opacity = useRef(new Animated.Value(0)).current;
  // Progress bar: 1 → 0 over AUTO_DISMISS_MS (left-to-right drain)
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
        toValue: SCREEN_W,
        useNativeDriver: true,
        damping: 22,
        stiffness: 260,
        mass: 0.8,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateX, opacity]);

  useEffect(() => {
    // ── Slide in with premium spring ──────────────────────────────────────
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 150,
        mass: 0.9,
        velocity: 2,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();

    // ── Progress countdown bar (not native-driver — animates width %) ────
    progressAnim.current = Animated.timing(progress, {
      toValue: 0,
      duration: AUTO_DISMISS_MS,
      useNativeDriver: false,
      easing: Easing.linear,
    });
    progressAnim.current.start();

    // ── Auto-dismiss ──────────────────────────────────────────────────────
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  const fresh = isNew(announcement.createdAt);

  return (
    <Animated.View
      // box-none: the transparent area around the card doesn't eat touches
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
          transform: [{ translateX }],
          opacity,
        },
      ]}
    >
      <View style={styles.card}>
        {/* ── Left gradient accent strip ────────────────────────────── */}
        <LinearGradient
          colors={[PRIMARY, PRIMARY2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accent}
        />

        {/* ── Content ──────────────────────────────────────────────── */}
        <View style={styles.content}>
          {/* Header: icon · title · NEW badge · close */}
          <View style={styles.header}>
            <Text style={styles.emoji}>📢</Text>

            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {announcement.title}
              </Text>
              {fresh && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>

            <Pressable onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
              <Feather name="x" size={15} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Body */}
          {!!announcement.body && (
            <Text style={styles.body} numberOfLines={3}>
              {announcement.body}
            </Text>
          )}

          {/* Date */}
          <View style={styles.dateRow}>
            <Feather name="clock" size={10} color="#94A3B8" />
            <Text style={styles.dateText}>{fmtDate(announcement.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* ── Progress bar (drains left→right over 4s) ──────────────────── */}
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
  wrapper: {
    position: "absolute",
    left: CARD_H_MARGIN,
    right: CARD_H_MARGIN,
    zIndex: 9999,
    // Drop shadow
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 20,
  },

  card: {
    flexDirection: "row",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.98)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${PRIMARY}20`,
  },

  accent: {
    width: 5,
  },

  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 10,
    gap: 5,
  },

  // Header row
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  emoji: {
    fontSize: 17,
    lineHeight: 22,
    flexShrink: 0,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1B4B",
    lineHeight: 19,
  },
  newBadge: {
    backgroundColor: EMERALD,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.8,
  },
  closeBtn: {
    flexShrink: 0,
    marginTop: 1,
  },

  // Body
  body: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    paddingLeft: 24,
  },

  // Date footer
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 24,
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: `${PRIMARY}18`,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderBottomLeftRadius: 18,
  },
});
