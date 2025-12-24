import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://libro-books.vercel.app'

    // Initialize Supabase Client (safe for server-side generation)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all public rooms
    const { data: rooms } = await supabase
        .from('rooms')
        .select('id, to_tsvector(updated_at)') // fetching updated_at if available, else just IDs
        // Note: Assuming 'updated_at' column exists, otherwise use 'created_at' or default to now
        .eq('privacy', 'public')
        .limit(50000);

    const roomUrls = (rooms || []).map((room) => ({
        url: `${baseUrl}/room/${room.id}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
    }))

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...roomUrls,
    ]
}
