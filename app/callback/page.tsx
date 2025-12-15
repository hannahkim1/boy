"use client";

import { Suspense } from "react";
import { CallbackHandler } from "./CallbackHandler";

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400">Connecting to Spotify...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
