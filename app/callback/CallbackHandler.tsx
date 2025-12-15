"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/spotify";

export function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(errorParam);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        return;
      }

      try {
        await exchangeCodeForTokens(code);
        router.replace("/");
      } catch {
        setError("Failed to authenticate with Spotify");
      }
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={() => router.replace("/")}
          className="text-spotify-green hover:underline"
        >
          Return home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400">Connecting to Spotify...</p>
      </div>
    </div>
  );
}
