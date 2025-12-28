"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { debounce } from "@/lib/utils";
import type { SpotifyTrack } from "@/lib/types";

// Playlist details interface
interface PlaylistDetails {
	id: string;
	name: string;
	description: string | null;
	images: { url: string }[];
	owner: { display_name: string };
	tracks: { total: number };
	public: boolean;
}

// Monitor screen content props
export interface MonitorScreenContentProps {
	onNavigate: (path: string) => void;
	searchTracks: (query: string) => Promise<SpotifyTrack[]>;
	createPlaylist: (name: string, tracks: SpotifyTrack[], description?: string, isPublic?: boolean) => Promise<string>;
	getPlaylists: () => Promise<{ items: PlaylistDetails[] }>;
	playPlaylistById: (playlistId: string) => Promise<void>;
	onPlaylistSelect: (playlistId: string, playlistName: string) => void;
	getPlaylistTracks: (playlistId: string) => Promise<SpotifyTrack[]>;
	playTrackInPlaylist: (playlistUri: string, trackUri: string) => Promise<void>;
	currentTrackName?: string | null;
	currentArtistName?: string | null;
	currentAlbumArt?: string | null;
	isPlaying?: boolean;
	onPlayPause?: () => void;
	onSkipNext?: () => void;
	onSkipPrevious?: () => void;
	onLikeTrack?: () => Promise<void>;
	isLiked?: boolean;
	isReceiverMode?: boolean;
	receiverPlaylistName?: string | null;
	receiverPlaylistTracks?: SpotifyTrack[];
	receiverPlaylistId?: string | null;
	receiverPlaylistImage?: string | null;
	isCurrentTrackInPlaylist?: boolean;
}

