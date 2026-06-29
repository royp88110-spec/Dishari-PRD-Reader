import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    const ok = await login(phone, password);
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
        <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <LinearGradient
              colors={["#E25C14", "#AD3806"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Feather name="coffee" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>Dishari Mess</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Meal & Expense Management
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sign In</Text>

            <View style={styles.inputWrap}>
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
              />
            </View>

            <View style={styles.inputWrap}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 4 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient colors={["#E25C14", "#AD3806"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtn}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Login</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.hint}>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Admin login: ID: <Text style={{ fontWeight: "700" }}>admin</Text> · Members: use phone number
            </Text>
          </View>
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  appName: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5, color: "#D4500A" },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: {
    borderRadius: 24, padding: 24, gap: 16,
    shadowColor: "#C04000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 14, elevation: 4,
  },
  cardTitle: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF4EE", borderWidth: 1.5, borderColor: "#EDE0D8", 
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 16 },
  errorText: { fontSize: 13, marginTop: -4 },
  loginBtn: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  hint: { marginTop: 24, alignItems: "center" },
  hintText: { fontSize: 12, textAlign: "center" },
});