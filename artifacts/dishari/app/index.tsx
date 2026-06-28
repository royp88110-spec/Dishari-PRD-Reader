import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, isLoading, needsSetup, schemaNotReady, supabaseReady, refreshSetupStatus } = useAuth();
  const colors = useColors();

  if (!supabaseReady) {
    return (
      <View style={[styles.center, { backgroundColor: "#FFF8F3" }]}>
        <Feather name="alert-triangle" size={40} color="#D4500A" style={{ marginBottom: 16 }} />
        <Text style={[styles.title, { color: "#D4500A" }]}>Supabase Not Configured</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Add these secrets in Replit Secrets (🔒), then restart the Expo workflow:
        </Text>
        <View style={[styles.codeBox, { backgroundColor: "#FFF0E6", borderColor: "#F0C4A0" }]}>
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL</Text>
          <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
          <Text style={styles.code}>SUPABASE_URL</Text>
          <Text style={styles.code}>SUPABASE_SERVICE_KEY</Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (schemaNotReady) {
    return (
      <ScrollView contentContainerStyle={[styles.center, { backgroundColor: "#FFF8F3", paddingVertical: 48 }]}>
        <View style={[styles.iconCircle, { backgroundColor: "#FFF0E6" }]}>
          <Feather name="database" size={36} color="#D4500A" />
        </View>
        <Text style={[styles.title, { color: "#D4500A", marginTop: 16 }]}>Database Not Set Up</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          The Supabase tables don't exist yet. Follow these steps:
        </Text>

        <View style={[styles.card, { backgroundColor: "#fff", borderColor: "#F0C4A0" }]}>
          <Step n={1} text="Open your Supabase project dashboard" />
          <Step n={2} text="Go to SQL Editor (left sidebar)" />
          <Step n={3} text='Click "New query"' />
          <Step n={4} text="Copy the entire contents of supabase/schema.sql from this project and paste it in" />
          <Step n={5} text='Click "Run" (▶)' />
          <Step n={6} text="Come back here and tap Retry below" />
        </View>

        <Pressable
          style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => { void refreshSetupStatus(); }}
        >
          <Feather name="refresh-cw" size={18} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (needsSetup) return <Redirect href="/setup" />;
  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin/" />;
  return <Redirect href="/member/" />;
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
    alignSelf: "stretch", marginBottom: 24,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "#D4500A",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#333" },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#D4500A", paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  primary: { color: "#D4500A" },
});
