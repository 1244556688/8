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
  const lyricsContainer = document.getElementById('lyricsContainer');
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

  const themeColors = [
    { bgStart: '#5a72e8', bgEnd: '#0a0f33', ballColor: '173, 216, 230' },
    { bgStart: '#e16d6d', bgEnd: '#330a0a', ballColor: '255, 99, 71' },
    { bgStart: '#6de1e1', bgEnd: '#0a3333', ballColor: '64, 224, 208' },
    { bgStart: '#e1d96d', bgEnd: '#33330a', ballColor: '255, 255, 102' },
    { bgStart: '#d46de1', bgEnd: '#330a33', ballColor: '216, 112, 255' },
  ];
  let currentThemeIndex = 0;

  function resize() {
    stage.width = window.innerWidth * devicePixelRatio;
    stage.height = window.innerHeight * devicePixelRatio;
    stage.style.width = window.innerWidth + 'px';
    stage.style.height = window.innerHeight + 'px';
    spectrumRow.width = window.innerWidth * devicePixelRatio;
    spectrumRow.height = 140 * devicePixelRatio;
    spectrumRow.style.width = window.innerWidth + 'px';
    spectrumRow.style.height = '140px';
  }
  window.addEventListener('resize', resize);
  resize();

  function setupAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
  }

  const maxFloatingBalls = 50;
  let floatingBalls = [];
  function initFloatingBalls() {
    floatingBalls = [];
    const ballColor = themeColors[currentThemeIndex].ballColor;
    for (let i = 0; i < maxFloatingBalls; i++) {
      floatingBalls.push({
        x: Math.random() * stage.width,
        y: Math.random() * stage.height,
        radius: 5 + Math.random() * 10,
        alpha: Math.random() * 0.3 + 0.1,
        speedY: 0.2 + Math.random() * 0.4,
        alphaSpeed: 0.002 + Math.random() * 0.004,
        fadingOut: Math.random() > 0.5,
        color: ballColor,
      });
    }
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    if (!analyser) {
      stageCtx.clearRect(0, 0, stage.width, stage.height);
      rowCtx.clearRect(0, 0, spectrumRow.width, spectrumRow.height);
      return;
    }
    analyser.getByteFrequencyData(dataArray);

    const bgStart = themeColors[currentThemeIndex].bgStart;
    const bgEnd = themeColors[currentThemeIndex].bgEnd;

    const bgGradient = stageCtx.createLinearGradient(0, 0, stage.width, stage.height);
    bgGradient.addColorStop(0, bgStart);
    bgGradient.addColorStop(1, bgEnd);
    stageCtx.fillStyle = bgGradient;
    stageCtx.fillRect(0, 0, stage.width, stage.height);

    const lowFreqCount = Math.floor(bufferLength * 0.1);
    let lowSum = 0;
    for (let i = 0; i < lowFreqCount; i++) {
      lowSum += dataArray[i];
    }
    const lowAvg = lowSum / lowFreqCount / 255;
    const cx = stage.width / 2;
    const cy = stage.height / 2 - 80 * devicePixelRatio;
    const baseRadius = 80 * devicePixelRatio;
    const radius = baseRadius + lowAvg * 300 * devicePixelRatio;
    const radialGradient = stageCtx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
    radialGradient.addColorStop(0, `rgba(124, 58, 237, 0.9)`);
    radialGradient.addColorStop(1, `rgba(67, 56, 202, 0.08)`);
    stageCtx.beginPath();
    stageCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    stageCtx.fillStyle = radialGradient;
    stageCtx.shadowColor = 'rgba(124, 58, 237, 0.7)';
    stageCtx.shadowBlur = 30;
    stageCtx.fill();
    stageCtx.shadowBlur = 0;

    floatingBalls.forEach(ball => {
      ball.y -= ball.speedY;
      if (ball.y + ball.radius < 0) {
        ball.y = stage.height + ball.radius;
        ball.x = Math.random() * stage.width;
      }
      if (ball.fadingOut) {
        ball.alpha -= ball.alphaSpeed;
        if (ball.alpha <= 0.1) {
          ball.alpha = 0.1;
          ball.fadingOut = false;
        }
      } else {
        ball.alpha += ball.alphaSpeed;
        if (ball.alpha >= 0.4) {
          ball.alpha = 0.4;
          ball.fadingOut = true;
        }
      }
      const grad = stageCtx.createRadialGradient(ball.x, ball.y, ball.radius * 0.1, ball.x, ball.y, ball.radius);
      grad.addColorStop(0, `rgba(${ball.color},${ball.alpha})`);
      grad.addColorStop(1, `rgba(${ball.color},0)`);
      stageCtx.beginPath();
      stageCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      stageCtx.fillStyle = grad;
      stageCtx.fill();
    });

    const barWidth = spectrumRow.width / bufferLength;
    rowCtx.clearRect(0, 0, spectrumRow.width, spectrumRow.height);
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 255 * spectrumRow.height;
      const hue = 250 - (i / bufferLength) * 250;
      rowCtx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      rowCtx.fillRect(i * barWidth, spectrumRow.height - barHeight, barWidth, barHeight);
    }
  }

  function updatePlaylistUI() {
    const buttons = playlistEl.querySelectorAll('button.track');
    buttons.forEach((btn, idx) => {
      btn.classList.toggle('active', idx === current);
    });
  }

  function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    current = index;
    audio.src = playlist[index].url;
    audio.load();
    audio.play().then(() => {
      isPlaying = true;
      toggleBtn.textContent = '暫停';
      nowPlayingEl.textContent = '正在播放: ' + playlist[index].name;
      updatePlaylistUI();
      setupAudio();
      draw();
      initFloatingBalls();
    });
  }

  toggleBtn.addEventListener('click', () => {
    if (!audio.src) return;
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      toggleBtn.textContent = '播放';
      cancelAnimationFrame(raf);
    } else {
      audio.play();
      isPlaying = true;
      toggleBtn.textContent = '暫停';
      draw();
    }
  });

  deleteBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    playlist.splice(current, 1);
    const btns = playlistEl.querySelectorAll('button.track');
    if (btns[current]) playlistEl.removeChild(btns[current]);
    if (playlist.length === 0) {
      audio.pause();
      audio.src = '';
      nowPlayingEl.textContent = '尚未播放';
      toggleBtn.textContent = '播放 / 暫停';
      cancelAnimationFrame(raf);
      return;
    }
    if (current >= playlist.length) current = 0;
    loadTrack(current);
  });

  fileInput.addEventListener('change', e => {
    for (const file of e.target.files) {
      const url = URL.createObjectURL(file);
      playlist.push({ name: file.name, url });
      const btn = document.createElement('button');
      btn.textContent = file.name;
      btn.classList.add('track');
      btn.addEventListener('click', () => loadTrack(playlist.findIndex(p => p.url === url)));
      playlistEl.appendChild(btn);
    }
    if (playlist.length === e.target.files.length) loadTrack(0);
  });

  document.addEventListener('dragover', e => {
    e.preventDefault();
    dropOverlay.style.display = 'flex';
  });
  document.addEventListener('dragleave', e => {
    e.preventDefault();
    if (e.target === dropOverlay) dropOverlay.style.display = 'none';
  });
  document.addEventListener('drop', e => {
    e.preventDefault();
    dropOverlay.style.display = 'none';
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        playlist.push({ name: file.name, url });
        const btn = document.createElement('button');
        btn.textContent = file.name;
        btn.classList.add('track');
        btn.addEventListener('click', () => loadTrack(playlist.findIndex(p => p.url === url)));
        playlistEl.appendChild(btn);
      }
    }
    if (playlist.length > 0 && !audio.src) loadTrack(0);
  });

  audio.addEventListener('ended', () => {
    if (playlist.length > 0) loadTrack((current + 1) % playlist.length);
  });

  audio.addEventListener('timeupdate', () => {
    if (!isNaN(audio.duration)) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressBar.value = progress;
      timeDisplay.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    }
  });

  progressBar.addEventListener('input', () => {
    if (!isNaN(audio.duration)) audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  initFloatingBalls();
})();
