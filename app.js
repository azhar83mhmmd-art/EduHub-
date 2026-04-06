/* ============================================================
   EDUHUB — app.js
   Full Frontend Logic: Auth, Roles, Guest Mode, AI, Realtime
   Supabase Integration
   ============================================================ */

// ===== SUPABASE CONFIG =====
// 🔧 GANTI dengan kredensial Supabase project kamu
const SUPABASE_URL = 'https://pzqlqdkkcadqhlgogmtt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6pCUSo9rzhaMzw4PoZwBWA_8TcbLX_D';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== ADMIN SECRET CODE =====
const OPERATOR_CODE = 'operator';

// ===== STATE =====
let currentUser = null;
let currentRole = null; // 'guest' | 'siswa' | 'admin'
let allMateri = [];
let favorites = new Set();
let realtimeChannel = null;

// ===== DEMO DATA (digunakan jika Supabase belum dikonfigurasi) =====
const DEMO_MATERI = [
  { id: '1', judul: 'Trigonometri Dasar', deskripsi: 'Pengenalan fungsi sin, cos, tan dan aplikasinya dalam kehidupan sehari-hari.', kelas: '10', mapel: 'matematika', tipe: 'pdf', url: 'https://www.africau.edu/images/default/sample.pdf', views: 324, downloads: 89, created_at: new Date().toISOString() },
  { id: '2', judul: 'Hukum Newton & Gravitasi', deskripsi: 'Memahami hukum-hukum Newton dan konsep gaya gravitasi universal.', kelas: '10', mapel: 'fisika', tipe: 'pdf', url: 'https://www.africau.edu/images/default/sample.pdf', views: 512, downloads: 142, created_at: new Date().toISOString() },
  { id: '3', judul: 'Ikatan Kimia & Tabel Periodik', deskripsi: 'Jenis-jenis ikatan kimia dan cara membaca tabel periodik unsur.', kelas: '10', mapel: 'kimia', tipe: 'ppt', url: '', views: 198, downloads: 67, created_at: new Date().toISOString() },
  { id: '4', judul: 'Sel & Organisme Hidup', deskripsi: 'Struktur sel prokariot dan eukariot serta fungsi organel-organelnya.', kelas: '11', mapel: 'biologi', tipe: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', views: 445, downloads: 0, created_at: new Date().toISOString() },
  { id: '5', judul: 'Integral & Aplikasinya', deskripsi: 'Teknik-teknik integrasi dan penerapannya dalam menghitung luas dan volume.', kelas: '12', mapel: 'matematika', tipe: 'pdf', url: 'https://www.africau.edu/images/default/sample.pdf', views: 678, downloads: 201, created_at: new Date().toISOString() },
  { id: '6', judul: 'Teks Argumentasi Bahasa Indonesia', deskripsi: 'Struktur dan ciri-ciri teks argumentasi serta cara menulisnya dengan baik.', kelas: '11', mapel: 'bahasa_indonesia', tipe: 'ppt', url: '', views: 287, downloads: 95, created_at: new Date().toISOString() },
  { id: '7', judul: 'Present Perfect Tense', deskripsi: 'Penggunaan present perfect tense dalam komunikasi dan penulisan bahasa Inggris.', kelas: '10', mapel: 'bahasa_inggris', tipe: 'pdf', url: 'https://www.africau.edu/images/default/sample.pdf', views: 356, downloads: 112, created_at: new Date().toISOString() },
  { id: '8', judul: 'Reformasi 1998 & Demokrasi', deskripsi: 'Perjalanan reformasi Indonesia 1998 dan dampaknya bagi demokrasi bangsa.', kelas: '12', mapel: 'sejarah', tipe: 'pdf', url: 'https://www.africau.edu/images/default/sample.pdf', views: 431, downloads: 134, created_at: new Date().toISOString() },
];

const DEMO_MODE = SUPABASE_URL.includes('YOUR_PROJECT');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  setupAuthTabs();
  await checkSession();
  await loadMateri();
  renderTrending();
});

// ===== SESSION CHECK =====
async function checkSession() {
  if (DEMO_MODE) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await setUser(session.user);
      setupRealtime();
    } else {
      // Check localStorage for guest mode
      const guest = localStorage.getItem('eduhub_guest');
      if (guest) setGuestMode();
    }
  } catch (e) {
    console.warn('Supabase not configured, running in demo mode');
  }
}

