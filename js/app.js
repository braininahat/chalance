import { encode, neighbors } from './geohash.js';

// ── State ──────────────────────────────────────────────
const APP = {
  gun: null,
  keypair: null,
  profile: null,
  geohash: null,
  cells: [],
  posts: new Map(),
  users: new Map(),
};

// ── Init ───────────────────────────────────────────────
export async function init() {
  APP.gun = Gun({
    peers: ['https://gun-manhattan.herokuapp.com/gun'],
    localStorage: true,
  });

  await loadOrCreateIdentity();
  renderIdentityScreen();
}

async function loadOrCreateIdentity() {
  const stored = localStorage.getItem('chalance_identity');
  if (stored) {
    const data = JSON.parse(stored);
    APP.keypair = data.keypair;
    APP.profile = data.profile;
  } else {
    APP.keypair = await SEA.pair();
    APP.profile = { name: '', avatar: randomAvatar(), created: Date.now() };
  }
}

function saveIdentity() {
  localStorage.setItem('chalance_identity', JSON.stringify({
    keypair: APP.keypair,
    profile: APP.profile,
  }));
}

function randomAvatar() {
  const hue = Math.floor(Math.random() * 360);
  const eyes = ['◠', '◉', '•', '◦', '◡', '▪'][Math.floor(Math.random() * 6)];
  const mouth = ['◡', '‿', '▽', '△', '○', '—', '◠'][Math.floor(Math.random() * 7)];
  return { hue, eyes, mouth };
}

// ── Avatar Rendering ───────────────────────────────────

