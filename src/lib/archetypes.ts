
export type Archetype = 'Observer' | 'Seeker' | 'Keeper' | 'Scribe' | 'Architect' | 'Void Walker';

export interface UserStats {
    totalTime: number; // seconds
    booksRead: number;
    roomsCreated: number;
    streak: number;
}

export function getArchetype(stats: UserStats): Archetype {
    const { totalTime, booksRead, roomsCreated, streak } = stats;
    const hours = totalTime / 3600;

    // Hierarchy of Archetypes (Highest priority first)

    // 1. The Void Walker: True dedication (High books + High time)
    if (booksRead >= 5 && hours >= 20) return 'Void Walker';

    // 2. The Architect: Creator of spaces
    if (roomsCreated >= 3) return 'Architect';

    // 3. The Keeper: Consistent presence (Streak)
    if (streak >= 7) return 'Keeper';

    // 4. The Scribe: Reader of many things (Volume)
    if (booksRead >= 3) return 'Scribe';

    // 5. The Seeker: Beginning the journey (Time investment)
    if (hours >= 2) return 'Seeker';

    // Default
    return 'Observer';
}

export const ARCHETYPE_DESCRIPTIONS: Record<Archetype, string> = {
    'Observer': "Watching from the shadows. The journey has just begun.",
    'Seeker': "Searching for meaning within the pages.",
    'Keeper': "A guardian of consistency and ritual.",
    'Scribe': "A collector of stories and fragments.",
    'Architect': "Builder of sanctuaries for others.",
    'Void Walker': "One who traverses the deep silence between words."
};
