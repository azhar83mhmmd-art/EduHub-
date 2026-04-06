-- ============================================================
-- EDUHUB — Supabase Database Schema
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ===== 1. PROFILES =====
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nama text not null,
  role text not null default 'siswa' check (role in ('siswa', 'admin')),
  is_admin boolean generated always as (role = 'admin') stored,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nama, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'siswa')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ===== 2. MATERI =====
create table if not exists public.materi (
  id uuid default gen_random_uuid() primary key,
  judul text not null,
  deskripsi text,
  kelas text not null check (kelas in ('10', '11', '12')),
  mapel text not null,
  tipe text not null default 'pdf' check (tipe in ('pdf', 'ppt', 'video')),
  url text,
  thumbnail_url text,
  views integer default 0,
  downloads integer default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);


-- ===== 3. KOMENTAR =====
create table if not exists public.komentar (
  id uuid default gen_random_uuid() primary key,
  materi_id uuid references public.materi(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  isi text not null,
  created_at timestamptz default now()
);


-- ===== 4. FAVORIT =====
create table if not exists public.favorit (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  materi_id uuid references public.materi(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, materi_id)
);


-- ===== 5. HISTORY =====
create table if not exists public.history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  materi_id uuid references public.materi(id) on delete cascade not null,
  action text not null default 'view' check (action in ('view', 'download')),
  created_at timestamptz default now()
);


-- ===== INDEXES =====
create index if not exists idx_materi_kelas on public.materi(kelas);
create index if not exists idx_materi_mapel on public.materi(mapel);
create index if not exists idx_komentar_materi on public.komentar(materi_id);
create index if not exists idx_favorit_user on public.favorit(user_id);
create index if not exists idx_history_user on public.history(user_id);


-- ===== ROW LEVEL SECURITY (RLS) =====

-- profiles
alter table public.profiles enable row level security;
create policy "Public profiles readable" on public.profiles for select using (true);
create policy "User can update own profile" on public.profiles for update using (auth.uid() = id);

-- materi
alter table public.materi enable row level security;
create policy "Anyone can read materi" on public.materi for select using (true);
create policy "Admin can insert materi" on public.materi for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin can update materi" on public.materi for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin can delete materi" on public.materi for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- komentar
alter table public.komentar enable row level security;
create policy "Anyone can read comments" on public.komentar for select using (true);
create policy "Authenticated users can insert comments" on public.komentar for insert
  with check (auth.uid() = user_id);
create policy "User can delete own comments" on public.komentar for delete
  using (auth.uid() = user_id);

-- favorit
alter table public.favorit enable row level security;
create policy "User reads own favorites" on public.favorit for select using (auth.uid() = user_id);
create policy "Authenticated can insert favorites" on public.favorit for insert with check (auth.uid() = user_id);
create policy "User can delete own favorites" on public.favorit for delete using (auth.uid() = user_id);

-- history
alter table public.history enable row level security;
create policy "User reads own history" on public.history for select using (auth.uid() = user_id);
create policy "Authenticated can insert history" on public.history for insert with check (auth.uid() = user_id);


-- ===== SAMPLE DATA =====
insert into public.materi (judul, deskripsi, kelas, mapel, tipe, url, views, downloads) values
  ('Trigonometri Dasar', 'Pengenalan fungsi sin, cos, tan dan aplikasinya.', '10', 'matematika', 'pdf', 'https://www.africau.edu/images/default/sample.pdf', 324, 89),
  ('Hukum Newton & Gravitasi', 'Memahami hukum-hukum Newton dan konsep gaya gravitasi.', '10', 'fisika', 'pdf', 'https://www.africau.edu/images/default/sample.pdf', 512, 142),
  ('Ikatan Kimia', 'Jenis-jenis ikatan kimia dan tabel periodik unsur.', '10', 'kimia', 'ppt', null, 198, 67),
  ('Sel & Organisme Hidup', 'Struktur sel prokariot dan eukariot.', '11', 'biologi', 'video', 'https://www.w3schools.com/html/mov_bbb.mp4', 445, 0),
  ('Integral & Aplikasinya', 'Teknik integrasi dan penerapannya.', '12', 'matematika', 'pdf', 'https://www.africau.edu/images/default/sample.pdf', 678, 201),
  ('Teks Argumentasi', 'Struktur dan cara menulis teks argumentasi.', '11', 'bahasa_indonesia', 'ppt', null, 287, 95);


-- ===== REALTIME =====
-- Enable realtime for komentar and materi tables
-- Di Supabase Dashboard > Database > Replication > Enable for tables: komentar, materi

-- ===== STORAGE BUCKETS =====
-- Di Supabase Dashboard > Storage > New Bucket: "materi-files" (public bucket)
-- Untuk upload file langsung dari browser
