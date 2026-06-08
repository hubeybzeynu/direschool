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
      final_results: {
        Row: {
          answer_image_url: string | null
          created_at: string
          grade_group: string | null
          id: string
          result_image_url: string
          student_id: string
          student_name: string | null
          student_password: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          answer_image_url?: string | null
          created_at?: string
          grade_group?: string | null
          id?: string
          result_image_url: string
          student_id: string
          student_name?: string | null
          student_password?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          answer_image_url?: string | null
          created_at?: string
          grade_group?: string | null
          id?: string
          result_image_url?: string
          student_id?: string
          student_name?: string | null
          student_password?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      mid_results: {
        Row: {
          answer_image_url: string | null
          created_at: string
          grade_group: string | null
          id: string
          result_image_url: string
          student_id: string
          student_name: string | null
          student_password: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          answer_image_url?: string | null
          created_at?: string
          grade_group?: string | null
          id?: string
          result_image_url: string
          student_id: string
          student_name?: string | null
          student_password?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          answer_image_url?: string | null
          created_at?: string
          grade_group?: string | null
          id?: string
          result_image_url?: string
          student_id?: string
          student_name?: string | null
          student_password?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ministry_results: {
        Row: {
          created_at: string
          download_url: string | null
          registration_no: string
          result_image_url: string
          school_id: string | null
          student_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          download_url?: string | null
          registration_no: string
          result_image_url: string
          school_id?: string | null
          student_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          download_url?: string | null
          registration_no?: string
          result_image_url?: string
          school_id?: string | null
          student_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_admins: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          age: number | null
          card_password: string | null
          conduct: Json
          created_at: string
          days_absent: Json
          days_present: Json
          detained_in_grade: string | null
          grade: string | null
          house_no: string | null
          id: string
          kebele: string | null
          promoted_to: string | null
          rank: Json
          remarks: string | null
          school_year: string | null
          sex: string | null
          student_id: string
          student_name: string | null
          subjects: Json
          teacher_name: string | null
          times_tardy: Json
          total_academic_days: Json
          total_students: number | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          card_password?: string | null
          conduct?: Json
          created_at?: string
          days_absent?: Json
          days_present?: Json
          detained_in_grade?: string | null
          grade?: string | null
          house_no?: string | null
          id?: string
          kebele?: string | null
          promoted_to?: string | null
          rank?: Json
          remarks?: string | null
          school_year?: string | null
          sex?: string | null
          student_id: string
          student_name?: string | null
          subjects?: Json
          teacher_name?: string | null
          times_tardy?: Json
          total_academic_days?: Json
          total_students?: number | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          card_password?: string | null
          conduct?: Json
          created_at?: string
          days_absent?: Json
          days_present?: Json
          detained_in_grade?: string | null
          grade?: string | null
          house_no?: string | null
          id?: string
          kebele?: string | null
          promoted_to?: string | null
          rank?: Json
          remarks?: string | null
          school_year?: string | null
          sex?: string | null
          student_id?: string
          student_name?: string | null
          subjects?: Json
          teacher_name?: string | null
          times_tardy?: Json
          total_academic_days?: Json
          total_students?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          rating: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          name: string
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rating?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          age: number | null
          created_at: string
          download_url: string | null
          english_name: string | null
          gender: string | null
          id: number
          image_url: string | null
          instagram: string | null
          name: string
          school_id: string
          section: string | null
          telegram: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          download_url?: string | null
          english_name?: string | null
          gender?: string | null
          id: number
          image_url?: string | null
          instagram?: string | null
          name: string
          school_id: string
          section?: string | null
          telegram?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          download_url?: string | null
          english_name?: string | null
          gender?: string | null
          id?: number
          image_url?: string | null
          instagram?: string | null
          name?: string
          school_id?: string
          section?: string | null
          telegram?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_links: {
        Row: {
          created_at: string
          id: string
          link_code: string
          linked: boolean
          linked_at: string | null
          telegram_chat_id: number | null
          telegram_first_name: string | null
          telegram_username: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_code: string
          linked?: boolean
          linked_at?: string | null
          telegram_chat_id?: number | null
          telegram_first_name?: string | null
          telegram_username?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_code?: string
          linked?: boolean
          linked_at?: string | null
          telegram_chat_id?: number | null
          telegram_first_name?: string | null
          telegram_username?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
