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
      agent_faqs: {
        Row: {
          agent_id: string
          answer: string
          created_at: string
          id: string
          question: string
        }
        Insert: {
          agent_id: string
          answer: string
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          agent_id?: string
          answer?: string
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_faqs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_rules: {
        Row: {
          agent_id: string
          agent_rules: string | null
          created_at: string
          forbidden_actions: string | null
          id: string
          system_prompt: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          agent_id: string
          agent_rules?: string | null
          created_at?: string
          forbidden_actions?: string | null
          id?: string
          system_prompt?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          agent_id?: string
          agent_rules?: string | null
          created_at?: string
          forbidden_actions?: string | null
          id?: string
          system_prompt?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_script_steps: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          message_to_send: string
          situation: string | null
          step_order: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          message_to_send: string
          situation?: string | null
          step_order: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          message_to_send?: string
          situation?: string | null
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_script_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      case_followups: {
        Row: {
          case_id: string
          created_at: string
          followup_count: number
          id: string
          is_paused: boolean | null
          last_followup_at: string | null
          next_followup_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          followup_count?: number
          id?: string
          is_paused?: boolean | null
          last_followup_at?: string | null
          next_followup_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          followup_count?: number
          id?: string
          is_paused?: boolean | null
          last_followup_at?: string | null
          next_followup_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_followups_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          active_agent_id: string | null
          assigned_to: string | null
          client_name: string | null
          client_phone: string
          created_at: string
          current_step_id: string | null
          id: string
          is_agent_paused: boolean | null
          last_message: string | null
          last_message_at: string | null
          status: string | null
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_agent_id?: string | null
          assigned_to?: string | null
          client_name?: string | null
          client_phone: string
          created_at?: string
          current_step_id?: string | null
          id?: string
          is_agent_paused?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string | null
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_agent_id?: string | null
          assigned_to?: string | null
          client_name?: string | null
          client_phone?: string
          created_at?: string
          current_step_id?: string | null
          id?: string
          is_agent_paused?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          status?: string | null
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_active_agent_id_fkey"
            columns: ["active_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "agent_script_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          source: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          source?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          source?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          case_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_api_settings: {
        Row: {
          always_online: boolean | null
          api_key: string
          api_url: string
          created_at: string
          groups_ignore: boolean | null
          id: string
          instance_name: string | null
          integration_type: string | null
          is_connected: boolean | null
          msg_call: string | null
          qrcode_enabled: boolean | null
          read_messages: boolean | null
          read_status: boolean | null
          reject_call: boolean | null
          sync_full_history: boolean | null
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          always_online?: boolean | null
          api_key: string
          api_url: string
          created_at?: string
          groups_ignore?: boolean | null
          id?: string
          instance_name?: string | null
          integration_type?: string | null
          is_connected?: boolean | null
          msg_call?: string | null
          qrcode_enabled?: boolean | null
          read_messages?: boolean | null
          read_status?: boolean | null
          reject_call?: boolean | null
          sync_full_history?: boolean | null
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          always_online?: boolean | null
          api_key?: string
          api_url?: string
          created_at?: string
          groups_ignore?: boolean | null
          id?: string
          instance_name?: string | null
          integration_type?: string | null
          is_connected?: boolean | null
          msg_call?: string | null
          qrcode_enabled?: boolean | null
          read_messages?: boolean | null
          read_status?: boolean | null
          reject_call?: boolean | null
          sync_full_history?: boolean | null
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      followup_settings: {
        Row: {
          created_at: string
          followup_message_1: string | null
          followup_message_2: string | null
          followup_message_3: string | null
          id: string
          inactivity_hours: number
          is_enabled: boolean | null
          max_followups: number
          respect_business_hours: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followup_message_1?: string | null
          followup_message_2?: string | null
          followup_message_3?: string | null
          id?: string
          inactivity_hours?: number
          is_enabled?: boolean | null
          max_followups?: number
          respect_business_hours?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          followup_message_1?: string | null
          followup_message_2?: string | null
          followup_message_3?: string | null
          id?: string
          inactivity_hours?: number
          is_enabled?: boolean | null
          max_followups?: number
          respect_business_hours?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean | null
          notification_phone: string
          notify_contract_sent: boolean | null
          notify_contract_signed: boolean | null
          notify_meeting_scheduled: boolean | null
          notify_new_lead: boolean | null
          notify_qualified_lead: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          notification_phone: string
          notify_contract_sent?: boolean | null
          notify_contract_signed?: boolean | null
          notify_meeting_scheduled?: boolean | null
          notify_new_lead?: boolean | null
          notify_qualified_lead?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          notification_phone?: string
          notify_contract_sent?: boolean | null
          notify_contract_signed?: boolean | null
          notify_meeting_scheduled?: boolean | null
          notify_new_lead?: boolean | null
          notify_qualified_lead?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_settings: {
        Row: {
          appointment_duration_minutes: number
          created_at: string
          id: string
          lunch_end_hour: number | null
          lunch_start_hour: number | null
          updated_at: string
          user_id: string
          work_days: number[]
          work_end_hour: number
          work_start_hour: number
        }
        Insert: {
          appointment_duration_minutes?: number
          created_at?: string
          id?: string
          lunch_end_hour?: number | null
          lunch_start_hour?: number | null
          updated_at?: string
          user_id: string
          work_days?: number[]
          work_end_hour?: number
          work_start_hour?: number
        }
        Update: {
          appointment_duration_minutes?: number
          created_at?: string
          id?: string
          lunch_end_hour?: number | null
          lunch_start_hour?: number | null
          updated_at?: string
          user_id?: string
          work_days?: number[]
          work_end_hour?: number
          work_start_hour?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "lawyer" | "assistant"
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
      app_role: ["admin", "manager", "lawyer", "assistant"],
    },
  },
} as const
