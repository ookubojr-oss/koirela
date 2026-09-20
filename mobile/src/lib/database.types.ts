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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          note: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          note?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          note?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          counselor_id: string | null
          created_at: string
          duration_seconds: number
          ended_at: string | null
          ends_at: string | null
          id: string
          price_jpy: number
          started_at: string | null
          status: Database["public"]["Enums"]["consultation_status"]
          user_id: string | null
        }
        Insert: {
          counselor_id?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          ends_at?: string | null
          id?: string
          price_jpy?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          user_id?: string | null
        }
        Update: {
          counselor_id?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          ends_at?: string | null
          id?: string
          price_jpy?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "consultations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      counselor_availability: {
        Row: {
          counselor_id: string
          is_accepting: boolean
          updated_at: string
        }
        Insert: {
          counselor_id: string
          is_accepting?: boolean
          updated_at?: string
        }
        Update: {
          counselor_id?: string
          is_accepting?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counselor_availability_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: true
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      counselor_payout_accounts: {
        Row: {
          account_holder_masked: string | null
          bank_label: string | null
          charges_enabled: boolean
          counselor_id: string
          details_submitted: boolean
          last_synced_at: string | null
          payouts_enabled: boolean
          provider: string
          provider_account_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_holder_masked?: string | null
          bank_label?: string | null
          charges_enabled?: boolean
          counselor_id: string
          details_submitted?: boolean
          last_synced_at?: string | null
          payouts_enabled?: boolean
          provider?: string
          provider_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_holder_masked?: string | null
          bank_label?: string | null
          charges_enabled?: boolean
          counselor_id?: string
          details_submitted?: boolean
          last_synced_at?: string | null
          payouts_enabled?: boolean
          provider?: string
          provider_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counselor_payout_accounts_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: true
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      counselor_profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          counselor_type: string
          created_at: string
          display_name: string
          gender: string | null
          is_suspended: boolean
          qualification_label: string | null
          specialty: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          counselor_type: string
          created_at?: string
          display_name: string
          gender?: string | null
          is_suspended?: boolean
          qualification_label?: string | null
          specialty?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          counselor_type?: string
          created_at?: string
          display_name?: string
          gender?: string | null
          is_suspended?: boolean
          qualification_label?: string | null
          specialty?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "counselor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_events: {
        Row: {
          app_version: string | null
          context: Json
          created_at: string
          id: number
          message: string
          name: string | null
          severity: string
          source: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          context?: Json
          created_at?: string
          id?: never
          message: string
          name?: string | null
          severity?: string
          source: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          context?: Json
          created_at?: string
          id?: never
          message?: string
          name?: string | null
          severity?: string
          source?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_identities: {
        Row: {
          created_at: string
          provider: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          counselor_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          counselor_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          counselor_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          counselor_id: string
          created_at: string
          document_path: string | null
          identity_fingerprint_hash: string | null
          provider: string | null
          provider_reference: string | null
          qualification_document_path: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          counselor_id: string
          created_at?: string
          document_path?: string | null
          identity_fingerprint_hash?: string | null
          provider?: string | null
          provider_reference?: string | null
          qualification_document_path?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          counselor_id?: string
          created_at?: string
          document_path?: string | null
          identity_fingerprint_hash?: string | null
          provider?: string | null
          provider_reference?: string | null
          qualification_document_path?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: true
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          consultation_id: string
          created_at: string
          id: number
          kind: Database["public"]["Enums"]["message_kind"]
          sender_id: string | null
        }
        Insert: {
          body: string
          consultation_id: string
          created_at?: string
          id?: never
          kind?: Database["public"]["Enums"]["message_kind"]
          sender_id?: string | null
        }
        Update: {
          body?: string
          consultation_id?: string
          created_at?: string
          id?: never
          kind?: Database["public"]["Enums"]["message_kind"]
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_events: {
        Row: {
          action: string
          attempted_message: string | null
          category: string
          consultation_id: string | null
          context: Json
          counselor_id: string | null
          created_at: string
          detector: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["moderation_source"]
          status: Database["public"]["Enums"]["moderation_status"]
          strike_number: number
        }
        Insert: {
          action: string
          attempted_message?: string | null
          category: string
          consultation_id?: string | null
          context?: Json
          counselor_id?: string | null
          created_at?: string
          detector?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: Database["public"]["Enums"]["moderation_source"]
          status?: Database["public"]["Enums"]["moderation_status"]
          strike_number?: number
        }
        Update: {
          action?: string
          attempted_message?: string | null
          category?: string
          consultation_id?: string | null
          context?: Json
          counselor_id?: string | null
          created_at?: string
          detector?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["moderation_source"]
          status?: Database["public"]["Enums"]["moderation_status"]
          strike_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "moderation_events_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_events_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "moderation_events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          counselor_online: boolean
          enabled: boolean
          one_minute_warning: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          counselor_online?: boolean
          enabled?: boolean
          one_minute_warning?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          counselor_online?: boolean
          enabled?: boolean
          one_minute_warning?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          app_redirect_uri: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          nonce: string
          provider: string
          state_hash: string
        }
        Insert: {
          app_redirect_uri: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          nonce: string
          provider: string
          state_hash: string
        }
        Update: {
          app_redirect_uri?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          nonce?: string
          provider?: string
          state_hash?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_jpy: number
          applied_at: string | null
          consultation_id: string
          created_at: string
          id: string
          kind: string
          payer_id: string | null
          provider: string
          provider_payment_intent_id: string | null
          provider_refund_id: string | null
          refunded_payment_intent_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_jpy: number
          applied_at?: string | null
          consultation_id: string
          created_at?: string
          id?: string
          kind?: string
          payer_id?: string | null
          provider?: string
          provider_payment_intent_id?: string | null
          provider_refund_id?: string | null
          refunded_payment_intent_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount_jpy?: number
          applied_at?: string | null
          consultation_id?: string
          created_at?: string
          id?: string
          kind?: string
          payer_id?: string | null
          provider?: string
          provider_payment_intent_id?: string | null
          provider_refund_id?: string | null
          refunded_payment_intent_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_items: {
        Row: {
          amount_jpy: number
          payment_id: string
          payout_id: string
        }
        Insert: {
          amount_jpy: number
          payment_id: string
          payout_id: string
        }
        Update: {
          amount_jpy?: number
          payment_id?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          counselor_id: string | null
          created_at: string
          gross_jpy: number
          id: string
          net_jpy: number
          paid_at: string | null
          period_end: string
          period_start: string
          platform_fee_jpy: number
          processed_by: string | null
          provider_payout_id: string | null
          provider_transfer_id: string | null
          status: string
        }
        Insert: {
          counselor_id?: string | null
          created_at?: string
          gross_jpy?: number
          id?: string
          net_jpy?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          platform_fee_jpy?: number
          processed_by?: string | null
          provider_payout_id?: string | null
          provider_transfer_id?: string | null
          status?: string
        }
        Update: {
          counselor_id?: string | null
          created_at?: string
          gross_jpy?: number
          id?: string
          net_jpy?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          platform_fee_jpy?: number
          processed_by?: string | null
          provider_payout_id?: string | null
          provider_transfer_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_band: string | null
          avatar_path: string | null
          created_at: string
          id: string
          is_suspended: boolean
          nickname: string
          role: Database["public"]["Enums"]["app_role"]
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          age_band?: string | null
          avatar_path?: string | null
          created_at?: string
          id: string
          is_suspended?: boolean
          nickname: string
          role?: Database["public"]["Enums"]["app_role"]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          age_band?: string | null
          avatar_path?: string | null
          created_at?: string
          id?: string
          is_suspended?: boolean
          nickname?: string
          role?: Database["public"]["Enums"]["app_role"]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          count: number
          scope: string
          window_started_at: string
        }
        Insert: {
          bucket_key: string
          count?: number
          scope: string
          window_started_at: string
        }
        Update: {
          bucket_key?: string
          count?: number
          scope?: string
          window_started_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          consultation_id: string
          counselor_id: string
          created_at: string
          stars: number
          tags: string[]
          user_id: string
        }
        Insert: {
          consultation_id: string
          counselor_id: string
          created_at?: string
          stars: number
          tags?: string[]
          user_id: string
        }
        Update: {
          consultation_id?: string
          counselor_id?: string
          created_at?: string
          stars?: number
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          consultation_id: string | null
          context: Json
          counselor_id: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          consultation_id?: string | null
          context?: Json
          counselor_id?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          consultation_id?: string | null
          context?: Json
          counselor_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_counselor_id_fkey"
            columns: ["counselor_id"]
            isOneToOne: false
            referencedRelation: "counselor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics_summary: { Args: never; Returns: Json }
      admin_confirm_report: {
        Args: { p_report_id: string }
        Returns: {
          strike_count: number
          suspended: boolean
        }[]
      }
      admin_overturn_moderation: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      admin_restore_counselor: {
        Args: { p_counselor_id: string }
        Returns: undefined
      }
      admin_review_counselor: {
        Args: {
          p_counselor_id: string
          p_qualification_label?: string
          p_status: Database["public"]["Enums"]["verification_status"]
        }
        Returns: undefined
      }
      admin_update_maintenance: {
        Args: { p_enabled: boolean; p_message: string; p_title: string }
        Returns: undefined
      }
      apply_paid_extension: {
        Args: { p_consultation_id: string; p_payment_intent_id: string }
        Returns: {
          new_ends_at: string
        }[]
      }
      consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      counselor_earnings_summary: {
        Args: { p_counselor_id?: string }
        Returns: {
          estimated_net_jpy: number
          estimated_platform_fee_jpy: number
          month_consultations: number
          month_gross_jpy: number
          today_consultations: number
        }[]
      }
      counselor_rating_stats: {
        Args: never
        Returns: {
          average_rating: number
          counselor_id: string
          rating_count: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_current_user_active: { Args: never; Returns: boolean }
      record_counselor_violation: {
        Args: {
          p_attempted_message: string
          p_category: string
          p_consultation_id: string
          p_context?: Json
          p_counselor_id: string
          p_detector?: string
        }
        Returns: {
          strike_count: number
          suspended: boolean
        }[]
      }
      request_account_deletion: {
        Args: never
        Returns: {
          completed_at: string | null
          note: string | null
          requested_at: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "account_deletion_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "user" | "counselor" | "admin"
      consultation_status:
        | "awaiting_payment"
        | "waiting"
        | "active"
        | "ended"
        | "canceled"
        | "refunded"
      message_kind: "text" | "system"
      moderation_source: "automated" | "user_report" | "admin"
      moderation_status: "active" | "overturned"
      report_status: "open" | "reviewed" | "dismissed" | "confirmed"
      verification_status: "not_submitted" | "pending" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "counselor", "admin"],
      consultation_status: [
        "awaiting_payment",
        "waiting",
        "active",
        "ended",
        "canceled",
        "refunded",
      ],
      message_kind: ["text", "system"],
      moderation_source: ["automated", "user_report", "admin"],
      moderation_status: ["active", "overturned"],
      report_status: ["open", "reviewed", "dismissed", "confirmed"],
      verification_status: ["not_submitted", "pending", "approved", "rejected"],
    },
  },
} as const
