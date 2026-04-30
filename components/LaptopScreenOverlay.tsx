"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSpotify } from "@/context/SpotifyContext";
import { debounce, formatDuration } from "@/lib/utils";
import type { SpotifyTrack } from "@/lib/types";

interface LaptopScreenOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  screenBounds: { left: number; top: number; width: number; height: number } | null;
}

export function LaptopScreenOverlay({ isVisible, onClose, screenBounds }: LaptopScreenOverlayProps) {
  const router = useRouter();
  const { search, createPlaylistWithTracks, getUserPlaylists } = useSpotify();

  // Tab state
  const [activeTab, setActiveTab] = useState<"create" | "browse">("browse");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Draft playlist state
  const [draftTracks, setDraftTracks] = useState<SpotifyTrack[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Browse playlists state
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // Track which tracks are already added
  const addedTrackIds = useMemo(() => new Set(draftTracks.map((t) => t.id)), [draftTracks]);

  // Load playlists on mount
  useEffect(() => {
    if (isVisible) {
      loadPlaylists();
    }
  }, [isVisible]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const data = await getUserPlaylists();
      setUserPlaylists(data.items || []);
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Debounced search
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await search(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [search]
  );

  const debouncedSearch = useMemo(() => debounce(performSearch, 300), [performSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const addTrack = useCallback((track: SpotifyTrack) => {
    setDraftTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setDraftTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || draftTracks.length === 0) return;
    setIsCreating(true);
    try {
      const playlistId = await createPlaylistWithTracks(playlistName, draftTracks);
      // Reset form
      setPlaylistName("");
      setDraftTracks([]);
      setSearchQuery("");
      setSearchResults([]);
      // Refresh playlists and switch to browse tab
      await loadPlaylists();
      setActiveTab("browse");
      // Navigate to receiver view
      router.push(`/receiver/${playlistId}`);
    } catch (error) {
      console.error("Failed to create playlist:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isVisible || !screenBounds) return null;

  // Add some padding to make the overlay slightly smaller than the screen bounds
  const padding = 4;
  const overlayStyle = {
    pointerEvents: "auto" as const,
    position: "absolute" as const,
    left: screenBounds.left + padding,
    top: screenBounds.top + padding,
    width: screenBounds.width - padding * 2,
    height: screenBounds.height - padding * 2,
    background: "linear-gradient(180deg, #0d1117 0%, #0a0a0a 100%)",
    borderRadius: "4px",
    overflow: "hidden" as const,
    boxShadow: "inset 0 0 30px rgba(29, 185, 84, 0.1)",
  };

  return (
    <div
      className="absolute inset-0 z-50"
      style={{ pointerEvents: "none" }}
    >
      {/* Backdrop - click to close (invisible but captures clicks) */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: "auto" }}
        onClick={onClose}
      />

      {/* Laptop screen content - positioned exactly on the 3D laptop screen */}
      <div
        className="animate-in fade-in duration-300"
        style={overlayStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Window title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff5f57]/80 transition-colors"
              />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-zinc-400 text-xs ml-2">Playlist Manager</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm px-2"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "text-[#1db954] border-b-2 border-[#1db954]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Your Playlists
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === "create"
                ? "text-[#1db954] border-b-2 border-[#1db954]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Create New
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-80px)] overflow-y-auto p-4">
          {activeTab === "browse" ? (
            // Browse playlists tab
            <div className="space-y-3">
              {loadingPlaylists ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm">
                  No playlists found. Create one!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {userPlaylists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => router.push(`/receiver/${playlist.id}`)}
                      className="flex items-center gap-3 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-left group"
                    >
                      {playlist.images?.[0] ? (
                        <img
                          src={playlist.images[0].url}
                          alt={playlist.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center text-2xl">
                          🎵
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {playlist.name}
                        </div>
                        <div className="text-zinc-500 text-xs">
                          {playlist.tracks?.total || 0} tracks
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={loadPlaylists}
                disabled={loadingPlaylists}
                className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {loadingPlaylists ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          ) : (
            // Create playlist tab
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search for songs..."
                  className="w-full px-4 py-2 pl-10 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#1db954]"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-white/5 rounded-lg max-h-32 overflow-y-auto">
                  {searchResults.slice(0, 5).map((track) => {
                    const isAdded = addedTrackIds.has(track.id);
                    return (
                      <button
                        key={track.id}
                        onClick={() => !isAdded && addTrack(track)}
                        disabled={isAdded}
                        className={`w-full flex items-center gap-2 p-2 text-left text-sm ${
                          isAdded ? "opacity-50" : "hover:bg-white/10"
                        }`}
                      >
                        <img
                          src={track.album.images[2]?.url || track.album.images[0]?.url}
                          alt={track.album.name}
                          className="w-8 h-8 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white truncate">{track.name}</div>
                          <div className="text-zinc-500 text-xs truncate">
                            {track.artists.map((a) => a.name).join(", ")}
                          </div>
                        </div>
                        <span className="text-lg">{isAdded ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Draft tracks */}
              {draftTracks.length > 0 && (
                <div className="space-y-2">
                  <div className="text-zinc-400 text-xs">
                    {draftTracks.length} track{draftTracks.length !== 1 ? "s" : ""} selected
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {draftTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 text-xs"
                      >
                        <span className="text-white truncate max-w-[100px]">{track.name}</span>
                        <button
                          onClick={() => removeTrack(track.id)}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Playlist name */}
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Playlist name..."
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#1db954]"
              />

              {/* Create button */}
              <button
                onClick={handleCreatePlaylist}
                disabled={!playlistName.trim() || draftTracks.length === 0 || isCreating}
                className="w-full py-2 bg-[#1db954] text-white text-sm font-medium rounded-lg hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? "Creating..." : "Create Playlist"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
