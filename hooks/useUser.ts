"use client";

import { useSpotify } from "@/context/SpotifyContext";

export function useUser() {
  const { user, isLoading } = useSpotify();

  return {
    user,
    isLoading,
    displayName: user?.display_name ?? null,
    avatarUrl: user?.images?.[0]?.url ?? null,
    isPremium: user?.product === "premium",
  };
}