// ===== AUTH MODAL =====
function openAuthModal(tab = 'signin') {
  document.getElementById('authModal').classList.remove('hidden');
  if (tab === 'signup') switchAuthTab('signup');
  else switchAuthTab('signin');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  clearAuthErrors();
}
function setupAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('tabSignin').classList.toggle('hidden', tab !== 'signin');
  document.getElementById('tabSignup').classList.toggle('hidden', tab !== 'signup');
}
function clearAuthErrors() {
  document.getElementById('signinError').classList.add('hidden');
  document.getElementById('signupError').classList.add('hidden');
}

// ===== SIGN IN =====
async function handleSignIn() {
  const email = document.getElementById('signinEmail').value.trim();
  const password = document.getElementById('signinPassword').value;
  const errEl = document.getElementById('signinError');
  if (!email || !password) return showError(errEl, 'Email dan password wajib diisi');

  if (DEMO_MODE) {
    // Demo: simulate login
    const fakeUser = { id: 'demo-1', email, user_metadata: { name: email.split('@')[0] } };
    await setUser(fakeUser, 'siswa');
    closeAuthModal();
    showNotification('Login berhasil! (Demo Mode)', 'success');
    return;
  }

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return showError(errEl, error.message);
    await setUser(data.user);
    closeAuthModal();
    showNotification('Selamat datang kembali! 🎉', 'success');
    setupRealtime();
  } catch (e) {
    showError(errEl, 'Terjadi kesalahan. Coba lagi.');
  }
}

// ===== SIGN UP =====
async function handleSignUp() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const code = document.getElementById('signupCode').value.trim();
  const errEl = document.getElementById('signupError');

  if (!name || !email || !password) return showError(errEl, 'Semua field wajib diisi');
  if (password.length < 6) return showError(errEl, 'Password minimal 6 karakter');

  const role = code === OPERATOR_CODE ? 'admin' : 'siswa';

  if (DEMO_MODE) {
    const fakeUser = { id: 'demo-1', email, user_metadata: { name } };
    await setUser(fakeUser, role);
    closeAuthModal();
    showNotification(`Akun berhasil dibuat! Role: ${role} 🎉`, 'success');
    return;
  }

  try {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name, role } }
    });
    if (error) return showError(errEl, error.message);

    // Insert profile
    if (data.user) {
      await sb.from('profiles').insert({
        id: data.user.id,
        nama: name,
        role: role,
        is_admin: role === 'admin'
      });
      await setUser(data.user, role);
      closeAuthModal();
      showNotification(`Selamat datang, ${name}! Role: ${role} 🎉`, 'success');
      setupRealtime();
    }
  } catch (e) {
    showError(errEl, 'Gagal membuat akun. Coba lagi.');
  }
}

// ===== LOGOUT =====
async function handleLogout() {
  if (!DEMO_MODE) await sb.auth.signOut();
  if (realtimeChannel) sb.removeChannel(realtimeChannel);
  currentUser = null;
  currentRole = null;
  localStorage.removeItem('eduhub_guest');
  favorites.clear();
  updateNavbar();
  showPage('home');
  showNotification('Berhasil keluar. Sampai jumpa! 👋', 'info');
}

// ===== GUEST MODE =====
function enterGuestMode() {
  currentUser = null;
  currentRole = 'guest';
  localStorage.setItem('eduhub_guest', '1');
  closeAuthModal();
  updateNavbar();
  showPage('materi');
  showNotification('Kamu masuk sebagai Tamu. Beberapa fitur terbatas.', 'warning');
}
function setGuestMode() {
  currentRole = 'guest';
  updateNavbar();
}

// ===== SET USER =====
async function setUser(user, overrideRole = null) {
  currentUser = user;
  if (overrideRole) {
    currentRole = overrideRole;
  } else if (!DEMO_MODE) {
    // Fetch role from profiles
    try {
      const { data } = await sb.from('profiles').select('role').eq('id', user.id).single();
      currentRole = data?.role || user.user_metadata?.role || 'siswa';
    } catch {
      currentRole = user.user_metadata?.role || 'siswa';
    }
  } else {
    currentRole = 'siswa';
  }
  localStorage.removeItem('eduhub_guest');
  updateNavbar();
  await loadUserData();
}

