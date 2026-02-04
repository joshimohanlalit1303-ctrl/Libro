-- 1. Public Keys Table (For E2EE)
create table if not exists public.public_keys (
    user_id uuid references auth.users(id) on delete cascade primary key,
    public_key text not null, -- JWK string or Base64
    created_at timestamptz default now()
);

alter table public.public_keys enable row level security;

create policy "Keys are public" 
    on public.public_keys for select 
    using ( true );

create policy "Users can upload their own key" 
    on public.public_keys for insert 
    with check ( auth.uid() = user_id );

create policy "Users can update their own key" 
    on public.public_keys for update 
    using ( auth.uid() = user_id );


-- 2. Friendships Table (Kindred Spirits)
create table if not exists public.friendships (
    id uuid default gen_random_uuid() primary key,
    requester_id uuid references auth.users(id) on delete cascade not null,
    addressee_id uuid references auth.users(id) on delete cascade not null,
    status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
    created_at timestamptz default now(),
    unique(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "Users can see their own friendships"
    on public.friendships for select
    using ( auth.uid() = requester_id or auth.uid() = addressee_id );

create policy "Users can request friendship"
    on public.friendships for insert
    with check ( auth.uid() = requester_id );

create policy "Participants can update status"
    on public.friendships for update
    using ( auth.uid() = requester_id or auth.uid() = addressee_id );


-- 3. Messages Table (Sealed Letters)
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    sender_id uuid references auth.users(id) on delete cascade not null,
    receiver_id uuid references auth.users(id) on delete cascade not null,
    content text not null, -- Encrypted Ciphertext
    iv text not null,      -- Initialization Vector
    created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can read their own messages"
    on public.messages for select
    using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can send messages"
    on public.messages for insert
    with check ( auth.uid() = sender_id );
