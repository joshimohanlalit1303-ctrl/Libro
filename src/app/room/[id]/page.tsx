
import { Metadata, ResolvingMetadata } from 'next';
import RoomView from '@/components/Room/RoomView';
import { createClient } from '@supabase/supabase-js';

// Create a direct client for server-side fetching to avoid context issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata(
    props: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const params = await props.params;
    const id = params.id;

    // fetch data
    const { data: room } = await supabase
        .from('rooms')
        .select('name, description, cover_url')
        .eq('id', id)
        .single();

    if (!room) {
        return {
            title: 'Room Not Found | Libro',
        }
    }

    const previousImages = (await parent).openGraph?.images || []

    return {
        title: `${room.name} | Libro`,
        description: room.description || `Join the reading room for ${room.name} on Libro.`,
        openGraph: {
            title: `${room.name} | Libro`,
            description: room.description || `Join the reading room for ${room.name} on Libro.`,
            images: room.cover_url ? [room.cover_url, ...previousImages] : previousImages,
        },
    }
}

export default async function RoomPage(props: Props) {
    const params = await props.params;
    return <RoomView roomId={params.id} />;
}
