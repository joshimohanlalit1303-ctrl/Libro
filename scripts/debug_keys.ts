import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkKeys() {
    console.log("--- Checking Public Keys ---");
    const { data: keys, error } = await supabase.from('public_keys').select('user_id, created_at, public_key');

    if (error) {
        console.error("Error fetching keys:", error);
    } else {
        console.log(`Found ${keys?.length} public keys.`);

        // Fetch usernames
        const userIds = keys?.map(k => k.user_id) || [];
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);

        keys?.forEach(k => {
            const name = profiles?.find(p => p.id === k.user_id)?.username || 'Unknown';
            // Show start of key to verify it's not empty
            console.log(`- [${name}] (${k.user_id}) - Key: ${k.public_key.substring(0, 20)}...`);
        });
    }

    console.log("\n--- Checking Friendships ---");
    const { data: friends } = await supabase.from('friendships').select('*');
    if (friends) {
        const uids = new Set([
            ...friends.map(f => f.requester_id),
            ...friends.map(f => f.addressee_id)
        ]);
        const { data: allProfiles } = await supabase.from('profiles').select('id, username').in('id', Array.from(uids));

        console.log(`Found ${friends.length} friendships.`);
        friends.forEach(f => {
            const req = allProfiles?.find(p => p.id === f.requester_id)?.username || f.requester_id;
            const add = allProfiles?.find(p => p.id === f.addressee_id)?.username || f.addressee_id;
            console.log(`- ${req} -> ${add} (${f.status})`);
        });
    }
}

checkKeys();
