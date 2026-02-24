-- Increase file size limit for 'books' bucket to 100MB
update storage.buckets
set file_size_limit = 104857600
where id = 'books';
