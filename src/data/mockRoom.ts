import { RoomState } from '@/types/room';

export const mockRoomState: RoomState = {
    room_metadata: {
        room_id: "lib-9928-xqa",
        room_name: "Summer Book Club: The Great Gatsby",
        created_at: "2025-12-21T08:30:00Z",
        status: "active",
        privacy: {
            type: "private",
            password_hash: "e3b0c442...",
            max_participants: 12
        }
    },
    content_state: {
        book_id: "isbn-9780743273565",
        format: "epub",
        source_url: "https://api.libro.com/v1/storage/books/gatsby.epub",
        current_location: {
            epub_cfi: "epubcfi(/6/4[chap01]!/4/2/10/2)",
            percentage: 12.5,
            page_number: 24,
            chapter_title: "Chapter 1"
        },
        sync_mode: "host_led"
    },
    participants: [
        {
            user_id: "user_01",
            username: "Alex_Readz",
            role: "host",
            avatar_url: "https://cdn.libro.com/avatars/u01.png",
            is_online: true,
            last_ping: "2025-12-21T08:45:10Z",
            device_info: "Chrome / macOS",
            presence_data: {
                is_typing: false,
                cursor_position: { x: 102, y: 450 }
            }
        }
    ],
    interactive_features: {
        annotations: [
            {
                id: "ann_778",
                user_id: "user_01",
                timestamp: "2025-12-21T08:40:00Z",
                cfi_range: "epubcfi(/6/4[chap01]!/4/2/10/2:5)",
                highlight_color: "#FFEB3B",
                note: "Look at the symbolism of the green light here.",
                is_public: true
            }
        ],
        real_time_chat: {
            channel_id: "chat_9928",
            history_limit: 100,
            enabled: true
        },
        audio_video_bridge: {
            provider: "web-rtc",
            session_id: "rtc_session_001",
            is_muted_by_default: true
        }
    },
    backend_config: {
        websocket_url: "wss://socket.libro.com/v1/rooms/sync",
        heartbeat_interval_ms: 5000,
        persistence: {
            save_on_exit: true,
            auto_archive_after_days: 30
        },
        permissions: {
            can_participants_turn_pages: false,
            can_participants_annotate: true,
            can_invite_others: true
        }
    }
};
