import { Redirect } from "expo-router";
import * as Linking from "expo-linking";
import {
  ActivityIndicator, Platform, Pressable, ScrollView,
  Share, StyleSheet, Text, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { useAuth, getApiBase } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, isLoading, needsSetup, schemaNotReady, supabaseReady, refreshSetupStatus } = useAuth();
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  /* ── Not configured at all ── */
  if (!supabaseReady) {
    return (
      <View style={[styles.center, { backgroundColor: "#FFF8F3" }]}>
        <Feather name="alert-triangle" size={40} color="#D4500A" style={{ marginBottom: 16 }} />
        <Text style={[styles.title, { color: "#D4500A" }]}>Supabase Not Configured</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Add these four secrets in Replit Secrets (🔒) then restart the Expo workflow:
        </Text>
        <View style={[styles.codeBox, { backgroundColor: "#FFF0E6", borderColor: "#F0C4A0" }]}>
          {["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"].map(k => (
            <Text key={k} style={styles.code}>{k}</Text>
          ))}
        </View>
      </View>
    );
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  /* ── Schema tables missing ── */
  if (schemaNotReady) {
    const ref = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "")
      .replace("https://", "").split(".")[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;

    const handleCopy = async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/schema`);
        const sql = await res.text();
        if (Platform.OS === "web") {
          await navigator.clipboard.writeText(sql);
        } else {
          await Share.share({ message: sql, title: "Dishari Mess Schema SQL" });
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        setCopied(false);
      }
    };

    const handleRetry = async () => {
      setRetrying(true);
      await refreshSetupStatus();
      setRetrying(false);
    };

    return (
      <ScrollView
        contentContainerStyle={[styles.center, { backgroundColor: "#FFF8F3", paddingVertical: 48 }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: "#FFF0E6" }]}>
          <Feather name="database" size={34} color="#D4500A" />
        </View>
        <Text style={[styles.title, { color: "#D4500A", marginTop: 16 }]}>Database Not Set Up</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Run the schema once in your Supabase project to create all tables.
        </Text>

        <View style={[styles.card, { backgroundColor: "#fff", borderColor: "#F0C4A0" }]}>
          <Step n={1} text="Copy the SQL schema below" />
          <Step n={2} text="Open Supabase → SQL Editor → New query" />
          <Step n={3} text="Paste and click Run ▶" />
          <Step n={4} text="Come back and tap Retry" />
        </View>

        {/* Action buttons */}
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleCopy}
        >
          <Feather name={copied ? "check" : "copy"} size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>{copied ? "Copied!" : "Copy SQL Schema"}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.outlineBtn, { borderColor: "#D4500A", opacity: pressed ? 0.7 : 1 }]}
          onPress={() => Linking.openURL(sqlEditorUrl)}
        >
          <Feather name="external-link" size={16} color="#D4500A" />
          <Text style={[styles.outlineBtnText, { color: "#D4500A" }]}>Open Supabase SQL Editor</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleRetry}
          disabled={retrying}
        >
          {retrying
            ? <ActivityIndicator size="small" color={colors.mutedForeground} />
            : <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />}
          <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
            {retrying ? "Checking…" : "Retry"}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  /* ── Normal routing ── */
  if (needsSetup) return <Redirect href="/setup" />;
  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin" />;
  return <Redirect href="/member" />;
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 10, textAlign: "center" },
  desc: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  codeBox: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 6, alignSelf: "stretch" },
  code: { fontFamily: "monospace", fontSize: 13, color: "#7C3C0A" },
  card: {
    borderRadius: 16, padding: 20, borderWidth: 1, gap: 14,
    alignSelf: "stretch", marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "#D4500A",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#333" },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#D4500A", paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, marginBottom: 12, alignSelf: "stretch", justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  outlineBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center",
    borderWidth: 1.5, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14, marginBottom: 12, alignSelf: "stretch",
  },
  outlineBtnText: { fontSize: 15, fontWeight: "600" },
  ghostBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  ghostBtnText: { fontSize: 14 },
  primary: { color: "#D4500A" },
});
