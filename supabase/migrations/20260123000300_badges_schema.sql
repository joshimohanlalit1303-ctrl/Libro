-- Add badges column to profiles if it doesn't exist
alter table public.profiles 
add column if not exists badges jsonb default '[]'::jsonb;

-- Update the claim_invite_code function to award a badge
create or replace function public.claim_invite_code()
returns trigger as $$
declare
    new_badge jsonb;
begin
    if new.raw_user_meta_data->>'invite_code' is not null then
        -- 1. Check validity and decrement uses
        -- We must check existence here again or rely on the previous check.
        -- We assume the UI or a pre-check validated it, but let's be safe and only update if rows modified.
        
        update public.invitation_codes
        set uses_remaining = uses_remaining - 1
        where code = (new.raw_user_meta_data->>'invite_code')::text
        and uses_remaining > 0;
        
        -- 2. If update was successful (found and decremented), award badge
        if found then
            new_badge := jsonb_build_object(
                'id', 'early_adopter',
                'name', 'Early Adopter',
                'icon', '🎫',
                'awarded_at', now()
            );

            -- We can't update 'profiles' here directly because the row might not exist yet 
            -- (profiles is usually created via TRIGGER on auth.users).
            -- RACE CONDITION: If profiles trigger runs AFTER this, we miss it.
            -- If profiles trigger runs BEFORE this, we hit it.
            
            -- SAFER APPROACH: just update medadata or insert into a separate 'user_badges' table.
            -- Or, since we want to store it in profiles, we can try an UPSERT on profiles.
            
            insert into public.profiles (id, username, badges)
            values (
                new.id, 
                new.raw_user_meta_data->>'username', -- Best effort, might be null
                jsonb_build_array(new_badge)
            )
            on conflict (id) do update
            set badges = profiles.badges || new_badge;
            
        end if;
    end if;
    return new;
end;
$$ language plpgsql security definer;
