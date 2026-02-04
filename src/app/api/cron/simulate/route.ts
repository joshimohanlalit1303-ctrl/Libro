import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- Configuration ---
// 128 Indian Names (Same as script)
const BOT_NAMES = [
    // Male
    "Aarav_Sharma", "Vihaan_Verma", "Aditya_Singh", "Arjun_Patel", "Sai_Kumar",
    "Reyansh_Gupta", "Ayaan_Reddy", "Krishna_Das", "Ishaan_Joshi", "Shaurya_Mehta",
    "Rohan_Malhotra", "Vikram_Rao", "Kabir_Nair", "Dhruv_Iyer", "Rian_Chopra",
    "Atharv_Saxena", "Vivaan_Bhat", "Ansh_Kapoor", "Aryan_Yadav", "Dev_Bansal",
    "Karthik_Menon", "Neel_Tiwari", "Rishi_Aggarwal", "Siddharth_Pillai", "Varun_Deshmukh",
    "Rahul_Mishra", "Amit_Dubey", "Kunal_Pandey", "Nikhil_Sinha", "Abhinav_Chaudhary",
    "Advait_Kumar", "Samarth_Joshi", "Yug_Patel", "Vihaan_Sharma", "Rudransh_Singh",
    "Atharva_Gupta", "Ayaan_Khan", "Dhruv_Rawat", "Kabir_Bhat", "Riaan_Malik",
    "Shaurya_Saxena", "Reyansh_Verma", "Aarav_Mehra", "Krishna_Nair", "Ishaan_Reddy",
    "Arjun_Chopra", "Aditya_Das", "Vivaan_Iyer", "Ansh_Sinha", "Aryan_Mishra",
    "Dev_Pillai", "Karthik_Rao", "Neel_Deshmukh", "Rishi_Tiwari", "Siddharth_Kaul",
    "Varun_Bansal", "Rahul_Mehta", "Amit_Agarwal", "Kunal_Pandey", "Nikhil_Dubey",
    "Abhinav_Kapoor", "Pranav_Sethi", "Om_Khanna", "Tejas_Yadav",

    // Female
    "Aadhya_Rana", "Diya_Thakur", "Saanvi_Bose", "Ananya_Ghosh", "Kiara_Sengupta",
    "Myra_Dutta", "Pari_Chatterjee", "Amaya_Banerjee", "Riya_Kulkarni", "Anvi_Hegde",
    "Aarohi_Shetty", "Kavya_Gowda", "Mira_Reddy", "Navya_Naidu", "Sia_Varma",
    "Prisha_Kaur", "Shanaya_Gill", "Kyra_Dhillon", "Ishita_Sandhu", "Jiya_Garg",
    "Anika_Jain", "Meera_Agarwal", "Zara_Khandekwalla", "Ria_Merchant", "Nisha_Soni",
    "Pooja_Kaul", "Sneha_Bhatia", "Tanvi_Deol", "Aditi_Roshan", "Naina_Talwar",
    "Navya_Singh", "Myra_Sharma", "Saanvi_Patel", "Ananya_Gupta", "Aadhya_Reddy",
    "Kiara_Kumar", "Diya_Malik", "Pari_Joshi", "Amaya_Khan", "Riya_Verma",
    "Anvi_Bhat", "Aarohi_Saxena", "Kavya_Rawat", "Mira_Mehra", "Sia_Nair",
    "Prisha_Chopra", "Shanaya_Das", "Kyra_Iyer", "Ishita_Sinha", "Jiya_Mishra",
    "Anika_Pillai", "Meera_Rao", "Zara_Deshmukh", "Ria_Tiwari", "Nisha_Kaul",
    "Pooja_Bansal", "Sneha_Mehta", "Tanvi_Agarwal", "Aditi_Pandey", "Naina_Dubey",
    "Isha_Kapoor", "Sara_Sethi", "Avni_Khanna", "Zoya_Yadav"
];

const JOIN_ROOM_PROBABILITY = 0.5;
const LEAVE_PROBABILITY = 0.05;
const CHAT_PROBABILITY = 0.05;