// Toggle Switch Component
function TabSwitch({
	activeTab,
	onTabChange,
}: {
	activeTab: "browse" | "compose";
	onTabChange: (tab: "browse" | "compose") => void;
}) {
	return (
		<div
			style={{
				display: "flex",
				background: "rgba(255,255,255,0.06)",
				borderRadius: "6px",
				padding: "2px",
				position: "relative",
			}}
		>
			{/* Sliding background indicator */}
			<div
				style={{
					position: "absolute",
					top: "2px",
					left: activeTab === "browse" ? "2px" : "calc(50% + 1px)",
					width: "calc(50% - 3px)",
					height: "calc(100% - 4px)",
					background: "#1db954",
					borderRadius: "4px",
					transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			/>
			<button
				type="button"
				onClick={() => onTabChange("browse")}
				style={{
					padding: "4px 14px",
					borderRadius: "4px",
					fontSize: "10px",
					fontWeight: 500,
					border: "none",
					cursor: "pointer",
					background: "transparent",
					color: activeTab === "browse" ? "white" : "#888",
					position: "relative",
					zIndex: 1,
					transition: "color 0.2s ease",
				}}
			>
				Browse
			</button>
			<button
				type="button"
				onClick={() => onTabChange("compose")}
				style={{
					padding: "4px 14px",
					borderRadius: "4px",
					fontSize: "10px",
					fontWeight: 500,
					border: "none",
					cursor: "pointer",
					background: "transparent",
					color: activeTab === "compose" ? "white" : "#888",
					position: "relative",
					zIndex: 1,
					transition: "color 0.2s ease",
				}}
			>
				Compose
			</button>
		</div>
	);
}

export function MonitorScreenContent({
	onNavigate,
	searchTracks,
	createPlaylist,
	getPlaylists,
	playPlaylistById,
	onPlaylistSelect,
	getPlaylistTracks,
	playTrackInPlaylist,
	currentTrackName,
	currentArtistName,
	currentAlbumArt,
	isPlaying,
	onPlayPause,
	onSkipNext,
	onSkipPrevious,
	onLikeTrack,
	isLiked,
	isReceiverMode,
	receiverPlaylistName,
	receiverPlaylistTracks,
	receiverPlaylistId,
	receiverPlaylistImage,
	isCurrentTrackInPlaylist,
}: MonitorScreenContentProps) {
	const [activeTab, setActiveTab] = useState<"compose" | "browse">("browse");
	const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistDetails | null>(null);
	const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
	const [loadingTracks, setLoadingTracks] = useState(false);
	const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [draftTracks, setDraftTracks] = useState<SpotifyTrack[]>([]);
	const [playlistName, setPlaylistName] = useState("");
	const [playlistDescription, setPlaylistDescription] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [isPrivate, setIsPrivate] = useState(false);
	const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);
	const [userPlaylists, setUserPlaylists] = useState<PlaylistDetails[]>([]);
	const [loadingPlaylists, setLoadingPlaylists] = useState(false);
	const [hoveredPlaylistId, setHoveredPlaylistId] = useState<string | null>(null);
	const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
	const [isStartingPlayback, setIsStartingPlayback] = useState(false);
	const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(null);
	const [copiedLink, setCopiedLink] = useState(false);

	// Reset optimistic state when actual isPlaying changes
	const prevIsPlayingRef = useRef(isPlaying);
	if (prevIsPlayingRef.current !== isPlaying) {
		prevIsPlayingRef.current = isPlaying;
		if (optimisticPlaying !== null) {
			setOptimisticPlaying(null);
		}
	}

	// The display value uses optimistic state if available
	const displayPlaying = optimisticPlaying ?? isPlaying;

	const handlePlayPause = () => {
		setOptimisticPlaying(!(optimisticPlaying ?? isPlaying));
		onPlayPause?.();
	};

	const addedTrackIds = useMemo(
		() => new Set(draftTracks.map((t) => t.id)),
		[draftTracks],
	);

	useEffect(() => {
		loadPlaylists();
	}, []);

	const loadPlaylists = useCallback(async () => {
		setLoadingPlaylists(true);
		try {
			const data = await getPlaylists();
			setUserPlaylists(data.items || []);
		} catch (error) {
			console.error("Failed to load playlists:", error);
		} finally {
			setLoadingPlaylists(false);
		}
	}, [getPlaylists]);

	const performSearch = useCallback(
		async (query: string) => {
			if (!query.trim()) {
				setSearchResults([]);
				return;
			}
			setIsSearching(true);
			try {
				const results = await searchTracks(query);
				setSearchResults(results);
			} catch {
				setSearchResults([]);
			} finally {
				setIsSearching(false);
			}
		},
		[searchTracks],
	);

	const debouncedSearch = useMemo(
		() => debounce(performSearch, 300),
		[performSearch],
	);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const query = e.target.value;
		setSearchQuery(query);
		debouncedSearch(query);
	};

	const addTrack = useCallback((track: SpotifyTrack) => {
		setDraftTracks((prev) => {
			if (prev.some((t) => t.id === track.id)) return prev;
			return [...prev, track];
		});
	}, []);

	const removeTrack = useCallback((trackId: string) => {
		setDraftTracks((prev) => prev.filter((t) => t.id !== trackId));
	}, []);

	const handleCreatePlaylist = async () => {
		if (!playlistName.trim() || draftTracks.length === 0) return;
		setIsCreating(true);
		try {
			const playlistId = await createPlaylist(playlistName, draftTracks, playlistDescription || undefined, !isPrivate);
			setCreatedPlaylistId(playlistId);
			await loadPlaylists();
		} catch (error) {
			console.error("Failed to create playlist:", error);
		} finally {
			setIsCreating(false);
		}
	};

	const handleResetCompose = () => {
		setCreatedPlaylistId(null);
		setPlaylistName("");
		setPlaylistDescription("");
		setDraftTracks([]);
		setSearchQuery("");
		setSearchResults([]);
		setIsPrivate(false);
	};

	const handleOpenPlaylist = useCallback(async (playlist: PlaylistDetails) => {
		setSelectedPlaylist(playlist);
		setLoadingTracks(true);
		try {
			const tracks = await getPlaylistTracks(playlist.id);
			setPlaylistTracks(tracks);
		} catch (error) {
			console.error("Failed to load playlist tracks:", error);
		} finally {
			setLoadingTracks(false);
		}
	}, [getPlaylistTracks]);

	const handlePlayTrack = useCallback(async (playlist: PlaylistDetails, track: SpotifyTrack) => {
		setPlayingTrackId(track.id);
		onPlaylistSelect(playlist.id, playlist.name);
		try {
			await playTrackInPlaylist(`spotify:playlist:${playlist.id}`, track.uri);
		} catch (error) {
			console.error("Failed to play track:", error);
		}
	}, [playTrackInPlaylist, onPlaylistSelect]);

	const handleBackToList = useCallback(() => {
		setSelectedPlaylist(null);
		setPlaylistTracks([]);
		setPlayingTrackId(null);
	}, []);

	const formatDuration = (ms: number) => {
		const min = Math.floor(ms / 60000);
		const sec = Math.floor((ms % 60000) / 1000);
		return `${min}:${sec.toString().padStart(2, "0")}`;
	};

	// Handler for playing a track in receiver mode
	const handleReceiverPlayTrack = useCallback(async (track: SpotifyTrack) => {
		if (!receiverPlaylistId) return;
		try {
			await playTrackInPlaylist(`spotify:playlist:${receiverPlaylistId}`, track.uri);
		} catch (error) {
			console.error("Failed to play track:", error);
		}
	}, [receiverPlaylistId, playTrackInPlaylist]);

	// Receiver Mode - Show dedicated Now Playing Playlist view with 40/60 split
	if (isReceiverMode) {
		// Show track info only if current track is in this playlist
		const showTrackInfo = isCurrentTrackInPlaylist && !!currentTrackName;

		return (
			<div
				style={{
					width: "100%",
					height: "100%",
					background: "#0a0a0a",
					color: "white",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					fontFamily: "Geist, Inter, system-ui, sans-serif",
					fontSize: "11px",
					letterSpacing: "-0.01em",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 14px",
						background: "#0d0d0d",
						borderBottom: "1px solid rgba(255,255,255,0.06)",
						flexShrink: 0,
					}}
				>
					<span style={{ fontSize: "12px", fontWeight: 600, color: "#1db954", letterSpacing: "-0.02em" }}>Hannify</span>
					<span style={{ fontSize: "9px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Now Playing</span>
				</div>

				{/* Main Content - 40/60 split */}
				<div style={{ flex: 1, display: "flex", gap: "16px", padding: "16px", overflow: "hidden" }}>
					{/* Left side - 40% - Now Playing or Playlist Cover */}
					<div style={{ width: "40%", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
						{showTrackInfo ? (
							<>
								{/* Album Art - Bigger */}
								{currentAlbumArt ? (
									<img
										src={currentAlbumArt}
										alt=""
										style={{
											width: "180px",
											height: "180px",
											borderRadius: "8px",
											marginBottom: "16px",
											boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
										}}
									/>
								) : (
									<div
										style={{
											width: "180px",
											height: "180px",
											borderRadius: "8px",
											marginBottom: "16px",
											background: "#1a1a1a",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
											<path d="M9 18V5l12-2v13" />
											<circle cx="6" cy="18" r="3" />
											<circle cx="18" cy="16" r="3" />
										</svg>
									</div>
								)}

								{/* Track Info */}
								<div style={{ textAlign: "center", maxWidth: "200px" }}>
									<div style={{ fontSize: "14px", fontWeight: 600, color: "#e5e5e5", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{currentTrackName}
									</div>
									<div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
										{currentArtistName || "Unknown Artist"}
									</div>
								</div>

								{/* Playlist Name */}
								{receiverPlaylistName && (
									<div style={{ fontSize: "9px", color: "#555", marginBottom: "12px" }}>
										from <span style={{ color: "#1db954" }}>{receiverPlaylistName}</span>
									</div>
								)}

								{/* Playback Controls */}
								<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
									<button
										type="button"
										onClick={onSkipPrevious}
										style={{
											background: "none",
											border: "none",
											cursor: "pointer",
											padding: "8px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<svg width="20" height="20" viewBox="0 0 24 24" fill="#b3b3b3" aria-hidden="true">
											<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
										</svg>
									</button>

									<button
										type="button"
										onClick={onPlayPause}
										style={{
											background: "#fff",
											border: "none",
											borderRadius: "50%",
											cursor: "pointer",
											width: "40px",
											height: "40px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										{isPlaying ? (
											<svg width="18" height="18" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
												<rect x="6" y="4" width="4" height="16" />
												<rect x="14" y="4" width="4" height="16" />
											</svg>
										) : (
											<svg width="18" height="18" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
												<polygon points="5,3 19,12 5,21" />
											</svg>
										)}
									</button>

									<button
										type="button"
										onClick={onSkipNext}
										style={{
											background: "none",
											border: "none",
											cursor: "pointer",
											padding: "8px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<svg width="20" height="20" viewBox="0 0 24 24" fill="#b3b3b3" aria-hidden="true">
											<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
										</svg>
									</button>
								</div>
							</>
						) : (
							<>
								{/* Playlist Cover when no track playing */}
								{receiverPlaylistImage ? (
									<img
										src={receiverPlaylistImage}
										alt=""
										style={{
											width: "180px",
											height: "180px",
											borderRadius: "8px",
											marginBottom: "16px",
											boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
										}}
									/>
								) : (
									<div
										style={{
											width: "180px",
											height: "180px",
											borderRadius: "8px",
											marginBottom: "16px",
											background: "#1a1a1a",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
											<path d="M9 18V5l12-2v13" />
											<circle cx="6" cy="18" r="3" />
											<circle cx="18" cy="16" r="3" />
										</svg>
									</div>
								)}

								{/* Playlist Name */}
								{receiverPlaylistName && (
									<div style={{ textAlign: "center", marginBottom: "16px" }}>
										<div style={{ fontSize: "14px", fontWeight: 600, color: "#e5e5e5", marginBottom: "4px" }}>
											{receiverPlaylistName}
										</div>
										<div style={{ fontSize: "10px", color: "#666" }}>
											{receiverPlaylistTracks?.length || 0} tracks
										</div>
									</div>
								)}

								{/* Play Playlist Button */}
								<button
									type="button"
									onClick={onPlayPause}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "8px",
										background: "#1db954",
										border: "none",
										borderRadius: "24px",
										padding: "12px 28px",
										fontSize: "12px",
										fontWeight: 600,
										color: "white",
										cursor: "pointer",
										boxShadow: "0 8px 24px rgba(29, 185, 84, 0.3)",
									}}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
										<polygon points="5,3 19,12 5,21" />
									</svg>
									Play Playlist
								</button>
							</>
						)}
					</div>

					{/* Right side - 60% - Track List */}
					<div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
						<div style={{ fontSize: "8px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
							Playlist ({receiverPlaylistTracks?.length || 0} tracks)
						</div>
						<div style={{ flex: 1, overflowY: "auto" }}>
							{receiverPlaylistTracks && receiverPlaylistTracks.length > 0 ? (
								<div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
									{receiverPlaylistTracks.map((track, index) => {
										const isCurrentTrack = currentTrackName === track.name;
										return (
											<button
												type="button"
												key={track.id}
												onClick={() => handleReceiverPlayTrack(track)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: "8px",
													padding: "6px 8px",
													background: isCurrentTrack ? "rgba(29, 185, 84, 0.1)" : "transparent",
													borderRadius: "4px",
													border: "none",
													cursor: "pointer",
													textAlign: "left",
													width: "100%",
													transition: "background 0.15s ease",
												}}
												onMouseEnter={(e) => {
													if (!isCurrentTrack) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
												}}
												onMouseLeave={(e) => {
													if (!isCurrentTrack) e.currentTarget.style.background = "transparent";
												}}
											>
												<span style={{ width: "16px", fontSize: "9px", color: isCurrentTrack ? "#1db954" : "#555", textAlign: "center", flexShrink: 0 }}>
													{isCurrentTrack ? (
														<svg width="10" height="10" viewBox="0 0 24 24" fill="#1db954" aria-hidden="true">
															<polygon points="5,3 19,12 5,21" />
														</svg>
													) : index + 1}
												</span>
												<img
													src={track.album.images[2]?.url || track.album.images[0]?.url}
													alt=""
													style={{ width: "28px", height: "28px", borderRadius: "3px", flexShrink: 0 }}
												/>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div style={{ fontSize: "10px", fontWeight: 500, color: isCurrentTrack ? "#1db954" : "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														{track.name}
													</div>
													<div style={{ fontSize: "8px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														{track.artists.map(a => a.name).join(", ")}
													</div>
												</div>
												<span style={{ fontSize: "8px", color: "#555", flexShrink: 0 }}>
													{formatDuration(track.duration_ms)}
												</span>
											</button>
										);
									})}
								</div>
							) : (
								<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", fontSize: "10px" }}>
									No tracks in playlist
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				background: "#0a0a0a",
				color: "white",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				fontFamily: "Geist, Inter, system-ui, sans-serif",
				fontSize: "11px",
				letterSpacing: "-0.01em",
			}}
		>
			{/* Header with tabs */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 14px",
					background: "#0d0d0d",
					borderBottom: "1px solid rgba(255,255,255,0.06)",
					flexShrink: 0,
				}}
			>
				<span style={{ fontSize: "12px", fontWeight: 600, color: "#1db954", letterSpacing: "-0.02em" }}>Hannify</span>
				<TabSwitch activeTab={activeTab} onTabChange={setActiveTab} />
			</div>

			{/* Content */}
			<div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
				{activeTab === "browse" ? (
					<div style={{ height: "100%" }}>
						{selectedPlaylist ? (
							/* Playlist Detail View - 30/70 split */
							<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
								{/* Back button */}
								<button
									type="button"
									onClick={handleBackToList}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										background: "none",
										border: "none",
										color: "#888",
										fontSize: "9px",
										cursor: "pointer",
										padding: "0 0 8px 0",
										marginBottom: "8px",
									}}
								>
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
										<path d="M19 12H5M12 19l-7-7 7-7" />
									</svg>
									Back
								</button>

								{/* Main content - 30/70 split */}
								<div style={{ flex: 1, display: "flex", gap: "16px", overflow: "hidden" }}>
									{/* Left side - 30% - Album art and details */}
									<div style={{ width: "30%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
										{/* Album art */}
										{selectedPlaylist.images?.[0] ? (
											<img
												src={selectedPlaylist.images[0].url}
												alt=""
												style={{
													width: "100%",
													aspectRatio: "1",
													objectFit: "cover",
													borderRadius: "4px",
													marginBottom: "10px",
												}}
											/>
										) : (
											<div
												style={{
													width: "100%",
													aspectRatio: "1",
													background: "#1a1a1a",
													borderRadius: "4px",
													marginBottom: "10px",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
													<path d="M9 18V5l12-2v13" />
													<circle cx="6" cy="18" r="3" />
													<circle cx="18" cy="16" r="3" />
												</svg>
											</div>
										)}

										{/* Playlist info */}
										<div style={{ fontSize: "7px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
											Playlist
										</div>
										<div style={{ fontSize: "12px", fontWeight: 600, color: "#e5e5e5", marginBottom: "4px", lineHeight: 1.2 }}>
											{selectedPlaylist.name}
										</div>
										<div style={{ fontSize: "8px", color: "#666", marginBottom: "10px" }}>
											{selectedPlaylist.tracks?.total || 0} tracks
										</div>
										<button
											type="button"
											onClick={async () => {
												if (isStartingPlayback) return;
												setIsStartingPlayback(true);
												try {
													await playPlaylistById(selectedPlaylist.id);
													setCurrentPlaylistId(selectedPlaylist.id);
													onPlaylistSelect(selectedPlaylist.id, selectedPlaylist.name);
												} catch (error) {
													console.error("Failed to play playlist:", error);
												} finally {
													setIsStartingPlayback(false);
												}
											}}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												gap: "4px",
												background: "#1db954",
												border: "none",
												borderRadius: "14px",
												padding: "6px 14px",
												fontSize: "9px",
												fontWeight: 500,
												color: "white",
												cursor: "pointer",
												width: "100%",
											}}
										>
											<svg width="10" height="10" viewBox="0 0 24 24" fill="white" aria-hidden="true">
												<polygon points="5,3 19,12 5,21" />
											</svg>
											Play All
										</button>

										{/* Copy Link button - only for public playlists */}
										{selectedPlaylist.public && (
											<button
												type="button"
												onClick={() => {
													const url = `${typeof window !== "undefined" ? window.location.origin : ""}/receiver/${selectedPlaylist.id}`;
													navigator.clipboard.writeText(url);
													setCopiedLink(true);
													setTimeout(() => setCopiedLink(false), 2000);
												}}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													gap: "4px",
													background: copiedLink ? "rgba(29, 185, 84, 0.2)" : "rgba(255,255,255,0.06)",
													border: "none",
													borderRadius: "14px",
													padding: "6px 14px",
													fontSize: "9px",
													fontWeight: 500,
													color: copiedLink ? "#1db954" : "#888",
													cursor: "pointer",
													width: "100%",
													marginTop: "6px",
													transition: "all 0.2s ease",
												}}
											>
												{copiedLink ? (
													<>
														<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1db954" strokeWidth="2" aria-hidden="true">
															<path d="M20 6L9 17l-5-5" />
														</svg>
														Copied!
													</>
												) : (
													<>
														<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
															<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
															<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
														</svg>
														Copy Link
													</>
												)}
											</button>
										)}
									</div>

									{/* Right side - 70% - Track list */}
									<div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
										{loadingTracks ? (
											<div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
												<div
													style={{
														width: "16px",
														height: "16px",
														border: "1.5px solid #1db954",
														borderTopColor: "transparent",
														borderRadius: "50%",
														animation: "spin 1s linear infinite",
													}}
												/>
											</div>
										) : (
											<div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
												{playlistTracks.map((track, index) => {
													const isCurrentTrack = playingTrackId === track.id;
													return (
														<button
															type="button"
															key={track.id}
															onClick={() => handlePlayTrack(selectedPlaylist, track)}
															style={{
																display: "flex",
																alignItems: "center",
																gap: "8px",
																padding: "5px 6px",
																background: isCurrentTrack ? "rgba(29, 185, 84, 0.1)" : "transparent",
																border: "none",
																borderRadius: "3px",
																cursor: "pointer",
																textAlign: "left",
																transition: "background 0.15s ease",
															}}
															onMouseEnter={(e) => {
																if (!isCurrentTrack) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
															}}
															onMouseLeave={(e) => {
																if (!isCurrentTrack) e.currentTarget.style.background = "transparent";
															}}
														>
															<span style={{ width: "14px", fontSize: "8px", color: isCurrentTrack ? "#1db954" : "#555", textAlign: "center", flexShrink: 0 }}>
																{isCurrentTrack ? (
																	<svg width="8" height="8" viewBox="0 0 24 24" fill="#1db954" aria-hidden="true">
																		<polygon points="5,3 19,12 5,21" />
																	</svg>
																) : index + 1}
															</span>
															<img
																src={track.album.images[2]?.url || track.album.images[0]?.url}
																alt=""
																style={{ width: "24px", height: "24px", borderRadius: "2px", flexShrink: 0 }}
															/>
															<div style={{ flex: 1, minWidth: 0 }}>
																<div style={{ fontSize: "9px", fontWeight: 500, color: isCurrentTrack ? "#1db954" : "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
																	{track.name}
																</div>
																<div style={{ fontSize: "7px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
																	{track.artists.map(a => a.name).join(", ")}
																</div>
															</div>
															<span style={{ fontSize: "7px", color: "#555", flexShrink: 0 }}>
																{formatDuration(track.duration_ms)}
															</span>
														</button>
													);
												})}
											</div>
										)}
									</div>
								</div>
							</div>
						) : loadingPlaylists ? (
							<div
								style={{
									display: "flex",
									justifyContent: "center",
									padding: "40px 0",
								}}
							>
								<div
									style={{
										width: "18px",
										height: "18px",
										border: "1.5px solid #1db954",
										borderTopColor: "transparent",
										borderRadius: "50%",
										animation: "spin 1s linear infinite",
									}}
								/>
							</div>
						) : userPlaylists.length === 0 ? (
							<div style={{ textAlign: "center", padding: "40px 0" }}>
								<div style={{ width: "32px", height: "32px", margin: "0 auto 8px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" aria-hidden="true">
										<path d="M9 18V5l12-2v13" />
										<circle cx="6" cy="18" r="3" />
										<circle cx="18" cy="16" r="3" />
									</svg>
								</div>
								<p style={{ color: "#666", fontSize: "10px" }}>
									No playlists yet
								</p>
							</div>
						) : (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(5, 1fr)",
									gap: "10px",
								}}
							>
								{userPlaylists.map((playlist) => {
									const isHovered = hoveredPlaylistId === playlist.id;
									const isPlayingPlaylist = currentPlaylistId === playlist.id;
									return (
										<button
											type="button"
											key={playlist.id}
											onClick={() => handleOpenPlaylist(playlist)}
											onMouseEnter={() => setHoveredPlaylistId(playlist.id)}
											onMouseLeave={() => setHoveredPlaylistId(null)}
											style={{
												background: isPlayingPlaylist
													? "rgba(29, 185, 84, 0.1)"
													: isHovered
														? "rgba(255,255,255,0.06)"
														: "rgba(255,255,255,0.02)",
												borderRadius: "4px",
												padding: "6px",
												border: isPlayingPlaylist
													? "1px solid rgba(29, 185, 84, 0.3)"
													: "1px solid rgba(255,255,255,0.04)",
												cursor: "pointer",
												textAlign: "left",
												transition: "all 0.15s ease",
											}}
										>
											<div style={{ position: "relative" }}>
												{playlist.images?.[0] ? (
													<img
														src={playlist.images[0].url}
														alt=""
														style={{
															width: "100%",
															aspectRatio: "1",
															objectFit: "cover",
															borderRadius: "3px",
															marginBottom: "6px",
														}}
													/>
												) : (
													<div
														style={{
															width: "100%",
															aspectRatio: "1",
															background: "#1a1a1a",
															borderRadius: "3px",
															marginBottom: "6px",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
													>
														<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
															<path d="M9 18V5l12-2v13" />
															<circle cx="6" cy="18" r="3" />
															<circle cx="18" cy="16" r="3" />
														</svg>
													</div>
												)}
												{isPlayingPlaylist && (
													<div
														style={{
															position: "absolute",
															bottom: "10px",
															right: "4px",
															background: "#1db954",
															borderRadius: "50%",
															width: "14px",
															height: "14px",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
														}}
													>
														<svg width="6" height="6" viewBox="0 0 24 24" fill="white" aria-hidden="true">
														<polygon points="5,3 19,12 5,21" />
													</svg>
													</div>
												)}
											</div>
											<div
												style={{
													color: isPlayingPlaylist ? "#1db954" : "#e5e5e5",
													fontSize: "9px",
													fontWeight: 500,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													lineHeight: 1.3,
												}}
											>
												{playlist.name}
											</div>
											<div style={{ color: "#555", fontSize: "8px" }}>
												{playlist.tracks?.total || 0} tracks
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
				) : createdPlaylistId ? (
					/* Success Screen */
					<div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", textAlign: "center" }}>
						<div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#1db954", display: "flex", alignItems: "center", justifyContent: "center" }}>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
								<path d="M20 6L9 17l-5-5" />
							</svg>
						</div>
						<div>
							<div style={{ fontSize: "14px", fontWeight: 600, color: "#e5e5e5", marginBottom: "4px" }}>Playlist Created!</div>
							<div style={{ fontSize: "10px", color: "#888" }}>{playlistName}</div>
						</div>
						<div style={{ fontSize: "9px", color: "#666", marginTop: "8px" }}>Share this link:</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "8px 12px", maxWidth: "90%" }}>
							<input
								type="text"
								readOnly
								value={`${typeof window !== "undefined" ? window.location.origin : ""}/receiver/${createdPlaylistId}`}
								style={{
									flex: 1,
									background: "transparent",
									border: "none",
									color: "#1db954",
									fontSize: "9px",
									outline: "none",
									minWidth: 0,
								}}
							/>
							<button
								type="button"
								onClick={() => {
									navigator.clipboard.writeText(`${window.location.origin}/receiver/${createdPlaylistId}`);
								}}
								style={{
									background: "rgba(29, 185, 84, 0.2)",
									border: "none",
									borderRadius: "4px",
									padding: "4px 8px",
									fontSize: "8px",
									color: "#1db954",
									cursor: "pointer",
									flexShrink: 0,
								}}
							>
								Copy
							</button>
						</div>
						<div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
							<button
								type="button"
								onClick={() => onNavigate(`/receiver/${createdPlaylistId}`)}
								style={{
									background: "#1db954",
									border: "none",
									borderRadius: "14px",
									padding: "8px 16px",
									fontSize: "9px",
									fontWeight: 600,
									color: "white",
									cursor: "pointer",
								}}
							>
								Open Playlist
							</button>
							<button
								type="button"
								onClick={handleResetCompose}
								style={{
									background: "rgba(255,255,255,0.06)",
									border: "none",
									borderRadius: "14px",
									padding: "8px 16px",
									fontSize: "9px",
									fontWeight: 500,
									color: "#888",
									cursor: "pointer",
								}}
							>
								Create Another
							</button>
						</div>
					</div>
				) : (
					/* Compose View - 30/70 split like playlist view */
					<div style={{ height: "100%", display: "flex", gap: "16px" }}>
						{/* Left side - 30% - Playlist info and search */}
						<div style={{ width: "30%", flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
							{/* Playlist name input */}
							<div>
								<div style={{ fontSize: "7px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
									Playlist Name
								</div>
								<input
									type="text"
									value={playlistName}
									onChange={(e) => setPlaylistName(e.target.value)}
									placeholder="My new playlist..."
									style={{
										width: "100%",
										padding: "8px 10px",
										background: "rgba(255,255,255,0.04)",
										border: "1px solid rgba(255,255,255,0.08)",
										borderRadius: "4px",
										fontSize: "10px",
										color: "white",
										outline: "none",
										boxSizing: "border-box",
									}}
								/>
							</div>

							{/* Playlist description input */}
							<div>
								<div style={{ fontSize: "7px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
									Description
								</div>
								<textarea
									value={playlistDescription}
									onChange={(e) => setPlaylistDescription(e.target.value)}
									placeholder="Add an optional description..."
									style={{
										width: "100%",
										padding: "8px 10px",
										background: "rgba(255,255,255,0.04)",
										border: "1px solid rgba(255,255,255,0.08)",
										borderRadius: "4px",
										fontSize: "10px",
										color: "white",
										outline: "none",
										boxSizing: "border-box",
										resize: "none",
										height: "50px",
										fontFamily: "inherit",
									}}
								/>
							</div>

							{/* Private toggle */}
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<div style={{ fontSize: "8px", color: "#888" }}>Private playlist</div>
								<button
									type="button"
									onClick={() => setIsPrivate(!isPrivate)}
									style={{
										width: "32px",
										height: "18px",
										borderRadius: "9px",
										border: "none",
										background: isPrivate ? "#1db954" : "rgba(255,255,255,0.15)",
										cursor: "pointer",
										position: "relative",
										transition: "background 0.2s ease",
									}}
								>
									<div
										style={{
											width: "14px",
											height: "14px",
											borderRadius: "50%",
											background: "white",
											position: "absolute",
											top: "2px",
											left: isPrivate ? "16px" : "2px",
											transition: "left 0.2s ease",
										}}
									/>
								</button>
							</div>

							{/* Search input */}
							<div style={{ position: "relative" }}>
								<div style={{ fontSize: "7px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
									Add Songs
								</div>
								<input
									type="text"
									value={searchQuery}
									onChange={handleSearchChange}
									placeholder="Search for songs..."
									style={{
										width: "100%",
										padding: "8px 10px",
										background: "rgba(255,255,255,0.04)",
										border: "1px solid rgba(255,255,255,0.08)",
										borderRadius: "4px",
										fontSize: "10px",
										color: "white",
										outline: "none",
										boxSizing: "border-box",
									}}
								/>

								{/* Search results dropdown */}
								{searchResults.length > 0 && (
									<div
										style={{
											position: "absolute",
											top: "100%",
											left: 0,
											right: 0,
											background: "#1a1a1a",
											borderRadius: "4px",
											overflow: "hidden",
											maxHeight: "160px",
											overflowY: "auto",
											marginTop: "4px",
											border: "1px solid rgba(255,255,255,0.08)",
											zIndex: 10,
										}}
									>
										{searchResults.slice(0, 6).map((track) => {
											const isAdded = addedTrackIds.has(track.id);
											return (
												<button
													type="button"
													key={track.id}
													onClick={() => addTrack(track)}
													disabled={isAdded}
													style={{
														width: "100%",
														display: "flex",
														alignItems: "center",
														gap: "6px",
														padding: "6px 8px",
														textAlign: "left",
														background: "transparent",
														border: "none",
														borderBottom: "1px solid rgba(255,255,255,0.03)",
														cursor: isAdded ? "not-allowed" : "pointer",
														opacity: isAdded ? 0.5 : 1,
														transition: "background 0.15s ease",
													}}
													onMouseEnter={(e) => {
														if (!isAdded) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = "transparent";
													}}
												>
													<img
														src={track.album.images[2]?.url || track.album.images[0]?.url}
														alt=""
														style={{ width: "24px", height: "24px", borderRadius: "2px" }}
													/>
													<div style={{ flex: 1, minWidth: 0 }}>
														<div style={{ color: "#e5e5e5", fontSize: "9px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
															{track.name}
														</div>
														<div style={{ color: "#555", fontSize: "7px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
															{track.artists.map((a) => a.name).join(", ")}
														</div>
													</div>
													<span style={{ fontSize: "10px", color: isAdded ? "#1db954" : "#888", fontWeight: 500 }}>
														{isAdded ? "+" : "+"}
													</span>
												</button>
											);
										})}
									</div>
								)}
							</div>

							{/* Create button */}
							<button
								type="button"
								onClick={handleCreatePlaylist}
								disabled={!playlistName.trim() || draftTracks.length === 0 || isCreating}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									background: "#1db954",
									border: "none",
									borderRadius: "14px",
									padding: "8px 14px",
									fontSize: "9px",
									fontWeight: 600,
									color: "white",
									cursor: "pointer",
									width: "100%",
									marginTop: "auto",
									opacity: !playlistName.trim() || draftTracks.length === 0 || isCreating ? 0.5 : 1,
									transition: "opacity 0.15s ease",
								}}
							>
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
									<path d="M5 12h14M12 5v14" />
								</svg>
								{isCreating ? "Creating..." : "Create Playlist"}
							</button>
						</div>

						{/* Right side - 70% - Track list */}
						<div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
							<div style={{ fontSize: "7px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
								Playlist Tracks ({draftTracks.length})
							</div>

							{draftTracks.length === 0 ? (
								<div
									style={{
										flex: 1,
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										color: "#555",
										fontSize: "10px",
										textAlign: "center",
									}}
								>
									<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" style={{ marginBottom: "8px" }} aria-hidden="true">
										<path d="M9 18V5l12-2v13" />
										<circle cx="6" cy="18" r="3" />
										<circle cx="18" cy="16" r="3" />
									</svg>
									<div>Search for songs to add</div>
									<div style={{ fontSize: "8px", color: "#444", marginTop: "4px" }}>
										Your tracks will appear here
									</div>
								</div>
							) : (
								<div style={{ flex: 1, overflowY: "auto" }}>
									<div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
										{draftTracks.map((track, index) => (
											<div
												key={track.id}
												style={{
													display: "flex",
													alignItems: "center",
													gap: "8px",
													padding: "5px 6px",
													background: "transparent",
													borderRadius: "3px",
													transition: "background 0.15s ease",
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.background = "rgba(255,255,255,0.04)";
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.background = "transparent";
												}}
											>
												<span style={{ width: "14px", fontSize: "8px", color: "#555", textAlign: "center", flexShrink: 0 }}>
													{index + 1}
												</span>
												<img
													src={track.album.images[2]?.url || track.album.images[0]?.url}
													alt=""
													style={{ width: "24px", height: "24px", borderRadius: "2px", flexShrink: 0 }}
												/>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div style={{ fontSize: "9px", fontWeight: 500, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														{track.name}
													</div>
													<div style={{ fontSize: "7px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														{track.artists.map(a => a.name).join(", ")}
													</div>
												</div>
												<span style={{ fontSize: "7px", color: "#555", flexShrink: 0, marginRight: "4px" }}>
													{formatDuration(track.duration_ms)}
												</span>
												<button
													type="button"
													onClick={() => removeTrack(track.id)}
													style={{
														background: "none",
														border: "none",
														color: "#666",
														cursor: "pointer",
														padding: "4px",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														borderRadius: "50%",
														transition: "background 0.15s ease, color 0.15s ease",
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.background = "rgba(255,255,255,0.1)";
														e.currentTarget.style.color = "#ff5555";
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = "none";
														e.currentTarget.style.color = "#666";
													}}
												>
													<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
														<path d="M18 6L6 18M6 6l12 12" />
													</svg>
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Now Playing Bar */}
			{currentTrackName && (
				<div
					style={{
						flexShrink: 0,
						display: "flex",
						alignItems: "center",
						gap: "10px",
						padding: "8px 12px",
						background: "#181818",
						borderTop: "1px solid rgba(255,255,255,0.06)",
					}}
				>
					{/* Album art */}
					{currentAlbumArt ? (
						<img
							src={currentAlbumArt}
							alt=""
							style={{ width: "36px", height: "36px", borderRadius: "2px", flexShrink: 0 }}
						/>
					) : (
						<div style={{ width: "36px", height: "36px", borderRadius: "2px", background: "#282828", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" aria-hidden="true">
								<path d="M9 18V5l12-2v13" />
								<circle cx="6" cy="18" r="3" />
								<circle cx="18" cy="16" r="3" />
							</svg>
						</div>
					)}

					{/* Track info */}
					<div style={{ flex: 1, minWidth: 0 }}>
						<div style={{ fontSize: "9px", fontWeight: 500, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
							<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrackName}</span>
							{/* Playing indicator - equalizer animation */}
							{displayPlaying && (
								<span style={{ display: "inline-flex", alignItems: "flex-end", gap: "1px", height: "9px", flexShrink: 0 }}>
									<span style={{ width: "1.5px", height: "5px", background: "#1db954", borderRadius: "0.5px", animation: "eq1 0.5s ease-in-out infinite alternate" }} />
									<span style={{ width: "1.5px", height: "8px", background: "#1db954", borderRadius: "0.5px", animation: "eq2 0.4s ease-in-out infinite alternate" }} />
									<span style={{ width: "1.5px", height: "4px", background: "#1db954", borderRadius: "0.5px", animation: "eq3 0.6s ease-in-out infinite alternate" }} />
								</span>
							)}
						</div>
						<div style={{ fontSize: "8px", color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							{currentArtistName || "Unknown Artist"}
						</div>
					</div>

					{/* Like button */}
					<button
						type="button"
						onClick={() => onLikeTrack?.()}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: "4px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#1db954" : "none"} stroke={isLiked ? "#1db954" : "#888"} strokeWidth="2" aria-hidden="true">
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
					</button>

					{/* Playback controls */}
					<div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
						{/* Previous */}
						<button
							type="button"
							onClick={onSkipPrevious}
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								padding: "4px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="#b3b3b3" aria-hidden="true">
								<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
							</svg>
						</button>

						{/* Play/Pause */}
						<button
							type="button"
							onClick={handlePlayPause}
							style={{
								background: "#fff",
								border: "none",
								borderRadius: "50%",
								cursor: "pointer",
								width: "24px",
								height: "24px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{displayPlaying ? (
								<svg width="12" height="12" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
									<rect x="6" y="4" width="4" height="16" />
									<rect x="14" y="4" width="4" height="16" />
								</svg>
							) : (
								<svg width="12" height="12" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
									<polygon points="5,3 19,12 5,21" />
								</svg>
							)}
						</button>

						{/* Next */}
						<button
							type="button"
							onClick={onSkipNext}
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								padding: "4px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="#b3b3b3" aria-hidden="true">
								<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
							</svg>
						</button>
					</div>
				</div>
			)}

			{/* Keyframes for animations */}
			<style>{`
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
				@keyframes eq1 {
					from { height: 4px; }
					to { height: 12px; }
				}
				@keyframes eq2 {
					from { height: 8px; }
					to { height: 16px; }
				}
				@keyframes eq3 {
					from { height: 3px; }
					to { height: 10px; }
				}
			`}</style>
		</div>
	);
}

export { type PlaylistDetails };
