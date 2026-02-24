-- Allow localhost:3000 to access the books bucket to fix "Failed to fetch" / CORS errors
update storage.buckets
set allowed_origins = '{http://localhost:3000, https://localhost:3000}'
where id = 'books';
