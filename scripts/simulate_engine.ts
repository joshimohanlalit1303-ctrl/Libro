
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// --- Configuration ---
const TOTAL_BOTS = 128;

// 60 Indian Names (Mixed Gender)
const BOT_NAMES = [
    // Male
    "Aarav_Sharma", "Vihaan_Verma", "Aditya_Singh", "Arjun_Patel", "Sai_Kumar",
    "Reyansh_Gupta", "Ayaan_Reddy", "Krishna_Das", "Ishaan_Joshi", "Shaurya_Mehta",
    "Rohan_Malhotra", "Vikram_Rao", "Kabir_Nair", "Dhruv_Iyer", "Rian_Chopra",
    "Atharv_Saxena", "Vivaan_Bhat", "Ansh_Kapoor", "Aryan_Yadav", "Dev_Bansal",
    "Karthik_Menon", "Neel_Tiwari", "Rishi_Aggarwal", "Siddharth_Pillai", "Varun_Deshmukh",
    "Rahul_Mishra", "Amit_Dubey", "Kunal_Pandey", "Nikhil_Sinha", "Abhinav_Chaudhary",

    // Female
    "Aadhya_Rana", "Diya_Thakur", "Saanvi_Bose", "Ananya_Ghosh", "Kiara_Sengupta",
    "Myra_Dutta", "Pari_Chatterjee", "Amaya_Banerjee", "Riya_Kulkarni", "Anvi_Hegde",
    "Aarohi_Shetty", "Kavya_Gowda", "Mira_Reddy", "Navya_Naidu", "Sia_Varma",
    "Prisha_Kaur", "Shanaya_Gill", "Kyra_Dhillon", "Ishita_Sandhu", "Jiya_Garg",
    "Anika_Jain", "Meera_Agarwal", "Zara_Khandekwalla", "Ria_Merchant", "Nisha_Soni",
    "Pooja_Kaul", "Sneha_Bhatia", "Tanvi_Deol", "Aditi_Roshan", "Naina_Talwar",

    // New 68 Names
    // Male
    "Advait_Kumar", "Samarth_Joshi", "Yug_Patel", "Vihaan_Sharma", "Rudransh_Singh",
    "Atharva_Gupta", "Ayaan_Khan", "Dhruv_Rawat", "Kabir_Bhat", "Riaan_Malik",
    "Shaurya_Saxena", "Reyansh_Verma", "Aarav_Mehra", "Krishna_Nair", "Ishaan_Reddy",
    "Arjun_Chopra", "Aditya_Das", "Vivaan_Iyer", "Ansh_Sinha", "Aryan_Mishra",
    "Dev_Pillai", "Karthik_Rao", "Neel_Deshmukh", "Rishi_Tiwari", "Siddharth_Kaul",
    "Varun_Bansal", "Rahul_Mehta", "Amit_Agarwal", "Kunal_Pandey", "Nikhil_Dubey",
    "Abhinav_Kapoor", "Pranav_Sethi", "Om_Khanna", "Tejas_Yadav",

    // Female
    "Navya_Singh", "Myra_Sharma", "Saanvi_Patel", "Ananya_Gupta", "Aadhya_Reddy",
    "Kiara_Kumar", "Diya_Malik", "Pari_Joshi", "Amaya_Khan", "Riya_Verma",
    "Anvi_Bhat", "Aarohi_Saxena", "Kavya_Rawat", "Mira_Mehra", "Sia_Nair",
    "Prisha_Chopra", "Shanaya_Das", "Kyra_Iyer", "Ishita_Sinha", "Jiya_Mishra",
    "Anika_Pillai", "Meera_Rao", "Zara_Deshmukh", "Ria_Tiwari", "Nisha_Kaul",
    "Pooja_Bansal", "Sneha_Mehta", "Tanvi_Agarwal", "Aditi_Pandey", "Naina_Dubey",
    "Isha_Kapoor", "Sara_Sethi", "Avni_Khanna", "Zoya_Yadav"
];

// WPM Range (Casual to Fast)
const MIN_WPM = 160;
const MAX_WPM = 280;
const AVG_WORDS_PER_PAGE = 250;

// Probabilities / Config
const JOIN_ROOM_PROBABILITY = 0.4;
const LEAVE_PROBABILITY = 0.02; // Low churn for stability
const CHAT_PROBABILITY = 0.05;

const CHAT_MESSAGES = [
    "This chapter is intense!",
    "Loving the flow so far.",
    "Anyone else find this part confusing?",
    "Such beautiful writing.",
    "Can't stop reading.",
    "Taking a break, BRB.",
    "Who is your favorite character?",
    "Just finished a great section.",
    "This reminds me of home.",
    "Reading late tonight!",
    "Good morning everyone.",
    "This quote is amazing.",
    "Highly recommend this book.",
    "Silence in the library is bliss."
];

// --- Types ---
type BotState = 'reading' | 'idle';

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

// --- Helpers ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

