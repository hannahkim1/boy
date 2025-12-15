"use client";

import Image from "next/image";

interface SpinningDiscProps {
  albumArt: string | null;
  isPlaying: boolean;
  size?: number;
}

export function SpinningDisc({ albumArt, isPlaying, size = 280 }: SpinningDiscProps) {
  return (
    <div className="perspective-1000" style={{ perspective: "1000px" }}>
      <div
        className={`
          relative rounded-full
          transform-gpu
          ${isPlaying ? "animate-spin-slow" : ""}
          shadow-disc
        `}
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Outer ring - vinyl edge */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black"
          style={{
            boxShadow: `
              inset 0 0 30px rgba(0,0,0,0.8),
              0 0 60px rgba(29, 185, 84, 0.15),
              0 25px 50px rgba(0,0,0,0.5)
            `,
          }}
        />

        {/* Vinyl grooves */}
        <div
          className="absolute rounded-full"
          style={{
            inset: size * 0.05,
            background: `repeating-radial-gradient(
              circle at center,
              transparent 0px,
              transparent 2px,
              rgba(255,255,255,0.03) 3px,
              transparent 4px
            )`,
          }}
        />

        {/* Album art center */}
        <div
          className="absolute rounded-full overflow-hidden bg-zinc-900"
          style={{
            inset: size * 0.2,
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          {albumArt ? (
            <Image
              src={albumArt}
              alt="Album art"
              fill
              className="object-cover"
              sizes={`${size * 0.6}px`}
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-zinc-700" />
            </div>
          )}
        </div>

        {/* Center hole */}
        <div
          className="absolute rounded-full bg-zinc-950"
          style={{
            width: size * 0.06,
            height: size * 0.06,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)",
          }}
        />

        {/* Shine effect */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
          }}
        />
      </div>
    </div>
  );
}