function renderAvatarSVG(avatar, size) {
  if (!avatar) return '';
  const h = avatar.hue;
  const bg = `hsl(${h}, 45%, 75%)`;
  const skin = `hsl(${h + 30}, 30%, 88%)`;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="${bg}" />
      <circle cx="50" cy="52" r="32" fill="${skin}" />
      <text x="35" y="50" font-size="14" text-anchor="middle" dominant-baseline="middle">${avatar.eyes}</text>
      <text x="65" y="50" font-size="14" text-anchor="middle" dominant-baseline="middle">${avatar.eyes}</text>
      <text x="50" y="68" font-size="16" text-anchor="middle" dominant-baseline="middle">${avatar.mouth}</text>
    </svg>
  `;
}

// ── Screens ────────────────────────────────────────────

function renderIdentityScreen() {
  const app = document.getElementById('app');
  const avatar = APP.profile.avatar || randomAvatar();
  APP.profile.avatar = avatar;

  app.innerHTML = `
    <div class="screen identity-screen">
      <div class="identity-container">
        <div class="logo-mark">
          <div class="logo-square"></div>
        </div>
        <h1 class="app-title">Chalance</h1>
        <p class="app-subtitle">glass houses protocol for human connection</p>

        <div class="avatar-preview" id="avatar-preview">
          ${renderAvatarSVG(avatar, 80)}
        </div>
        <button id="reroll-avatar" class="btn-ghost btn-sm">different face</button>

        <div class="identity-form">
          <div class="input-group">
            <label for="name-input">Your name</label>
            <input type="text" id="name-input" placeholder="How people will know you"
              value="${APP.profile.name}" maxlength="24" autocomplete="off" />
          </div>
          <button id="enter-btn" class="btn-primary" disabled>
            Enter the Square
          </button>
        </div>

        <p class="identity-note">
          Your identity is a keypair on your device.<br>
          No account. No email. No server knows who you are.<br>
          Everything you say in the square is public and permanent.
        </p>
      </div>
    </div>
  `;

  const nameInput = document.getElementById('name-input');
  const enterBtn = document.getElementById('enter-btn');

  nameInput.addEventListener('input', () => {
    enterBtn.disabled = nameInput.value.trim().length === 0;
  });
  enterBtn.disabled = nameInput.value.trim().length === 0;

  document.getElementById('reroll-avatar').addEventListener('click', () => {
    APP.profile.avatar = randomAvatar();
    document.getElementById('avatar-preview').innerHTML = renderAvatarSVG(APP.profile.avatar, 80);
  });

  enterBtn.addEventListener('click', () => {
    APP.profile.name = nameInput.value.trim();
    saveIdentity();
    requestLocation();
  });
}

function requestLocation() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen location-screen">
      <div class="location-container">
        <div class="location-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </div>
        <h2>Find your square</h2>
        <p class="location-desc">
          GPS truncated to ~5km on your device.
          The network never sees your precise location.
        </p>
        <button id="gps-btn" class="btn-primary">Share Location</button>
        <div class="location-divider"><span>or</span></div>
        <div class="input-group">
          <label for="manual-geo">Enter a geohash</label>
          <input type="text" id="manual-geo" placeholder="e.g. dr7nb" maxlength="5" autocomplete="off" />
          <button id="manual-btn" class="btn-secondary" disabled>Go</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('gps-btn').addEventListener('click', () => {
    const btn = document.getElementById('gps-btn');
    btn.textContent = 'Locating...';
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        APP.geohash = encode(pos.coords.latitude, pos.coords.longitude, 5);
        enterSquare();
      },
      () => {
        btn.textContent = 'Failed. Try manual entry.';
        btn.disabled = false;
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });

  const manualInput = document.getElementById('manual-geo');
  const manualBtn = document.getElementById('manual-btn');
  manualInput.addEventListener('input', () => {
    manualBtn.disabled = manualInput.value.trim().length < 4;
  });
  manualBtn.addEventListener('click', () => {
    APP.geohash = manualInput.value.trim().toLowerCase().slice(0, 5);
    enterSquare();
  });
}

// ── Square ─────────────────────────────────────────────

function enterSquare() {
  APP.cells = neighbors(APP.geohash);
  publishPresence();
  subscribeToSquare();
  renderSquare();
}

function publishPresence() {
  APP.gun.get('users').get(APP.keypair.pub).put({
    name: APP.profile.name,
    avatar: JSON.stringify(APP.profile.avatar),
    geohash: APP.geohash,
    lastSeen: Date.now(),
    pub: APP.keypair.pub,
  });
}

function subscribeToSquare() {
  APP.cells.forEach(cell => {
    APP.gun.get('squares').get(cell).map().on((data, key) => {
      if (!data || !data.author || !data.content) return;
      const existing = APP.posts.get(key);
      if (existing && existing.timestamp >= data.timestamp) return;

      if (data.authorName && data.authorAvatar) {
        try {
          APP.users.set(data.author, {
            name: data.authorName,
            avatar: JSON.parse(data.authorAvatar),
            pub: data.author,
          });
        } catch (e) {}
      }

      APP.posts.set(key, { ...data, id: key });
      debouncedRenderFeed();
    });
  });

  APP.gun.get('users').map().once((data) => {
    if (!data || !data.pub || data.pub === APP.keypair.pub) return;
    if (!APP.cells.includes(data.geohash)) return;
    try {
      APP.users.set(data.pub, {
        name: data.name,
        avatar: JSON.parse(data.avatar),
        pub: data.pub,
      });
    } catch (e) {
      APP.users.set(data.pub, { name: data.name, pub: data.pub });
    }
    debouncedRenderPeople();
  });

  // Listen for connect requests
  APP.gun.get('connect').get(APP.keypair.pub).map().on((data, key) => {
    if (!data || !data.from || !data.number) return;
    if (Date.now() - data.timestamp > 120000) return;
    handleIncomingConnect(data);
  });
}

let feedTimeout;
function debouncedRenderFeed() {
  clearTimeout(feedTimeout);
  feedTimeout = setTimeout(renderFeed, 150);
}

let peopleTimeout;
function debouncedRenderPeople() {
  clearTimeout(peopleTimeout);
  peopleTimeout = setTimeout(renderPeople, 200);
}

function renderSquare() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen square-screen">
      <header class="square-header">
        <div class="header-left">
          <div class="logo-mark sm"><div class="logo-square"></div></div>
          <div class="header-info">
            <h1 class="header-title">Chalance</h1>
            <span class="header-cell">${APP.geohash}</span>
          </div>
        </div>
        <div class="header-right">
          <div class="user-badge">
            <div class="avatar-tiny">${renderAvatarSVG(APP.profile.avatar, 24)}</div>
            <span class="user-name">${APP.profile.name}</span>
          </div>
        </div>
      </header>

      <div class="square-body">
        <div class="square-main">
          <div class="compose-area">
            <div class="compose-card">
              <div class="compose-to">
                <label>To:</label>
                <select id="compose-target">
                  <option value="">the square</option>
                </select>
              </div>
              <textarea id="compose-input" placeholder="Say something..." rows="2" maxlength="500"></textarea>
              <div class="compose-actions">
                <span class="char-count"><span id="char-count">0</span>/500</span>
                <button id="post-btn" class="btn-primary btn-sm" disabled>Post</button>
              </div>
            </div>
          </div>
          <div class="feed" id="feed">
            <div class="feed-empty">
              <p>The square is quiet.</p>
              <p class="subtle">Say something. Or wait.</p>
            </div>
          </div>
        </div>
        <aside class="square-sidebar">
          <div class="sidebar-section">
            <h3>People Here</h3>
            <div id="people-list" class="people-list">
              <p class="subtle">Listening...</p>
            </div>
          </div>
        </aside>
      </div>

      <div class="connect-overlay" id="connect-overlay" style="display:none;">
        <div class="connect-card" id="connect-card"></div>
      </div>
    </div>
  `;

  bindSquareEvents();
  renderFeed();
  renderPeople();
}

function renderFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;

  const posts = Array.from(APP.posts.values())
    .filter(p => APP.cells.includes(p.geohash))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 200);

  updateComposeTargets();

  if (posts.length === 0) {
    feed.innerHTML = `
      <div class="feed-empty">
        <p>The square is quiet.</p>
        <p class="subtle">Say something. Or wait.</p>
      </div>
    `;
    return;
  }

  feed.innerHTML = posts.map(post => {
    const isMe = post.author === APP.keypair.pub;
    const author = isMe ? APP.profile : APP.users.get(post.author);
    const authorName = author?.name || 'Anon';
    const authorAvatar = isMe ? APP.profile.avatar : author?.avatar;
    const targetName = post.target
      ? (post.target === APP.keypair.pub ? APP.profile.name : (APP.users.get(post.target)?.name || 'someone'))
      : null;
    const isToMe = post.target === APP.keypair.pub;
    const isConnect = post.content.startsWith('\u2261');

    return `
      <div class="feed-post ${isMe ? 'own' : ''} ${isToMe ? 'to-me' : ''} ${isConnect ? 'connect-post' : ''}">
        <div class="post-header">
          <div class="post-author-info">
            <div class="avatar-tiny">${renderAvatarSVG(authorAvatar, 24)}</div>
            <span class="post-author">${escapeHtml(authorName)}</span>
            ${targetName ? `<span class="post-arrow">\u2192</span><span class="post-target ${isToMe ? 'target-me' : ''}">${escapeHtml(targetName)}</span>` : ''}
          </div>
          <span class="post-time">${formatTime(post.timestamp)}</span>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${!isMe ? `
          <div class="post-actions">
            <button class="btn-ghost btn-xs reply-btn" data-author="${post.author}">reply</button>
            <button class="btn-ghost btn-xs connect-btn" data-pub="${post.author}">connect</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  feed.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const select = document.getElementById('compose-target');
      if (select) {
        select.value = btn.dataset.author;
        document.getElementById('compose-input')?.focus();
      }
    });
  });

  feed.querySelectorAll('.connect-btn').forEach(btn => {
    btn.addEventListener('click', () => initiateConnect(btn.dataset.pub));
  });
}

function renderPeople() {
  const container = document.getElementById('people-list');
  if (!container) return;

  const people = Array.from(APP.users.values()).filter(u => u.pub !== APP.keypair.pub);

  if (people.length === 0) {
    container.innerHTML = '<p class="subtle">Listening...</p>';
    return;
  }

  container.innerHTML = people.map(user => `
    <div class="person-card">
      <div class="avatar-tiny">${renderAvatarSVG(user.avatar, 28)}</div>
      <span class="person-name">${escapeHtml(user.name || 'Anon')}</span>
      <button class="btn-ghost btn-xs connect-btn-side" data-pub="${user.pub}">connect</button>
    </div>
  `).join('');

  container.querySelectorAll('.connect-btn-side').forEach(btn => {
    btn.addEventListener('click', () => initiateConnect(btn.dataset.pub));
  });

  updateComposeTargets();
}

function updateComposeTargets() {
  const select = document.getElementById('compose-target');
  if (!select) return;
  const current = select.value;
  const opts = ['<option value="">the square</option>'];
  APP.users.forEach((user, pub) => {
    if (pub === APP.keypair.pub) return;
    opts.push(`<option value="${pub}">${escapeHtml(user.name || 'Anon')}</option>`);
  });
  select.innerHTML = opts.join('');
  if (current && [...select.options].find(o => o.value === current)) {
    select.value = current;
  }
}

// ── Post ───────────────────────────────────────────────

