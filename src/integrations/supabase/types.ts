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
      ai_logs: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          contact_phone: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          model: string | null
          response_time_ms: number | null
          source: string
          status: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          contact_phone?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          response_time_ms?: number | null
          source?: string
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          contact_phone?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          response_time_ms?: number | null
          source?: string
          status?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
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
          case_description: string | null
          client_name: string | null
          client_phone: string
          contract_value: number | null
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
          case_description?: string | null
          client_name?: string | null
          client_phone: string
          contract_value?: number | null
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
          case_description?: string | null
          client_name?: string | null
          client_phone?: string
          contract_value?: number | null
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
            foreignKeyName: "cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
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
      contact_memories: {
        Row: {
          agent_id: string | null
          contact_phone: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          memory_type: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          contact_phone: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          contact_phone?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_memories_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
          external_message_id: string | null
          id: string
          media_type: string | null
          media_url: string | null
          message_status: string | null
          role: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_status?: string | null
          role: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_status?: string | null
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
      financial_transactions: {
        Row: {
          amount: number
          case_id: string | null
          category: string
          created_at: string
          date: string
          description: string
          due_date: string | null
          id: string
          is_paid: boolean
          notes: string | null
          payment_method: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          case_id?: string | null
          category: string
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          notes?: string | null
          payment_method?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          case_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          notes?: string | null
          payment_method?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
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
      funnel_agent_assignments: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          stage_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          stage_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          stage_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_agent_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
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
      knowledge_chunks: {
        Row: {
          agent_id: string | null
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          chunk_index?: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          agent_id: string | null
          content: string
          created_at: string
          file_name: string | null
          id: string
          metadata: Json | null
          source_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          created_at?: string
          file_name?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          created_at?: string
          file_name?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_history: {
        Row: {
          created_at: string
          document_type: string
          id: string
          input_data: Json
          is_favorite: boolean | null
          output_data: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          input_data?: Json
          is_favorite?: boolean | null
          output_data: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          input_data?: Json
          is_favorite?: boolean | null
          output_data?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_processing_locks: {
        Row: {
          client_phone: string
          locked_at: string
          user_id: string
        }
        Insert: {
          client_phone: string
          locked_at?: string
          user_id: string
        }
        Update: {
          client_phone?: string
          locked_at?: string
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
      petition_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          title?: string
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
      research_api_settings: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_enabled: boolean | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
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
      signed_documents: {
        Row: {
          case_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          doc_token: string
          id: string
          signed_at: string | null
          status: string
          template_name: string | null
          updated_at: string
          user_id: string
          zapsign_data: Json | null
        }
        Insert: {
          case_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          doc_token: string
          id?: string
          signed_at?: string | null
          status?: string
          template_name?: string | null
          updated_at?: string
          user_id: string
          zapsign_data?: Json | null
        }
        Update: {
          case_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          doc_token?: string
          id?: string
          signed_at?: string | null
          status?: string
          template_name?: string | null
          updated_at?: string
          user_id?: string
          zapsign_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "signed_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          oab_number: string | null
          owner_id: string
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          oab_number?: string | null
          owner_id: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          oab_number?: string | null
          owner_id?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
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
      zapsign_settings: {
        Row: {
          api_token: string
          created_at: string
          id: string
          is_enabled: boolean | null
          sandbox_mode: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_token: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          sandbox_mode?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_token?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          sandbox_mode?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_locks: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_contact_memories: {
        Args: {
          match_agent_id?: string
          match_count?: number
          match_phone: string
          match_threshold?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          memory_type: string
          metadata: Json
          similarity: number
        }[]
      }
      match_knowledge_chunks: {
        Args: {
          match_agent_id?: string
          match_count?: number
          match_threshold?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
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