// ===== UPDATE NAVBAR =====
function updateNavbar() {
  const navAuth = document.getElementById('navAuth');
  const navUser = document.getElementById('navUser');
  const navGuest = document.getElementById('navGuest');

  navAuth.classList.add('hidden');
  navUser.classList.add('hidden');
  navGuest.classList.add('hidden');

  if (currentRole === 'guest') {
    navGuest.classList.remove('hidden');
    return;
  }

  if (currentUser) {
    navUser.classList.remove('hidden');
    const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User';
    document.getElementById('userDisplayName').textContent = name;
    document.getElementById('userAvatar').textContent = name[0].toUpperCase();
    const badge = document.getElementById('userRoleBadge');
    badge.textContent = currentRole;
    badge.className = `role-badge ${currentRole}`;
    document.getElementById('adminMenuItems').classList.toggle('hidden', currentRole !== 'admin');
    // Show upload button for admin in materi page
    document.getElementById('uploadBtn').classList.toggle('hidden', currentRole !== 'admin');
  } else {
    navAuth.classList.remove('hidden');
  }
}

// ===== USER MENU TOGGLE =====
function toggleUserMenu() {
  document.getElementById('userMenu').classList.toggle('hidden');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-pill')) {
    document.getElementById('userMenu')?.classList.add('hidden');
  }
});

// ===== LOAD USER DATA =====
async function loadUserData() {
  if (!currentUser || DEMO_MODE) {
    updateDashboardStats(3, 5, 8);
    return;
  }
  try {
    const [{ count: dl }, { count: fav }, { count: hist }] = await Promise.all([
      sb.from('history').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      sb.from('favorit').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      sb.from('history').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id),
    ]);
    updateDashboardStats(dl || 0, fav || 0, hist || 0);
    // Load favorites
    const { data: favData } = await sb.from('favorit').select('materi_id').eq('user_id', currentUser.id);
    if (favData) favData.forEach(f => favorites.add(f.materi_id));
  } catch (e) {}
}

function updateDashboardStats(downloads, favs, hist) {
  document.getElementById('statDownloads').textContent = downloads;
  document.getElementById('statFavorites').textContent = favs;
  document.getElementById('statHistory').textContent = hist;
  const name = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Pengguna';
  document.getElementById('dashboardWelcome').textContent = `Halo, ${name}! 👋 Semangat belajar hari ini.`;
}

// ===== LOAD MATERI =====
async function loadMateri() {
  if (DEMO_MODE) {
    allMateri = DEMO_MATERI;
    renderMateri(allMateri);
    return;
  }
  try {
    const { data, error } = await sb.from('materi').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allMateri = data || [];
    renderMateri(allMateri);
  } catch (e) {
    allMateri = DEMO_MATERI;
    renderMateri(allMateri);
  }
}

// ===== RENDER MATERI =====
function renderMateri(list) {
  const grid = document.getElementById('materiGrid');
  if (!list.length) {
    grid.innerHTML = '<p class="empty-state">Tidak ada materi ditemukan</p>';
    return;
  }
  grid.innerHTML = list.map(m => materiCardHTML(m)).join('');
}

function renderTrending() {
  const sorted = [...DEMO_MATERI].sort((a,b) => b.views - a.views).slice(0,4);
  const grid = document.getElementById('trendingGrid');
  grid.innerHTML = sorted.map(m => materiCardHTML(m)).join('');
}

function materiCardHTML(m) {
  const icons = { matematika: '📐', fisika: '⚛️', kimia: '🧪', biologi: '🌿', bahasa_indonesia: '📖', bahasa_inggris: '🌍', sejarah: '🏛️' };
  const icon = icons[m.mapel] || '📚';
  const isFav = favorites.has(m.id);
  return `
    <div class="materi-card" onclick="openMateriDetail('${m.id}')">
      <div class="materi-thumb">
        ${icon}
        <span class="materi-type-badge type-${m.tipe}">${m.tipe.toUpperCase()}</span>
      </div>
      <div class="materi-body">
        <div class="materi-meta">
          <span class="materi-tag">Kelas ${m.kelas}</span>
          <span class="materi-tag">${formatMapel(m.mapel)}</span>
        </div>
        <div class="materi-title">${m.judul}</div>
        <div class="materi-desc">${m.deskripsi}</div>
        <div class="materi-footer">
          <div class="materi-stats">
            <span>👁 ${m.views || 0}</span>
            <span>📥 ${m.downloads || 0}</span>
          </div>
          <div class="materi-actions" onclick="event.stopPropagation()">
            <button class="icon-btn ${isFav ? 'fav-active' : ''}" onclick="toggleFavorite('${m.id}')" title="Favorit">❤️</button>
            <button class="icon-btn" onclick="downloadMateri('${m.id}')" title="Download">📥</button>
          </div>
        </div>
      </div>
    </div>`;
}

