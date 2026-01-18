import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const BOT_NAMES = [
    'Alice Reader', 'Bob Bookworm', 'Charlie Chapter', 'Diana Page', 'Evan Epi',
    'Fiona Fiction', 'George Genre', 'Hannah History', 'Ian Index', 'Julia Jacket',
    'Kevin Kindle', 'Laura Library', 'Mike Margin', 'Nina Novel', 'Oliver Opus'
];

const CHAT_MESSAGES = [
    "This chapter is so intense!",
    "I love how the author describes the setting here.",
    "Wait, did I miss something? Rereading the last page.",
    "The character development is really picking up.",
    "Has anyone else reached the part about the old house?",
    "Such a beautiful quote.",
    "I'm really enjoying this session.",
    "This book is harder to put down than I thought.",
    "Interesting perspective.",
    "I wonder what will happen next.",
    "This reminds me of another book I read last year.",
    "Great point!",
    "I'm highlighting so much in this chapter.",
    "The pacing is perfect.",
    "Is everyone else seeing the same page numbers? Mine might be different.",
    "Wow.",
    "I need to take a break after this chapter, it's heavy.",
    "Just joined! Catching up.",
    "Love this!"
];

async function main() {
    const roomId = process.argv[2];
    const botCount = parseInt(process.argv[3] || '10', 10);

    if (!roomId) {
        console.error('Usage: npx tsx scripts/simulate_users.ts <roomId> [botCount]');
        process.exit(1);
    }

    console.log(`Initializing ${botCount} bots for room: ${roomId}`);

    const bots: { id: string, name: string, progress: number }[] = [];

    // Create Bots
    for (let i = 0; i < botCount; i++) {
        const name = BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ` ${i}` : '');
        // Deterministic ID based on run? No, random is better for now.
        const id = randomUUID();
        bots.push({ id, name, progress: Math.floor(Math.random() * 30) });
    }

    console.log('Registering bots in database...');

    // 1. Upsert Profiles using Admin Key (Bypass RLS)
    const { error: profileError } = await supabase.from('profiles').upsert(
        bots.map(b => ({
            id: b.id,
            username: b.name,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.id}`
        }))
    );

    if (profileError) {
        console.error('Error creating bot profiles:', profileError);
    }

    // 2. Add to Participants
    const { error: partError } = await supabase.from('participants').upsert(
        bots.map(b => ({
            room_id: roomId,
            user_id: b.id,
            role: 'viewer',
            last_seen: new Date().toISOString()
        }))
    );

    if (partError) {
        console.error('Error adding participants:', partError);
    } else {
        console.log('Bots added to participant list.');
    }

    // 3. Connect to Realtime
    const channel = supabase.channel(`room-reader:${roomId}`);
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('Connected to Realtime channel.');
        }
    });

    console.log('Starting simulation loop. Press Ctrl+C to stop.');

    // Heartbeat Loop (Keep them "online")
    setInterval(async () => {
        const { error: hbError } = await supabase.from('participants').upsert(
            bots.map(b => ({
                room_id: roomId,
                user_id: b.id,
                role: 'viewer',
                last_seen: new Date().toISOString()
            }))
        );
        if (hbError) console.error('Heartbeat error:', hbError.message);
        // else console.log('Heartbeat sent');
    }, 10000);

    // Activity Loop (Reading & Chatting)
    const interval = setInterval(async () => {
        // 1. Random move
        if (Math.random() > 0.3) {
            const bot = bots[Math.floor(Math.random() * bots.length)];
            bot.progress += (Math.random() * 2);
            if (bot.progress > 99) bot.progress = 0;

            const percentage = Math.round(bot.progress);
            console.log(`[READ] ${bot.name} is at ${percentage}%`);

            await channel.send({
                type: 'broadcast',
                event: 'location_change',
                payload: {
                    username: bot.name,
                    percentage: percentage
                }
            });
        }

        // 2. Random Chat (20% chance)
        if (Math.random() > 0.8) {
            const bot = bots[Math.floor(Math.random() * bots.length)];
            const message = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];

            console.log(`[CHAT] ${bot.name}: ${message}`);

            const { error: chatError } = await supabase.from('messages').insert({
                room_id: roomId,
                user_id: bot.id,
                content: message,
                // created_at is default
            });

            if (chatError) console.error('Chat error:', chatError.message);
        }

    }, 3000); // Check for action every 3 seconds

}

main();
