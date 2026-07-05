// apps/web/src/types/database.ts
// Supabase 数据库类型定义
// 正式项目中应通过 `supabase gen types typescript` 自动生成

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          travel_preferences: string[] | null;
          reputation_score: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          travel_preferences?: string[] | null;
          reputation_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          travel_preferences?: string[] | null;
          reputation_score?: number;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          destination: string;
          departure: string | null;
          start_date: string;
          end_date: string;
          pace: string;
          traveler_count: number;
          preferences: string[] | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          destination: string;
          departure?: string | null;
          start_date: string;
          end_date: string;
          pace?: string;
          traveler_count?: number;
          preferences?: string[] | null;
          status?: string;
        };
        Update: {
          destination?: string;
          departure?: string | null;
          start_date?: string;
          end_date?: string;
          pace?: string;
          traveler_count?: number;
          preferences?: string[] | null;
          status?: string;
        };
      };
      trip_nodes: {
        Row: {
          id: string;
          trip_id: string;
          spot_id: string | null;
          name: string;
          node_type: string;
          start_time: string;
          duration_minutes: number;
          transit_minutes: number;
          sort_order: number;
          metadata: Json;
        };
        Insert: {
          id?: string;
          trip_id: string;
          spot_id?: string | null;
          name: string;
          node_type?: string;
          start_time: string;
          duration_minutes: number;
          transit_minutes?: number;
          sort_order: number;
          metadata?: Json;
        };
        Update: {
          name?: string;
          node_type?: string;
          start_time?: string;
          duration_minutes?: number;
          transit_minutes?: number;
          sort_order?: number;
          metadata?: Json;
        };
      };
      spots: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          latitude: number;
          longitude: number;
          min_visit_minutes: number;
          recommended_minutes: number;
          rating: number;
          tags: string[] | null;
          opening_time: string | null;
          closing_time: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          latitude: number;
          longitude: number;
          min_visit_minutes?: number;
          recommended_minutes?: number;
          rating?: number;
          tags?: string[] | null;
          opening_time?: string | null;
          closing_time?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          image_url?: string | null;
        };
      };
      ugc_reports: {
        Row: {
          id: string;
          user_id: string;
          spot_id: string;
          trip_id: string | null;
          content: string | null;
          photos: string[] | null;
          rating: number | null;
          user_lat: number | null;
          user_lng: number | null;
          status: string;
          confidence: number | null;
          upvotes: number;
          comment_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          spot_id: string;
          trip_id?: string | null;
          content?: string | null;
          photos?: string[] | null;
          rating?: number | null;
          user_lat?: number | null;
          user_lng?: number | null;
          status?: string;
          confidence?: number | null;
        };
        Update: {
          content?: string | null;
          photos?: string[] | null;
          rating?: number | null;
          status?: string;
          confidence?: number | null;
          upvotes?: number;
        };
      };
      realtime_alerts: {
        Row: {
          id: string;
          trip_id: string;
          alert_type: string;
          priority: string;
          title: string;
          description: string | null;
          confidence: number;
          suggestion: string | null;
          status: string;
          created_at: string;
          dismiss_reason: string | null;
          dismissed_at: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          alert_type: string;
          priority?: string;
          title: string;
          description?: string | null;
          confidence?: number;
          suggestion?: string | null;
          status?: string;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          priority?: string;
          title?: string;
          description?: string | null;
          confidence?: number;
          suggestion?: string | null;
          status?: string;
          dismiss_reason?: string | null;
          dismissed_at?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
    };
  };
}

// ========== 便捷类型别名 ==========
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripNode = Database["public"]["Tables"]["trip_nodes"]["Row"];
export type Spot = Database["public"]["Tables"]["spots"]["Row"];
export type UGCReport = Database["public"]["Tables"]["ugc_reports"]["Row"];
export type RealtimeAlert =
  Database["public"]["Tables"]["realtime_alerts"]["Row"];

// ========== Insert/Update 便捷别名 ==========
export type TripInsert = Database["public"]["Tables"]["trips"]["Insert"];
export type TripNodeInsert =
  Database["public"]["Tables"]["trip_nodes"]["Insert"];
export type UGCReportInsert =
  Database["public"]["Tables"]["ugc_reports"]["Insert"];
export type RealtimeAlertInsert =
  Database["public"]["Tables"]["realtime_alerts"]["Insert"];
