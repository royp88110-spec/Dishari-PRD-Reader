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
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { ToastProvider } from "@/context/ToastContext";
import { SplashCover } from "@/components/SplashCover";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Minimum time (ms) the splash cover is shown even if auth resolves faster.
const MIN_SPLASH_MS = 2200;

// ── Auth guard — lives inside AuthProvider so it can read user state ──────────
function AuthGuard() {
  const { user, isLoading, needsSetup, schemaNotReady, supabaseReady } = useAuth();
  const segments = useSegments();

  // Track whether the minimum splash duration has elapsed.
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // Keep the cover up while auth is still loading OR the min delay hasn't passed.
  const showCover = isLoading || !minDelayDone;

  useEffect(() => {
    // Wait until both auth and minimum display time are ready.
    if (showCover) return;

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

    // Hide the native splash AFTER routing is queued.
    void SplashScreen.hideAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCover, user, needsSetup, schemaNotReady, supabaseReady]);

  // ── Animated splash cover ────────────────────────────────────────────────────
  // Rendered AFTER <Stack> so it layers on top. Shown while auth resolves AND
  // during the minimum splash duration for a polished entry experience.
  if (showCover) {
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <SplashCover />
      </View>
    );
  }

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back", animation: "none" }}>
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
                  <ToastProvider>
                    <RootLayoutNav />
                  </ToastProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </DataProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// StyleSheet kept for future use; initCover replaced by <SplashCover />.
const styles = StyleSheet.create({});
