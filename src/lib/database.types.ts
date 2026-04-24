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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      approved_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      crm_daily_log: {
        Row: {
          calls: number
          comments: string | null
          contacts: number
          created_at: string
          date: string
          id: string
          sales: number
          showings: number
        }
        Insert: {
          calls?: number
          comments?: string | null
          contacts?: number
          created_at?: string
          date: string
          id?: string
          sales?: number
          showings?: number
        }
        Update: {
          calls?: number
          comments?: string | null
          contacts?: number
          created_at?: string
          date?: string
          id?: string
          sales?: number
          showings?: number
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_showings: {
        Row: {
          contact_id: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          outcome: string
          status: string
          time: string | null
          unit_id: string
          unit_record_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          outcome?: string
          status?: string
          time?: string | null
          unit_id: string
          unit_record_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          outcome?: string
          status?: string
          time?: string | null
          unit_id?: string
          unit_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_showings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_showings_unit_record_id_fkey"
            columns: ["unit_record_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_snapshots: {
        Row: {
          data: Json
          id: string
          period: string
          updated_at: string | null
        }
        Insert: {
          data: Json
          id?: string
          period: string
          updated_at?: string | null
        }
        Update: {
          data?: Json
          id?: string
          period?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_data: {
        Row: {
          created_at: string | null
          id: string
          leads_facebook: number | null
          leads_instagram: number | null
          leads_tiktok: number | null
          month: number
          spend_facebook: number | null
          updated_at: string | null
          views_facebook: number | null
          views_tiktok: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          leads_facebook?: number | null
          leads_instagram?: number | null
          leads_tiktok?: number | null
          month: number
          spend_facebook?: number | null
          updated_at?: string | null
          views_facebook?: number | null
          views_tiktok?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          leads_facebook?: number | null
          leads_instagram?: number | null
          leads_tiktok?: number | null
          month?: number
          spend_facebook?: number | null
          updated_at?: string | null
          views_facebook?: number | null
          views_tiktok?: number | null
          year?: number
        }
        Relationships: []
      }
      marketing_offline: {
        Row: {
          amount: number
          channel: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          month: number | null
          period_type: string
          year: number
        }
        Insert: {
          amount: number
          channel: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          month?: number | null
          period_type: string
          year: number
        }
        Update: {
          amount?: number
          channel?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          month?: number | null
          period_type?: string
          year?: number
        }
        Relationships: []
      }
      owner_entities: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unit_history: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          id: string
          new_data: Json | null
          previous_data: Json | null
          unit_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          unit_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_payments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_date: string | null
          sale_id: string | null
          status: string
          unit_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_date?: string | null
          sale_id?: string | null
          status?: string
          unit_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_date?: string | null
          sale_id?: string | null
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "unit_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_reservations: {
        Row: {
          contact_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          reserved_at: string
          showing_id: string | null
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          reserved_at?: string
          showing_id?: string | null
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          reserved_at?: string
          showing_id?: string | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_reservations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_reservations_showing_id_fkey"
            columns: ["showing_id"]
            isOneToOne: false
            referencedRelation: "crm_showings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_sales: {
        Row: {
          buyer_name: string
          created_at: string
          crm_lead_id: string | null
          final_price: number
          id: string
          notes: string | null
          payment_type: string
          reservation_id: string | null
          sale_date: string
          showing_id: string | null
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          buyer_name: string
          created_at?: string
          crm_lead_id?: string | null
          final_price: number
          id?: string
          notes?: string | null
          payment_type: string
          reservation_id?: string | null
          sale_date: string
          showing_id?: string | null
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          buyer_name?: string
          created_at?: string
          crm_lead_id?: string | null
          final_price?: number
          id?: string
          notes?: string | null
          payment_type?: string
          reservation_id?: string | null
          sale_date?: string
          showing_id?: string | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_sales_crm_lead_id_fkey"
            columns: ["crm_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "unit_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_sales_showing_id_fkey"
            columns: ["showing_id"]
            isOneToOne: false
            referencedRelation: "crm_showings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          balcony_area: number | null
          bathrooms: number | null
          bedrooms: number | null
          block: string
          buyer_lead_id: string | null
          buyer_name: string | null
          created_at: string | null
          floorplan_code: string | null
          id: string
          level: string
          notes: string | null
          orientation: string | null
          owner_category: string
          owner_name: string
          price: number
          reservation_expires_at: string | null
          sale_date: string | null
          sale_price: number | null
          size: number
          status: string
          terrace_area: number | null
          toilets: number | null
          type: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          balcony_area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          block: string
          buyer_lead_id?: string | null
          buyer_name?: string | null
          created_at?: string | null
          floorplan_code?: string | null
          id?: string
          level: string
          notes?: string | null
          orientation?: string | null
          owner_category: string
          owner_name: string
          price: number
          reservation_expires_at?: string | null
          sale_date?: string | null
          sale_price?: number | null
          size: number
          status?: string
          terrace_area?: number | null
          toilets?: number | null
          type: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          balcony_area?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          block?: string
          buyer_lead_id?: string | null
          buyer_name?: string | null
          created_at?: string | null
          floorplan_code?: string | null
          id?: string
          level?: string
          notes?: string | null
          orientation?: string | null
          owner_category?: string
          owner_name?: string
          price?: number
          reservation_expires_at?: string | null
          sale_date?: string | null
          sale_price?: number | null
          size?: number
          status?: string
          terrace_area?: number | null
          toilets?: number | null
          type?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_buyer_lead_id_fkey"
            columns: ["buyer_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_unit_sale: {
        Args: {
          p_buyer_name: string
          p_crm_lead_id?: string
          p_final_price: number
          p_installments?: Json
          p_notes?: string
          p_payment_type: string
          p_reservation_id?: string
          p_sale_date: string
          p_showing_id?: string
          p_unit_id: string
        }
        Returns: string
      }
      create_unit_reservation: {
        Args: {
          p_contact_id?: string
          p_expires_at?: string
          p_notes?: string
          p_reserved_at?: string
          p_showing_id?: string
          p_unit_id: string
        }
        Returns: string
      }
      cancel_unit_reservation: {
        Args: {
          p_notes?: string
          p_reservation_id: string
        }
        Returns: string
      }
      extend_unit_reservation: {
        Args: {
          p_expires_at: string
          p_notes?: string
          p_reservation_id: string
        }
        Returns: string
      }
      expire_unit_reservations: {
        Args: {
          p_cutoff?: string
          p_unit_ids?: string[]
        }
        Returns: {
          balcony_area: number | null
          bathrooms: number | null
          bedrooms: number | null
          block: string
          buyer_lead_id: string | null
          buyer_name: string | null
          created_at: string | null
          floorplan_code: string | null
          id: string
          level: string
          notes: string | null
          orientation: string | null
          owner_category: string
          owner_name: string
          price: number
          reservation_expires_at: string | null
          sale_date: string | null
          sale_price: number | null
          size: number
          status: string
          terrace_area: number | null
          toilets: number | null
          type: string
          unit_id: string
          updated_at: string | null
        }[]
      }
      get_units_shell_summary: {
        Args: {
          p_stock_category?: string
          p_stock_entity?: string
        }
        Returns: {
          available_units_count: number
          construction_companies_units_count: number
          investitor_units_count: number
          land_owners_units_count: number
          scope_available_count: number
          scope_reserved_count: number
          scope_sold_count: number
          scope_total_count: number
          total_units: number
        }[]
      }
      list_unit_owner_options: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          name: string
        }[]
      }
      list_sales_upcoming_payments: {
        Args: {
          p_owner_scope?: string
        }
        Returns: {
          payment_amount: number
          payment_created_at: string | null
          payment_due_date: string
          payment_id: string
          payment_installment_number: number
          payment_notes: string | null
          payment_paid_date: string | null
          payment_sale_id: string | null
          payment_status: string
          payment_unit_id: string
          sale_buyer_name: string | null
          sale_crm_lead_id: string | null
          sale_date: string | null
          sale_final_price: number | null
          sale_payment_type: string | null
          unit_block: string
          unit_code: string
          unit_created_at: string | null
          unit_id: string
          unit_level: string
          unit_owner_category: string
          unit_owner_name: string
          unit_price: number
          unit_size: number
          unit_status: string
          unit_type: string
          unit_updated_at: string | null
        }[]
      }
      run_reservation_expiry_job: {
        Args: {
          p_cutoff?: string
        }
        Returns: number
      }
      reporting_get_sale_metrics: {
        Args: {
          p_month?: number
          p_owner_scope?: string
          p_year?: number
        }
        Returns: {
          collected_value: number
          contracted_value: number
          has_payment_data: boolean
          owner_scope: string
          pending_value: number
          period_month: number | null
          period_year: number | null
          sold_units: number
        }[]
      }
      reporting_get_sale_monthly_series: {
        Args: {
          p_owner_scope?: string
          p_year?: number
        }
        Returns: {
          contracted_value: number
          month_label: string
          month_number: number
          month_short_label: string
          owner_scope: string
          series_year: number
          sold_units: number
        }[]
      }
      reporting_get_sale_typology_breakdown: {
        Args: {
          p_month?: number
          p_owner_scope?: string
          p_year?: number
        }
        Returns: {
          contracted_value: number
          owner_scope: string
          period_month: number | null
          period_year: number
          sale_ids: string[]
          sold_units: number
          typology: string
          typology_order: number
          unit_record_ids: string[]
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
