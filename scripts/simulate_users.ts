import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';

// Load environment variables
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
    'Kevin Kindle', 'Laura Library', 'Mike Margin', 'Nina Novel', 'Oliver Opus',
    'Paula Plot', 'Quinn Quote', 'Rachel Read', 'Steve Story', 'Tina Text',
    'Uma Ursula', 'Victor Verse', 'Wendy Word', 'Xander Xylophone', 'Yara Young', 'Zack Zenith'
];

const CHAT_MESSAGES = [
    "This chapter is so intense!", "I love how the author describes the setting here.",
    "Wait, did I miss something? Rereading the last page.", "The character development is really picking up.",
    "Has anyone else reached the part about the old house?", "Such a beautiful quote.",
    "I'm really enjoying this session.", "This book is harder to put down than I thought.",
    "Interesting perspective.", "I wonder what will happen next.", "This reminds me of another book I read last year.",
    "Great point!", "I'm highlighting so much in this chapter.", "The pacing is perfect.",
    "Is everyone else seeing the same page numbers? Mine might be different.", "Wow.",
    "I need to take a break after this chapter, it's heavy.", "Just joined! Catching up.", "Love this!"
];

// Bot State Definition
type BotState = 'reading' | 'switching' | 'idle';

interface Bot {
    id: string; // Real Auth ID
    name: string;
    state: BotState;
    currentRoomId: string | null;
    currentRoomName: string | null;
    progress: number;
    color: string;
    nextActionTime?: number;
}

const HIGHLIGHT_COLORS = ['#fef3c7', '#d1fae5', '#bfdbfe', '#fbcfe8', '#e9d5ff', '#fecaca', '#fed7aa'];

