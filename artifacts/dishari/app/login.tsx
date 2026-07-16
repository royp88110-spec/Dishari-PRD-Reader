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
  const passwordRef = useRef<TextInput>(null);

  // ── Entrance animations ────────────────────────────────────────────────────
  const logoScale   = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);
  const titleY      = useSharedValue(22);
  const titleOpacity = useSharedValue(0);
  const cardY       = useSharedValue(48);
  const cardOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo: scale + fade in (springs feel more organic than timing)
    logoOpacity.value = withDelay(80,  withTiming(1, { duration: 280 }));
    logoScale.value   = withDelay(80,  withSpring(1, { damping: 13, stiffness: 110 }));
    // Tagline: slides + fades
    titleOpacity.value = withDelay(260, withTiming(1,  { duration: 350 }));
    titleY.value       = withDelay(260, withSpring(0,  { damping: 16, stiffness: 130 }));
    // Login card: slides up
    cardOpacity.value  = withDelay(400, withTiming(1,  { duration: 380 }));
    cardY.value        = withDelay(400, withSpring(0,  { damping: 14, stiffness: 105 }));
    // Hint: soft fade
    hintOpacity.value  = withDelay(640, withTiming(1,  { duration: 350 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle  = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
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
    <LinearGradient colors={["#FFF8F3", "#FFE4CC"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Animated.View style={logoStyle}>
              <LinearGradient
                colors={["#E25C14", "#AD3806"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                <Feather name="coffee" size={36} color="#fff" />
              </LinearGradient>
            </Animated.View>

            <Animated.View style={[styles.titleBlock, titleStyle]}>
              <Text style={styles.appName}>Dishari Mess</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Meal &amp; Expense Management
              </Text>
            </Animated.View>
          </View>

          {/* ── Login card ────────────────────────────────────────────────── */}
          <Animated.View style={cardStyle}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sign In</Text>

              {/* Phone */}
              <View style={[styles.inputWrap, { borderColor: phone ? "#D4500A60" : colors.input }]}>
                <Feather name="phone" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Phone / User ID"
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              {/* Password */}
              <View style={[styles.inputWrap, { borderColor: password ? "#D4500A60" : colors.input }]}>
                <Feather name="lock" size={18} color={colors.mutedForeground} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                  <Feather
                    name={showPass ? "eye-off" : "eye"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorWrap}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
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
                    colors={["#E25C14", "#AD3806"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.loginBtn, loading && { opacity: 0.8 }]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginBtnText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Hint ──────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.hint, hintStyle]}>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Admin login: ID:{" "}
              <Text style={{ fontWeight: "700", color: "#D4500A" }}>admin</Text>
              {"  ·  "}Members: use phone number
            </Text>
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
  header: { alignItems: "center", marginBottom: 36 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#D4500A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  titleBlock: { alignItems: "center" },
  appName: {
    fontSize: 32, fontWeight: "800", letterSpacing: -0.5, color: "#D4500A",
  },
  subtitle: { fontSize: 14, marginTop: 5 },
  card: {
    borderRadius: 24, padding: 24, gap: 14,
    shadowColor: "#C04000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 20, elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF4EE", borderWidth: 1.5,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 16 },
  errorWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 13, flex: 1 },
  loginBtn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hint: { marginTop: 24, alignItems: "center" },
  hintText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
