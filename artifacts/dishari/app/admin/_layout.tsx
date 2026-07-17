import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function AdminLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const TAB_HEIGHT = isWeb ? 84 : isIOS ? 83 : 68;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#1E40AF",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.10,
          shadowRadius: 16,
          height: TAB_HEIGHT,
          paddingTop: 6,
          paddingBottom: isIOS ? 0 : 10,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 2,
          marginBottom: isWeb ? 14 : 0,
        },
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
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarLabel: "Members",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarLabel: "Meals",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarLabel: "Expenses",
          tabBarIcon: ({ color, size }) => (
            <Feather name="dollar-sign" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarLabel: "More",
          tabBarIcon: ({ color, size }) => (
            <Feather name="more-horizontal" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
