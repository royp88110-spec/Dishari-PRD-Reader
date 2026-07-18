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
    // Wait until auth has fully initialised before making routing decisions.
    if (isLoading) return;

    const topSegment = segments[0] as string | undefined;
    const onProtected = topSegment === "admin" || topSegment === "member";
    const onLogin     = topSegment === "login";
    const onIndex     = !topSegment; // root "/"

    if (!supabaseReady || schemaNotReady || needsSetup) {
      // Let index.tsx handle these edge cases
      if (!onIndex) router.replace("/");
      return;
    }

    if (!user) {
      // Signed out — push off any protected screen immediately
      if (onProtected) {
        router.replace("/login");
      }
    } else {
      // Signed in — push off the login / splash screen
      if (onLogin || onIndex) {
        router.replace(user.role === "admin" ? "/admin" : "/member");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, needsSetup, schemaNotReady, supabaseReady]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index"  options={{ headerShown: false }} />
        <Stack.Screen name="login"  options={{ headerShown: false }} />
        <Stack.Screen name="setup"  options={{ headerShown: false }} />
        <Stack.Screen name="admin"  options={{ headerShown: false }} />
        <Stack.Screen name="member" options={{ headerShown: false }} />
      </Stack>
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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
