import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ── Auth guard — lives inside AuthProvider so it can read user state ──────────
function AuthGuard() {
  const { user, isLoading, needsSetup, schemaNotReady, supabaseReady } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    // While auth is still resolving, do nothing — the opaque cover below
    // ensures no intermediate screen is visible.
    if (isLoading) return;

    const topSegment = segments[0] as string | undefined;
    const onProtected = topSegment === "admin" || topSegment === "member";
    const onLogin     = topSegment === "login";
    const onIndex     = !topSegment; // root "/"

    if (!supabaseReady || schemaNotReady || needsSetup) {
      if (!onIndex) router.replace("/");
    } else if (!user) {
      // Signed out — push off any protected screen
      if (onProtected) router.replace("/login");
      // Already on login/index — stay put, no navigation needed
    } else {
      // Signed in — route to the correct dashboard
      if (onLogin || onIndex) {
        router.replace(user.role === "admin" ? "/admin" : "/member");
      }
    }

    // Hide the splash AFTER routing is queued. router.replace() is synchronous
    // in terms of committing the navigation to Expo Router's stack, so by the
    // time hideAsync resolves (fade-out ~300 ms) the destination screen is ready.
    void SplashScreen.hideAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, needsSetup, schemaNotReady, supabaseReady]);

  // ── Opaque init cover ────────────────────────────────────────────────────────
  // While auth is resolving, render a solid cover that matches the splash
  // background so no half-rendered screen bleeds through during the native
  // splash fade. This is rendered AFTER <Stack> so it layers on top.
  if (isLoading) {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.initCover,
        ]}
        pointerEvents="none"
      />
    );
  }

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index"  options={{ headerShown: false }} />
        <Stack.Screen name="login"  options={{ headerShown: false }} />
        <Stack.Screen name="setup"  options={{ headerShown: false }} />
        <Stack.Screen name="admin"  options={{ headerShown: false }} />
        <Stack.Screen name="member" options={{ headerShown: false }} />
      </Stack>
      {/* AuthGuard comes AFTER Stack so its cover View renders on top */}
      <AuthGuard />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Pre-load Feather icon font — prevents blank icons on first render
    ...Feather.font,
  });

  // Returning null keeps the native splash visible while fonts are loading.
  // SplashScreen.hideAsync() is called by AuthGuard once auth also resolves —
  // so the splash covers BOTH font loading and auth initialisation.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DataProvider>
            <AuthProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </DataProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  initCover: {
    // Matches app.json splash.backgroundColor — user sees a seamless handoff
    // from the native splash to this cover while auth resolves.
    backgroundColor: "#FFF8F3",
  },
});
