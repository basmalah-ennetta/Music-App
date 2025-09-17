/** @format */

// --- Spotify App Config ---
const clientId = "a85a513571c74a8c8a46647f21eba43a";
const redirectUri = "https://music-app-dj-bass.vercel.app/";
const scopes = [
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
];

// --- PKCE Functions ---
function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
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

function setItem(key, value) {
  if (value !== undefined && value !== null) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function getItem(key) {
  const v = localStorage.getItem(key);
  try {
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
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

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      const text = await response.text();
      console.error("Failed to parse JSON:", text);
      throw new Error("Failed to parse JSON from Spotify token response");
    }

    if (!response.ok) {
      console.error("Spotify token request failed:", response.status, data);
      throw new Error(`Spotify token request failed: ${response.status}`);
    }

    console.log("Spotify token response:", data);
    return data;
  } catch (err) {
    console.error("Error fetching Spotify access token:", err);
    throw err;
  }
}


// --- DOM Elements ---
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const progressBar = document.getElementById("progress-bar");
const progressContainer = document.getElementById("progress-container");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const albumArt = document.getElementById("album-art");
const songTitle = document.getElementById("song-title");
const artistName = document.getElementById("artist-name");
const searchBar = document.getElementById("search-bar");

// --- Player State ---
let deviceId = null;
let player = null;
let isPlaying = false;
let currentTrack = null;
let tracks = [];
let currentTrackIndex = 0;
let progressInterval = null;
let token = null;

// --- Utilities ---
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? "0" + secs : secs}`;
}

// --- Web Playback SDK ---
window.onSpotifyWebPlaybackSDKReady = () => {
  player = new Spotify.Player({
    name: "Web Player Demo",
    getOAuthToken: (cb) => {
      cb(token);
    },
    volume: 0.5,
  });

  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    console.log("Ready with device ID:", deviceId);
  });

  player.addListener("player_state_changed", (state) => {
    if (!state) return;
    currentTrack = state.track_window.current_track;
    isPlaying = !state.paused;

    songTitle.textContent = currentTrack.name;
    artistName.textContent = currentTrack.artists.map((a) => a.name).join(", ");
    albumArt.src = currentTrack.album.images[0]?.url || "";
    playBtn.textContent = isPlaying ? "⏸" : "▶";
    durationEl.textContent = formatTime(currentTrack.duration_ms);

    clearInterval(progressInterval);
    if (isPlaying) {
      progressInterval = setInterval(async () => {
        const state = await player.getCurrentState();
        if (!state) return;
        const ms = state.position;
        currentTimeEl.textContent = formatTime(ms);
        const percent =
          (ms / state.track_window.current_track.duration_ms) * 100;
        progressBar.style.width = percent + "%";
      }, 1000);
    }
  });

  player.connect();
};

// --- Playback Functions ---
async function playTrack(index) {
  if (!deviceId || !tracks[index]) return;
  currentTrackIndex = index;
  const trackUri = tracks[index].uri;

  await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      body: JSON.stringify({ uris: [trackUri] }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  isPlaying = true;
  playBtn.textContent = "⏸";
}

async function togglePlay() {
  if (!player) return;
  if (isPlaying) await player.pause();
  else await player.resume();
  isPlaying = !isPlaying;
}

async function nextTrack() {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  await playTrack(currentTrackIndex);
}

async function prevTrack() {
  currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  await playTrack(currentTrackIndex);
}

// --- Event Listeners ---
playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", nextTrack);
prevBtn.addEventListener("click", prevTrack);

progressContainer.addEventListener("click", async (e) => {
  if (!currentTrack) return;
  const width = progressContainer.clientWidth;
  const clickX = e.offsetX;
  const seekMs = (clickX / width) * currentTrack.duration_ms;
  await player.seek(seekMs);
});

// --- Search Function ---
searchBar.addEventListener("keypress", async (e) => {
  if (e.key === "Enter" && searchBar.value.trim()) {
    const query = encodeURIComponent(searchBar.value);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    tracks = data.tracks.items.map((t) => ({
      title: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      cover: t.album.images[0]?.url,
      uri: t.uri,
      duration_ms: t.duration_ms,
    }));
    if (tracks.length) playTrack(0);
  }
});

// --- Main Auth & Init ---
(async () => {
  const params = new URLSearchParams(window.location.search);
  let code = params.get("code");
  token = getItem("access_token");

  if (!token) {
    if (!code) {
      await redirectToAuthCodeFlow();
    } else {
      const { access_token } = await getAccessToken(code);
      setItem("access_token", access_token);
      token = access_token;
      window.history.replaceState({}, document.title, "/"); // Clean URL
    }
  }

  console.log("Access Token:", token);
})();
