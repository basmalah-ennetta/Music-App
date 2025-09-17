/** @format */

// Spotify App Config
const clientId = "a85a513571c74a8c8a46647f21eba43a"; 
const redirectUri = "https://music-app-dj-bass.vercel.app/callback"; 
const scopes = [
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
];

// --- PKCE Functions ---
function generateCodeVerifier(length) {
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Save/Load from localStorage
function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getItem(key) {
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : null;
}

// --- Auth Flow ---
async function redirectToAuthCodeFlow() {
  const codeVerifier = generateCodeVerifier(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  setItem("code_verifier", codeVerifier);

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("scope", scopes.join(" "));
  url.searchParams.append("code_challenge_method", "S256");
  url.searchParams.append("code_challenge", codeChallenge);

  window.location = url.toString();
}

async function getAccessToken(code) {
  const codeVerifier = getItem("code_verifier");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return await response.json();
}

// --- Main ---
(async () => {
  const params = new URLSearchParams(window.location.search);
  let code = params.get("code");
  let token = getItem("access_token");

  if (!token) {
    if (!code) {
      await redirectToAuthCodeFlow();
    } else {
      const { access_token, expires_in, refresh_token } = await getAccessToken(code);
      setItem("access_token", access_token);
      setItem("refresh_token", refresh_token);
      token = access_token;
      window.history.replaceState({}, document.title, "/"); // Clean URL
    }
  }

  // Now `token` can be used with Spotify Web API + Playback SDK
  console.log("Access Token:", token);
})();
