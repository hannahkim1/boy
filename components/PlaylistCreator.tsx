"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSpotify } from "@/context/SpotifyContext";
import { Button } from "@/components/Button";
import { debounce, formatDuration } from "@/lib/utils";
import type { SpotifyTrack } from "@/lib/types";

export function PlaylistCreator() {
  const { search, createPlaylistWithTracks } = useSpotify();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Draft playlist state
  const [draftTracks, setDraftTracks] = useState<SpotifyTrack[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track which tracks are already added
  const addedTrackIds = useMemo(() => new Set(draftTracks.map((t) => t.id)), [draftTracks]);

  // Debounced search function
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await search(query);
        setSearchResults(results);
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : "Search failed");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [search]
  );

  const debouncedSearch = useMemo(() => debounce(performSearch, 300), [performSearch]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Add track to draft
  const addTrack = useCallback((track: SpotifyTrack) => {
    setDraftTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) {
        return prev;
      }
      return [...prev, track];
    });
  }, []);

  // Remove track from draft
  const removeTrack = useCallback((trackId: string) => {
    setDraftTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  // Create playlist
  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || draftTracks.length === 0) return;

    setIsCreating(true);
    setCreationError(null);
    setSuccessMessage(null);

    try {
      const playlistId = await createPlaylistWithTracks(playlistName, draftTracks);
      setSuccessMessage(`Playlist "${playlistName}" created successfully!`);

      // Clear draft after success
      setTimeout(() => {
        setDraftTracks([]);
        setPlaylistName("");
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setCreationError(err instanceof Error ? err.message : "Failed to create playlist");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Search Section */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search for songs..."
            className="w-full px-6 py-3 pl-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1db954]/50 transition-all"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
            {searchError}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            {searchResults.map((track) => {
              const isAdded = addedTrackIds.has(track.id);
              const albumImage = track.album.images[2] || track.album.images[0];

              return (
                <button
                  key={track.id}
                  onClick={() => !isAdded && addTrack(track)}
                  disabled={isAdded}
                  className={`w-full flex items-center gap-3 p-3 transition-all ${
                    isAdded
                      ? "bg-white/5 cursor-not-allowed opacity-60"
                      : "hover:bg-white/10 cursor-pointer"
                  }`}
                >
                  {albumImage && (
                    <img
                      src={albumImage.url}
                      alt={track.album.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white font-medium truncate">{track.name}</div>
                    <div className="text-zinc-400 text-sm truncate">
                      {track.artists.map((a) => a.name).join(", ")} • {formatDuration(track.duration_ms)}
                    </div>
                  </div>
                  <div className="text-2xl">{isAdded ? "✓" : "+"}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results message */}
        {!isSearching && searchQuery.trim() && searchResults.length === 0 && !searchError && (
          <div className="text-center text-zinc-400 py-8">
            No tracks found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Draft Playlist Section */}
      {draftTracks.length > 0 && (
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold text-lg">
            Your Playlist • {draftTracks.length} {draftTracks.length === 1 ? "track" : "tracks"}
          </h3>

          {/* Draft Tracks */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {draftTracks.map((track) => {
              const albumImage = track.album.images[2] || track.album.images[0];
              return (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2 bg-white/5 rounded-lg group hover:bg-white/10 transition-all"
                >
                  {albumImage && (
                    <img
                      src={albumImage.url}
                      alt={track.album.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{track.name}</div>
                    <div className="text-zinc-400 text-xs truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTrack(track.id)}
                    className="text-zinc-400 hover:text-red-400 transition-colors text-xl px-2"
                    aria-label="Remove track"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {/* Playlist Name Input */}
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Playlist name..."
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#1db954]/50 transition-all"
          />

          {/* Create Button */}
          <Button
            onClick={handleCreatePlaylist}
            disabled={!playlistName.trim() || draftTracks.length === 0 || isCreating}
            className="w-full"
          >
            {isCreating ? "Creating..." : "Create Playlist"}
          </Button>

          {/* Creation Error */}
          {creationError && (
            <div className="px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm">
              {creationError}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="px-4 py-3 bg-[#1db954]/20 border border-[#1db954]/40 rounded-lg text-green-300 text-sm">
              {successMessage}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {draftTracks.length === 0 && !searchQuery && (
        <div className="text-center text-zinc-400 py-8">
          Search for songs above to create a playlist
        </div>
      )}
    </div>
  );
}