function formatMapel(mapel) {
  const map = { matematika: 'Matematika', fisika: 'Fisika', kimia: 'Kimia', biologi: 'Biologi', bahasa_indonesia: 'Bhs. Indonesia', bahasa_inggris: 'Bhs. Inggris', sejarah: 'Sejarah' };
  return map[mapel] || mapel;
}

// ===== FILTER MATERI =====
function filterMateri() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const kelas = document.getElementById('filterKelas').value;
  const mapel = document.getElementById('filterMapel').value;
  const filtered = allMateri.filter(m =>
    (!q || m.judul.toLowerCase().includes(q) || m.deskripsi.toLowerCase().includes(q)) &&
    (!kelas || m.kelas === kelas) &&
    (!mapel || m.mapel === mapel)
  );
  renderMateri(filtered);
}

// ===== OPEN MATERI DETAIL =====
function openMateriDetail(id) {
  const m = allMateri.find(x => x.id === id);
  if (!m) return;

  // Track view
  trackView(id);

  const icons = { matematika: '📐', fisika: '⚛️', kimia: '🧪', biologi: '🌿', bahasa_indonesia: '📖', bahasa_inggris: '🌍', sejarah: '🏛️' };
  const icon = icons[m.mapel] || '📚';
  const isFav = favorites.has(m.id);
  const canDownload = currentRole === 'siswa' || currentRole === 'admin';
  const canComment = currentUser && currentRole !== 'guest';

  let previewHTML = '';
  if (m.url) {
    if (m.tipe === 'video') {
      previewHTML = `<div class="preview-container"><video controls><source src="${m.url}" type="video/mp4">Browser tidak mendukung video.</video></div>`;
    } else if (m.tipe === 'pdf' || m.tipe === 'ppt') {
      previewHTML = `<div class="preview-container"><iframe src="${m.tipe === 'pdf' ? m.url : `https://docs.google.com/viewer?url=${encodeURIComponent(m.url)}&embedded=true`}"></iframe></div>`;
    }
  } else {
    previewHTML = `<div class="preview-container" style="padding:3rem;text-align:center;color:var(--text-secondary)">📄 Preview tidak tersedia untuk materi ini.</div>`;
  }

  const commentsHTML = canComment ? `
    <div class="comments-section">
      <h3>💬 Komentar</h3>
      <div class="comment-form">
        <input type="text" id="commentInput" placeholder="Tulis komentar..." />
        <button class="btn-primary" onclick="submitComment('${m.id}')">Kirim</button>
      </div>
      <div id="commentsList">
        <div style="color:var(--text-muted);font-size:0.85rem;padding:1rem 0">Memuat komentar...</div>
      </div>
    </div>` : `
    <div class="comments-section">
      <h3>💬 Komentar</h3>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:1.25rem;text-align:center;color:var(--text-secondary);font-size:0.875rem">
        🔒 <a href="#" onclick="openAuthModal()" style="color:var(--accent)">Login</a> untuk menulis komentar
      </div>
    </div>`;

  document.getElementById('modalContent').innerHTML = `
    <div class="detail-hero">
      <div class="detail-icon">${icon}</div>
      <div class="detail-info">
        <h1>${m.judul}</h1>
        <div class="detail-meta">
          <span class="materi-tag">Kelas ${m.kelas}</span>
          <span class="materi-tag">${formatMapel(m.mapel)}</span>
          <span class="materi-type-badge type-${m.tipe}" style="position:static">${m.tipe.toUpperCase()}</span>
        </div>
        <p class="detail-desc">${m.deskripsi}</p>
        <div class="detail-actions">
          ${canDownload
            ? `<button class="btn-primary" onclick="downloadMateri('${m.id}')">📥 Download</button>`
            : `<button class="btn-ghost" onclick="showLoginRequired('download')">🔒 Download (Login Dulu)</button>`}
          <button class="btn-ghost ${isFav ? 'fav-active' : ''}" onclick="toggleFavorite('${m.id}')">❤️ Favorit</button>
          ${currentRole === 'admin' ? `<button class="btn-danger" onclick="deleteMateri('${m.id}')">🗑 Hapus</button>` : ''}
        </div>
      </div>
    </div>
    ${previewHTML}
    ${commentsHTML}`;

  document.getElementById('materiModal').classList.remove('hidden');
  if (canComment) loadComments(m.id);
}

