import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials');
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

async function main() {
    console.log(`Tagging ${BOT_NAMES.length} bots...`);

    // 1. Update profiles where username is in BOT_NAMES
    const { error: updateError, count } = await supabase
        .from('profiles')
        .update({ is_bot: true })
        .in('username', BOT_NAMES)
        .select();

    if (updateError) {
        console.error('Error tagging bots:', updateError);
    } else {
        console.log(`Successfully tagged ${count} bots as 'is_bot: true'.`);
    }

    // 2. Also ensure non-bots are false (default handles this, but good to be sure if we used any other logic)
}

main();
