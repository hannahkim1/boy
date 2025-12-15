import {
  SPOTIFY_AUTH_URL,
  SPOTIFY_TOKEN_URL,
  SPOTIFY_API_BASE,
  SPOTIFY_SCOPES,
  TOKEN_STORAGE_KEY,
  CODE_VERIFIER_KEY,
} from "./constants";
import type { TokenResponse, StoredTokens, SpotifyUser, PlaybackState } from "./types";

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

export function getStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function storeTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(CODE_VERIFIER_KEY);
}

export function isTokenExpired(tokens: StoredTokens): boolean {
  return Date.now() >= tokens.expiresAt - 60000; // 1 minute buffer
}

export async function initiateLogin(): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing Spotify configuration");
  }

  const codeVerifier = generateRandomString(64);
  localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);

  if (!clientId || !redirectUri || !codeVerifier) {
    throw new Error("Missing required parameters for token exchange");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data: TokenResponse = await response.json();
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  storeTokens(tokens);
  localStorage.removeItem(CODE_VERIFIER_KEY);

  return tokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing Spotify client ID");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Failed to refresh token");
  }

  const data: TokenResponse = await response.json();
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  storeTokens(tokens);
  return tokens;
}

async function fetchWithAuth<T>(endpoint: string, accessToken: string): Promise<T | null> {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  return response.json();
}

export async function getCurrentUser(accessToken: string): Promise<SpotifyUser> {
  const user = await fetchWithAuth<SpotifyUser>("/me", accessToken);
  if (!user) throw new Error("Failed to fetch user");
  return user;
}

export async function getCurrentPlayback(accessToken: string): Promise<PlaybackState | null> {
  return fetchWithAuth<PlaybackState>("/me/player/currently-playing", accessToken);
}

export async function play(accessToken: string): Promise<void> {
  await fetch(`${SPOTIFY_API_BASE}/me/player/play`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function pause(accessToken: string): Promise<void> {
  await fetch(`${SPOTIFY_API_BASE}/me/player/pause`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
