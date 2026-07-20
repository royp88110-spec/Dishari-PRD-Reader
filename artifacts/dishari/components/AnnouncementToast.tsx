/**
 * AnnouncementToast — Purple glassmorphism slide-in notification
 * Matches the app's purple gradient header UI.
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

  const dismissedRef  = useRef(false);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim  = useRef<Animated.CompositeAnimation | null>(null);

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
    // Entrance — spring with gentle bounce
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
      {/* ── Glass card ──────────────────────────────────────────────────────── */}
      <View style={styles.card}>

        {/* Blur layer — iOS native, web/Android fallback via gradient opacity */}
        {IS_IOS ? (
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Purple gradient fill (sits on top of blur on iOS, standalone on Android/web) */}
        <LinearGradient
          colors={["rgba(124,58,237,0.92)", "rgba(91,33,182,0.94)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Content row ───────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Circular icon — frosted white on purple */}
          <View style={styles.iconCircle}>
            <Feather name="bell" size={20} color="#FFFFFF" />
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
              <Feather name="calendar" size={11} color="rgba(255,255,255,0.55)" />
              <Text style={styles.dateText}>{fmtDate(announcement.createdAt)}</Text>
            </View>

          </View>

          {/* Close button */}
          <Pressable onPress={dismiss} hitSlop={12} style={styles.closeBtn}>
            <View style={styles.closeCircle}>
              <Feather name="x" size={13} color="rgba(255,255,255,0.85)" />
            </View>
          </Pressable>

        </View>
      </View>

      {/* ── Progress bar ──────────────────────────────────────────────────────── */}
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
    left: H_MARGIN,
    right: H_MARGIN,
    zIndex: 9999,
    borderRadius: 20,
    // Deep purple shadow
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 24,
  },

  card: {
    borderRadius: 20,
    overflow: "hidden",
    minHeight: 90,
    // Subtle glass border — white at low opacity
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  body: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  // Frosted white icon circle
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },

  message: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
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
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },

  closeBtn: {
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderBottomLeftRadius: 20,
  },
});
