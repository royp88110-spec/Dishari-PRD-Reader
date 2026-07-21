import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_MAX_WIDTH = SCREEN_WIDTH * 0.52;

// Gradient matches the app's purple→violet→cyan design language
const GRADIENT: [string, string, string] = ["#4F46E5", "#7C3AED", "#06B6D4"];

export function SplashCover() {
  const insets = useSafeAreaInsets();

  // Logo: opacity + scale spring
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.78)).current;

  // Text block: fade in slightly after logo
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Loading bar: width progress (cannot use native driver for layout props)
  const barProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── Logo entrance ──────────────────────────────────────────────────────
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // ── Text fades in 180 ms after logo begins ─────────────────────────────
    Animated.sequence([
      Animated.delay(180),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
    ]).start();

    // ── Loading bar sweeps across over ~1.9 s (leaves ~300 ms gap) ────────
    Animated.sequence([
      Animated.delay(350),
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 1850,
        useNativeDriver: false, // width interpolation requires JS driver
      }),
    ]).start();
  }, [barProgress, logoOpacity, logoScale, textOpacity]);

  const barWidth = barProgress.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, BAR_MAX_WIDTH],
  });

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0.25, y: 0 }}
      end={{ x: 0.75, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    >
      {/* ── Centred logo + text ──────────────────────────────────────────── */}
      <View style={styles.center}>
        {/* Glow halo behind logo */}
        <Animated.View
          style={[
            styles.logoHalo,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity }]}>
          <Text style={styles.appName}>Dishari Mess</Text>
          <Text style={styles.subtitle}>Smart Meal &amp; Expense Management</Text>
        </Animated.View>
      </View>

      {/* ── Slim animated loading bar at bottom ─────────────────────────── */}
      <View
        style={[
          styles.barContainer,
          { paddingBottom: Math.max(insets.bottom + 28, 44) },
        ]}
      >
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 32,
  },

  // Frosted-glass halo that makes the icon pop on the gradient
  logoHalo: {
    width: 108,
    height: 108,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    // Shadow / elevation for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 20,
  },

  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  appName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // Loading bar
  barContainer: {
    alignItems: "center",
  },
  barTrack: {
    width: BAR_MAX_WIDTH,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 2,
  },
});
