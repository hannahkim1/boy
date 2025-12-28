"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSpotify } from "@/context/SpotifyContext";
import type { SpotifyTrack } from "@/lib/types";

interface RecordPlayerSceneProps {
  albumArt: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  trackName?: string | null;
  artistName?: string | null;
  progress?: number;
  duration?: number;
  onLikeTrack?: () => Promise<void>;
  isLiked?: boolean;
  isReceiverMode?: boolean;
  receiverPlaylistName?: string | null;
  receiverPlaylistTracks?: SpotifyTrack[];
  receiverPlaylistId?: string | null;
  receiverPlaylistImage?: string | null;
  receiverPlaylistDescription?: string | null;
  isCurrentTrackInPlaylist?: boolean;
}

const RecordPlayerSceneInner = dynamic(
  () => import("./RecordPlayerScene").then((mod) => mod.RecordPlayerScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export function RecordPlayerSceneClient(props: RecordPlayerSceneProps) {
  const router = useRouter();
  const { search, createPlaylistWithTracks, getUserPlaylists, playPlaylistById, getPlaylistTracks, playTrackInPlaylist } = useSpotify();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <RecordPlayerSceneInner
      {...props}
      onNavigate={handleNavigate}
      searchTracks={search}
      createPlaylist={createPlaylistWithTracks}
      getPlaylists={getUserPlaylists}
      playPlaylistById={playPlaylistById}
      getPlaylistTracks={getPlaylistTracks}
      playTrackInPlaylist={playTrackInPlaylist}
    />
  );
}
