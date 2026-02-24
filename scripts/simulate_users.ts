import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// --- Configuration ---
const TOTAL_BOTS = 92;
const BOT_NAMES = [
    // Male
    "Aarav Sharma", "Vihaan Verma", "Aditya Singh", "Arjun Patel", "Sai Kumar",
    "Reyansh Gupta", "Ayaan Reddy", "Krishna Das", "Ishaan Joshi", "Shaurya Mehta",
    "Rohan Malhotra", "Vikram Rao", "Kabir Nair", "Dhruv Iyer", "Rian Chopra",
    "Atharv Saxena", "Vivaan Bhat", "Ansh Kapoor", "Aryan Yadav", "Dev Bansal",
    "Karthik Menon", "Neel Tiwari", "Rishi Aggarwal", "Siddharth Pillai", "Varun Deshmukh",
    "Rahul Mishra", "Amit Dubey", "Kunal Pandey", "Nikhil Sinha", "Abhinav Chaudhary",
    "Advait Kumar", "Samarth Joshi", "Yug Patel", "Vihaan Roy", "Rudransh Singh",
    "Atharva Gupta", "Ayaan Khan", "Dhruv Rawat", "Kabir Bhat", "Riaan Malik",
    "Shaurya Seth", "Reyansh Khanna", "Aarav Mehra", "Krishna Nair", "Ishaan Kaul",
    "Arjun Chopra", "Aditya Das", "Vivaan Iyer", "Ansh Talwar", "Aryan Mishra",
    "Dev Pillai", "Karthik Rao", "Neel Bhatia", "Rishi Deol", "Siddharth Kaul",
    "Varun Bansal", "Rahul Mehta", "Amit Agarwal", "Kunal Roshan", "Nikhil Dubey",
    "Abhinav Kapoor", "Pranav Sethi", "Om Khanna", "Tejas Yadav",

    // Female
    "Aadhya Rana", "Diya Thakur", "Saanvi Bose", "Ananya Ghosh", "Kiara Sengupta",
    "Myra Dutta", "Pari Chatterjee", "Amaya Banerjee", "Riya Kulkarni", "Anvi Hegde",
    "Aarohi Shetty", "Kavya Gowda", "Mira Reddy", "Navya Naidu", "Sia Varma",
    "Prisha Kaur", "Shanaya Gill", "Kyra Dhillon", "Ishita Sandhu", "Jiya Garg",
    "Anika Jain", "Meera Agarwal", "Zara Khandekwalla", "Ria Merchant", "Nisha Soni",
    "Pooja Kaul", "Sneha Bhatia", "Tanvi Deol", "Aditi Roshan", "Naina Talwar",
    "Navya Singh", "Myra Sharma", "Saanvi Patel", "Ananya Gupta", "Aadhya Shah",
    "Kiara Kumar", "Diya Malik", "Pari Joshi", "Amaya Khan", "Riya Verma",
    "Anvi Bhat", "Aarohi Saxena", "Kavya Rawat", "Mira Mehra", "Sia Nair",
    "Prisha Chopra", "Shanaya Das", "Kyra Iyer", "Ishita Sinha", "Jiya Mishra",
    "Anika Pillai", "Meera Rao", "Zara Deshmukh", "Ria Tiwari", "Nisha Kaul",
    "Pooja Bansal", "Sneha Mehta", "Tanvi Agarwal", "Aditi Pandey", "Naina Dubey",
    "Isha Kapoor", "Sara Sethi", "Avni Khanna", "Zoya Yadav"
];

// WPM Range
const MIN_WPM = 180;
const MAX_WPM = 260;
const AVG_WORDS_PER_PAGE = 250;

// Probabilities
const JOIN_ROOM_PROBABILITY = 0.7;
const CREATE_ROOM_PROBABILITY = 0.1; // 10% Chance to create a room if idle
const CHAT_PROBABILITY = 0.05; // Low probability to avoid spam

const CHAT_MESSAGES = [
    "Interesting chapter.",
    "I like the pacing here.",
    "Taking a moment to digest this.",
    "The imagery is quite vivid.",
    "Good reading session everyone.",
    "Making good progress.",
    "This concept is fascinating.",
    "Enjoying the flow of this book.",
    "Quiet reading time is the best.",
    "Not sure about this character's motivation.",
    "Almost done with this section.",
    "brb, grabbing tea.",
    "back.",
    "This book is better than expected."
];

// --- Types ---
type BotState = 'reading' | 'idle' | 'switching';

interface Bot {
    id: string;
    email: string;
    username: string;
    state: BotState;
    currentRoomId: string | null;
    currentBookId: string | null;
    progress: number; // 0-100
    wpm: number;
    nextActionTime: number; // Timestamp
}

