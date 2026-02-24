-- Create tables
create table profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text
);

create table rooms (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  status text check (status in ('active', 'archived')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  book_id text not null,
  max_participants integer default 10,
  privacy text check (privacy in ('public', 'private')) default 'public',
  owner_id uuid references profiles(id)
);

create table participants (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  role text check (role in ('host', 'viewer')) default 'viewer',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, user_id)
);

create table chat_messages (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table annotations (
  id uuid default uuid_generate_v4() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  cfi_range text not null,
  note text,
  highlight_color text default '#FFEB3B',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Realtime
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table annotations;
alter publication supabase_realtime add table participants;

-- RLS (Simple for now)
alter table profiles enable row level security;
alter table rooms enable row level security;
alter table participants enable row level security;
alter table chat_messages enable row level security;
alter table annotations enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );

create policy "Room participants can view messages." on chat_messages for select using (
  exists (
    select 1 from participants
    where participants.room_id = chat_messages.room_id
    and participants.user_id = auth.uid()
  )
);

create policy "Participants can insert messages." on chat_messages for insert with check (
  exists (
    select 1 from participants
    where participants.room_id = chat_messages.room_id
    and participants.user_id = auth.uid()
  )
);

-- Rooms policies
create policy "Rooms are viewable by everyone." on rooms for select using ( true );
create policy "Authenticated users can create rooms." on rooms for insert with check ( auth.uid() = owner_id );

-- Update rooms table
alter table rooms add column epub_url text;
alter table rooms add column cover_url text;

-- Storage Setup (Requires 'storage' schema access, strictly speaking usually done via dashboard but trying via SQL)
insert into storage.buckets (id, name, public) values ('books', 'books', true) on conflict (id) do nothing;

create policy "Public Access to Books" on storage.objects for select using ( bucket_id = 'books' );
create policy "Auth Upload to Books" on storage.objects for insert with check ( bucket_id = 'books' and auth.role() = 'authenticated' );
