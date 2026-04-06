# ⚡ EduHub — Platform Belajar Modern

Platform edukasi berbasis web dengan sistem autentikasi, role user, guest mode, AI tools, dan realtime.

---

## 📁 Struktur File

```
eduhub/
├── index.html      ← Halaman utama (semua halaman dalam 1 file)
├── style.css       ← Styling glassmorphism dark theme
├── app.js          ← Logika aplikasi lengkap
├── database.sql    ← Schema Supabase + sample data
└── README.md       ← Panduan ini
```

---

## 🚀 Cara Menjalankan

### Mode Demo (Tanpa Supabase)
Buka `index.html` langsung di browser. Semua fitur berjalan dengan data demo.

### Mode Full (Dengan Supabase)

#### 1. Buat Project Supabase
- Kunjungi https://supabase.com → New Project
- Catat **Project URL** dan **Anon Key**

#### 2. Setup Database
- Buka **SQL Editor** di Supabase Dashboard
- Copy-paste seluruh isi `database.sql` → Run

#### 3. Setup Realtime
- Buka **Database** → **Replication**
- Enable replication untuk tabel: `komentar`, `materi`

#### 4. Konfigurasi app.js
Buka `app.js`, ubah baris berikut:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'; // ← Ganti ini
const SUPABASE_KEY = 'YOUR_ANON_KEY';                    // ← Ganti ini
```

#### 5. (Opsional) AI Features
Fitur AI menggunakan Anthropic API. Untuk mengaktifkan:
- Daftarkan API key di https://console.anthropic.com
- Karena API key tidak boleh di frontend, buat **Supabase Edge Function** sebagai proxy:
```
supabase functions new ai-proxy
```
Kemudian modifikasi `generateSummary()` dan `generateSoal()` di `app.js` untuk memanggil edge function tersebut.

---

## 👤 Role System

| Role | Akses |
|------|-------|
| **Tamu** | Lihat & preview materi saja |
| **Siswa** | Download, komentar, favorit, riwayat, AI tools |
| **Admin** | Semua akses + upload & hapus materi, kelola user |

**Cara jadi Admin:** Saat register, masukkan kode rahasia `operator`

---

## 🔐 Security (RLS Supabase)

- Tamu: hanya SELECT pada `materi`
- Siswa: INSERT `komentar`, `favorit`, `history`
- Admin: INSERT/UPDATE/DELETE pada `materi`
- Semua dikontrol via Row Level Security

---

## ⚡ Fitur Realtime

Menggunakan **Supabase Realtime**:
- Komentar baru muncul langsung tanpa reload
- Materi baru muncul di semua client secara realtime

---

## 🤖 AI Features (Login Required)

- **Ringkasan Otomatis**: Paste teks → AI merangkum
- **Generate Soal**: Paste teks → AI membuat soal pilihan ganda

---

## 🎨 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **UI**: Glassmorphism + Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Fonts**: Syne (display) + DM Sans (body)
- **AI**: Anthropic Claude API

---

## 📝 Catatan Pengembangan

1. Untuk production, jangan expose Anthropic API key di frontend
2. Gunakan Supabase Edge Functions sebagai proxy untuk AI calls
3. Aktifkan email confirmation di Supabase Auth Settings
4. Setup Storage bucket `materi-files` untuk upload file langsung
