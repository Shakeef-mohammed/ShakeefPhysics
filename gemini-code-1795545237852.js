/* ================= 1. THEME TOGGLE (LIGHT / DARK MODE) ================= */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const htmlEl = document.documentElement;

const savedTheme = localStorage.getItem('shakeef_theme') || 'light';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
});

function setTheme(theme) {
  htmlEl.setAttribute('data-theme', theme);
  localStorage.setItem('shakeef_theme', theme);
  themeIcon.className = theme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
}

/* ================= 2. 3-BAR RESPONSIVE NAVIGATION ================= */
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');

hamburgerBtn.addEventListener('click', () => {
  hamburgerBtn.classList.toggle('active');
  navMenu.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburgerBtn.classList.remove('active');
    navMenu.classList.remove('active');
  });
});

/* ================= 3. COURSE LANDSCAPE SLIDER ================= */
const courseSlider = document.getElementById('courseSlider');
document.getElementById('slideLeft').addEventListener('click', () => {
  courseSlider.scrollBy({ left: -360, behavior: 'smooth' });
});
document.getElementById('slideRight').addEventListener('click', () => {
  courseSlider.scrollBy({ left: 360, behavior: 'smooth' });
});

/* ================= 4. SMART CUSTOM YOUTUBE PLAYER & WATCH TRACKER ================= */
let player;
let watchSeconds = 0;
let currentLessonTitle = '01. Introduction to Vectors & Scalars';
let currentVideoId = 'M7lc1UVf-VE';
let trackerInterval = null;

// Called automatically by YouTube IFrame API
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    videoId: currentVideoId,
    playerVars: {
      controls: 0,        // Hide default YouTube controls
      modestbranding: 1,  // Minimize YouTube branding
      rel: 0,             // Disable unrelated suggested videos
      showinfo: 0,
      iv_load_policy: 3,  // Hide annotations
      disablekb: 1,
      fs: 0
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady() {
  setInterval(updateProgressUI, 500);
}

function onPlayerStateChange(event) {
  const playBtnIcon = document.querySelector('#playPauseBtn i');
  if (event.data === YT.PlayerState.PLAYING) {
    playBtnIcon.className = 'bx bx-pause';
    startWatchTracker();
  } else {
    playBtnIcon.className = 'bx bx-play';
    stopWatchTracker();
  }
}

// Custom Player Controls
document.getElementById('playPauseBtn').addEventListener('click', () => {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
});

document.getElementById('rewindBtn').addEventListener('click', () => {
  if (!player) return;
  player.seekTo(Math.max(0, player.getCurrentTime() - 10), true);
});

document.getElementById('forwardBtn').addEventListener('click', () => {
  if (!player) return;
  player.seekTo(player.getCurrentTime() + 10, true);
});

document.getElementById('speedSelect').addEventListener('change', (e) => {
  if (!player) return;
  player.setPlaybackRate(parseFloat(e.target.value));
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const container = document.getElementById('customVideoBox');
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
});

document.getElementById('progressArea').addEventListener('click', (e) => {
  if (!player) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const clickRatio = (e.clientX - rect.left) / rect.width;
  player.seekTo(clickRatio * player.getDuration(), true);
});

function updateProgressUI() {
  if (!player || typeof player.getCurrentTime !== 'function') return;
  const current = player.getCurrentTime() || 0;
  const duration = player.getDuration() || 0;

  document.getElementById('currentTime').textContent = formatTime(current);
  document.getElementById('totalDuration').textContent = formatTime(duration);

  if (duration > 0) {
    const pct = Math.min(100, Math.round((current / duration) * 100));
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('completionPct').textContent = pct + '%';
    document.getElementById('adminCurrentPct').textContent = pct + '%';
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Track actual student watch time & sync with MySQL API
function startWatchTracker() {
  if (trackerInterval) return;
  trackerInterval = setInterval(() => {
    watchSeconds++;
    const mins = Math.floor(watchSeconds / 60);
    const secs = watchSeconds % 60;
    const formatted = `${mins}m ${String(secs).padStart(2, '0')}s`;

    document.getElementById('liveWatchTime').textContent = formatted;
    document.getElementById('adminCurrentWatch').textContent = formatted;

    // Every 15 seconds, send watch telemetry to MySQL backend (api/track_watch.php)
    if (watchSeconds % 15 === 0) {
      syncWatchTimeToMySQL(currentVideoId, currentLessonTitle, watchSeconds);
    }
  }, 1000);
}

function stopWatchTracker() {
  clearInterval(trackerInterval);
  trackerInterval = null;
}

function syncWatchTimeToMySQL(videoId, title, secondsWatched) {
  // Connects to your PHP/Node MySQL API when hosted on a server
  fetch('api/track_watch.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: localStorage.getItem('shakeef_student') || 'GUEST',
      video_id: videoId,
      lesson_title: title,
      watched_seconds: secondsWatched
    })
  }).catch(() => {
    // Silent fallback when running statically on GitHub Pages
  });
}

