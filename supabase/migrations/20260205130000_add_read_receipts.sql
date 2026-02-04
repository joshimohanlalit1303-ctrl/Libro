
-- Add is_read column to messages
alter table public.messages 
add column if not exists is_read boolean default false;

-- Policy: Receiver can update is_read
create policy "Receiver can mark as read"
on public.messages for update
using ( auth.uid() = receiver_id )
with check ( auth.uid() = receiver_id );