function closeMateriModal() {
  document.getElementById('materiModal').classList.add('hidden');
}

// ===== DOWNLOAD =====
async function downloadMateri(id) {
  if (currentRole === 'guest') {
    showLoginRequired('download');
    return;
  }
  if (!currentUser && currentRole !== 'guest') {
    openAuthModal();
    return;
  }
  const m = allMateri.find(x => x.id === id);
  if (!m) return;

  showNotification(`📥 Mengunduh "${m.judul}"...`, 'info');
  if (!DEMO_MODE && currentUser) {
    await sb.from('history').insert({ user_id: currentUser.id, materi_id: id, action: 'download' });
    await sb.from('materi').update({ downloads: (m.downloads || 0) + 1 }).eq('id', id);
    m.downloads = (m.downloads || 0) + 1;
  }
  if (m.url) window.open(m.url, '_blank');
  else showNotification('File tidak tersedia untuk diunduh', 'warning');
}

// ===== TRACK VIEW =====
async function trackView(id) {
  const m = allMateri.find(x => x.id === id);
  if (m) m.views = (m.views || 0) + 1;
  if (!DEMO_MODE && currentUser) {
    await sb.from('history').insert({ user_id: currentUser.id, materi_id: id, action: 'view' }).catch(()=>{});
  }
}

// ===== TOGGLE FAVORITE =====
async function toggleFavorite(id) {
  if (!currentUser || currentRole === 'guest') {
    showLoginRequired('favorit');
    return;
  }
  if (favorites.has(id)) {
    favorites.delete(id);
    showNotification('Dihapus dari favorit', 'info');
    if (!DEMO_MODE) await sb.from('favorit').delete().eq('user_id', currentUser.id).eq('materi_id', id);
  } else {
    favorites.add(id);
    showNotification('Ditambahkan ke favorit ❤️', 'success');
    if (!DEMO_MODE) await sb.from('favorit').insert({ user_id: currentUser.id, materi_id: id });
  }
  renderMateri(allMateri); // re-render to update fav buttons
}

// ===== COMMENTS =====
async function loadComments(materiId) {
  const list = document.getElementById('commentsList');
  if (!list) return;
  if (DEMO_MODE) {
    list.innerHTML = demoComments(materiId);
    return;
  }
  try {
    const { data, error } = await sb.from('komentar')
      .select('*, profiles(nama)')
      .eq('materi_id', materiId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!data.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:1rem 0">Belum ada komentar. Jadilah yang pertama!</p>';
      return;
    }
    list.innerHTML = data.map(c => commentHTML(c.profiles?.nama || 'Anonim', c.isi, c.created_at)).join('');
  } catch {
    list.innerHTML = demoComments(materiId);
  }
}

function demoComments(id) {
  const demos = [
    ['Andi R.', 'Materinya sangat jelas dan mudah dipahami! Terima kasih admin 🙏', '2 jam lalu'],
    ['Siti N.', 'Bisa minta soal latihannya juga? Ini sangat membantu belajar saya.', '5 jam lalu'],
    ['Budi P.', 'Sudah download dan baca, mantap banget! Langsung paham.', '1 hari lalu'],
  ];
  return demos.map(([n,t,time]) => commentHTML(n, t, time)).join('');
}

function commentHTML(name, text, time) {
  return `<div class="comment-item">
    <div class="comment-avatar">${name[0].toUpperCase()}</div>
    <div class="comment-body">
      <div class="comment-name">${name}</div>
      <div class="comment-text">${text}</div>
      <div class="comment-time">${typeof time === 'string' && time.includes('T') ? new Date(time).toLocaleString('id-ID') : time}</div>
    </div>
  </div>`;
}

async function submitComment(materiId) {
  if (!currentUser || currentRole === 'guest') {
    showLoginRequired('komentar');
    return;
  }
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;

  if (DEMO_MODE) {
    const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Kamu';
    const list = document.getElementById('commentsList');
    list.insertAdjacentHTML('afterbegin', commentHTML(name, text, 'Baru saja'));
    input.value = '';
    showNotification('Komentar terkirim! 💬', 'success');
    return;
  }

  try {
    const { error } = await sb.from('komentar').insert({ user_id: currentUser.id, materi_id: materiId, isi: text });
    if (error) throw error;
    input.value = '';
    showNotification('Komentar terkirim! 💬', 'success');
    // Realtime will handle adding to list
  } catch {
    showNotification('Gagal mengirim komentar', 'error');
  }
}

