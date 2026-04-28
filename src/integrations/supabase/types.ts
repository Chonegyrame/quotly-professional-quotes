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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_idempotency_cache: {
        Row: {
          created_at: string
          input_hash: string
          request_id: string
          response: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          input_hash: string
          request_id: string
          response: Json
          user_id: string
        }
        Update: {
          created_at?: string
          input_hash?: string
          request_id?: string
          response?: Json
          user_id?: string
        }
        Relationships: []
      }
      ai_ip_usage: {
        Row: {
          function_name: string
          id: number
          ip: string
          used_at: string
        }
        Insert: {
          function_name: string
          id?: number
          ip: string
          used_at?: string
        }
        Update: {
          function_name?: string
          id?: number
          ip?: string
          used_at?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          bankgiro: string | null
          created_at: string
          default_validity_days: number
          default_vat: number
          email: string | null
          email_template: string | null
          form_slug: string | null
          id: string
          logo_url: string | null
          name: string
          org_number: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          bankgiro?: string | null
          created_at?: string
          default_validity_days?: number
          default_vat?: number
          email?: string | null
          email_template?: string | null
          form_slug?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_number?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          bankgiro?: string | null
          created_at?: string
          default_validity_days?: number
          default_vat?: number
          email?: string | null
          email_template?: string | null
          form_slug?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          org_number?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_business_profile: {
        Row: {
          base_address: string | null
          base_lat: number | null
          base_lng: number | null
          company_id: string
          created_at: string
          id: string
          min_ticket_sek: number | null
          primary_trade: string
          secondary_trades: string[]
          service_radius_km: number | null
          specialties: string[]
          updated_at: string
        }
        Insert: {
          base_address?: string | null
          base_lat?: number | null
          base_lng?: number | null
          company_id: string
          created_at?: string
          id?: string
          min_ticket_sek?: number | null
          primary_trade: string
          secondary_trades?: string[]
          service_radius_km?: number | null
          specialties?: string[]
          updated_at?: string
        }
        Update: {
          base_address?: string | null
          base_lat?: number | null
          base_lng?: number | null
          company_id?: string
          created_at?: string
          id?: string
          min_ticket_sek?: number | null
          primary_trade?: string
          secondary_trades?: string[]
          service_radius_km?: number | null
          specialties?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_business_profile_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_form_templates: {
        Row: {
          based_on_template_id: string | null
          company_id: string
          created_at: string
          description: string | null
          form_schema: Json
          id: string
          is_active: boolean
          name: string
          red_flag_rules: Json
          sub_type: string
          trade: string
          trigger_keywords: string[]
          updated_at: string
        }
        Insert: {
          based_on_template_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          form_schema: Json
          id?: string
          is_active?: boolean
          name: string
          red_flag_rules?: Json
          sub_type: string
          trade: string
          trigger_keywords?: string[]
          updated_at?: string
        }
        Update: {
          based_on_template_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          name?: string
          red_flag_rules?: Json
          sub_type?: string
          trade?: string
          trigger_keywords?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_form_templates_based_on_template_id_fkey"
            columns: ["based_on_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_form_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_job_patterns: {
        Row: {
          avg_total_labor: number
          common_materials: Json
          company_id: string
          id: string
          last_updated_at: string
          member_quote_ids: string[] | null
          occurrence_count: number
          pattern_keywords: string[]
          trade: string
          typical_line_items: Json
        }
        Insert: {
          avg_total_labor?: number
          common_materials?: Json
          company_id: string
          id?: string
          last_updated_at?: string
          member_quote_ids?: string[] | null
          occurrence_count?: number
          pattern_keywords?: string[]
          trade: string
          typical_line_items?: Json
        }
        Update: {
          avg_total_labor?: number
          common_materials?: Json
          company_id?: string
          id?: string
          last_updated_at?: string
          member_quote_ids?: string[] | null
          occurrence_count?: number
          pattern_keywords?: string[]
          trade?: string
          typical_line_items?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_job_patterns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_material_learnings: {
        Row: {
          added_at: string
          company_id: string
          id: string
          job_keywords: string[]
          learning_type: string
          material_name: string
          quote_id: string | null
          trade: string
        }
        Insert: {
          added_at?: string
          company_id: string
          id?: string
          job_keywords?: string[]
          learning_type: string
          material_name: string
          quote_id?: string | null
          trade: string
        }
        Update: {
          added_at?: string
          company_id?: string
          id?: string
          job_keywords?: string[]
          learning_type?: string
          material_name?: string
          quote_id?: string | null
          trade?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_material_learnings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_material_learnings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_trade_profiles: {
        Row: {
          common_materials: Json
          company_id: string
          id: string
          last_computed_at: string
          total_quotes: number
          trade: string
          typical_labor_avg: number
          typical_labor_max: number
          typical_labor_min: number
          typical_labor_p10: number
          typical_labor_p90: number
        }
        Insert: {
          common_materials?: Json
          company_id: string
          id?: string
          last_computed_at?: string
          total_quotes?: number
          trade: string
          typical_labor_avg?: number
          typical_labor_max?: number
          typical_labor_min?: number
          typical_labor_p10?: number
          typical_labor_p90?: number
        }
        Update: {
          common_materials?: Json
          company_id?: string
          id?: string
          last_computed_at?: string
          total_quotes?: number
          trade?: string
          typical_labor_avg?: number
          typical_labor_max?: number
          typical_labor_min?: number
          typical_labor_p10?: number
          typical_labor_p90?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_trade_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          description: string | null
          form_schema: Json
          id: string
          is_active: boolean
          name: string
          red_flag_rules: Json
          sub_type: string
          trade: string
          trigger_keywords: string[]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_schema: Json
          id?: string
          is_active?: boolean
          name: string
          red_flag_rules?: Json
          sub_type: string
          trade: string
          trigger_keywords?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          form_schema?: Json
          id?: string
          is_active?: boolean
          name?: string
          red_flag_rules?: Json
          sub_type?: string
          trade?: string
          trigger_keywords?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      incoming_requests: {
        Row: {
          ai_confidence: string | null
          ai_score: number | null
          ai_tier: string | null
          ai_verdict: Json | null
          company_id: string
          converted_to_quote_id: string | null
          created_at: string
          form_template_id: string | null
          free_text: string | null
          id: string
          internal_notes: string | null
          needs_human_review: boolean
          photos: string[]
          status: string
          submitted_answers: Json
          submitter_address: string | null
          submitter_city: string | null
          submitter_email: string | null
          submitter_lat: number | null
          submitter_lng: number | null
          submitter_name: string | null
          submitter_phone: string | null
          submitter_postal_code: string | null
          updated_at: string
        }
        Insert: {
          ai_confidence?: string | null
          ai_score?: number | null
          ai_tier?: string | null
          ai_verdict?: Json | null
          company_id: string
          converted_to_quote_id?: string | null
          created_at?: string
          form_template_id?: string | null
          free_text?: string | null
          id?: string
          internal_notes?: string | null
          needs_human_review?: boolean
          photos?: string[]
          status?: string
          submitted_answers?: Json
          submitter_address?: string | null
          submitter_city?: string | null
          submitter_email?: string | null
          submitter_lat?: number | null
          submitter_lng?: number | null
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_postal_code?: string | null
          updated_at?: string
        }
        Update: {
          ai_confidence?: string | null
          ai_score?: number | null
          ai_tier?: string | null
          ai_verdict?: Json | null
          company_id?: string
          converted_to_quote_id?: string | null
          created_at?: string
          form_template_id?: string | null
          free_text?: string | null
          id?: string
          internal_notes?: string | null
          needs_human_review?: boolean
          photos?: string[]
          status?: string
          submitted_answers?: Json
          submitter_address?: string | null
          submitter_city?: string | null
          submitter_email?: string | null
          submitter_lat?: number | null
          submitter_lng?: number | null
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_postal_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_requests_converted_to_quote_id_fkey"
            columns: ["converted_to_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_requests_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          id: string
          is_deleted: boolean
          markup_percent: number
          name: string
          purchase_price: number
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          markup_percent?: number
          name: string
          purchase_price?: number
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          markup_percent?: number
          name?: string
          purchase_price?: number
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      quote_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          quote_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          quote_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_item_materials: {
        Row: {
          created_at: string
          id: string
          markup_percent: number
          material_id: string | null
          name: string
          purchase_price: number
          quantity: number
          quote_item_id: string
          sort_order: number | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          markup_percent?: number
          material_id?: string | null
          name?: string
          purchase_price?: number
          quantity?: number
          quote_item_id: string
          sort_order?: number | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          markup_percent?: number
          material_id?: string | null
          name?: string
          purchase_price?: number
          quantity?: number
          quote_item_id?: string
          sort_order?: number | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_item_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_item_materials_quote_item_id_fkey"
            columns: ["quote_item_id"]
            isOneToOne: false
            referencedRelation: "quote_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          id: string
          quantity: number
          quote_id: string
          sort_order: number | null
          unit_price: number
          vat_rate: number
        }
        Insert: {
          description?: string
          id?: string
          quantity?: number
          quote_id: string
          sort_order?: number | null
          unit_price?: number
          vat_rate?: number
        }
        Update: {
          description?: string
          id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          unit_price?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_templates: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          default_items: Json | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          default_items?: Json | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          default_items?: Json | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          actual_hours: number | null
          ai_materials_added: number | null
          ai_materials_removed: number | null
          ai_prompt_text: string | null
          ai_suggestions: Json | null
          company_id: string
          completed_at: string | null
          created_at: string
          customer_address: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          estimated_days: number | null
          estimated_hours: number | null
          id: string
          job_size: number | null
          job_size_unit: string | null
          keywords: string[] | null
          material_fingerprint: string[] | null
          notes: string | null
          opened_at: string | null
          quote_number: string
          sent_at: string | null
          status: string
          trade: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          actual_hours?: number | null
          ai_materials_added?: number | null
          ai_materials_removed?: number | null
          ai_prompt_text?: string | null
          ai_suggestions?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          estimated_days?: number | null
          estimated_hours?: number | null
          id?: string
          job_size?: number | null
          job_size_unit?: string | null
          keywords?: string[] | null
          material_fingerprint?: string[] | null
          notes?: string | null
          opened_at?: string | null
          quote_number: string
          sent_at?: string | null
          status?: string
          trade?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          actual_hours?: number | null
          ai_materials_added?: number | null
          ai_materials_removed?: number | null
          ai_prompt_text?: string | null
          ai_suggestions?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          estimated_days?: number | null
          estimated_hours?: number | null
          id?: string
          job_size?: number | null
          job_size_unit?: string | null
          keywords?: string[] | null
          material_fingerprint?: string[] | null
          notes?: string | null
          opened_at?: string | null
          quote_number?: string
          sent_at?: string | null
          status?: string
          trade?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recompute_metrics: {
        Row: {
          company_id: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          patterns_found: number
          quote_count: number
          status: string
          trade: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          duration_ms: number
          error_message?: string | null
          id?: string
          patterns_found?: number
          quote_count?: number
          status: string
          trade?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          patterns_found?: number
          quote_count?: number
          status?: string
          trade?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recompute_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_materials: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          markup_percent: number
          name: string
          purchase_price: number
          unit: string
          unit_price: number | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          markup_percent?: number
          name: string
          purchase_price?: number
          unit?: string
          unit_price?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          markup_percent?: number
          name?: string
          purchase_price?: number
          unit?: string
          unit_price?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_ai_usage_slot: {
        Args: { p_daily_limit: number; p_user_id: string }
        Returns: boolean
      }
      company_role: { Args: { check_company_id: string }; Returns: string }
      get_company_by_slug: {
        Args: { slug: string }
        Returns: {
          base_lat: number
          base_lng: number
          form_slug: string
          id: string
          logo_url: string
          name: string
          primary_trade: string
          secondary_trades: string[]
          service_radius_km: number
        }[]
      }
      get_company_members: {
        Args: { p_company_id: string }
        Returns: {
          email: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_next_quote_number: { Args: { p_company_id: string }; Returns: string }
      get_quote_company_branding: {
        Args: { p_quote_id: string }
        Returns: {
          address: string
          bankgiro: string
          email: string
          logo_url: string
          name: string
          org_number: string
          phone: string
        }[]
      }
      is_company_member: {
        Args: { check_company_id: string }
        Returns: boolean
      }
      replace_company_job_patterns: {
        Args: { p_company_id: string; p_patterns: Json; p_trade: string }
        Returns: undefined
      }
      slugify_company_name: { Args: { input: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
