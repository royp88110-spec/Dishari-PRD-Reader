import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

interface Props {
  /** Member's display name — used to derive initials fallback */
  name?: string;
  /** Remote photo URL — shown when valid, falls back to initials on error */
  photoUrl?: string;
  size?: number;
  /** Override border-radius; defaults to size/2 (full circle) */
  borderRadius?: number;
  bgColor?: string;
  textColor?: string;
}

/**
 * Avatar that renders, in priority order:
 *   1. Photo (if photoUrl provided and loads without error)
 *   2. Initials (first character of name)
 *   3. Feather "user" icon fallback
 */
export function MemberAvatar({
  name,
  photoUrl,
  size = 44,
  borderRadius,
  bgColor = "rgba(255,255,255,0.2)",
  textColor = "#fff",
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  // Reset failure state whenever the URL changes so a new valid URL gets a fresh attempt
  useEffect(() => { setImgFailed(false); }, [photoUrl]);

  const br = borderRadius ?? size / 2;
  const initials = name?.trim().charAt(0).toUpperCase() ?? "";

  const container = {
    width: size,
    height: size,
    borderRadius: br,
    backgroundColor: bgColor,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  };

  if (photoUrl && !imgFailed) {
    return (
      <View style={container}>
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size }}
          onError={() => setImgFailed(true)}
        />
      </View>
    );
  }

  if (initials) {
    return (
      <View style={container}>
        <Text style={{ fontSize: size * 0.42, fontWeight: "700", color: textColor }}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View style={container}>
      <Feather name="user" size={size * 0.48} color={textColor} />
    </View>
  );
}
