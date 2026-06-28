import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, isLoading, needsSetup, supabaseReady } = useAuth();
  const colors = useColors();

  if (!supabaseReady) {
    return (
      <View style={[styles.center, { backgroundColor: "#FFF8F3" }]}>
        <Text style={[styles.title, { color: "#D4500A" }]}>Supabase Not Configured</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables, then restart the app.
        </Text>
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

  if (needsSetup) return <Redirect href="/setup" />;
  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin/" />;
  return <Redirect href="/member/" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  desc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
