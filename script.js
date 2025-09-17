document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const albumArt = document.getElementById('album-art');
    const songTitle = document.getElementById('song-title');
    const artistName = document.getElementById('artist-name');
    const searchBar = document.getElementById('search-bar');
    
    // Player state
    let isPlaying = false;
    let currentTrackIndex = 0;
    let tracks = [];
    let audio = new Audio();
    let progressUpdateInterval;


    // Predefined tracks 
    const tracksData = [
        {
            title: "peekaboo (feat. azchike)",
            artist: "Kendrick Lamar, AZ Chike",
            cover: "https://e-cdns-images.dzcdn.net/images/cover/50c2cc95-3658-9417-0d4b-831abde44ba1/250x250-000000-80-0-0.jpg",
        },
        {
            title: "1999",
            artist: "MARK",
            cover: "https://e-cdns-images.dzcdn.net/images/cover/2f0f592d80b598aeb2d31073f18c52ed/250x250-000000-80-0-0.jpg",
           
        },
        {
            title: "Training Season",
            artist: "Dua Lipa",
            cover: "https://e-cdns-images.dzcdn.net/images/cover/ZjBZ8MUnB0E/250x250-000000-80-0-0.jpg",
            
        }
    ];

    // Initialize player with predefined tracks
    function initPlayer() {
        tracks = tracksData;
        if (tracks.length > 0) {
            loadTrack(0);
        }
    }

    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }

    // Load track into player
    function loadTrack(index) {
        if (index < 0 || index >= tracks.length) return;
        
        currentTrackIndex = index;
        const track = tracks[index];
        
        // Update UI
        songTitle.textContent = track.title;
        artistName.textContent = track.artist;
        albumArt.src = track.cover;
        currentTimeEl.textContent = '0:00';
        progressBar.style.width = '0%';
        durationEl.textContent = ''; 
        
        // Set audio source to Deezer preview
        audio.src = '';
        audio.load();
        
        if (isPlaying) {
            audio.play().catch(e => {
                console.error('Playback error:', e);
                alert('Please click play to start audio');
                isPlaying = false;
                playBtn.textContent = "▶";
            });
        }
    }

    // Update progress bar
    function updateProgress() {
        if (!audio.src) return;
        
        const progressPercent = ; 
        progressBar.style.width = `${progressPercent}%`;
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }

    // Player controls
    function togglePlay() {
        if (!audio.src) return;
        
        if (isPlaying) {
            audio.pause();
            playBtn.textContent = "▶";
            playBtn.style.transform = "scale(1)";
            clearInterval(progressUpdateInterval);
        } else {
            audio.play()
                .then(() => {
                    playBtn.textContent = "⏸";
                    playBtn.style.transform = "scale(1.1)";
                    progressUpdateInterval = setInterval(updateProgress, 1000);
                })
                .catch(e => {
                    console.error('Playback error:', e);
                    alert('Playback failed. Please try again.');
                });
        }
        isPlaying = !isPlaying;
    }

    function nextTrack() {
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        loadTrack(nextIndex);
    }

    function prevTrack() {
        const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        loadTrack(prevIndex);
    }

    // Seek functionality 
    function setProgress(e) {
        if (!audio.src) return;
        
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const seekTime = ; 
        
        audio.currentTime = seekTime;
        updateProgress();
    }

    
    async function search(query) {
        try {
            const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            tracks = data.data.map(track => ({
                title: track.title,
                artist: track.artist.name,
                cover: track.album.cover_medium,
                deezerId: track.id,
                duration: ''
            }));
            
            if (tracks.length > 0) {
                loadTrack(0);
            }
        } catch (error) {
            console.error('Deezer API error:', error);
            alert('Error searching Deezer. Please try again.');
        }
    }

    // Event listeners
    playBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    progressContainer.addEventListener('click', setProgress);
    
    // Track ended handler
    audio.addEventListener('ended', nextTrack);

    // Click on track items
    document.querySelectorAll('.track-item').forEach((item, index) => {
        item.addEventListener('click', function() {
            if (tracks.length > 0) {
                loadTrack(index);
                if (!isPlaying) {
                    togglePlay();
                }
            }
        });
    });

    // Search functionality
    searchBar.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            searchDeezer(this.value);
        }
    });

    // Initialize with predefined tracks
    initPlayer();
});