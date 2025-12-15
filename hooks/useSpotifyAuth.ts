"use client";

import { useCallback } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { initiateLogin } from "@/lib/spotify";

export function useSpotifyAuth() {
  const { isAuthenticated, isLoading, logout } = useSpotify();

  const login = useCallback(async () => {
    await initiateLogin();
  }, []);

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}