// ===== AI FEATURES =====
async function generateSummary() {
  if (!currentUser || currentRole === 'guest') {
    showLoginRequired('AI Summary');
    return;
  }
  const text = document.getElementById('summaryInput').value.trim();
  if (!text) return showNotification('Masukkan teks materi terlebih dahulu', 'warning');

  const output = document.getElementById('summaryOutput');
  output.classList.remove('hidden');
  output.innerHTML = '<div class="ai-loading"><div class="spinner"></div> AI sedang merangkum teks kamu...</div>';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Tolong buat ringkasan yang jelas dan padat dari teks berikut dalam bahasa Indonesia. Format dengan poin-poin penting:\n\n${text}`
        }]
      })
    });
    const data = await response.json();
    const result = data.content?.map(c => c.text || '').join('') || 'Tidak bisa membuat ringkasan.';
    output.innerHTML = `<strong>📝 Ringkasan:</strong>\n\n${result}`;
  } catch (e) {
    // Fallback: simple local summarization
    output.innerHTML = localSummarize(text);
  }
}

async function generateSoal() {
  if (!currentUser || currentRole === 'guest') {
    showLoginRequired('AI Generate Soal');
    return;
  }
  const text = document.getElementById('soalInput').value.trim();
  const count = document.getElementById('soalCount').value;
  if (!text) return showNotification('Masukkan teks materi terlebih dahulu', 'warning');

  const output = document.getElementById('soalOutput');
  output.classList.remove('hidden');
  output.innerHTML = `<div class="ai-loading"><div class="spinner"></div> AI sedang membuat ${count} soal dari teks kamu...</div>`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Buatkan ${count} soal pilihan ganda beserta jawabannya berdasarkan teks berikut. Format:\n\n1. [Pertanyaan]\nA) [Pilihan]\nB) [Pilihan]\nC) [Pilihan]\nD) [Pilihan]\nJawaban: [Huruf]\n\nTeks:\n${text}`
        }]
      })
    });
    const data = await response.json();
    const result = data.content?.map(c => c.text || '').join('') || 'Tidak bisa membuat soal.';
    output.innerHTML = `<strong>❓ Soal Latihan:</strong>\n\n${result}`;
  } catch (e) {
    output.innerHTML = localGenerateSoal(text, count);
  }
}

// Fallback local functions (when API not configured)
function localSummarize(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 5);
  return `<strong>📝 Ringkasan (Auto):</strong>\n\n${sentences.map((s, i) => `• ${s.trim()}`).join('\n')}`;
}
function localGenerateSoal(text, count) {
  return `<strong>❓ Soal Latihan:</strong>\n\n⚠️ Koneksi ke AI belum dikonfigurasi. Pastikan API key telah diset.\n\nContoh soal akan muncul setelah API dikonfigurasi.`;
}

// ===== UPLOAD MATERI (Admin) =====
async function handleUpload() {
  if (currentRole !== 'admin') {
    showNotification('Hanya admin yang bisa upload materi', 'error');
    return;
  }
  const judul = document.getElementById('uploadJudul').value.trim();
  const deskripsi = document.getElementById('uploadDeskripsi').value.trim();
  const kelas = document.getElementById('uploadKelas').value;
  const mapel = document.getElementById('uploadMapel').value;
  const tipe = document.getElementById('uploadTipe').value;
  const url = document.getElementById('uploadUrl').value.trim();

  if (!judul || !deskripsi) return showNotification('Judul dan deskripsi wajib diisi', 'warning');

  const newMateri = { id: Date.now().toString(), judul, deskripsi, kelas, mapel, tipe, url, views: 0, downloads: 0, created_at: new Date().toISOString() };

  if (DEMO_MODE) {
    allMateri.unshift(newMateri);
    showNotification('Materi berhasil diupload! ✅', 'success');
    renderMateri(allMateri);
    loadAdminMateri();
    return;
  }

  try {
    const { data, error } = await sb.from('materi').insert({ judul, deskripsi, kelas, mapel, tipe, url, views: 0, downloads: 0, uploaded_by: currentUser.id }).select().single();
    if (error) throw error;
    allMateri.unshift(data);
    showNotification('Materi berhasil diupload! ✅', 'success');
    renderMateri(allMateri);
    loadAdminMateri();
  } catch (e) {
    showNotification('Gagal upload materi: ' + e.message, 'error');
  }
}

