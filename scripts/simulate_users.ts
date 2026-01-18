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

const HIGHLIGHT_COLORS = ['#fef3c7', '#d1fae5', '#bfdbfe', '#fbcfe8', '#e9d5ff', '#fecaca', '#fed7aa'];

async function main() {
    let targetRoomId = process.argv[2];
    const botCountInput = process.argv[3];
    const botCount = parseInt(botCountInput || '20', 10);

    console.log("Initializing Bot Simulation...");

    // 1. Fetch Rooms (if no specific room provided, or just to validate)
    const { data: rooms, error: roomError } = await supabase.from('rooms').select('id, name');

    if (roomError || !rooms || rooms.length === 0) {
        console.error("Failed to fetch rooms:", roomError);
        process.exit(1);
    }

    let activeRooms = rooms;
    if (targetRoomId && targetRoomId !== 'auto') {
        const specific = rooms.find(r => r.id === targetRoomId);
        if (!specific) {
            console.error(`Room ID ${targetRoomId} not found in database.`);
            // Fallback to all rooms? No, user might have made a typo.
            // But user asked for "randomly join rooms", so 'auto' logic is good.
        } else {
            activeRooms = [specific];
        }
    } else {
        console.log(`No specific room provided (or 'auto'), utilizing all ${rooms.length} available rooms.`);
    }

    console.log(`Spawning ${botCount} bots across ${activeRooms.length} room(s)...`);

    const bots: any[] = [];

    // Create unique bots
    for (let i = 0; i < botCount; i++) {
        const name = BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ` ${i}` : '');
        const id = randomUUID();
        // Assign to a random room
        const room = activeRooms[Math.floor(Math.random() * activeRooms.length)];

        bots.push({
            id,
            name,
            roomId: room.id,
            roomName: room.name,
            progress: Math.floor(Math.random() * 20),
            color: HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)]
        });
    }

    // 2. Register Profiles/Participants
    console.log('Creating Auth Users and Profiles...');

    for (const bot of bots) {
        // [FIX] Create Auth User first to satisfy Foreign Key
        // valid email needed
        const email = `${bot.name.toLowerCase().replace(/\s/g, '.')}@example.com`;

        // Check if exists or create
        // We use random password, we don't need to log in as them, just need the record.
        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { username: bot.name }
        });

        let userId = user?.user?.id;

        if (createError) {
            // If already exists, try to find their ID (we can't easily query auth.users by email with client, 
            // but admin listUsers works).
            // For simplicity, just log error. In a real script we'd handle existing users better.
            // Actually, if we used deterministic UUIDs we could skip this, but we used random.
            // Let's assume for this run we want fresh users or we catch "Email already registered"
            console.warn(`User creation warning for ${bot.name}: ${createError.message}`);
            if (createError.message.includes("already registered")) {
                // Try to fetch to get ID? Or just skip?
                // Skipping is safer to avoid messing up existing real users if names collide.
                continue;
            }
        }

        if (!userId && !createError) {
            // Should not happen
            continue;
        }

        if (userId) {
            bot.id = userId; // Update bot ID to the real Auth ID

            // NOW Upsert Profile
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: userId,
                username: bot.name,
                avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${userId}&backgroundColor=b6e3f4,c0aede,d1d4f9`
            });

            if (profileError) console.error('Profile error:', profileError.message);

            // Join Room
            const { error: joinError } = await supabase.from('participants').upsert({
                room_id: bot.roomId,
                user_id: userId,
                role: 'viewer',
                last_seen: new Date().toISOString()
            }, { onConflict: 'room_id, user_id' });

            if (joinError) console.error(`Failed to join ${bot.name} to ${bot.roomName}:`, joinError.message);
        }
    }
    console.log("Bots successfully joined.");

    // 3. Realtime Connections
    // We can't easily open limited connections for everyone, but we can open one for each unique room
    // to broadcast "location_change" so real users see it.
    const uniqueRoomIds = [...new Set(bots.map(b => b.roomId))];
    const roomChannels: Record<string, any> = {};

    for (const rid of uniqueRoomIds) {
        roomChannels[rid] = supabase.channel(`room-reader:${rid}`);
        roomChannels[rid].subscribe();
    }
    console.log(`Connected to ${uniqueRoomIds.length} realtime channels for broadcasting.`);

    // 4. Activity Loop
    console.log('Starting Activity Loop. Press Ctrl+C to stop.');

    // Heartbeat (Every 10s)
    setInterval(async () => {
        // Update ALL bots' last_seen
        for (const bot of bots) {
            await supabase.from('participants').update({
                last_seen: new Date().toISOString()
            }).match({ room_id: bot.roomId, user_id: bot.id });
        }
        process.stdout.write('.'); // heartbeat pulse
    }, 10000);

    // Random Actions (Every 2s)
    setInterval(async () => {
        const bot = bots[Math.floor(Math.random() * bots.length)];
        const action = Math.random();

        // Action Distribution:
        // 0.0 - 0.4: Read (Move)
        // 0.4 - 0.5: React/Highlight (Fake DB insert)
        // 0.5 - 0.6: Chat
        // 0.6 - 1.0: Idle

        if (action < 0.4) {
            // MOVE
            bot.progress += (Math.random() * 3);
            if (bot.progress > 99) bot.progress = 0;
            const percentage = Math.round(bot.progress);

            // Broadcast
            const channel = roomChannels[bot.roomId];
            if (channel) {
                await channel.send({
                    type: 'broadcast',
                    event: 'location_change',
                    payload: { username: bot.name, percentage: percentage }
                });
            }
            console.log(`[READ] ${bot.name} @ ${percentage}% in ${bot.roomName}`);
        }
        else if (action < 0.45) {
            // CHAT
            const msg = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
            await supabase.from('messages').insert({
                room_id: bot.roomId,
                user_id: bot.id,
                content: msg
            });
            console.log(`[CHAT] ${bot.name} in ${bot.roomName}: "${msg}"`);
        }
        else if (action < 0.5) {
            // HIGHLIGHT (Fake it by inserting to DB so it persists)
            // We need a proper CFI for this to actually render, which is hard.
            // But we can insert a dummy one just to trigger the "Activity" or side effects.
            // Actually, without a valid CFI matching the book content, it won't render in the reader.
            // But we can try inserting a random "fake" CFI to see if it shows up in lists?
            // "epubcfi(/6/14!/4/2/1:0,/1:10)" - generic format
            const fakeCfi = `epubcfi(/6/${10 + Math.floor(Math.random() * 10)}!/4/2/${1 + Math.floor(Math.random() * 100)}:0,/1:${Math.floor(Math.random() * 50)})`;

            // We need a book_id. This script doesn't know the book_id of the room easily without querying.
            // Let's query book_id for the room if we haven't.
            // Optimization: Skip strict highlighting for now as getting valid CFIs is complex without book parsing.
            // Instead, maybe just a "Reaction"?
            console.log(`[IDLE] ${bot.name} is reading intently...`);
        }

        // [NEW] Simulate Reading Time Accumulation for Leaderboard
        // We use direct DB update since 'track_reading_time' relies on auth.uid() which we don't have for bots in this context
        const { data: profile } = await supabase.from('profiles').select('total_time_read').eq('id', bot.id).single();
        if (profile) {
            const current = profile.total_time_read || 0;
            const added = Math.floor(Math.random() * 10) + 1;
            await supabase.from('profiles').update({
                total_time_read: current + added
            }).eq('id', bot.id);
        }
    }, 2000);
}

main();
