"use client";

import { useState, useEffect, useCallback } from "react";
import { useSpotify } from "@/context/SpotifyContext";

export function useSavedTrack(trackId: string | null | undefined) {
	const { checkSavedTracks, saveTrack, removeSavedTrack } = useSpotify();
	const [isSaved, setIsSaved] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);

	// Check if the track is saved when trackId changes
	useEffect(() => {
		async function checkTrack() {
			if (!trackId) {
				setIsSaved(false);
				setOptimisticSaved(null);
				return;
			}

			try {
				const [saved] = await checkSavedTracks([trackId]);
				setIsSaved(saved);
				setOptimisticSaved(null);
			} catch {
				// Silently fail
			}
		}

		checkTrack();
	}, [trackId, checkSavedTracks]);

	const toggleSave = useCallback(async () => {
		if (!trackId || isLoading) return;

		const currentSaved = optimisticSaved ?? isSaved;

		// Optimistically update
		setOptimisticSaved(!currentSaved);
		setIsLoading(true);

		try {
			if (currentSaved) {
				await removeSavedTrack(trackId);
				setIsSaved(false);
			} else {
				await saveTrack(trackId);
				setIsSaved(true);
			}
			setOptimisticSaved(null);
		} catch {
			// Revert optimistic update on error
			setOptimisticSaved(null);
		} finally {
			setIsLoading(false);
		}
	}, [
		trackId,
		isSaved,
		optimisticSaved,
		isLoading,
		saveTrack,
		removeSavedTrack,
	]);

	// The display value uses optimistic state if available
	const isTrackSaved = optimisticSaved ?? isSaved;

	return {
		isSaved: isTrackSaved,
		isLoading,
		toggleSave,
	};
}
