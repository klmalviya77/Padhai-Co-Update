export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_uploads: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          upload_count: number
          upload_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          upload_count?: number
          upload_date?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          upload_count?: number
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      fulfillment_votes: {
        Row: {
          created_at: string | null
          fulfillment_id: string
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          fulfillment_id: string
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          fulfillment_id?: string
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_votes_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "request_fulfillments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      note_requests: {
        Row: {
          category: Database["public"]["Enums"]["education_category"]
          created_at: string | null
          description: string | null
          expires_at: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          level: string
          points_offered: number
          requester_id: string
          status: string
          subject: string
          topic: string
        }
        Insert: {
          category: Database["public"]["Enums"]["education_category"]
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          level: string
          points_offered: number
          requester_id: string
          status?: string
          subject: string
          topic: string
        }
        Update: {
          category?: Database["public"]["Enums"]["education_category"]
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          level?: string
          points_offered?: number
          requester_id?: string
          status?: string
          subject?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_requests_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_requests_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_requests_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          category: Database["public"]["Enums"]["education_category"]
          created_at: string | null
          downvotes: number | null
          file_type: string
          file_url: string
          id: string
          level: string
          status: Database["public"]["Enums"]["note_status"] | null
          subject: string
          tags: string[] | null
          topic: string
          trust_score: number | null
          updated_at: string | null
          uploader_id: string
          upvotes: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["education_category"]
          created_at?: string | null
          downvotes?: number | null
          file_type: string
          file_url: string
          id?: string
          level?: string
          status?: Database["public"]["Enums"]["note_status"] | null
          subject: string
          tags?: string[] | null
          topic: string
          trust_score?: number | null
          updated_at?: string | null
          uploader_id: string
          upvotes?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["education_category"]
          created_at?: string | null
          downvotes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          level?: string
          status?: Database["public"]["Enums"]["note_status"] | null
          subject?: string
          tags?: string[] | null
          topic?: string
          trust_score?: number | null
          updated_at?: string | null
          uploader_id?: string
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          course: string | null
          created_at: string | null
          email: string
          full_name: string | null
          gyan_points: number | null
          id: string
          referral_code: string | null
          reputation_level:
            | Database["public"]["Enums"]["reputation_level"]
            | null
          university: string | null
          updated_at: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          gyan_points?: number | null
          id: string
          referral_code?: string | null
          reputation_level?:
            | Database["public"]["Enums"]["reputation_level"]
            | null
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          gyan_points?: number | null
          id?: string
          referral_code?: string | null
          reputation_level?:
            | Database["public"]["Enums"]["reputation_level"]
            | null
          university?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          points_awarded: number | null
          referral_month: string
          referred_user_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          referral_month?: string
          referred_user_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          referral_month?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      request_fulfillments: {
        Row: {
          auto_review_at: string | null
          created_at: string | null
          downvotes: number | null
          file_size: number
          file_type: string
          file_url: string
          id: string
          request_id: string
          reviewed_at: string | null
          status: string
          uploader_id: string
          upvotes: number | null
          validation_errors: string[] | null
          validation_passed: boolean | null
        }
        Insert: {
          auto_review_at?: string | null
          created_at?: string | null
          downvotes?: number | null
          file_size: number
          file_type: string
          file_url: string
          id?: string
          request_id: string
          reviewed_at?: string | null
          status?: string
          uploader_id: string
          upvotes?: number | null
          validation_errors?: string[] | null
          validation_passed?: boolean | null
        }
        Update: {
          auto_review_at?: string | null
          created_at?: string | null
          downvotes?: number | null
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          request_id?: string
          reviewed_at?: string | null
          status?: string
          uploader_id?: string
          upvotes?: number | null
          validation_errors?: string[] | null
          validation_passed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "request_fulfillments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "note_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_fulfillments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_fulfillments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_fulfillments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vote_activity: {
        Row: {
          id: string
          note_id: string
          user_id: string
          vote_timestamp: string | null
          vote_type: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          vote_timestamp?: string | null
          vote_type: string
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          vote_timestamp?: string | null
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_activity_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profile_public: {
        Row: {
          course: string | null
          created_at: string | null
          full_name: string | null
          gyan_points: number | null
          id: string | null
          reputation_level:
            | Database["public"]["Enums"]["reputation_level"]
            | null
          university: string | null
          updated_at: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string | null
          full_name?: string | null
          gyan_points?: number | null
          id?: string | null
          reputation_level?:
            | Database["public"]["Enums"]["reputation_level"]
            | null
          university?: string | null
          updated_at?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string | null
          full_name?: string | null
          gyan_points?: number | null
          id?: string | null
          reputation_level?:
            | Database["public"]["Enums"]["reputation_level"]
            | null
          university?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_leaderboard: {
        Row: {
          gyan_points: number | null
          id: string | null
          reputation_level:
            | Database["public"]["Enums"]["reputation_level"]
            | null
        }
        Insert: {
          gyan_points?: number | null
          id?: string | null
          reputation_level?:
            | Database["public"]["Enums"]["reputation_level"]
            | null
        }
        Update: {
          gyan_points?: number | null
          id?: string | null
          reputation_level?:
            | Database["public"]["Enums"]["reputation_level"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_upload_points: { Args: { _user_id: string }; Returns: undefined }
      check_community_validation: {
        Args: { _fulfillment_id: string }
        Returns: undefined
      }
      check_referral_limit: { Args: { _referrer_id: string }; Returns: boolean }
      check_vote_spam: { Args: { _user_id: string }; Returns: boolean }
      deduct_download_points: {
        Args: { _cost: number; _user_id: string }
        Returns: boolean
      }
      ensure_referral_code: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      get_fulfillment_vote_counts: {
        Args: { fulfillment_uuid: string }
        Returns: {
          downvotes: number
          upvotes: number
        }[]
      }
      get_note_vote_counts: {
        Args: { note_uuid: string }
        Returns: {
          downvotes: number
          upvotes: number
        }[]
      }
      get_referral_stats: {
        Args: { _user_id: string }
        Returns: {
          monthly_referrals: number
          pending_referrals: number
          total_points_earned: number
          total_referrals: number
        }[]
      }
      get_upload_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_upload_count: { Args: { _user_id: string }; Returns: number }
      process_fulfillment_approval: {
        Args: {
          _approved: boolean
          _fulfillment_id: string
          _reviewer_id: string
        }
        Returns: undefined
      }
      validate_fulfillment: {
        Args: { _fulfillment_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      education_category: "programming" | "school" | "university"
      note_status: "pending" | "approved" | "quarantined"
      reputation_level:
        | "Newbie"
        | "Contributor"
        | "Active"
        | "Top Contributor"
        | "Legend"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      education_category: ["programming", "school", "university"],
      note_status: ["pending", "approved", "quarantined"],
      reputation_level: [
        "Newbie",
        "Contributor",
        "Active",
        "Top Contributor",
        "Legend",
      ],
    },
  },
} as const
