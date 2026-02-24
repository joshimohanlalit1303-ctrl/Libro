-- Create Invitation Codes Table
create table if not exists public.invitation_codes (
    code text primary key,
    uses_remaining int not null default 1,
    created_at timestamptz default now(),
    expires_at timestamptz,
    created_by uuid references auth.users(id) on delete set null
);

-- RLS: Only admins (or no one via API) can create. Public can read via RPC.
alter table public.invitation_codes enable row level security;

-- RPC to check if a code is valid (Public)
create or replace function check_invite_code(code_check text)
returns boolean as $$
declare
    valid boolean;
begin
    select exists(
        select 1 from public.invitation_codes
        where code = code_check
        and uses_remaining > 0
        and (expires_at is null or expires_at > now())
    ) into valid;
    return valid;
end;
$$ language plpgsql security definer;

-- Trigger to claim code on Signup
create or replace function public.claim_invite_code()
returns trigger as $$
begin
    if new.raw_user_meta_data->>'invite_code' is not null then
        update public.invitation_codes
        set uses_remaining = uses_remaining - 1
        where code = (new.raw_user_meta_data->>'invite_code')::text
        and uses_remaining > 0;
    end if;
    return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication errors on re-run
drop trigger if exists on_auth_user_created_claim_invite on auth.users;

create trigger on_auth_user_created_claim_invite
    after insert on auth.users
    for each row execute procedure public.claim_invite_code();

-- Insert a default codes for testing
insert into public.invitation_codes (code, uses_remaining)
values 
    ('WELCOME_LIBRO', 100),
    ('READ_WITH_US', 50)
on conflict (code) do nothing;