// ===== DELETE MATERI (Admin) =====
async function deleteMateri(id) {
  if (currentRole !== 'admin') return;
  if (!confirm('Yakin hapus materi ini?')) return;

  allMateri = allMateri.filter(m => m.id !== id);
  if (!DEMO_MODE) {
    await sb.from('materi').delete().eq('id', id);
  }
  closeMateriModal();
  renderMateri(allMateri);
  showNotification('Materi berhasil dihapus', 'success');
  loadAdminMateri();
}

// ===== ADMIN: LOAD DATA =====
async function loadAdminMateri() {
  const list = document.getElementById('adminMateriList');
  if (!list) return;
  const data = allMateri;
  if (!data.length) { list.innerHTML = '<p class="empty-state">Belum ada materi</p>'; return; }
  list.innerHTML = data.map(m => `
    <div class="admin-item">
      <div class="admin-item-info">
        <div class="admin-item-title">${m.judul}</div>
        <div class="admin-item-meta">Kelas ${m.kelas} · ${formatMapel(m.mapel)} · ${m.tipe.toUpperCase()} · 👁 ${m.views} · 📥 ${m.downloads}</div>
      </div>
      <button class="btn-danger" onclick="deleteMateri('${m.id}')">🗑 Hapus</button>
    </div>`).join('');
}

async function loadAdminUsers() {
  const list = document.getElementById('adminUserList');
  if (!list) return;
  if (DEMO_MODE) {
    list.innerHTML = `
      <div class="admin-item"><div class="admin-item-info"><div class="admin-item-title">demo@siswa.id</div><div class="admin-item-meta">Role: siswa · Joined: hari ini</div></div><span class="role-badge siswa">siswa</span></div>
      <div class="admin-item"><div class="admin-item-info"><div class="admin-item-title">admin@eduhub.id</div><div class="admin-item-meta">Role: admin · Joined: hari ini</div></div><span class="role-badge admin">admin</span></div>`;
    return;
  }
  try {
    const { data } = await sb.from('profiles').select('*');
    if (!data?.length) { list.innerHTML = '<p class="empty-state">Tidak ada pengguna</p>'; return; }
    list.innerHTML = data.map(u => `
      <div class="admin-item">
        <div class="admin-item-info">
          <div class="admin-item-title">${u.nama || '—'}</div>
          <div class="admin-item-meta">Role: ${u.role}</div>
        </div>
        <span class="role-badge ${u.role}">${u.role}</span>
      </div>`).join('');
  } catch { list.innerHTML = '<p class="empty-state">Gagal memuat pengguna</p>'; }
}

// ===== ADMIN TABS =====
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelector(`.admin-tab[onclick*="${tab}"]`).classList.add('active');
  document.getElementById(`adminTab${tab.charAt(0).toUpperCase()+tab.slice(1)}`).classList.remove('hidden');
  if (tab === 'materi') loadAdminMateri();
  if (tab === 'users') loadAdminUsers();
}

// ===== FAVORITES PAGE =====
async function loadFavoritesPage() {
  const grid = document.getElementById('favoritesGrid');
  if (currentRole === 'guest' || !currentUser) {
    grid.innerHTML = `<div class="lock-box glass-card" style="text-align:center;padding:2rem"><div class="lock-icon">🔒</div><p>Login untuk melihat favorit</p><button class="btn-primary" onclick="openAuthModal()" style="margin-top:1rem">Login</button></div>`;
    return;
  }
  const favMateri = allMateri.filter(m => favorites.has(m.id));
  if (!favMateri.length) {
    grid.innerHTML = '<p class="empty-state">Belum ada materi favorit. Klik ❤️ pada materi untuk menambahkan.</p>';
    return;
  }
  grid.innerHTML = favMateri.map(m => materiCardHTML(m)).join('');
}

