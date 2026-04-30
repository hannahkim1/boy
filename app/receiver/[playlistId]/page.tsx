"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RecordPlayerSceneClient } from "@/components/RecordPlayerSceneClient";
import { Button } from "@/components/Button";
import { useSpotify } from "@/context/SpotifyContext";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { usePlayback } from "@/hooks/usePlayback";
import type { SpotifyTrack } from "@/lib/types";

function ReceiverContent() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.playlistId as string;

  const { isAuthenticated, isLoading: authLoading } = useSpotifyAuth();
  const {
    play,
    pause,
    skipNext,
    skipPrevious,
    playPlaylistById,
    getPlaylistById,
    getPlaylistTracks,
  } = useSpotify();
  const { isPlaying, albumArt, trackName, artistName, progress, duration } =
    usePlayback();

  const [playlist, setPlaylist] = useState<any>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);

  useEffect(() => {
    if (isAuthenticated && playlistId) {
      loadPlaylist();
    }
  }, [isAuthenticated, playlistId]);

  const loadPlaylist = async () => {
    setLoadingPlaylist(true);
    setError(null);
    try {
      const [data, tracks] = await Promise.all([
        getPlaylistById(playlistId),
        getPlaylistTracks(playlistId),
      ]);
      setPlaylist(data);
      setPlaylistTracks(tracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playlist");
    } finally {
      setLoadingPlaylist(false);
    }
  };

  // Check if the current track is in this playlist
  // Compare by track name since we may not have the exact track ID
  const isCurrentTrackInPlaylist = trackName && playlistTracks.length > 0
    ? playlistTracks.some((track) =>
        track.name.toLowerCase() === trackName.toLowerCase()
      )
    : false;

  const handlePlayPlaylist = async () => {
    if (isStartingPlayback) return; // Prevent double-clicks
    setIsStartingPlayback(true);
    try {
      await playPlaylistById(playlistId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to play playlist");
    } finally {
      // Reset after a delay to allow playback state to update
      setTimeout(() => setIsStartingPlayback(false), 1000);
    }
  };

  const handlePlayPause = async () => {
    if (isStartingPlayback) return; // Prevent actions while starting
    if (isPlaying) {
      await pause();
    } else {
      // If no track is playing or current track is not in this playlist, start the playlist
      if (!trackName || !isCurrentTrackInPlaylist) {
        await handlePlayPlaylist();
      } else {
        await play();
      }
    }
  };

  if (authLoading || loadingPlaylist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-[#0a0a0a]">
        <h1 className="text-4xl font-bold text-white">Receiver View</h1>
        <p className="text-zinc-400">Please log in to view this playlist</p>
        <Button onClick={() => router.push("/")}>Go to Home</Button>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-[#0a0a0a]">
        <h1 className="text-4xl font-bold text-white">Error</h1>
        <p className="text-zinc-400">{error || "Playlist not found"}</p>
        <div className="flex gap-4">
          <Button onClick={loadPlaylist}>Retry</Button>
          <Button variant="ghost" onClick={() => router.push("/playlist")}>
            Back to Playlists
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
      <RecordPlayerSceneClient
        albumArt={albumArt}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSkipNext={skipNext}
        onSkipPrevious={skipPrevious}
        trackName={trackName}
        artistName={artistName}
        progress={progress}
        duration={duration}
        isReceiverMode={true}
        receiverPlaylistName={playlist?.name}
        receiverPlaylistTracks={playlistTracks}
        receiverPlaylistId={playlistId}
        receiverPlaylistImage={playlist?.images?.[0]?.url || null}
        receiverPlaylistDescription={playlist?.description || null}
        isCurrentTrackInPlaylist={isCurrentTrackInPlaylist}
      />

      {/* Now Playing indicator - bottom left */}
      {trackName && (
        <div className="absolute bottom-4 left-4 text-xs bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#1db954]">♫</span>
            <div className="flex flex-col">
              <span className="text-zinc-200 truncate max-w-[180px] font-medium">
                {trackName}
              </span>
              {artistName && (
                <span className="text-zinc-400 truncate max-w-[180px] text-[10px]">
                  {artistName}
                </span>
              )}
            </div>
          </div>
          {!isCurrentTrackInPlaylist && (
            <div className="text-zinc-500 text-[10px]">
              Not in this playlist
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function ReceiverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReceiverContent />
    </Suspense>
  );
}
