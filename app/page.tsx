"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { RecordPlayerScene } from "@/components/RecordPlayerScene";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { usePlayback } from "@/hooks/usePlayback";
import { useSpotify } from "@/context/SpotifyContext";
import { exchangeCodeForTokens } from "@/lib/spotify";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, logout } = useSpotifyAuth();
  const { isPlaying, albumArt, trackName, artistName, progress, duration } = usePlayback();
  const { play, pause, skipNext, skipPrevious } = useSpotify();
  const [isExchanging, setIsExchanging] = useState(false);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

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
    <div className="relative w-full h-screen overflow-hidden">
      <RecordPlayerScene
        albumArt={albumArt}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSkipNext={skipNext}
        onSkipPrevious={skipPrevious}
        trackName={trackName}
        artistName={artistName}
        progress={progress}
        duration={duration}
      />

      {/* Overlay UI */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        {!trackName && (
          <div className="text-center bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3">
            <p className="text-zinc-400">Nothing playing</p>
            <p className="text-zinc-500 text-sm mt-1">Play something on Spotify</p>
          </div>
        )}

        <Button variant="ghost" onClick={logout} className="text-sm bg-black/50 backdrop-blur-sm">
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
