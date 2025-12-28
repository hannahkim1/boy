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
  skipToNext as spotifySkipNext,
  skipToPrevious as spotifySkipPrevious,
  searchTracks,
  createPlaylist,
  addTracksToPlaylist,
  playPlaylist,
  getPlaylist,
  getUserPlaylists,
  removeTracksFromPlaylist,
  getPlaylistTracks as spotifyGetPlaylistTracks,
  playTrackInPlaylist as spotifyPlayTrackInPlaylist,
  saveTrack as spotifySaveTrack,
  removeTrack as spotifyRemoveTrack,
  checkSavedTracks as spotifyCheckSavedTracks,
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
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  search: (query: string) => Promise<SpotifyTrack[]>;
  createPlaylistWithTracks: (name: string, tracks: SpotifyTrack[], message?: string, isPublic?: boolean) => Promise<string>;
  getValidToken: () => Promise<string | null>;
  playPlaylistById: (playlistId: string) => Promise<void>;
  getPlaylistById: (playlistId: string) => Promise<any>;
  getUserPlaylists: () => Promise<any>;
  removeTracksFromPlaylist: (playlistId: string, trackUris: string[]) => Promise<void>;
  addTracksToPlaylist: (playlistId: string, trackUris: string[]) => Promise<void>;
  getPlaylistTracks: (playlistId: string) => Promise<SpotifyTrack[]>;
  playTrackInPlaylist: (playlistUri: string, trackUri: string) => Promise<void>;
  saveTrack: (trackId: string) => Promise<void>;
  removeSavedTrack: (trackId: string) => Promise<void>;
  checkSavedTracks: (trackIds: string[]) => Promise<boolean[]>;
  isCurrentTrackSaved: boolean;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentTrackSaved, setIsCurrentTrackSaved] = useState(false);
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

  const skipNext = useCallback(async () => {
    const accessToken = await getValidToken();
    if (!accessToken) return;
    await spotifySkipNext(accessToken);
    await refreshPlayback();
  }, [getValidToken, refreshPlayback]);

  const skipPrevious = useCallback(async () => {
    const accessToken = await getValidToken();
    if (!accessToken) return;
    await spotifySkipPrevious(accessToken);
    await refreshPlayback();
  }, [getValidToken, refreshPlayback]);

  const search = useCallback(async (query: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    return searchTracks(accessToken, query);
  }, [getValidToken]);

  const createPlaylistWithTracks = useCallback(
    async (name: string, tracks: SpotifyTrack[], message?: string, isPublic: boolean = true) => {
      const accessToken = await getValidToken();
      if (!accessToken || !user) throw new Error("Not authenticated");

      const playlistId = await createPlaylist(accessToken, user.id, name, message, isPublic);

      if (tracks.length > 0) {
        const trackUris = tracks.map((t) => t.uri);
        await addTracksToPlaylist(accessToken, playlistId, trackUris);
      }

      return playlistId;
    },
    [getValidToken, user]
  );

  const playPlaylistById = useCallback(async (playlistId: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    const playlistUri = `spotify:playlist:${playlistId}`;
    await playPlaylist(accessToken, playlistUri);
    await refreshPlayback();
  }, [getValidToken, refreshPlayback]);

  const getPlaylistById = useCallback(async (playlistId: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    return getPlaylist(accessToken, playlistId);
  }, [getValidToken]);

  const getUserPlaylistsData = useCallback(async () => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    return getUserPlaylists(accessToken);
  }, [getValidToken]);

  const removeTracksFromPlaylistById = useCallback(
    async (playlistId: string, trackUris: string[]) => {
      const accessToken = await getValidToken();
      if (!accessToken) throw new Error("Not authenticated");
      await removeTracksFromPlaylist(accessToken, playlistId, trackUris);
    },
    [getValidToken]
  );

  const addTracksToPlaylistById = useCallback(
    async (playlistId: string, trackUris: string[]) => {
      const accessToken = await getValidToken();
      if (!accessToken) throw new Error("Not authenticated");
      await addTracksToPlaylist(accessToken, playlistId, trackUris);
    },
    [getValidToken]
  );

  const getPlaylistTracksById = useCallback(async (playlistId: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    return spotifyGetPlaylistTracks(accessToken, playlistId);
  }, [getValidToken]);

  const playTrackInPlaylistById = useCallback(
    async (playlistUri: string, trackUri: string) => {
      const accessToken = await getValidToken();
      if (!accessToken) throw new Error("Not authenticated");
      await spotifyPlayTrackInPlaylist(accessToken, playlistUri, trackUri);
      await refreshPlayback();
    },
    [getValidToken, refreshPlayback]
  );

  const saveTrackById = useCallback(async (trackId: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    await spotifySaveTrack(accessToken, trackId);
    setIsCurrentTrackSaved(true);
  }, [getValidToken]);

  const removeSavedTrackById = useCallback(async (trackId: string) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    await spotifyRemoveTrack(accessToken, trackId);
    setIsCurrentTrackSaved(false);
  }, [getValidToken]);

  const checkSavedTracksById = useCallback(async (trackIds: string[]) => {
    const accessToken = await getValidToken();
    if (!accessToken) throw new Error("Not authenticated");
    return spotifyCheckSavedTracks(accessToken, trackIds);
  }, [getValidToken]);

  // Check if current track is saved when playback changes
  useEffect(() => {
    async function checkCurrentTrack() {
      if (!playback?.item?.id) {
        setIsCurrentTrackSaved(false);
        return;
      }
      try {
        const accessToken = await getValidToken();
        if (!accessToken) return;
        const [isSaved] = await spotifyCheckSavedTracks(accessToken, [playback.item.id]);
        setIsCurrentTrackSaved(isSaved);
      } catch {
        // Silently fail
      }
    }
    checkCurrentTrack();
  }, [playback?.item?.id, getValidToken]);

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
        skipNext,
        skipPrevious,
        search,
        createPlaylistWithTracks,
        getValidToken,
        playPlaylistById,
        getPlaylistById,
        getUserPlaylists: getUserPlaylistsData,
        removeTracksFromPlaylist: removeTracksFromPlaylistById,
        addTracksToPlaylist: addTracksToPlaylistById,
        getPlaylistTracks: getPlaylistTracksById,
        playTrackInPlaylist: playTrackInPlaylistById,
        saveTrack: saveTrackById,
        removeSavedTrack: removeSavedTrackById,
        checkSavedTracks: checkSavedTracksById,
        isCurrentTrackSaved,
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
