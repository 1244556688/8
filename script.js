const playlist = [
  { name: "歌曲1", url: "music1.mp3", cover: "cover1.jpg" },
  { name: "歌曲2", url: "music2.mp3", cover: "cover2.jpg" },
  { name: "歌曲3", url: "music3.mp3", cover: "cover3.jpg" }
];

const audio = new Audio();
let current = 0;

const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const progressBar = document.getElementById("progress-bar");
const nowPlayingEl = document.getElementById("now-playing");
const timeDisplay = document.getElementById("time-display");
const coverImage = document.getElementById("cover-image");

function loadCurrentTrack() {
  const track = playlist[current];
  audio.src = track.url;
  nowPlayingEl.textContent = `正在播放: ${track.name}`;
  coverImage.src = track.cover || "default-cover.jpg";
}

function updateTimeDisplay(currentTime, duration) {
  function fmt(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  timeDisplay.textContent = `${fmt(currentTime)} / ${fmt(duration)}`;
}

playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸️";
  } else {
    audio.pause();
    playBtn.textContent = "▶️";
  }
});

prevBtn.addEventListener("click", () => {
  current = (current - 1 + playlist.length) % playlist.length;
  loadCurrentTrack();
  audio.play();
  playBtn.textContent = "⏸️";
});

nextBtn.addEventListener("click", () => {
  current = (current + 1) % playlist.length;
  loadCurrentTrack();
  audio.play();
  playBtn.textContent = "⏸️";
});

audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    progressBar.value = (audio.currentTime / audio.duration) * 100;
    updateTimeDisplay(audio.currentTime, audio.duration);
  }
});

progressBar.addEventListener("input", () => {
  if (audio.duration) {
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  }
});

audio.addEventListener("ended", () => {
  nextBtn.click();
});

// 預設載入第一首
loadCurrentTrack();