async function main() {
    console.log(`Initializing Simulated Reader Engine for ${TOTAL_BOTS} Indian Personas...`);

    // 1. Fetch Rooms & Books (Need targets)
    let { data: rooms, error: roomError } = await supabase.from('rooms').select('id, name, book_id');
    if (roomError || !rooms || rooms.length === 0) {
        console.error("No active rooms found. Please create some rooms manually first!");
        // We could create rooms, but for "Reader Engine", joining existing is safer demo.
        // Actually, let's just create one if none exist? No, user has rooms.
        process.exit(1);
    }

    // Filter rooms that have valid books
    const activeRooms = rooms.filter(r => r.book_id);
    console.log(`Targeting ${activeRooms.length} active rooms.`);

    const bots: Bot[] = [];

    // 2. Initialize / Fetch Bots
    console.log("Syncing Bot Profiles...");

    for (const username of BOT_NAMES) {
        const email = `${username.toLowerCase()}@sim.libro.me`;
        const password = 'simulated_secure_pass'; // Irrelevant, using admin client

        let userId = '';

        // Check if user exists (by email) to avoid spamming Auth
        // Using Admin List is heavy, so we try optimized check or just create and catch error
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingAuth = listData.users.find(u => u.email === email);

        if (existingAuth) {
            userId = existingAuth.id;
        } else {
            // Create New Auth User
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { username, is_bot: true, country: 'IN' }
            });

            if (newUser.user) {
                userId = newUser.user.id;
            } else {
                console.error(`Failed to create auth for ${username}:`, createError?.message);
                continue;
            }
        }

        // Ensure Profile Exists
        // Use Indian-specific Dicebear seed explicitly
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&skinColor=f8d25c,ffdbb4&hairColor=2c1b18,4a312c,000000`; // Warm skin tones, dark hair

        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            username: username,
            avatar_url: avatarUrl,
            // Randomize existing stats for realism
            streak_count: randomInt(3, 120),
            total_time_read: randomInt(3600, 360000), // 1 hour to 100 hours
            total_time_read: randomInt(3600, 360000), // 1 hour to 100 hours
            last_active_date: new Date().toISOString().split('T')[0],
            is_bot: true
        }, { onConflict: 'id' });

        if (profileError) {
            console.error(`Profile sync error for ${username}:`, profileError.message);
        }

        // Initialize Bot State
        bots.push({
            id: userId,
            email,
            username,
            state: 'idle',
            currentRoomId: null,
            currentBookId: null,
            progress: randomFloat(0, 90), // ongoing reading
            wpm: randomInt(MIN_WPM, MAX_WPM),
            nextActionTime: Date.now() + randomInt(0, 10000) // Staggered start
        });
    }

    console.log(`Engine Ready. Controlling ${bots.length} personas.`);
    console.log(`Engine Ready. Controlling ${bots.length} personas.`);

    const runLoop = async () => {
        const now = Date.now();

        for (const bot of bots) {
            // Heartbeat if online (every cycle)
            if (bot.currentRoomId) {
                supabase.from('participants')
                    .update({ last_seen: new Date().toISOString() })
                    .eq('room_id', bot.currentRoomId)
                    .eq('user_id', bot.id)
                    .then(() => { });
            }

            if (now < bot.nextActionTime) continue;

            // Logic
            if (bot.state === 'idle') {
                // Join Logic
                if (Math.random() < JOIN_ROOM_PROBABILITY && activeRooms.length > 0) {
                    const room = activeRooms[randomInt(0, activeRooms.length - 1)];
                    const { error } = await supabase.from('participants').upsert({
                        room_id: room.id,
                        user_id: bot.id,
                        role: 'viewer',
                        last_seen: new Date().toISOString()
                    }, { onConflict: 'room_id,user_id' });

                    if (!error) {
                        bot.currentRoomId = room.id;
                        bot.currentBookId = room.book_id;
                        bot.state = 'reading';
                        // console.log(`[JOIN] ${bot.username} -> ${room.name}`);
                        bot.nextActionTime = now + 10000;
                    }
                } else {
                    bot.nextActionTime = now + 30000;
                }
            } else if (bot.state === 'reading') {
                // Read Logic
                if (Math.random() < LEAVE_PROBABILITY) {
                    if (bot.currentRoomId) {
                        await supabase.from('participants').delete().eq('room_id', bot.currentRoomId).eq('user_id', bot.id);
                        // console.log(`[LEAVE] ${bot.username} left.`);
                        bot.currentRoomId = null;
                        bot.state = 'idle';
                        bot.nextActionTime = now + randomInt(60000, 300000);
                    }
                } else {
                    // Read chunk
                    const seconds = 30;
                    bot.progress = Math.min(100, bot.progress + 0.5);

                    if (bot.currentBookId) {
                        try {
                            await supabase.rpc('track_reading_time_v4', {
                                user_id_input: bot.id,
                                book_id_input: bot.currentBookId,
                                seconds: seconds
                            });

                            if (Math.random() < CHAT_PROBABILITY && bot.currentRoomId) {
                                const msg = CHAT_MESSAGES[randomInt(0, CHAT_MESSAGES.length - 1)];
                                await supabase.from('messages').insert({
                                    room_id: bot.currentRoomId,
                                    user_id: bot.id,
                                    content: msg
                                });
                                // console.log(`[CHAT] ${bot.username}: ${msg}`);
                            }
                        } catch (e) { }
                    }
                    bot.nextActionTime = now + (seconds * 1000);
                }
            }
        }
    };

    // Check for --once flag (for GitHub Actions / Cron)
    if (process.argv.includes('--once')) {
        console.log("Running single simulation cycle (--once)...");
        await runLoop();
        console.log("Cycle complete.");
        process.exit(0);
    } else {
        console.log("Simulation Loop Running... (Press Ctrl+C to stop)");
        setInterval(runLoop, 5000 * 2);
    }

}
}

main().catch(console.error);
