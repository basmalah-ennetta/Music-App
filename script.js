/** @format */

const clientId = "a85a513571c74a8c8a46647f21eba43a"; // Replace with your Spotify App Client ID
const redirectUri = "https://music-app-dj-bass.vercel.app/callback"; // Current page as redirect
const scopes = [
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

// --- Token Handling ---
function getTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

let token = getTokenFromUrl();
if (!token) {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes)}`;
  window.location.href = authUrl;
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

let deviceId = null;
let player = null;
let isPlaying = false;
let currentTrack = null;
let tracks = [];
let currentTrackIndex = 0;
let progressInterval = null;

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