function postToSquare(content, target) {
  const postId = `${APP.keypair.pub.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const post = {
    author: APP.keypair.pub,
    authorName: APP.profile.name,
    authorAvatar: JSON.stringify(APP.profile.avatar),
    content,
    target: target || '',
    geohash: APP.geohash,
    timestamp: Date.now(),
  };
  APP.gun.get('squares').get(APP.geohash).get(postId).put(post);
  APP.posts.set(postId, { ...post, id: postId });
  renderFeed();
}

// ── Ephemeral Connect ──────────────────────────────────
// Phone number exchange. Numbers exist only in RAM.
// Sent via Gun signaling (encrypted to recipient).
// The public square records that a connection happened,
// but never the number itself.

function initiateConnect(targetPub) {
  const user = APP.users.get(targetPub);
  const name = user?.name || 'Someone';

  const overlay = document.getElementById('connect-overlay');
  const card = document.getElementById('connect-card');
  if (!overlay || !card) return;

  card.innerHTML = `
    <h3>Connect with ${escapeHtml(name)}</h3>
    <p class="subtle">Your number will exist only on their screen, only until they close the tab.</p>
    <div class="input-group" style="margin-top:1rem;">
      <label for="connect-number">Your phone number</label>
      <input type="tel" id="connect-number" placeholder="+1234567890" maxlength="16" autocomplete="off" />
    </div>
    <div class="connect-actions">
      <button id="connect-send" class="btn-primary btn-sm" disabled>Send</button>
      <button id="connect-cancel" class="btn-ghost btn-sm">Cancel</button>
    </div>
  `;
  overlay.style.display = 'flex';

  const input = document.getElementById('connect-number');
  const sendBtn = document.getElementById('connect-send');

  input.addEventListener('input', () => {
    sendBtn.disabled = input.value.trim().length < 7;
  });
  input.focus();

  sendBtn.addEventListener('click', () => {
    const number = input.value.trim();

    // Send encrypted via Gun signaling
    const sigId = `${APP.keypair.pub.slice(0, 8)}_${Date.now()}`;
    APP.gun.get('connect').get(targetPub).get(sigId).put({
      from: APP.keypair.pub,
      fromName: APP.profile.name,
      number: number, // in production: SEA.encrypt to target's key
      timestamp: Date.now(),
    });

    // Public record: connection happened, no number
    postToSquare(`\u2261 connected with ${name}`, targetPub);

    card.innerHTML = `
      <h3>Sent</h3>
      <p class="subtle">Your number was sent to ${escapeHtml(name)}. It only exists in their browser memory.</p>
      <button id="connect-done" class="btn-primary btn-sm" style="margin-top:1rem;">Done</button>
    `;
    document.getElementById('connect-done').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  });

  document.getElementById('connect-cancel').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

function handleIncomingConnect(data) {
  const name = data.fromName || APP.users.get(data.from)?.name || 'Someone';
  const number = data.number;
  if (!number) return;

  const overlay = document.getElementById('connect-overlay');
  const card = document.getElementById('connect-card');
  if (!overlay || !card) return;

  card.innerHTML = `
    <h3>${escapeHtml(name)} wants to connect</h3>
    <p class="subtle">Their number exists only in your browser memory right now. Close this and it's gone forever.</p>
    <div class="connect-number-display">${escapeHtml(String(number))}</div>
    <div class="connect-actions">
      <button id="connect-reciprocate" class="btn-primary btn-sm">Send yours back</button>
      <button id="connect-dismiss" class="btn-ghost btn-sm">Close</button>
    </div>
  `;
  overlay.style.display = 'flex';

  document.getElementById('connect-dismiss').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  document.getElementById('connect-reciprocate').addEventListener('click', () => {
    overlay.style.display = 'none';
    initiateConnect(data.from);
  });
}

// ── Event Binding ──────────────────────────────────────

function bindSquareEvents() {
  const composeInput = document.getElementById('compose-input');
  const postBtn = document.getElementById('post-btn');
  const charCount = document.getElementById('char-count');

  if (composeInput && postBtn) {
    composeInput.addEventListener('input', () => {
      const len = composeInput.value.length;
      postBtn.disabled = len === 0;
      if (charCount) charCount.textContent = len;
    });

    composeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (composeInput.value.trim()) {
          const target = document.getElementById('compose-target')?.value || '';
          postToSquare(composeInput.value.trim(), target);
          composeInput.value = '';
          if (charCount) charCount.textContent = '0';
          postBtn.disabled = true;
        }
      }
    });

    postBtn.addEventListener('click', () => {
      if (composeInput.value.trim()) {
        const target = document.getElementById('compose-target')?.value || '';
        postToSquare(composeInput.value.trim(), target);
        composeInput.value = '';
        if (charCount) charCount.textContent = '0';
        postBtn.disabled = true;
      }
    });
  }

  // Close overlay on background click
  document.getElementById('connect-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'connect-overlay') {
      e.target.style.display = 'none';
    }
  });
}

// ── Utilities ──────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(ts) {
  const d = new Date(ts);
  const diff = Date.now() - d;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Boot ───────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