interface RoomInfo {
    id: string;
    name: string;
    book_id: string;
}

interface BookInfo {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    epub_url: string | null;
}

// --- Helpers ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

async function main() {
    console.log("Initializing Simulated User Engine (v2 - with Room Creation)...");

    // 1. Fetch Rooms & Books
    // We maintain a local cache of rooms that bots can join.
    let { data: rooms, error: roomError } = await supabase.from('rooms').select('id, name, book_id');
    if (roomError || !rooms) {
        console.error("Error fetching rooms:", roomError);
        rooms = [];
    }

    // Fetch Books for creation
    const { data: books, error: bookError } = await supabase.from('books').select('id, title, author, cover_url, epub_url').limit(50);
    if (bookError || !books || books.length === 0) {
        console.error("FATAL: No books found. Cannot create rooms.");
        process.exit(1);
    }

    console.log(`Found ${rooms.length} active rooms.`);
    console.log(`Found ${books.length} books available for room creation.`);

    const activeRooms: RoomInfo[] = [...rooms];
    const bots: Bot[] = [];

    // 2. Initialize Bots
    for (const username of BOT_NAMES) {
        // Deterministic Email based on username (replace spaces with dots for email)
        const email = `${username.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
        const password = 'secure_bot_password_123!';

        // Check if user exists, or create
        let userId = '';

        // Try Creating
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username, is_bot: true }
        });

        if (newUser.user) {
            userId = newUser.user.id;
            // Create Profile
            await supabase.from('profiles').upsert({
                id: userId,
                username: username,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                level: randomInt(1, 5), // Fake some level
                total_time_read: randomInt(60, 3600) // Fake some history
            }, { onConflict: 'id' }).select();
        } else if (
            createError?.message?.includes('already registered') ||
            createError?.message?.includes('violates unique constraint') ||
            createError?.code === 'email_exists' ||
            createError?.status === 422
        ) {
            // 1. Try finding in Profiles
            const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single();
            if (profile) {
                userId = profile.id;
            } else {
                // 2. Try finding in Auth via Admin List (increase limit)
                const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                if (listError) {
                    console.error(`ListUsers error for ${username}:`, listError);
                }
                const found = allUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (found) {
                    userId = found.id;
                    // Restore/Ensure profile exists
                    await supabase.from('profiles').upsert({
                        id: userId,
                        username: username,
                        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                        level: randomInt(1, 5),
                        total_time_read: randomInt(60, 3600)
                    }, { onConflict: 'id' });
                } else {
                    console.error(`Could not find existing user ${username} (${email}) in Auth list.`);
                }
            }
        } else {
            console.error(`CreateUser error for ${username}:`, createError);
        }

        if (!userId) {
            console.error(`Failed to initialize bot ${username} - UserID missing`);
            continue;
        }

        // Initialize State
        bots.push({
            id: userId,
            email,
            username,
            state: 'idle',
            currentRoomId: null,
            currentBookId: null,
            progress: 0,
            wpm: randomInt(MIN_WPM, MAX_WPM),
            nextActionTime: Date.now() + randomInt(0, 5000)
        });
    }

    console.log(`Initialized ${bots.length} / ${TOTAL_BOTS} bots.`);

    // 3. Main Loop
    setInterval(async () => {
        const now = Date.now();

        // Optional: Refresh rooms list occasionally to see rooms created by REAL users?
        // For simplicity, we just append when we create. 
        // Real-time complete sync is overkill for now.

        for (const bot of bots) {
            // Heartbeat if online
            if (bot.currentRoomId) {
                await supabase.from('participants')
                    .update({ last_seen: new Date().toISOString() })
                    .eq('room_id', bot.currentRoomId)
                    .eq('user_id', bot.id);
            }

            if (now < bot.nextActionTime) continue;

            // --- State Machine ---
            switch (bot.state) {
                case 'idle':
                    const roll = Math.random();

                    // A. Join Room (70%)
                    if (activeRooms.length > 0 && roll < JOIN_ROOM_PROBABILITY) {
                        const room = activeRooms[randomInt(0, activeRooms.length - 1)];

                        // Join Room
                        const { error: joinError } = await supabase.from('participants').upsert({
                            room_id: room.id,
                            user_id: bot.id,
                            role: 'viewer',
                            last_seen: new Date().toISOString()
                        }, { onConflict: 'room_id,user_id' });

                        if (!joinError) {
                            bot.currentRoomId = room.id;
                            bot.currentBookId = room.book_id;
                            bot.state = 'reading';
                            bot.progress = randomInt(0, 10); // Start at random low progress
                            console.log(`[JOIN] ${bot.username} joined "${room.name}"`);
                            bot.nextActionTime = now + 10000; // 10s warmup
                        }
                    }
                    // B. Create Room (10%)
                    else if (roll < (JOIN_ROOM_PROBABILITY + CREATE_ROOM_PROBABILITY)) {
                        // Create a new room
                        const book = books[randomInt(0, books.length - 1)];
                        const roomName = `Reading ${book.title}`;
                        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

                        const { data: newRoom, error: createError } = await supabase.from('rooms').insert({
                            name: roomName,
                            description: `Hosted by ${bot.username}`,
                            book_id: book.id,
                            epub_url: book.epub_url,
                            cover_url: book.cover_url,
                            privacy: 'public',
                            owner_id: bot.id,
                            access_code: accessCode,
                            max_participants: 50
                        }).select().single();

                        if (newRoom && !createError) {
                            console.log(`[CREATE] ${bot.username} created room "${roomName}"!`);

                            // Add to local list
                            activeRooms.push({ id: newRoom.id, name: newRoom.name, book_id: newRoom.book_id });

                            // Auto-join as host
                            await supabase.from('participants').insert({
                                room_id: newRoom.id,
                                user_id: bot.id,
                                role: 'host',
                                last_seen: new Date().toISOString()
                            });

                            bot.currentRoomId = newRoom.id;
                            bot.currentBookId = book.id;
                            bot.state = 'reading';
                            bot.progress = 0;
                            bot.nextActionTime = now + 5000;
                        } else {
                            console.error(`[CREATE_FAIL] ${bot.username} failed to create room: ${createError?.message}`);
                            bot.nextActionTime = now + 10000;
                        }
                    }
                    else {
                        // Stay idle
                        bot.nextActionTime = now + randomInt(30000, 60000);
                    }
                    break;

                case 'reading':
                    // Action: Browse / Turn Page / Leave

                    // 1. Chance to Leave (Churn)
                    if (Math.random() < 0.05) { // 5% chance per "page turn" to leave
                        if (bot.currentRoomId) {
                            await supabase.from('participants').delete().eq('room_id', bot.currentRoomId).eq('user_id', bot.id);
                            console.log(`[LEAVE] ${bot.username} left room.`);
                            bot.currentRoomId = null;
                            bot.currentBookId = null;
                            bot.state = 'idle';
                            bot.nextActionTime = now + randomInt(60000, 300000); // Break for 1-5 mins
                        }
                        break;
                    }

                    // 2. Turn Page (Calculate Delay based on WPM)
                    const secondsToRead = (AVG_WORDS_PER_PAGE / bot.wpm) * 60;
                    const variance = randomFloat(0.8, 1.2);
                    const readTimeMs = secondsToRead * variance * 1000;

                    // Execute "Page Turn" (Update Progress)
                    const percentGain = randomFloat(0.5, 1.5);
                    bot.progress = Math.min(100, bot.progress + percentGain);

                    console.log(`[READ] ${bot.username} progress: ${bot.progress.toFixed(2)}% (WPM: ${bot.wpm})`);

                    // 3. Update DB Stats
                    if (bot.currentBookId) {
                        await supabase.from('user_progress').upsert({
                            user_id: bot.id,
                            book_id: bot.currentBookId,
                            current_page: Math.floor(bot.progress), // approximating % to page for now
                            progress_percentage: bot.progress,
                            last_read: new Date().toISOString()
                        }, { onConflict: 'user_id,book_id' });
                    }

                    // Update Total Time Read via RPC
                    await supabase.rpc('track_reading_time', {
                        seconds: Math.floor(secondsToRead * variance),
                        user_id_input: bot.id
                    });

                    // 4. Chance to Chat
                    if (Math.random() < CHAT_PROBABILITY && bot.currentRoomId) {
                        const msg = CHAT_MESSAGES[randomInt(0, CHAT_MESSAGES.length - 1)];
                        await supabase.from('messages').insert({
                            room_id: bot.currentRoomId,
                            user_id: bot.id,
                            content: msg
                        });
                        console.log(`[CHAT] ${bot.username}: ${msg}`);
                    }

                    bot.nextActionTime = now + readTimeMs;

                    if (bot.progress >= 100) {
                        console.log(`[FINISH] ${bot.username} finished book.`);
                        bot.state = 'idle';
                        bot.progress = 0;
                        bot.nextActionTime = now + randomInt(60000, 120000);
                    }
                    break;
            }
        }
    }, 5000); // 5s tick
}

main().catch(console.error);
