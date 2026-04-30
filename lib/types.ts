export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email: string;
  images: SpotifyImage[];
  product: "premium" | "free" | "open";
  country: string;
  uri: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface TopArtist {
  id: string;
  name: string;
  uri: string;
  images: SpotifyImage[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
  is_playable: boolean;
}

export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
}

export interface PlaybackState {
  device: SpotifyDevice;
  is_playing: boolean;
  progress_ms: number | null;
  timestamp: number;
  item: SpotifyTrack | null;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