const CHAT_MESSAGES = [
    "This chapter is intense!", "Loving the flow so far.", "Anyone else find this part confusing?",
    "Such beautiful writing.", "Can't stop reading.", "Taking a break, BRB.", "Who is your favorite character?",
    "Just finished a great section.", "This reminds me of home.", "Reading late tonight!",
    "Good morning everyone.", "This quote is amazing.", "Highly recommend this book.",
    "Silence in the library is bliss."
];

// Initialize Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export async function GET(request: Request) {
    // Check Auth (Optional for demo, recommended for prod)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: "Missing Env" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const log = [] as string[];

    try {
        // 1. Fetch Active Rooms
        const { data: rooms } = await supabase.from('rooms').select('id, name, book_id');
        const activeRooms = (rooms || []).filter(r => r.book_id);

        if (activeRooms.length === 0) {
            return NextResponse.json({ message: "No active rooms" });
        }

        // 2. Identify Bot Users (By Username List)
        // Optimization: Fetch all profiles where username IN list
        // Supabase 'in' query works well
        const { data: botProfiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('username', BOT_NAMES);

        if (!botProfiles || botProfiles.length === 0) {
            return NextResponse.json({ message: "No active bots found", tips: "Run 'npm run simulate' locally once to seed data." });
        }

        const botIds = botProfiles.map(b => b.id);
        const botMap = botProfiles.reduce((acc, b) => ({ ...acc, [b.id]: b }), {} as any);

        // 3. Get Current Participation State
        const { data: participants } = await supabase
            .from('participants')
            .select('user_id, room_id')
            .in('user_id', botIds);

        const activeBotIds = new Set(participants?.map(p => p.user_id));
        const activeBotParticipantMap = participants?.reduce((acc, p) => ({ ...acc, [p.user_id]: p.room_id }), {} as any) || {};

        // 4. Batch Actions
        // We will loop through ALL known bots and decide action
        const updates = [] as Promise<any>[];

        for (const bot of botProfiles) {
            const isReading = activeBotIds.has(bot.id);
            const currentRoomId = activeBotParticipantMap[bot.id];

            if (isReading) {
                // ACTION: Reading
                // 1. Leave Logic
                if (Math.random() < LEAVE_PROBABILITY) {
                    updates.push(
                        supabase.from('participants').delete().eq('room_id', currentRoomId).eq('user_id', bot.id)
                    );
                    log.push(`[LEAVE] ${bot.username}`);
                } else {
                    // 2. Read Update (Heartbeat + Progress)
                    const room = activeRooms.find(r => r.id === currentRoomId);
                    if (room) {
                        const seconds = 60; // Assume 1 min chunk for cron interval
                        updates.push(
                            supabase.from('participants').update({ last_seen: new Date().toISOString() }).eq('room_id', currentRoomId).eq('user_id', bot.id),
                            supabase.rpc('track_reading_time_v4', {
                                user_id_input: bot.id,
                                book_id_input: room.book_id,
                                seconds: seconds
                            })
                        );

                        // 3. Chat Logic
                        if (Math.random() < CHAT_PROBABILITY) {
                            const msg = CHAT_MESSAGES[randomInt(0, CHAT_MESSAGES.length - 1)];
                            updates.push(
                                supabase.from('messages').insert({
                                    room_id: currentRoomId,
                                    user_id: bot.id,
                                    content: msg
                                })
                            );
                            log.push(`[CHAT] ${bot.username}: ${msg}`);
                        }
                    }
                }
            } else {
                // ACTION: Idle -> Join?
                if (Math.random() < JOIN_ROOM_PROBABILITY) {
                    const room = activeRooms[randomInt(0, activeRooms.length - 1)];
                    updates.push(
                        supabase.from('participants').upsert({
                            room_id: room.id,
                            user_id: bot.id,
                            role: 'viewer',
                            last_seen: new Date().toISOString()
                        }, { onConflict: 'room_id,user_id' })
                    );
                    log.push(`[JOIN] ${bot.username} -> ${room.name}`);
                }
            }
        }

        await Promise.all(updates);

        return NextResponse.json({
            success: true,
            active_bots: activeBotIds.size,
            actions: updates.length,
            logs: log.slice(0, 100) // Truncate
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
