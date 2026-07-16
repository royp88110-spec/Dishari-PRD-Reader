import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function MemberLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  // Tab bar height: give enough room for icon (22) + gap + label (~16) + padding
  const TAB_HEIGHT = isWeb ? 84 : isIOS ? 83 : 68;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#D4500A",
        tabBarInactiveTintColor: "#BFA99A",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        tabBarStyle: {
          position: "absolute",
          // On iOS: transparent so BlurView shows through.
          // On Android/web: solid white — no extra background component needed.
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#8B2200",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.10,
          shadowRadius: 16,
          height: TAB_HEIGHT,
          paddingTop: 6,
          paddingBottom: isIOS ? 0 : 10,
        },
        // tabBarItemStyle: vertical centering of icon+label within each cell
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
          marginBottom: isWeb ? 14 : 0,
        },
        // Use BlurView only on iOS; skip the custom background on Android
        // (a transparent backgroundColor + elevation is sufficient there and
        // avoids any rendering-order issues that can hide icons).
        tabBarBackground: isIOS
          ? () => (
              <BlurView
                intensity={95}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Bill",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "My Meals",
          tabBarLabel: "Meals",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarLabel: "Expenses",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="advances"
        options={{
          title: "Advances",
          tabBarLabel: "Advances",
          tabBarIcon: ({ color, size }) => (
            <Feather name="credit-card" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fines"
        options={{
          title: "Fines",
          tabBarLabel: "Fines",
          tabBarIcon: ({ color, size }) => (
            <Feather name="alert-circle" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
