"use client";

import { useSpotify } from "@/context/SpotifyContext";

export function usePlayback() {
  const { playback, refreshPlayback, play, pause, topArtistImages, topArtists } = useSpotify();

  const isPlaying = playback?.is_playing ?? false;

  const togglePlayback = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  return {
    isPlaying,
    track: playback?.item ?? null,
    progress: playback?.progress_ms ?? 0,
    duration: playback?.item?.duration_ms ?? 0,
    albumArt: playback?.item?.album?.images?.[0]?.url ?? null,
    trackName: playback?.item?.name ?? null,
    artistName: playback?.item?.artists?.map((a) => a.name).join(", ") ?? null,
    refresh: refreshPlayback,
    play,
    pause,
    togglePlayback,
    topArtistImages,
    topArtists,
  };
}
