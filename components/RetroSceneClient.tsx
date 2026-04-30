"use client";

import dynamic from "next/dynamic";

const RetroSceneInner = dynamic(
  () => import("./RetroScene").then((mod) => mod.RetroScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
);

export function RetroSceneClient({ topArtistImages }: { topArtistImages?: string[] }) {
  return <RetroSceneInner topArtistImages={topArtistImages} />;
}
