import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    // Warn only in development, or handle gracefully
    console.warn('Supabase credentials missing. Check .env.local');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
