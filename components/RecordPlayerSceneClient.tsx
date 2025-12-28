"use client";

import dynamic from "next/dynamic";

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
  return <RecordPlayerSceneInner {...props} />;
}
