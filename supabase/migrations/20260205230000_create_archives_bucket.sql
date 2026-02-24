-- Create a new public bucket for academic archives
insert into storage.buckets (id, name, public)
values ('archive_papers', 'archive_papers', true);

-- Allow public access to read files
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'archive_papers' );

-- Allow authenticated users to upload files
create policy "Authenticated users can upload papers"
  on storage.objects for insert
  with check (
    bucket_id = 'archive_papers' 
    and auth.role() = 'authenticated'
  );
