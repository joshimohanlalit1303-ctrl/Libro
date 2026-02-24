-- Enable pg_cron if available (standard on Supabase cloud)
create extension if not exists pg_cron with schema extensions;

-- Function to delete inactive rooms
create or replace function public.cleanup_inactive_rooms()
returns void
language plpgsql
security definer
as $$
begin
  -- Delete rooms where the latest activity (participant last_seen or room creation) is older than 30 days
  delete from rooms
  where id in (
    select r.id
    from rooms r
    left join participants p on r.id = p.room_id
    group by r.id
    having max(coalesce(p.last_seen, r.created_at)) < (now() - interval '30 days')
  );
end;
$$;

-- Schedule the job to run daily at 00:00 UTC
-- We use a DO block to safely attempt scheduling (postgres specific)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-inactive-rooms', -- job name
      '0 0 * * *',              -- schedule (midnight)
      'select public.cleanup_inactive_rooms()'
    );
  end if;
end
$$;
