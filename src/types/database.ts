export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          all_day: boolean
          client_id: string | null
          created_at: string
          end: string | null
          id: string
          kind: string
          location: string | null
          notes: string | null
          project_id: string | null
          reminder_minutes: number | null
          start: string
          title: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          client_id?: string | null
          created_at?: string
          end?: string | null
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          reminder_minutes?: number | null
          start: string
          title: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          client_id?: string | null
          created_at?: string
          end?: string | null
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          reminder_minutes?: number | null
          start?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      catalog_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          label: string
          unit: string
          unit_price: number
          user_id: string
          vat_rate: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          label: string
          unit?: string
          unit_price: number
          user_id: string
          vat_rate?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          label?: string
          unit?: string
          unit_price?: number
          user_id?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: 'catalog_items_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          siret: string | null
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          siret?: string | null
          type?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          siret?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      discounts: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'discounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          id: string
          label: string
          notes: string | null
          project_id: string | null
          receipt_url: string | null
          user_id: string
          vat_amount: number | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          label: string
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          user_id: string
          vat_amount?: number | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          label?: string
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          user_id?: string
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'expenses_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string | null
          created_at: string
          deposit_deducted: number | null
          deposit_reference: string | null
          discount_amount: number
          due_date: string | null
          id: string
          items: Json
          kind: string
          last_reminder_at: string | null
          notes: string | null
          number: string | null
          paid_at: string | null
          parent_invoice_id: string | null
          payment_method: string | null
          pdf_url: string | null
          project_id: string | null
          quote_id: string | null
          reminder_count: number
          sent_at: string | null
          status: string
          subtotal: number
          title: string | null
          total: number
          user_id: string
          vat_amount: number
        }
        Insert: {
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          deposit_deducted?: number | null
          deposit_reference?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          items?: Json
          kind?: string
          last_reminder_at?: string | null
          notes?: string | null
          number?: string | null
          paid_at?: string | null
          parent_invoice_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          project_id?: string | null
          quote_id?: string | null
          reminder_count?: number
          sent_at?: string | null
          status?: string
          subtotal?: number
          title?: string | null
          total?: number
          user_id: string
          vat_amount?: number
        }
        Update: {
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          deposit_deducted?: number | null
          deposit_reference?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          items?: Json
          kind?: string
          last_reminder_at?: string | null
          notes?: string | null
          number?: string | null
          paid_at?: string | null
          parent_invoice_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          project_id?: string | null
          quote_id?: string | null
          reminder_count?: number
          sent_at?: string | null
          status?: string
          subtotal?: number
          title?: string | null
          total?: number
          user_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_parent_invoice_id_fkey'
            columns: ['parent_invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_quote_id_fkey'
            columns: ['quote_id']
            isOneToOne: false
            referencedRelation: 'quotes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          bic: string | null
          company_name: string | null
          created_at: string
          default_vat_rate: number
          email: string
          first_name: string | null
          iban: string | null
          id: string
          income_tax_rate: number
          last_name: string | null
          legal_mentions: string | null
          logo_url: string | null
          micro_enterprise: boolean
          payment_terms: number
          pdf_color: string
          phone: string | null
          plan: string
          reminder_days: Json
          reminder_repeat_days: number
          siret: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          urssaf_period: string
          urssaf_rate: number
          vat_number: string | null
          versement_liberatoire: boolean
        }
        Insert: {
          address?: string | null
          bic?: string | null
          company_name?: string | null
          created_at?: string
          default_vat_rate?: number
          email: string
          first_name?: string | null
          iban?: string | null
          id: string
          income_tax_rate?: number
          last_name?: string | null
          legal_mentions?: string | null
          logo_url?: string | null
          micro_enterprise?: boolean
          payment_terms?: number
          pdf_color?: string
          phone?: string | null
          plan?: string
          reminder_days?: Json
          reminder_repeat_days?: number
          siret?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          urssaf_period?: string
          urssaf_rate?: number
          vat_number?: string | null
          versement_liberatoire?: boolean
        }
        Update: {
          address?: string | null
          bic?: string | null
          company_name?: string | null
          created_at?: string
          default_vat_rate?: number
          email?: string
          first_name?: string | null
          iban?: string | null
          id?: string
          income_tax_rate?: number
          last_name?: string | null
          legal_mentions?: string | null
          logo_url?: string | null
          micro_enterprise?: boolean
          payment_terms?: number
          pdf_color?: string
          phone?: string | null
          plan?: string
          reminder_days?: Json
          reminder_repeat_days?: number
          siret?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          urssaf_period?: string
          urssaf_rate?: number
          vat_number?: string | null
          versement_liberatoire?: boolean
        }
        Relationships: []
      }
      project_logs: {
        Row: {
          content: string | null
          created_at: string
          id: string
          photos: Json
          project_id: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          photos?: Json
          project_id: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          photos?: Json
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_logs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          user_id: string
        }
        Insert: {
          address?: string | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          user_id: string
        }
        Update: {
          address?: string | null
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          accepted_ip: string | null
          client_id: string | null
          created_at: string
          description: string | null
          discount_amount: number
          discount_kind: string | null
          discount_label: string | null
          discount_value: number | null
          id: string
          items: Json
          notes: string | null
          number: string | null
          pdf_url: string | null
          project_id: string | null
          public_token: string
          refused_at: string | null
          reminder_sent_at: string | null
          sent_at: string | null
          signature_name: string | null
          status: string
          subtotal: number
          title: string | null
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
          vat_amount: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_kind?: string | null
          discount_label?: string | null
          discount_value?: number | null
          id?: string
          items?: Json
          notes?: string | null
          number?: string | null
          pdf_url?: string | null
          project_id?: string | null
          public_token?: string
          refused_at?: string | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          signature_name?: string | null
          status?: string
          subtotal?: number
          title?: string | null
          total?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          vat_amount?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_kind?: string | null
          discount_label?: string | null
          discount_value?: number | null
          id?: string
          items?: Json
          notes?: string | null
          number?: string | null
          pdf_url?: string | null
          project_id?: string | null
          public_token?: string
          refused_at?: string | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          signature_name?: string | null
          status?: string
          subtotal?: number
          title?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: 'quotes_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quotes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_public_quote: {
        Args: {
          p_accepted_ip: string
          p_signature_name: string
          p_token: string
        }
        Returns: undefined
      }
      get_public_quote: {
        Args: { p_token: string }
        Returns: {
          description: string
          discount_amount: number
          id: string
          items: Json
          notes: string
          number: string
          pdf_url: string
          public_token: string
          status: string
          subtotal: number
          title: string
          total: number
          valid_until: string
          vat_amount: number
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