// ===== HISTORY PAGE =====
async function loadHistoryPage() {
  const grid = document.getElementById('historyGrid');
  if (currentRole === 'guest' || !currentUser) {
    grid.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-secondary)">🔒 <a href="#" onclick="openAuthModal()" style="color:var(--accent)">Login</a> untuk melihat riwayat</div>`;
    return;
  }
  if (DEMO_MODE) {
    grid.innerHTML = DEMO_MATERI.slice(0, 4).map(m => `
      <div class="list-item">
        <div class="list-item-icon">${m.tipe === 'video' ? '🎬' : '📄'}</div>
        <div class="list-item-info">
          <div class="list-item-title">${m.judul}</div>
          <div class="list-item-meta">Kelas ${m.kelas} · ${formatMapel(m.mapel)} · 📥 Download</div>
        </div>
      </div>`).join('');
    return;
  }
  try {
    const { data } = await sb.from('history').select('*, materi(judul, kelas, mapel, tipe)').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20);
    if (!data?.length) { grid.innerHTML = '<p class="empty-state">Belum ada riwayat</p>'; return; }
    grid.innerHTML = data.map(h => `
      <div class="list-item">
        <div class="list-item-icon">${h.materi?.tipe === 'video' ? '🎬' : '📄'}</div>
        <div class="list-item-info">
          <div class="list-item-title">${h.materi?.judul || '—'}</div>
          <div class="list-item-meta">Kelas ${h.materi?.kelas} · ${formatMapel(h.materi?.mapel)} · ${h.action === 'download' ? '📥' : '👁'} ${h.action}</div>
        </div>
        <div class="list-item-action" style="font-size:0.75rem;color:var(--text-muted)">${new Date(h.created_at).toLocaleDateString('id-ID')}</div>
      </div>`).join('');
  } catch { grid.innerHTML = '<p class="empty-state">Gagal memuat riwayat</p>'; }
}

// ===== REALTIME =====
function setupRealtime() {
  if (DEMO_MODE || !currentUser) return;
  realtimeChannel = sb.channel('eduhub-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'komentar' }, payload => {
      const list = document.getElementById('commentsList');
      if (list && payload.new) {
        const name = payload.new.user_name || 'Pengguna';
        list.insertAdjacentHTML('afterbegin', commentHTML(name, payload.new.isi, payload.new.created_at));
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'materi' }, payload => {
      if (payload.new) {
        allMateri.unshift(payload.new);
        showNotification(`📚 Materi baru: "${payload.new.judul}"`, 'info');
        renderMateri(allMateri);
      }
    })
    .subscribe();
}

// ===== PAGE NAVIGATION =====
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageMap = {
    home: 'pageHome',
    materi: 'pageMateri',
    detail: 'pageDetail',
    ai: 'pageAi',
    dashboard: 'pageDashboard',
    favorites: 'pageFavorites',
    history: 'pageHistory',
    admin: 'pageAdmin',
    upload: 'pageAdmin',
  };

  const pageId = pageMap[page];
  if (pageId) document.getElementById(pageId)?.classList.remove('hidden');

  // Update nav active state
  const navLinkMap = { home: 0, materi: 1, ai: 2 };
  if (navLinkMap[page] !== undefined) {
    document.querySelectorAll('.nav-link')[navLinkMap[page]]?.classList.add('active');
  }

  // Page-specific setup
  if (page === 'ai') {
    const locked = !currentUser || currentRole === 'guest';
    document.getElementById('aiLocked').classList.toggle('hidden', !locked);
    document.getElementById('aiContent').classList.toggle('hidden', locked);
  }
  if (page === 'admin') {
    if (currentRole !== 'admin') {
      showNotification('Akses ditolak! Hanya admin yang bisa masuk.', 'error');
      showPage('home');
      return;
    }
    document.getElementById('adminTabUpload').classList.add('hidden');
    document.getElementById('adminTabUsers').classList.add('hidden');
    document.getElementById('adminTabMateri').classList.remove('hidden');
    document.querySelectorAll('.admin-tab').forEach((t,i) => t.classList.toggle('active', i===0));
    loadAdminMateri();
  }
  if (page === 'dashboard') {
    if (!currentUser || currentRole === 'guest') { openAuthModal(); return; }
  }
  if (page === 'favorites') loadFavoritesPage();
  if (page === 'history') loadHistoryPage();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== HELPERS =====
function showLoginRequired(feature = 'fitur ini') {
  showNotification(`🔒 Silakan login untuk mengakses ${feature}`, 'warning');
  setTimeout(() => openAuthModal(), 1200);
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showNotification(msg, type = 'info') {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.className = `notification ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.add('hidden'), 4000);
}

// ===== CLOSE MODALS ON BACKDROP CLICK =====
document.getElementById('authModal').addEventListener('click', function(e) {
  if (e.target === this) closeAuthModal();
});
document.getElementById('materiModal').addEventListener('click', function(e) {
  if (e.target === this) closeMateriModal();
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeAuthModal(); closeMateriModal(); }
});
