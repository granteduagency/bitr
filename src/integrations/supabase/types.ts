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
  public: {
    Tables: {
      calisma_applications: {
        Row: {
          client_id: string | null
          created_at: string | null
          documents_url: string[] | null
          has_employer: boolean | null
          id: string
          job_type: string | null
          notes: string | null
          status: string | null
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          documents_url?: string[] | null
          has_employer?: boolean | null
          id?: string
          job_type?: string | null
          notes?: string | null
          status?: string | null
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          documents_url?: string[] | null
          has_employer?: boolean | null
          id?: string
          job_type?: string | null
          notes?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calisma_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      contact_settings: {
        Row: {
          address_tr: string
          address_uz: string
          created_at: string
          email: string
          facebook_url: string
          id: number
          instagram_url: string
          phone: string
          subtitle_tr: string
          subtitle_uz: string
          telegram_url: string
          updated_at: string
          whatsapp_url: string
          working_hours_tr: string
          working_hours_uz: string
        }
        Insert: {
          address_tr?: string
          address_uz?: string
          created_at?: string
          email?: string
          facebook_url?: string
          id?: number
          instagram_url?: string
          phone?: string
          subtitle_tr?: string
          subtitle_uz?: string
          telegram_url?: string
          updated_at?: string
          whatsapp_url?: string
          working_hours_tr?: string
          working_hours_uz?: string
        }
        Update: {
          address_tr?: string
          address_uz?: string
          created_at?: string
          email?: string
          facebook_url?: string
          id?: number
          instagram_url?: string
          phone?: string
          subtitle_tr?: string
          subtitle_uz?: string
          telegram_url?: string
          updated_at?: string
          whatsapp_url?: string
          working_hours_tr?: string
          working_hours_uz?: string
        }
        Relationships: []
      }
      client_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          lead_id: string
          reference_id: string | null
          route: string | null
          service_key: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          lead_id: string
          reference_id?: string | null
          route?: string | null
          service_key?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          lead_id?: string
          reference_id?: string | null
          route?: string | null
          service_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_leads: {
        Row: {
          application_count: number
          created_at: string
          first_seen_at: string
          id: string
          last_action: string | null
          last_activity_at: string
          last_application_at: string | null
          last_route: string | null
          last_seen_at: string
          last_service_key: string | null
          metadata: Json
          name: string
          phone: string
        }
        Insert: {
          application_count?: number
          created_at?: string
          first_seen_at?: string
          id?: string
          last_action?: string | null
          last_activity_at?: string
          last_application_at?: string | null
          last_route?: string | null
          last_seen_at?: string
          last_service_key?: string | null
          metadata?: Json
          name: string
          phone: string
        }
        Update: {
          application_count?: number
          created_at?: string
          first_seen_at?: string
          id?: string
          last_action?: string | null
          last_activity_at?: string
          last_application_at?: string | null
          last_route?: string | null
          last_seen_at?: string
          last_service_key?: string | null
          metadata?: Json
          name?: string
          phone?: string
        }
        Relationships: []
      }
      consulates: {
        Row: {
          address: string | null
          country: string
          country_code: string | null
          email: string | null
          id: string
          is_active: boolean | null
          notes_tr: string | null
          notes_uz: string | null
          phone: string | null
          required_documents: Json | null
          website: string | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          country: string
          country_code?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes_tr?: string | null
          notes_uz?: string | null
          phone?: string | null
          required_documents?: Json | null
          website?: string | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          country?: string
          country_code?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes_tr?: string | null
          notes_uz?: string | null
          phone?: string | null
          required_documents?: Json | null
          website?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      deport_calculations: {
        Row: {
          client_id: string | null
          created_at: string | null
          entry_date: string | null
          exit_date: string | null
          id: string
          penalty_amount: number | null
          result_data: Json | null
          violation_days: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          entry_date?: string | null
          exit_date?: string | null
          id?: string
          penalty_amount?: number | null
          result_data?: Json | null
          violation_days?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          entry_date?: string | null
          exit_date?: string | null
          id?: string
          penalty_amount?: number | null
          result_data?: Json | null
          violation_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deport_calculations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hukuk_applications: {
        Row: {
          client_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          problem: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          problem?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          problem?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hukuk_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ikamet_applications: {
        Row: {
          address: string | null
          appointment_result: Json | null
          appointment_url: string | null
          category: string
          client_id: string | null
          created_at: string | null
          email: string | null
          father_name: string | null
          has_insurance: boolean | null
          id: string
          mother_name: string | null
          notes: string | null
          passport_document_id: string | null
          passport_extraction: Json | null
          passport_url: string | null
          phone: string | null
          photo_url: string | null
          status: string | null
          student_cert_url: string | null
          supporter_documents_url: string[] | null
          supporter_id_back_url: string | null
          supporter_id_front_url: string | null
          supporter_passport_document_id: string | null
          supporter_passport_extraction: Json | null
          supporter_passport_url: string | null
          supporter_student_cert_url: string | null
          supporter_type: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          appointment_result?: Json | null
          appointment_url?: string | null
          category: string
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          father_name?: string | null
          has_insurance?: boolean | null
          id?: string
          mother_name?: string | null
          notes?: string | null
          passport_document_id?: string | null
          passport_extraction?: Json | null
          passport_url?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          student_cert_url?: string | null
          supporter_documents_url?: string[] | null
          supporter_id_back_url?: string | null
          supporter_id_front_url?: string | null
          supporter_passport_document_id?: string | null
          supporter_passport_extraction?: Json | null
          supporter_passport_url?: string | null
          supporter_student_cert_url?: string | null
          supporter_type?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          appointment_result?: Json | null
          appointment_url?: string | null
          category?: string
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          father_name?: string | null
          has_insurance?: boolean | null
          id?: string
          mother_name?: string | null
          notes?: string | null
          passport_document_id?: string | null
          passport_extraction?: Json | null
          passport_url?: string | null
          phone?: string | null
          photo_url?: string | null
          status?: string | null
          student_cert_url?: string | null
          supporter_documents_url?: string[] | null
          supporter_id_back_url?: string | null
          supporter_id_front_url?: string | null
          supporter_passport_document_id?: string | null
          supporter_passport_extraction?: Json | null
          supporter_passport_url?: string | null
          supporter_student_cert_url?: string | null
          supporter_type?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ikamet_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sigorta_applications: {
        Row: {
          client_id: string | null
          created_at: string | null
          data: Json
          documents_url: string[] | null
          id: string
          notes: string | null
          status: string | null
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          data?: Json
          documents_url?: string[] | null
          id?: string
          notes?: string | null
          status?: string | null
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          data?: Json
          documents_url?: string[] | null
          id?: string
          notes?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sigorta_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tercume_applications: {
        Row: {
          client_id: string | null
          created_at: string | null
          document_types: string[] | null
          documents_url: string[] | null
          from_language: string | null
          id: string
          passport_document_id: string | null
          passport_extraction: Json | null
          status: string | null
          to_language: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          document_types?: string[] | null
          documents_url?: string[] | null
          from_language?: string | null
          id?: string
          passport_document_id?: string | null
          passport_extraction?: Json | null
          status?: string | null
          to_language?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          document_types?: string[] | null
          documents_url?: string[] | null
          from_language?: string | null
          id?: string
          passport_document_id?: string | null
          passport_extraction?: Json | null
          status?: string | null
          to_language?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tercume_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          degrees: string[] | null
          faculties: Json | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          logo_url: string | null
          name_tr: string
          name_uz: string
          programs: Json | null
        }
        Insert: {
          city?: string | null
          degrees?: string[] | null
          faculties?: Json | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          logo_url?: string | null
          name_tr: string
          name_uz: string
          programs?: Json | null
        }
        Update: {
          city?: string | null
          degrees?: string[] | null
          faculties?: Json | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          logo_url?: string | null
          name_tr?: string
          name_uz?: string
          programs?: Json | null
        }
        Relationships: []
      }
      university_applications: {
        Row: {
          client_id: string | null
          created_at: string | null
          degree: string | null
          diploma_supplement_url: string | null
          diploma_url: string | null
          external_university_city: string | null
          external_university_country: string | null
          external_university_id: string | null
          external_university_name: string | null
          external_university_website: string | null
          external_workspace_id: string | null
          faculty: string | null
          id: string
          language: string | null
          passport_document_id: string | null
          passport_extraction: Json | null
          passport_url: string | null
          phone: string | null
          photo_url: string | null
          program: string | null
          status: string | null
          university_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          degree?: string | null
          diploma_supplement_url?: string | null
          diploma_url?: string | null
          external_university_city?: string | null
          external_university_country?: string | null
          external_university_id?: string | null
          external_university_name?: string | null
          external_university_website?: string | null
          external_workspace_id?: string | null
          faculty?: string | null
          id?: string
          language?: string | null
          passport_document_id?: string | null
          passport_extraction?: Json | null
          passport_url?: string | null
          phone?: string | null
          photo_url?: string | null
          program?: string | null
          status?: string | null
          university_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          degree?: string | null
          diploma_supplement_url?: string | null
          diploma_url?: string | null
          external_university_city?: string | null
          external_university_country?: string | null
          external_university_id?: string | null
          external_university_name?: string | null
          external_university_website?: string | null
          external_workspace_id?: string | null
          faculty?: string | null
          id?: string
          language?: string | null
          passport_document_id?: string | null
          passport_extraction?: Json | null
          passport_url?: string | null
          phone?: string | null
          photo_url?: string | null
          program?: string | null
          status?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "university_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "university_applications_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visa_applications: {
        Row: {
          client_id: string | null
          created_at: string | null
          from_country: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string | null
          to_country: string | null
          travel_date: string | null
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          from_country?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          to_country?: string | null
          travel_date?: string | null
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          from_country?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          to_country?: string | null
          travel_date?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_client: {
        Args: {
          _name: string
          _phone: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_client_activity: {
        Args: {
          _action: string
          _details?: Json
          _name: string
          _phone: string
          _reference_id?: string | null
          _route?: string | null
          _service_key?: string | null
        }
        Returns: string
      }
      record_client_application: {
        Args: {
          _details?: Json
          _name: string
          _phone: string
          _reference_id: string
          _route?: string | null
          _service_key: string
        }
        Returns: string
      }
      upsert_client_lead: {
        Args: {
          _entry_source?: string
          _metadata?: Json
          _name: string
          _phone: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
    },
  },
} as const
