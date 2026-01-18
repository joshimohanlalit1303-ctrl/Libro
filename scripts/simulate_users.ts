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
        const email = `${name.toLowerCase().replace(/\s/g, '.')}@example.com`;
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { username: name, gender: Math.random() > 0.5 ? 'male' : 'female' }
        });

        let userId = user?.user?.id;

        if (createError) {
            // console.log(`[DEBUG] Error creating ${name}: ${createError.message}`);
            if (createError.message.includes("already registered")) {
                // Try to find user by email.
                // Ideally we'd filter, but supabase-js admin listUsers doesn't always support aggressive filtering without RLS context?
                // Actually listUsers() ensures we get users. Let's fetch a larger page to be safe.
                const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

                if (listData && listData.users) {
                    const existing = listData.users.find(u => u.email === email);
                    if (existing) {
                        userId = existing.id;
                        // console.log(`[DEBUG] Found existing ID for ${name}: ${userId}`);
                    } else {
                        console.warn(`[WARN] User ${name} said registered but not found in list (len ${listData.users.length}).`);
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
            // We initialize counts if null, but upsert preserves existing if we don't specify defaults in SQL
        });

        const startRoom = getRandomRoom();

        bots.push({
            id: userId,
            name,
            state: 'reading', // Start reading
            currentRoomId: startRoom.id,
            currentRoomName: startRoom.name,
            progress: Math.floor(Math.random() * 50),
            color: HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)]
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

    // 4. Main Activity Loop (Runs every 3 seconds)
    setInterval(async () => {
        const promises = bots.map(async (bot) => {

            // --- STATE: SWITCHING ---
            if (bot.state === 'switching') {
                if (bot.currentRoomId) {
                    // Leave old room
                    await supabase.from('participants').delete().match({ room_id: bot.currentRoomId, user_id: bot.id });
                    // Broadcast leave? Not strictly needed, presence handles it.
                }

                // Pick new room
                const newRoom = getRandomRoom();
                bot.currentRoomId = newRoom.id;
                bot.currentRoomName = newRoom.name;
                bot.progress = 0; // Reset progress for new book

                // Join new room
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
                // Heartbeat
                await supabase.from('participants').update({ last_seen: new Date().toISOString() })
                    .match({ room_id: bot.currentRoomId, user_id: bot.id });

                // Update Progress (Faster reading for demo)
                bot.progress += (Math.random() * 2);

                // Broadcast Position
                const channel = roomChannels[bot.currentRoomId];
                if (channel) {
                    await channel.send({
                        type: 'broadcast', event: 'location_change',
                        payload: { username: bot.name, percentage: Math.min(100, Math.round(bot.progress)) }
                    });
                }

                // Update Leaderboard Time (Add 3-10 seconds)
                const addedSeconds = Math.floor(Math.random() * 7) + 3;

                // Direct SQL update to be sure
                // Using a raw query to increment is safest but not exposed easily. 
                // We'll read-update-write.
                const { data: prof } = await supabase.from('profiles').select('total_time_read').eq('id', bot.id).single();
                if (prof) {
                    await supabase.from('profiles').update({
                        total_time_read: (prof.total_time_read || 0) + addedSeconds
                    }).eq('id', bot.id);
                }

                // CHECK COMPLETION
                if (bot.progress >= 100) {
                    console.log(`[FINISH] ${bot.name} finished a book!`);

                    // Increment Books Read
                    const { data: prof2 } = await supabase.from('profiles').select('books_read_count').eq('id', bot.id).single();
                    if (prof2) {
                        await supabase.from('profiles').update({
                            books_read_count: (prof2.books_read_count || 0) + 1
                        }).eq('id', bot.id);
                    }

                    // Switch room soon
                    bot.state = 'switching';
                }

                // RANDOM EVENTS
                // 1% chance to just switch rooms unexpectedly (bored)
                if (Math.random() < 0.01) {
                    bot.state = 'switching';
                }

                // 2% chance to chat
                if (Math.random() < 0.02) {
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
        // process.stdout.write('.');

    }, 3000); // 3-second tick
}

main();
