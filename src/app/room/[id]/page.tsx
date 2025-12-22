"use client";

import React from 'react';
import RoomView from '@/components/Room/RoomView';
import { useParams } from 'next/navigation';

export default function RoomPage() {
    const params = useParams();
    const id = params?.id as string;

    if (!id) return <div>Resolving Room...</div>;

    return <RoomView roomId={id} />;
}
