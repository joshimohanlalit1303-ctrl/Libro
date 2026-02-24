-- Create vocabulary table
create table if not exists public.vocabulary (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    book_id uuid references public.books(id) on delete set null,
    word text not null,
    context_sentence text,
    definition text,
    created_at timestamptz not null default now(),
    
    constraint vocabulary_pkey primary key (id)
);

-- Enable RLS
alter table public.vocabulary enable row level security;

-- Policies
create policy "Users can view their own vocabulary"
    on public.vocabulary for select
    using (auth.uid() = user_id);

create policy "Users can insert their own vocabulary"
    on public.vocabulary for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own vocabulary"
    on public.vocabulary for delete
    using (auth.uid() = user_id);

-- Indexes
create index vocabulary_user_id_idx on public.vocabulary(user_id);
create index vocabulary_book_id_idx on public.vocabulary(book_id);
