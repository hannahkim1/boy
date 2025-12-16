"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { StoredTokens, SpotifyUser, PlaybackState, SpotifyTrack } from "@/lib/types";
import {
  getStoredTokens,
  clearTokens,
  isTokenExpired,
  refreshAccessToken,
  getCurrentUser,
  getCurrentPlayback,
  play as spotifyPlay,
  pause as spotifyPause,
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
} from "@/lib/spotify";

interface SpotifyContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SpotifyUser | null;
  playback: PlaybackState | null;
  logout: () => void;
  refreshPlayback: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  search: (query: string) => Promise<SpotifyTrack[]>;
  createPlaylistWithTracks: (name: string, tracks: SpotifyTrack[]) => Promise<string>;
  getValidToken: () => Promise<string | null>;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    let currentTokens = tokens || getStoredTokens();
    if (!currentTokens) return null;

    if (isTokenExpired(currentTokens)) {
      try {
        currentTokens = await refreshAccessToken(currentTokens.refreshToken);
        setTokens(currentTokens);
      } catch {
        setTokens(null);
        setUser(null);
        return null;
      }
    }

    return currentTokens.accessToken;
  }, [tokens]);

  const refreshPlayback = useCallback(async () => {
    const accessToken = await getValidToken();
    if (!accessToken) return;

    try {
      const state = await getCurrentPlayback(accessToken);
      setPlayback(state);
    } catch {
      // Silently fail for playback refresh
    }
  }, [getValidToken]);

  const logout = useCallback(() => {
    clearTokens();
    setTokens(null);
    setUser(null);
    setPlayback(null);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
  }, []);

  const play = useCallback(async () => {
    const accessToken = await getValidToken();
    if (!accessToken) return;
    await spotifyPlay(accessToken);
    await refreshPlayback();
  }, [getValidToken, refreshPlayback]);

  const pause = useCallback(async () => {
    const accessToken = await getValidToken();
    if (!accessToken) return;
    await spotifyPause(accessToken);
    await refreshPlayback();
  }, [getValidToken, refreshPlayback]);

  const search = useCallback(async (query: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    return searchTracks(accessToken, query);
  }, [getValidToken]);

  const createPlaylistWithTracks = useCallback(
    async (name: string, tracks: SpotifyTrack[]) => {
      const accessToken = await getValidToken();
      if (!accessToken || !user) throw new Error("Not authenticated");

      const playlistId = await createPlaylist(accessToken, user.id, name);

      if (tracks.length > 0) {
        const trackUris = tracks.map((t) => t.uri);
        await addTracksToPlaylist(accessToken, playlistId, trackUris);
      }

      return playlistId;
    },
    [getValidToken, user]
  );

  useEffect(() => {
    async function init() {
      const storedTokens = getStoredTokens();
      if (!storedTokens) {
        setIsLoading(false);
        return;
      }

      try {
        let validTokens = storedTokens;
        if (isTokenExpired(storedTokens)) {
          validTokens = await refreshAccessToken(storedTokens.refreshToken);
        }

        setTokens(validTokens);
        const userData = await getCurrentUser(validTokens.accessToken);
        setUser(userData);

        const playbackData = await getCurrentPlayback(validTokens.accessToken);
        setPlayback(playbackData);
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!tokens) return;

    refreshIntervalRef.current = setInterval(refreshPlayback, 3000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [tokens, refreshPlayback]);

  return (
    <SpotifyContext.Provider
      value={{
        isAuthenticated: !!tokens,
        isLoading,
        user,
        playback,
        logout,
        refreshPlayback,
        play,
        pause,
        search,
        createPlaylistWithTracks,
        getValidToken,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotify must be used within SpotifyProvider");
  }
  return context;
}
