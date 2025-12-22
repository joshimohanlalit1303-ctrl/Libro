export interface RoomMetadata {
  room_id?: string;
  room_name: string;
  created_at?: string;
  status?: 'active' | 'archived';
  privacy: {
    type: 'private' | 'public';
    password_hash?: string;
    max_participants: number;
  };
}

export interface ContentState {
  book_id: string;
  format: 'epub' | 'pdf';
  source_url: string;
  current_location: {
    epub_cfi: string;
    percentage: number;
    page_number: number;
    chapter_title: string;
    scrollTop?: number; // For non-epub formats if needed
  };
  sync_mode: 'host_led' | 'collaborative';
}

export interface Participant {
  user_id: string;
  username: string;
  role: 'host' | 'viewer';
  avatar_url: string;
  is_online: boolean;
  last_ping: string;
  device_info: string;
  presence_data: {
    is_typing: boolean;
    cursor_position?: { x: number; y: number };
  };
}

export interface Annotation {
  id: string;
  user_id: string;
  timestamp: string;
  cfi_range: string;
  highlight_color: string;
  note: string;
  is_public: boolean;
}

export interface InteractiveFeatures {
  annotations: Annotation[];
  real_time_chat: {
    channel_id: string;
    history_limit: number;
    enabled: boolean;
  };
  audio_video_bridge: {
    provider: 'web-rtc' | 'zoom' | 'other';
    session_id: string;
    is_muted_by_default: boolean;
  };
}

export interface BackendConfig {
  websocket_url: string;
  heartbeat_interval_ms: number;
  persistence: {
    save_on_exit: boolean;
    auto_archive_after_days: number;
  };
  permissions: {
    can_participants_turn_pages: boolean;
    can_participants_annotate: boolean;
    can_invite_others: boolean;
  };
}

export interface RoomState {
  room_metadata: RoomMetadata;
  content_state: ContentState;
  participants: Participant[];
  interactive_features: InteractiveFeatures;
  backend_config: BackendConfig;
}