async function main() {
    let targetRoomId = process.argv[2];
    const botCountInput = process.argv[3];
    const botCount = parseInt(botCountInput || '20', 10);

    console.log("Initializing Smart Bot Simulation...");

    // 1. Fetch JSON of all rooms
    const { data: rooms, error: roomError } = await supabase.from('rooms').select('id, name');

    if (roomError || !rooms || rooms.length === 0) {
        console.error("Failed to fetch rooms:", roomError);
        process.exit(1);
    }

    // Helper: Pick Random Room
    const getRandomRoom = () => rooms[Math.floor(Math.random() * rooms.length)];

    const bots: Bot[] = [];

    console.log(`Setting up ${botCount} bots...`);

    // 2. Initialize Bots (Create/Get User and Profile)
    for (let i = 0; i < botCount; i++) {
        const name = BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ` ${i}` : '');

        // 2a. Ensure Auth User Exists
        // [FIX] Use new email pattern to bypass lookup issues and restart fresh
        const email = `${name.toLowerCase().replace(/\s/g, '.')}4@example.com`;
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { username: name, gender: Math.random() > 0.5 ? 'male' : 'female' }
        });

        let userId = user?.user?.id;

        if (createError) {
            console.log(`[DEBUG] Error creating ${name}: ${createError.message}`);
            if (createError.message.includes("already registered")) {
                // Try to find user by email.
                const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                if (listData && listData.users) {
                    const existing = listData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                    if (existing) {
                        userId = existing.id;
                        console.log(`[DEBUG] Found existing ID for ${name}: ${userId}`);
                    } else {
                        console.warn(`[WARN] User ${name} (${email}) not found in list of ${listData.users.length} users.`);
                    }
                } else {
                    console.error(`[ERROR] Failed to list users:`, listError);
                }
            }
        }

        if (!userId) {
            console.warn(`Could not initialize bot ${name}, skipping.`);
            continue;
        }

        // 2b. Ensure Profile Exists
        await supabase.from('profiles').upsert({
            id: userId,
            username: name,
            avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${userId}`,
        });

        const startRoom = getRandomRoom();

        // [NEW] Human-like Reading Speed
        // User requested "turn pages randomly between 5-15 minutes"
        // We'll set a 'nextActionTime' for the bot.
        const SLOW_READ_MIN_MS = 5 * 60 * 1000; // 5 mins
        const SLOW_READ_MAX_MS = 15 * 60 * 1000; // 15 mins

        // For testing purposes, we might want to be slightly faster to prove it works, but I must follow instructions.
        // I will adhere to the requested 5-15 minutes.
        const getNextReadDelay = () => Math.floor(Math.random() * (SLOW_READ_MAX_MS - SLOW_READ_MIN_MS)) + SLOW_READ_MIN_MS;

        bots.push({
            id: userId,
            name,
            state: 'reading',
            currentRoomId: startRoom.id,
            currentRoomName: startRoom.name,
            progress: Math.floor(Math.random() * 50),
            color: HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)],
            nextActionTime: Date.now() + Math.floor(Math.random() * 5000) // [FIX] Start reading immediately (0-5s delay)
        });

        // 2c. Initial Join
        await supabase.from('participants').upsert({
            room_id: startRoom.id,
            user_id: userId,
            role: 'viewer',
            last_seen: new Date().toISOString()
        }, { onConflict: 'room_id, user_id' });
    }

    console.log(`${bots.length} bots initialized and active.`);

    // 3. Setup Realtime Broadcasters
    const uniqueRoomIds = [...new Set(rooms.map(r => r.id))];
    const roomChannels: Record<string, any> = {};
    for (const room of rooms) {
        roomChannels[room.id] = supabase.channel(`room-reader:${room.id}`);
        roomChannels[room.id].subscribe();
    }

    // 4. Main Activity Loop (Runs every 10 seconds to save CPU, since action is slow)
    setInterval(async () => {
        const now = Date.now();
        const promises = bots.map(async (bot: any) => {

            // Always heartbeat (every loop) to stay "Online"
            if (bot.currentRoomId) {
                await supabase.from('participants').update({ last_seen: new Date().toISOString() })
                    .match({ room_id: bot.currentRoomId, user_id: bot.id });
            }

            // --- STATE: SWITCHING ---
            if (bot.state === 'switching') {
                if (bot.currentRoomId) {
                    await supabase.from('participants').delete().match({ room_id: bot.currentRoomId, user_id: bot.id });
                }
                const newRoom = getRandomRoom();
                bot.currentRoomId = newRoom.id;
                bot.currentRoomName = newRoom.name;
                bot.progress = 0;
                bot.nextActionTime = now + (Math.floor(Math.random() * 60000)); // Wait 1 min before starting to read

                await supabase.from('participants').upsert({
                    room_id: newRoom.id,
                    user_id: bot.id,
                    role: 'viewer',
                    last_seen: new Date().toISOString()
                }, { onConflict: 'room_id, user_id' });

                bot.state = 'reading';
                console.log(`[SWITCH] ${bot.name} switched to ${bot.currentRoomName}`);
                return;
            }

            // --- STATE: READING ---
            if (bot.state === 'reading' && bot.currentRoomId) {
                // Only act if time has passed
                if (now < bot.nextActionTime) return;

                // Time to turn page!
                // Update Progress (+1-3% simulates a page turn)
                // User said "turn pages", implying discrete steps.
                bot.progress += (Math.random() * 2) + 0.5;

                // Broadcast
                const channel = roomChannels[bot.currentRoomId];
                if (channel) {
                    await channel.send({
                        type: 'broadcast', event: 'location_change',
                        payload: { username: bot.name, percentage: Math.min(100, Math.round(bot.progress)) }
                    });
                }

                console.log(`[READ] ${bot.name} turned page. Progress: ${bot.progress.toFixed(1)}%`);

                // Update Leaderboard (Add time equal to the delay that just passed)
                // Estimate time spent reading as ~10 minutes (600 seconds)
                const timeSpentReading = 600;
                const { data: prof } = await supabase.from('profiles').select('total_time_read').eq('id', bot.id).single();
                if (prof) {
                    await supabase.from('profiles').update({
                        total_time_read: (prof.total_time_read || 0) + timeSpentReading
                    }).eq('id', bot.id);
                }

                // Check Completion
                if (bot.progress >= 100) {
                    console.log(`[FINISH] ${bot.name} finished book!`);
                    const { data: prof2 } = await supabase.from('profiles').select('books_read_count').eq('id', bot.id).single();
                    if (prof2) {
                        await supabase.from('profiles').update({
                            books_read_count: (prof2.books_read_count || 0) + 1
                        }).eq('id', bot.id);
                    }
                    bot.state = 'switching';
                } else {
                    // Schedule next page turn (5-15 mins)
                    const SLOW_READ_MIN_MS = 5 * 60 * 1000;
                    const SLOW_READ_MAX_MS = 15 * 60 * 1000;
                    const delay = Math.floor(Math.random() * (SLOW_READ_MAX_MS - SLOW_READ_MIN_MS)) + SLOW_READ_MIN_MS;
                    bot.nextActionTime = now + delay;
                }

                // Rare chat (independent of page turn? No, let's tie it to page turns to avoid spam)
                if (Math.random() < 0.1) {
                    const msg = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
                    await supabase.from('messages').insert({
                        room_id: bot.currentRoomId,
                        user_id: bot.id,
                        content: msg
                    });
                    console.log(`[CHAT] ${bot.name}: ${msg}`);
                }
            }
        });

        await Promise.all(promises);

    }, 10000); // Check loop every 10s (heartbeat needed)
}

main();
