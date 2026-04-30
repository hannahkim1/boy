"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { RetroSceneClient } from "@/components/RetroSceneClient";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { usePlayback } from "@/hooks/usePlayback";
import { exchangeCodeForTokens } from "@/lib/spotify";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, logout } = useSpotifyAuth();
  const { isPlaying, trackName, artistName, albumArt, topArtistImages } = usePlayback();
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      if (code && !isAuthenticated && !isExchanging) {
        setIsExchanging(true);
        try {
          await exchangeCodeForTokens(code);
          window.history.replaceState({}, "", "/");
          window.location.reload();
        } catch {
          setIsExchanging(false);
        }
      }
    }
    handleCallback();
  }, [searchParams, isAuthenticated, isExchanging]);

  if (isLoading || isExchanging) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
        <h1 className="text-4xl font-bold text-white">Now Playing</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Connect your Spotify account to see your current playback
        </p>
        <Button onClick={login}>Connect Spotify</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
      {/* 3D Blender scene — vinyl spins when isPlaying */}
      <RetroSceneClient topArtistImages={topArtistImages} />

      {/* Track info overlay — bottom centre */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-none">
        {trackName ? (
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 pointer-events-auto">
            {albumArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={albumArt}
                alt="album art"
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-white font-semibold text-sm leading-tight">
                {trackName}
              </p>
              <p className="text-zinc-400 text-xs mt-0.5">{artistName}</p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isPlaying ? "bg-[#1db954] animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span className="text-zinc-500 text-xs">
                {isPlaying ? "Playing" : "Paused"}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 text-center pointer-events-auto">
            <p className="text-zinc-400 text-sm">Nothing playing</p>
            <p className="text-zinc-600 text-xs mt-1">
              Play something on Spotify
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={logout}
          className="text-sm bg-black/50 backdrop-blur-sm pointer-events-auto"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
