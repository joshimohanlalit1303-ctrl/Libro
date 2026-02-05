-- Create the academic_papers table
create table if not exists public.academic_papers (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    branch text not null, -- e.g., 'CSE', 'ECE'
    year integer not null, -- Exam Year, e.g., 2023
    semester integer not null check (semester between 1 and 8),
    subject_code text, -- e.g., 'MAT101'
    file_url text not null, -- Path in storage or full URL
    uploaded_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.academic_papers enable row level security;

-- Policies for academic_papers
create policy "Papers are visible to all authenticated users"
    on public.academic_papers for select
    to authenticated
    using (true);

create policy "Authenticated users can upload papers"
    on public.academic_papers for insert
    to authenticated
    with check (auth.uid() = uploaded_by);

-- Create a bucket for academic docs if it doesn't exist
insert into storage.buckets (id, name, public)
values ('academic_docs', 'academic_docs', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Academic docs are publicly accessible"
    on storage.objects for select
    to public
    using ( bucket_id = 'academic_docs' );

create policy "Authenticated users can upload academic docs"
    on storage.objects for insert
    to authenticated
    with check ( bucket_id = 'academic_docs' );
