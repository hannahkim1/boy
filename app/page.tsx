"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { SpinningDisc } from "@/components/SpinningDisc";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { usePlayback } from "@/hooks/usePlayback";
import { exchangeCodeForTokens } from "@/lib/spotify";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, logout } = useSpotifyAuth();
  const { isPlaying, albumArt, trackName, artistName } = usePlayback();
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold text-white">Now Playing</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Connect your Spotify account to see your current playback
        </p>
        <Button onClick={login}>Connect</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <SpinningDisc albumArt={albumArt} isPlaying={isPlaying} size={280} />

      {trackName ? (
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">{trackName}</h2>
          <p className="text-zinc-400 mt-1">{artistName}</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-zinc-400">Nothing playing</p>
          <p className="text-zinc-500 text-sm mt-1">Play something on Spotify</p>
        </div>
      )}

      <Button variant="ghost" onClick={logout} className="text-sm">
        Disconnect
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
