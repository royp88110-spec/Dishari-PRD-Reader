import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const { login } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // ── Entrance animations ────────────────────────────────────────────────────
  const logoScale   = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoFloat   = useSharedValue(0);
  const titleY      = useSharedValue(28);
  const titleOpacity = useSharedValue(0);
  const cardY       = useSharedValue(56);
  const cardOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo: scale spring + fade
    logoOpacity.value = withDelay(80,  withTiming(1, { duration: 300 }));
    logoScale.value   = withDelay(80,  withSpring(1, { damping: 12, stiffness: 100 }));
    // Floating bob — runs after entrance settles
    logoFloat.value   = withDelay(700, withRepeat(
      withSequence(
        withTiming(-7, { duration: 1800 }),
        withTiming(0,  { duration: 1800 }),
      ),
      -1,
      true,
    ));
    // Title
    titleOpacity.value = withDelay(300, withTiming(1,  { duration: 380 }));
    titleY.value       = withDelay(300, withSpring(0,  { damping: 15, stiffness: 120 }));
    // Card
    cardOpacity.value  = withDelay(460, withTiming(1,  { duration: 400 }));
    cardY.value        = withDelay(460, withSpring(0,  { damping: 14, stiffness: 105 }));
    // Hint
    hintOpacity.value  = withDelay(700, withTiming(1,  { duration: 380 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle  = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoFloat.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const cardStyle  = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));
  const hintStyle  = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  // ── Button press animation ─────────────────────────────────────────────────
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    const ok = await login(phone.trim(), password);
    setLoading(false);
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <LinearGradient
      colors={["#EFF6FF", "#DBEAFE", "#F8FAFC"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* ── Logo + Branding ───────────────────────────────────────────── */}
          <View style={styles.header}>
            <Animated.View style={logoStyle}>
              {/* Outer glow ring */}
              <View style={styles.logoGlowOuter}>
                <View style={styles.logoGlowInner}>
                  <LinearGradient
                    colors={["#3B82F6", "#2563EB", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoCircle}
                  >
                    <Feather name="coffee" size={34} color="#fff" />
                  </LinearGradient>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[styles.titleBlock, titleStyle]}>
              <Text style={styles.appName}>Dishari Mess</Text>
              <Text style={styles.appTagline}>Management System</Text>
              <View style={styles.taglinePill}>
                <Feather name="shield" size={11} color="#2563EB" />
                <Text style={styles.taglinePillText}>Secure · Smart · Seamless</Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Login Card ────────────────────────────────────────────────── */}
          <Animated.View style={cardStyle}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>

              {/* Card header */}
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: "#EFF6FF" }]}>
                  <Feather name="log-in" size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome Back</Text>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                    Sign in to your account
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              {/* Phone field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Phone / User ID
                </Text>
                <View style={[
                  styles.inputWrap,
                  {
                    borderColor: phoneFocused ? "#2563EB" : phone ? "#93C5FD" : colors.input,
                    backgroundColor: phoneFocused ? "#EFF6FF" : colors.muted,
                  },
                ]}>
                  <View style={[styles.inputIcon, { backgroundColor: phoneFocused ? "#DBEAFE" : colors.border }]}>
                    <Feather name="phone" size={16} color={phoneFocused ? "#2563EB" : colors.mutedForeground} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Enter your phone or ID"
                    placeholderTextColor={colors.mutedForeground}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Password
                </Text>
                <View style={[
                  styles.inputWrap,
                  {
                    borderColor: passFocused ? "#2563EB" : password ? "#93C5FD" : colors.input,
                    backgroundColor: passFocused ? "#EFF6FF" : colors.muted,
                  },
                ]}>
                  <View style={[styles.inputIcon, { backgroundColor: passFocused ? "#DBEAFE" : colors.border }]}>
                    <Feather name="lock" size={16} color={passFocused ? "#2563EB" : colors.mutedForeground} />
                  </View>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8} style={styles.eyeBtn}>
                    <Feather
                      name={showPass ? "eye-off" : "eye"}
                      size={16}
                      color={passFocused ? "#2563EB" : colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Error banner */}
              {error ? (
                <View style={[styles.errorWrap, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <View style={styles.errorIconWrap}>
                    <Feather name="alert-circle" size={14} color="#EF4444" />
                  </View>
                  <Text style={[styles.errorText, { color: "#DC2626" }]}>{error}</Text>
                </View>
              ) : null}

              {/* Login button */}
              <Pressable
                onPressIn={() => {
                  btnScale.value = withSpring(0.96, { damping: 12, stiffness: 250 });
                }}
                onPressOut={() => {
                  btnScale.value = withSpring(1, { damping: 12, stiffness: 250 });
                }}
                onPress={handleLogin}
                disabled={loading}
              >
                <Animated.View style={btnStyle}>
                  <LinearGradient
                    colors={["#3B82F6", "#2563EB", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.loginBtn, loading && { opacity: 0.85 }]}
                  >
                    {loading ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.loginBtnText}>Signing In…</Text>
                      </View>
                    ) : (
                      <View style={styles.loginBtnRow}>
                        <Text style={styles.loginBtnText}>Sign In</Text>
                        <Feather name="arrow-right" size={18} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Hint ──────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.hint, hintStyle]}>
            <View style={[styles.hintBox, { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "#BFDBFE" }]}>
              <Feather name="info" size={12} color="#2563EB" />
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Admin: ID <Text style={{ fontWeight: "700", color: "#2563EB" }}>admin</Text>
                {"  ·  "}Members: use phone number
              </Text>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },

  // Header
  header: { alignItems: "center", marginBottom: 32 },
  logoGlowOuter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(37,99,235,0.08)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
  },
  logoGlowInner: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: "rgba(37,99,235,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  titleBlock: { alignItems: "center", gap: 4 },
  appName: {
    fontSize: 30, fontWeight: "800", letterSpacing: -0.5, color: "#1E40AF",
  },
  appTagline: {
    fontSize: 14, color: "#64748B", fontWeight: "500", marginBottom: 8,
  },
  taglinePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EFF6FF", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  taglinePillText: { fontSize: 11, color: "#2563EB", fontWeight: "600" },

  // Card
  card: {
    borderRadius: 24, padding: 24, gap: 16,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 10,
    borderWidth: 1, borderColor: "#E2E8F0",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardHeaderIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 20, fontWeight: "800" },
  cardSub: { fontSize: 13, marginTop: 1 },
  cardDivider: { height: 1, marginVertical: -4 },

  // Fields
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 16, overflow: "hidden",
  },
  inputIcon: {
    width: 48, height: 52, alignItems: "center", justifyContent: "center",
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 14, paddingRight: 14 },
  eyeBtn: { padding: 14 },

  // Error
  errorWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  errorIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "500" },

  // Button
  loginBtn: {
    borderRadius: 16, paddingVertical: 17,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  loginBtnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Hint
  hint: { marginTop: 20, alignItems: "center" },
  hintBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1,
  },
  hintText: { fontSize: 12, textAlign: "center" },
});
