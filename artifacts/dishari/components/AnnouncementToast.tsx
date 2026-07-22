/**
 * AnnouncementToast — slide-in notification card
 *
 * Two visual themes:
 *  · general          → rich blue → cyan gradient, white text, frosted-glass icon
 *  · payment_reminder → warm amber/orange on cream, dark text (unchanged)
 */

import { Feather, Ionicons } from "@expo/vector-icons";
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
const AUTO_DISMISS_MS = 5000;

// ─── Theme ────────────────────────────────────────────────────────────────────

interface Theme {
  // Card
  cardGrad:        readonly [string, string, string];
  accentGrad:      readonly [string, string];
  cardBorder:      string;
  shadowColor:     string;
  // Icon
  iconBg:          string;
  iconBorder:      string;
  iconColor:       string;
  iconFamily:      "ionicons" | "feather";
  iconName:        string;
  // Text
  titleColor:      string;
  messageColor:    string;
  dateColor:       string;
  calendarColor:   string;
  // Badge
  badgeGrad:       readonly [string, string];
  badgeTextColor:  string;
  // Close button
  closeBg:         string;
  closeBorder:     string;
  closeIconColor:  string;
  // Progress
  progressBg:      string;
  progressFg:      string;
}

function getTheme(type: Announcement["type"]): Theme {
  if (type === "payment_reminder") {
    return {
      cardGrad:       ["#FFFBEB", "#FEF3C7", "#FFF9F0"],
      accentGrad:     ["#F59E0B", "#D97706"],
      cardBorder:     "#FDE68A",
      shadowColor:    "#92400E",
      iconBg:         "#FFF7ED",
      iconBorder:     "#FCD34D",
      iconColor:      "#F59E0B",
      iconFamily:     "feather",
      iconName:       "bell",
      titleColor:     "#1E293B",
      messageColor:   "#475569",
      dateColor:      "#94A3B8",
      calendarColor:  "#94A3B8",
      badgeGrad:      ["#F59E0B", "#D97706"],
      badgeTextColor: "#FFFFFF",
      closeBg:        "#F1F5F9",
      closeBorder:    "#E2E8F0",
      closeIconColor: "#64748B",
      progressBg:     "#FEF3C7",
      progressFg:     "#F59E0B",
    };
  }

  // ── General: blue → cyan full-bleed gradient ──────────────────────────────
  return {
    cardGrad:       ["#1D4ED8", "#2563EB", "#0EA5E9"],
    accentGrad:     ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.1)"],
    cardBorder:     "rgba(255,255,255,0.22)",
    shadowColor:    "#1E3A8A",
    iconBg:         "rgba(255,255,255,0.18)",
    iconBorder:     "rgba(255,255,255,0.35)",
    iconColor:      "#FFFFFF",
    iconFamily:     "ionicons",
    iconName:       "megaphone",
    titleColor:     "#FFFFFF",
    messageColor:   "rgba(255,255,255,0.88)",
    dateColor:      "rgba(255,255,255,0.62)",
    calendarColor:  "rgba(255,255,255,0.62)",
    badgeGrad:      ["rgba(255,255,255,0.32)", "rgba(255,255,255,0.16)"],
    badgeTextColor: "#FFFFFF",
    closeBg:        "rgba(255,255,255,0.18)",
    closeBorder:    "rgba(255,255,255,0.30)",
    closeIconColor: "rgba(255,255,255,0.90)",
    progressBg:     "rgba(255,255,255,0.20)",
    progressFg:     "rgba(255,255,255,0.85)",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 48 * 3_600_000;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function ToastIcon({ theme }: { theme: Theme }) {
  if (theme.iconFamily === "ionicons") {
    return (
      <Ionicons
        name={theme.iconName as React.ComponentProps<typeof Ionicons>["name"]}
        size={21}
        color={theme.iconColor}
      />
    );
  }
  return (
    <Feather
      name={theme.iconName as React.ComponentProps<typeof Feather>["name"]}
      size={20}
      color={theme.iconColor}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  announcement: Announcement;
  onDismiss:    () => void;
}

export function AnnouncementToast({ announcement, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const theme  = getTheme(announcement.type);

  // ── Animation values ──────────────────────────────────────────────────────
  const translateX = useRef(new Animated.Value(SCREEN_W + 80)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const scale      = useRef(new Animated.Value(0.94)).current;
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
        toValue:         SCREEN_W + 80,
        useNativeDriver: true,
        damping:         30,
        stiffness:       320,
        mass:            0.7,
      }),
      Animated.timing(opacity, {
        toValue:         0,
        duration:        190,
        useNativeDriver: true,
        easing:          Easing.out(Easing.ease),
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateX, opacity]);

  useEffect(() => {
    // Entrance — smooth spring slide from right with subtle Y + scale
    Animated.parallel([
      Animated.spring(translateX, {
        toValue:           0,
        useNativeDriver:   true,
        damping:           18,
        stiffness:         160,
        mass:              0.8,
        velocity:          6,
        overshootClamping: false,
      }),
      Animated.spring(translateY, {
        toValue:         0,
        useNativeDriver: true,
        damping:         22,
        stiffness:       240,
        mass:            0.65,
      }),
      Animated.spring(scale, {
        toValue:         1,
        useNativeDriver: true,
        damping:         16,
        stiffness:       210,
        mass:            0.65,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        duration:        200,
        useNativeDriver: true,
        easing:          Easing.out(Easing.cubic),
      }),
    ]).start();

    // Progress drain
    progressAnim.current = Animated.timing(progress, {
      toValue:         0,
      duration:        AUTO_DISMISS_MS,
      useNativeDriver: false,
      easing:          Easing.linear,
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

  const bodyPreview = isReminder
    ? announcement.body.split("\n").filter(Boolean)[2] ?? announcement.body
    : announcement.body;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top:        insets.top + 10,
          shadowColor: theme.shadowColor,
          transform:  [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    >
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <View style={[styles.card, { borderColor: theme.cardBorder }]}>

        {/* Full-bleed background gradient */}
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

          {/* Icon — frosted circle for general, bordered for reminder */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.iconBg, borderColor: theme.iconBorder },
            ]}
          >
            <ToastIcon theme={theme} />
          </View>

          {/* Text stack */}
          <View style={styles.textStack}>

            {/* Title + badge */}
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: theme.titleColor }]}
                numberOfLines={2}
              >
                {announcement.title}
              </Text>

              {isReminder ? (
                <LinearGradient
                  colors={theme.badgeGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.badge, isReminder ? styles.badgeBorder : null]}
                >
                  <Text style={[styles.badgeText, { color: theme.badgeTextColor }]}>DUE</Text>
                </LinearGradient>
              ) : fresh ? (
                <LinearGradient
                  colors={theme.badgeGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.badge, styles.badgeBorder]}
                >
                  <Text style={[styles.badgeText, { color: theme.badgeTextColor }]}>✦ NEW</Text>
                </LinearGradient>
              ) : null}
            </View>

            {/* Message preview */}
            {!!bodyPreview && (
              <Text
                style={[styles.message, { color: theme.messageColor }]}
                numberOfLines={2}
              >
                {bodyPreview}
              </Text>
            )}

            {/* Date */}
            <View style={styles.dateRow}>
              <Feather name="calendar" size={11} color={theme.calendarColor} />
              <Text style={[styles.dateText, { color: theme.dateColor }]}>
                {fmtDate(announcement.createdAt)}
              </Text>
            </View>

          </View>

          {/* Close button */}
          <Pressable onPress={dismiss} hitSlop={12} style={styles.closeBtn}>
            <View
              style={[
                styles.closeCircle,
                { backgroundColor: theme.closeBg, borderColor: theme.closeBorder },
              ]}
            >
              <Feather name="x" size={13} color={theme.closeIconColor} />
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
    position:     "absolute",
    left:         H_MARGIN,
    right:        H_MARGIN,
    zIndex:       9999,
    borderRadius: 20,
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius:  28,
    elevation:     18,
  },

  card: {
    flexDirection: "row",
    borderRadius:  20,
    overflow:      "hidden",
    minHeight:     92,
    borderWidth:   1,
  },

  accentBar: { width: 5 },

  body: {
    flex:              1,
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 14,
    paddingVertical:   14,
    gap:               12,
  },

  iconCircle: {
    width:          46,
    height:         46,
    borderRadius:   23,
    borderWidth:    1.5,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },

  textStack: { flex: 1, gap: 4 },

  titleRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    flexWrap:      "wrap",
    gap:           7,
  },

  title: {
    flex:          1,
    fontSize:      15,
    fontWeight:    "700",
    lineHeight:    21,
    letterSpacing: -0.2,
  },

  badge: {
    borderRadius:     7,
    paddingHorizontal: 8,
    paddingVertical:   3,
    alignSelf:        "flex-start",
    flexShrink:       0,
  },
  badgeBorder: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  badgeText: {
    fontSize:      10,
    fontWeight:    "800",
    letterSpacing: 0.8,
  },

  message: {
    fontSize:   13,
    lineHeight: 19,
    fontWeight: "400",
  },

  dateRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    marginTop:     1,
  },
  dateText: {
    fontSize:   11,
    fontWeight: "500",
  },

  closeBtn:    { flexShrink: 0, alignSelf: "flex-start" },
  closeCircle: {
    width:          28,
    height:         28,
    borderRadius:   14,
    borderWidth:    1,
    alignItems:     "center",
    justifyContent: "center",
  },

  progressTrack: {
    height:                4,
    borderBottomLeftRadius:  20,
    borderBottomRightRadius: 20,
    overflow:              "hidden",
  },
  progressFill: {
    height:               "100%",
    borderBottomLeftRadius: 20,
  },
});
