"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlaylistCreator } from "@/components/PlaylistCreator";
import { Button } from "@/components/Button";
import { useSpotify } from "@/context/SpotifyContext";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";

export default function PlaylistPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSpotifyAuth();
  const { getUserPlaylists } = useSpotify();
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated]);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const data = await getUserPlaylists();
      setUserPlaylists(data.items || []);
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-4xl font-bold text-white">Playlist Manager</h1>
        <p className="text-zinc-400">Please log in to manage playlists</p>
        <Button onClick={() => router.push("/")}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Playlist Manager</h1>
            <p className="text-zinc-400 mt-2">Create and manage your Spotify playlists</p>
          </div>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Back to Player
          </Button>
        </div>

        {/* Create New Playlist Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Create New Playlist</h2>
          <PlaylistCreator onPlaylistCreated={loadPlaylists} />
        </div>

        {/* Your Playlists Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Your Playlists</h2>
            <Button variant="ghost" onClick={loadPlaylists} disabled={loadingPlaylists}>
              {loadingPlaylists ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {loadingPlaylists ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userPlaylists.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              No playlists found. Create your first playlist above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all group cursor-pointer"
                  onClick={() => router.push(`/receiver/${playlist.id}`)}
                >
                  {playlist.images?.[0] && (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="w-full aspect-square object-cover rounded-md mb-3"
                    />
                  )}
                  {!playlist.images?.[0] && (
                    <div className="w-full aspect-square bg-zinc-800 rounded-md mb-3 flex items-center justify-center">
                      <span className="text-6xl">🎵</span>
                    </div>
                  )}
                  <h3 className="text-white font-semibold truncate">{playlist.name}</h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    {playlist.tracks?.total || 0} tracks
                  </p>
                  <Button
                    className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/receiver/${playlist.id}`);
                    }}
                  >
                    Open Receiver View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
