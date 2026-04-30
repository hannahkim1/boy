export const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
	"user-read-private",
	"user-read-email",
	"user-read-playback-state",
	"user-read-currently-playing",
	"user-modify-playback-state",
	"playlist-modify-private",
	"playlist-modify-public",
	"playlist-read-private",
	"ugc-image-upload",
	"user-top-read",
	"user-library-read",
	"user-library-modify",
].join(" ");

export const TOKEN_STORAGE_KEY = "spotify_tokens";
export const CODE_VERIFIER_KEY = "spotify_code_verifier";
