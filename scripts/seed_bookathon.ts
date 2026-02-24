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

async function seed() {
    console.log("🚀 Starting Bookathon Seeding...");

    // 1. Get some books to complete
    const { data: books } = await supabase.from('books').select('id').limit(10);
    if (!books || books.length === 0) {
        console.error("❌ No books found in database to complete.");
        return;
    }

    const targetCount = 124;
    const names = BOT_NAMES.slice(0, targetCount);

    for (const name of names) {
        // Create/Get user
        const { data: user, error: userError } = await supabase.auth.admin.createUser({
            email: `${name.toLowerCase()}@bookathon.in`,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: name.replace('_', ' ') }
        });

        let userId = '';
        if (userError) {
            if (userError.message.includes('already registered')) {
                // Get existing user
                const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', name).single();
                if (existingUser) userId = existingUser.id;
            } else {
                console.error(`❌ Error creating user ${name}:`, userError.message);
                continue;
            }
        } else {
            userId = user.user.id;
            // Update profile username
            await supabase.from('profiles').update({ username: name, full_name: name.replace('_', ' ') }).eq('id', userId);
        }

        if (!userId) {
            // Find by email if username check failed
            const { data: usersRef } = await supabase.auth.admin.listUsers();
            const found = usersRef.users.find(u => u.email === `${name.toLowerCase()}@bookathon.in`);
            if (found) userId = found.id;
        }

        if (!userId) continue;

        // 2. Random 1-3 books finished
        const booksToFinishCount = Math.floor(Math.random() * 3) + 1;
        const shuffledBooks = [...books].sort(() => 0.5 - Math.random());
        const selectedBooks = shuffledBooks.slice(0, booksToFinishCount);

        let totalTime = 0;
        for (const book of selectedBooks) {
            const timeRead = Math.floor(Math.random() * 5000) + 3000; // 50-130 mins per book
            totalTime += timeRead;

            await supabase.from('user_progress').upsert({
                user_id: userId,
                book_id: book.id,
                progress_percentage: 100,
                is_completed: true,
                time_read_seconds: timeRead,
                last_read_at: new Date().toISOString()
            }, { onConflict: 'user_id,book_id' });
        }

        // 3. Update profile stats
        await supabase.from('profiles').update({
            books_read_count: booksToFinishCount,
            total_time_read: totalTime,
            xp: booksToFinishCount * 50 + Math.floor(totalTime / 60)
        }).eq('id', userId);

        console.log(`✅ Seeded ${name} with ${booksToFinishCount} books and ${Math.round(totalTime / 60)} mins.`);
    }

    console.log("🏁 Seeding Complete!");
}

seed();