// Switch Lesson in Playlist
function loadVideo(videoId, title, btnEl) {
  currentVideoId = videoId;
  currentLessonTitle = title;
  watchSeconds = 0;

  document.querySelectorAll('.lesson-item').forEach(el => el.classList.remove('active'));
  btnEl.classList.add('active');

  document.getElementById('adminCurrentLesson').textContent = title;
  document.getElementById('liveWatchTime').textContent = '0m 00s';

  // Update AI Lesson Summary dynamically
  const summaries = {
    'M7lc1UVf-VE': '<strong>Key Formula:</strong> Resultant vector $R = \\sqrt{A^2 + B^2 + 2AB\\cos\\theta}$. Resolve perpendicular components first!',
    'aqz-KE-bpKQ': '<strong>Key Formula:</strong> $F_{net} = ma$ and Limiting Friction $f_s = \\mu_s R$. Always draw a clean Free Body Diagram.',
    'ScMzIvxBSi4': '<strong>Key Formula:</strong> Ohm\'s Law $V = IR$ & Kirchhoff\'s Junction Rule $\\sum I_{in} = \\sum I_{out}$.'
  };
  document.getElementById('aiSummaryText').innerHTML = summaries[videoId] || summaries['M7lc1UVf-VE'];

  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(videoId);
  }
}

document.getElementById('aiNoteBtn').addEventListener('click', () => {
  document.getElementById('aiNotesBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function toggleAdminAnalytics() {
  const panel = document.getElementById('adminAnalyticsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

/* ================= 5. AI PHYSICS CHATBOT ================= */
const chatbotWindow = document.getElementById('chatbotWindow');
document.getElementById('aiChatToggle').addEventListener('click', () => {
  chatbotWindow.classList.toggle('open');
});

function toggleChatbot(forceState) {
  if (forceState) chatbotWindow.classList.add('open');
  else chatbotWindow.classList.remove('open');
}

function sendQuickPrompt(text) {
  document.getElementById('chatInput').value = text;
  handleChatSubmit(new Event('submit'));
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const userText = input.value.trim();
  if (!userText) return;

  appendMessage(userText, 'user');
  input.value = '';

  setTimeout(() => {
    const reply = generatePhysicsAIReply(userText.toLowerCase());
    appendMessage(reply, 'bot');
  }, 500);
}

function appendMessage(text, sender) {
  const chatBody = document.getElementById('chatBody');
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.innerHTML = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function generatePhysicsAIReply(q) {
  if (q.includes('newton')) {
    return "<b>Newton's 2nd Law:</b> The rate of change of momentum is directly proportional to the applied unbalanced force: <b>F = ma</b> (for constant mass).";
  }
  if (q.includes('projectile') || q.includes('range')) {
    return "<b>Projectile Range Formula:</b><br>R = (u² sin 2θ) / g<br>Maximum range occurs at <b>θ = 45°</b>!";
  }
  if (q.includes('2027') || q.includes('fee') || q.includes('class')) {
    return "<b>2027 A/L Physics Theory:</b> Held every Saturday at 8:00 AM (Live + Smart Recording). Monthly fee is <b>LKR 2,500</b>. Click 'Register' at the top to join!";
  }
  return "Great question! For detailed step-by-step solving on <b>\"" + q + "\"</b>, check our AI Lesson Notes or message Shakeef Sir directly on WhatsApp using the green button below.";
}

/* ================= 6. AUTH MODAL (SIGN IN / REGISTER) ================= */
function openAuthModal(tab) {
  document.getElementById('authModal').classList.add('open');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

function handleAuthSubmit(e, type) {
  e.preventDefault();
  const userName = type === 'login'
    ? document.getElementById('loginUser').value
    : document.getElementById('regName').value;

  localStorage.setItem('shakeef_student', userName);
  document.getElementById('studentWatermark').textContent = `STUDENT: ${userName.toUpperCase()} • Shakeef Physics`;
  closeAuthModal();
  alert(`Welcome to Shakeef Physics, ${userName}! Your student session is now active.`);
}

/* ================= 7. INTERACTIVE PROJECTILE SIMULATION ================= */
function openSimModal() {
  document.getElementById('simModal').classList.add('open');
  drawProjectile();
}

function closeSimModal() {
  document.getElementById('simModal').classList.remove('open');
}

function drawProjectile() {
  const angleDeg = parseFloat(document.getElementById('angleSlider').value);
  const v0 = parseFloat(document.getElementById('velSlider').value);
  document.getElementById('angleVal').textContent = angleDeg;
  document.getElementById('velVal').textContent = v0;

  const g = 9.8;
  const rad = (angleDeg * Math.PI) / 180;
  const maxH = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);
  const range = (v0 * v0 * Math.sin(2 * rad)) / g;

  document.getElementById('simReadout').textContent =
    `Max Height: ${maxH.toFixed(1)} m  |  Horizontal Range: ${range.toFixed(1)} m`;

  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ground line
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 215);
  ctx.lineTo(520, 215);
  ctx.stroke();

  // Trajectory curve
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const scale = 0.72;
  for (let x = 0; x <= range; x += 2) {
    const y = x * Math.tan(rad) - (g * x * x) / (2 * v0 * v0 * Math.cos(rad) * Math.cos(rad));
    const px = 25 + x * scale;
    const py = 215 - y * scale;
    if (x === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}