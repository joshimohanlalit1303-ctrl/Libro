-- Create highlights table
create table public.highlights (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    book_id text not null, -- Can be UUID or string depending on implementation, favoring flexibility
    room_id uuid references public.rooms(id) on delete cascade, -- Optional: link to room if room-specific
    cfi_range text not null,
    text_content text,
    color text default '#fff59d', -- Default yellow-ish
    created_at timestamptz not null default now(),
    
    constraint highlights_pkey primary key (id)
);

-- Create highlight_reactions table
create table public.highlight_reactions (
    id uuid not null default gen_random_uuid(),
    highlight_id uuid not null references public.highlights(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    emoji text not null,
    created_at timestamptz not null default now(),
    
    constraint highlight_reactions_pkey primary key (id),
    constraint unique_reaction unique (highlight_id, user_id, emoji) -- Prevent duplicate same-emoji reactions by same user
);

-- Enable RLS
alter table public.highlights enable row level security;
alter table public.highlight_reactions enable row level security;

-- Policies for Highlights
-- Everyone can read highlights (in the room/book context)
create policy "Highlights are viewable by everyone" on public.highlights
    for select using (true);

-- Authenticated users can insert highlights
create policy "Users can create highlights" on public.highlights
    for insert with check (auth.uid() = user_id);

-- Users can delete their own highlights
create policy "Users can delete own highlights" on public.highlights
    for delete using (auth.uid() = user_id);

-- Policies for Reactions
create policy "Reactions are viewable by everyone" on public.highlight_reactions
    for select using (true);

create policy "Users can add reactions" on public.highlight_reactions
    for insert with check (auth.uid() = user_id);

create policy "Users can remove their reactions" on public.highlight_reactions
    for delete using (auth.uid() = user_id);

-- Enable Realtime
-- Add tables to the publication used by Supabase Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'highlights') then
    alter publication supabase_realtime add table public.highlights;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'highlight_reactions') then
    alter publication supabase_realtime add table public.highlight_reactions;
  end if;
end;
$$;
