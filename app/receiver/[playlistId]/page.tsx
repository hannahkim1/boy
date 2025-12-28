"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RecordPlayerScene } from "@/components/RecordPlayerScene";
import { Button } from "@/components/Button";
import { useSpotify } from "@/context/SpotifyContext";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { usePlayback } from "@/hooks/usePlayback";

export default function ReceiverPage() {
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
  } = useSpotify();
  const { isPlaying, albumArt, trackName, artistName, progress, duration } =
    usePlayback();

  const [playlist, setPlaylist] = useState<any>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);

  useEffect(() => {
    if (isAuthenticated && playlistId) {
      loadPlaylist();
      // Pause current playback when entering receiver view
      if (isPlaying) {
        pause();
      }
    }
  }, [isAuthenticated, playlistId]);

  const loadPlaylist = async () => {
    setLoadingPlaylist(true);
    setError(null);
    try {
      const data = await getPlaylistById(playlistId);
      setPlaylist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playlist");
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handlePlayPlaylist = async () => {
    try {
      await playPlaylistById(playlistId);
      setHasStartedPlayback(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to play playlist");
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      if (!hasStartedPlayback && playlist) {
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
      <RecordPlayerScene
        albumArt={hasStartedPlayback ? albumArt : null}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSkipNext={skipNext}
        onSkipPrevious={skipPrevious}
        trackName={hasStartedPlayback ? trackName : null}
        artistName={hasStartedPlayback ? artistName : null}
        progress={hasStartedPlayback ? progress : 0}
        duration={hasStartedPlayback ? duration : 0}
      />

      {/* Overlay UI */}
      <div className="absolute top-8 left-8 right-8 flex items-start justify-between">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 max-w-md">
          <h2 className="text-white font-semibold text-lg">{playlist.name}</h2>
          {playlist.description && (
            <p className="text-zinc-300 text-sm mt-1 italic">
              "{playlist.description}"
            </p>
          )}
          <p className="text-zinc-400 text-xs mt-2">
            {playlist.tracks?.total || 0} tracks
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={() => router.push("/playlist")}
          className="bg-black/50 backdrop-blur-sm"
        >
          Back to Playlists
        </Button>
      </div>

      {/* Start Playback CTA */}
      {!hasStartedPlayback && !isPlaying && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <Button onClick={handlePlayPlaylist} className="text-lg px-8 py-4">
            Play {playlist.name}
          </Button>
        </div>
      )}

      {/* Track Info */}
      {hasStartedPlayback && trackName && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3">
          <h3 className="text-white font-semibold">{trackName}</h3>
          <p className="text-zinc-400 text-sm">{artistName}</p>
        </div>
      )}
    </div>
  );
}
