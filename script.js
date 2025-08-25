(() => {
  const stage = document.getElementById('stage');
  const spectrumRow = document.getElementById('spectrumRow');
  const stageCtx = stage.getContext('2d');
  const rowCtx = spectrumRow.getContext('2d');
  const playlistEl = document.getElementById('playlist');
  const nowPlayingEl = document.getElementById('nowPlaying');
  const toggleBtn = document.getElementById('toggle');
  const deleteBtn = document.getElementById('delete-btn');
  const fileInput = document.getElementById('fileInput');
  const dropOverlay = document.getElementById('drop-overlay');
  const progressBar = document.getElementById('progressBar');
  const timeDisplay = document.getElementById('timeDisplay');
  
  let audioCtx, analyser, source;
  let dataArray, bufferLength;
  let audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.volume = 0.85;
  let raf;
  let playlist = [];
  let current = 0;
  let isPlaying = false;

  const resizeCanvas = () => {
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    spectrumRow.width = window.innerWidth;
    spectrumRow.height = 60;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const initAudioContext = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }
  };

  const addToPlaylist = (file) => {
    const url = URL.createObjectURL(file);
    playlist.push({ name: file.name, url });
    renderPlaylist();
    if (playlist.length === 1) loadTrack(0);
  };

  const renderPlaylist = () => {
    playlistEl.querySelectorAll('button').forEach(btn => btn.remove());
    playlist.forEach((track, i) => {
      const btn = document.createElement('button');
      btn.textContent = track.name;
      btn.onclick = () => loadTrack(i, true);
      if (i === current) btn.classList.add('active');
      playlistEl.appendChild(btn);
    });
  };

  const loadTrack = (index, play = false) => {
    current = index;
    audio.src = playlist[index].url;
    nowPlayingEl.textContent = "正在播放: " + playlist[index].name;
    renderPlaylist();
    if (play) playTrack();
  };

  const playTrack = () => {
    initAudioContext();
    if (source) source.disconnect();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    audio.play();
    isPlaying = true;
    toggleBtn.textContent = "暫停";
    animate();
  };

  const pauseTrack = () => {
    audio.pause();
    isPlaying = false;
    toggleBtn.textContent = "播放";
    cancelAnimationFrame(raf);
  };

  toggleBtn.onclick = () => {
    if (!playlist.length) return;
    isPlaying ? pauseTrack() : playTrack();
  };

  deleteBtn.onclick = () => {
    if (!playlist.length) return;
    playlist.splice(current, 1);
    if (playlist.length === 0) {
      pauseTrack();
      audio.src = "";
      nowPlayingEl.textContent = "尚未播放";
      renderPlaylist();
    } else {
      loadTrack(current % playlist.length, true);
    }
  };

  audio.onended = () => {
    if (playlist.length) {
      loadTrack((current + 1) % playlist.length, true);
    }
  };

  fileInput.onchange = (e) => {
    [...e.target.files].forEach(addToPlaylist);
  };

  document.addEventListener('dragover', e => {
    e.preventDefault();
    dropOverlay.classList.add('visible');
  });
  document.addEventListener('dragleave', e => {
    e.preventDefault();
    dropOverlay.classList.remove('visible');
  });
  document.addEventListener('drop', e => {
    e.preventDefault();
    dropOverlay.classList.remove('visible');
    [...e.dataTransfer.files].forEach(addToPlaylist);
  });

  const updateProgress = () => {
    if (audio.duration) {
      progressBar.value = (audio.currentTime / audio.duration) * 100;
      const format = t => {
        const m = Math.floor(t / 60).toString().padStart(2,'0');
        const s = Math.floor(t % 60).toString().padStart(2,'0');
        return `${m}:${s}`;
      };
      timeDisplay.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}`;
    }
  };
  audio.ontimeupdate = updateProgress;

  progressBar.oninput = () => {
    if (audio.duration) {
      audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
  };

  const animate = () => {
    raf = requestAnimationFrame(animate);
    analyser.getByteFrequencyData(dataArray);
    stageCtx.clearRect(0,0,stage.width,stage.height);
    const barWidth = (stage.width / bufferLength) * 2.5;
    let x = 0;
    for (let i=0; i<bufferLength; i++) {
      const barHeight = dataArray[i];
      stageCtx.fillStyle = `rgb(${barHeight+100},50,150)`;
      stageCtx.fillRect(x, stage.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
    rowCtx.clearRect(0,0,spectrumRow.width,spectrumRow.height);
    const rw = spectrumRow.width / bufferLength;
    for (let i=0; i<bufferLength; i++) {
      const h = dataArray[i] / 2;
      rowCtx.fillStyle = `rgb(50,200,${h+100})`;
      rowCtx.fillRect(i*rw, spectrumRow.height-h, rw-1, h);
    }
  };
})();
