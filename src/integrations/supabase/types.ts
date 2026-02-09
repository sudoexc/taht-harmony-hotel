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
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          comment: string | null
          created_at: string
          hotel_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          spent_at: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          comment?: string | null
          created_at?: string
          hotel_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          spent_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          comment?: string | null
          created_at?: string
          hotel_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          spent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          created_at: string
          id: string
          name: string
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      month_closings: {
        Row: {
          closed_at: string
          hotel_id: string
          id: string
          month: string
          totals_json: Json | null
        }
        Insert: {
          closed_at?: string
          hotel_id: string
          id?: string
          month: string
          totals_json?: Json | null
        }
        Update: {
          closed_at?: string
          hotel_id?: string
          id?: string
          month?: string
          totals_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "month_closings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          comment: string | null
          created_at: string
          hotel_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
          stay_id: string
        }
        Insert: {
          amount?: number
          comment?: string | null
          created_at?: string
          hotel_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          stay_id: string
        }
        Update: {
          amount?: number
          comment?: string | null
          created_at?: string
          hotel_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "stays"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          hotel_id: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          hotel_id: string
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          hotel_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean
          base_price: number
          capacity: number
          created_at: string
          floor: number
          hotel_id: string
          id: string
          notes: string | null
          number: string
          room_type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          active?: boolean
          base_price?: number
          capacity?: number
          created_at?: string
          floor?: number
          hotel_id: string
          id?: string
          notes?: string | null
          number: string
          room_type?: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          active?: boolean
          base_price?: number
          capacity?: number
          created_at?: string
          floor?: number
          hotel_id?: string
          id?: string
          notes?: string | null
          number?: string
          room_type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      stays: {
        Row: {
          check_in_date: string
          check_out_date: string
          comment: string | null
          created_at: string
          deposit_expected: number
          guest_name: string
          guest_phone: string | null
          hotel_id: string
          id: string
          manual_adjustment_amount: number
          price_per_night: number
          room_id: string
          status: Database["public"]["Enums"]["stay_status"]
          weekly_discount_amount: number
        }
        Insert: {
          check_in_date: string
          check_out_date: string
          comment?: string | null
          created_at?: string
          deposit_expected?: number
          guest_name: string
          guest_phone?: string | null
          hotel_id: string
          id?: string
          manual_adjustment_amount?: number
          price_per_night?: number
          room_id: string
          status?: Database["public"]["Enums"]["stay_status"]
          weekly_discount_amount?: number
        }
        Update: {
          check_in_date?: string
          check_out_date?: string
          comment?: string | null
          created_at?: string
          deposit_expected?: number
          guest_name?: string
          guest_phone?: string | null
          hotel_id?: string
          id?: string
          manual_adjustment_amount?: number
          price_per_night?: number
          room_id?: string
          status?: Database["public"]["Enums"]["stay_status"]
          weekly_discount_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "stays_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stays_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_hotel_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "MANAGER"
      expense_category:
        | "SALARY"
        | "INVENTORY"
        | "UTILITIES"
        | "REPAIR"
        | "MARKETING"
        | "OTHER"
      payment_method: "CASH" | "CARD" | "PAYME" | "CLICK"
      room_type: "ECONOM" | "STANDARD"
      stay_status: "BOOKED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED"
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
      app_role: ["ADMIN", "MANAGER"],
      expense_category: [
        "SALARY",
        "INVENTORY",
        "UTILITIES",
        "REPAIR",
        "MARKETING",
        "OTHER",
      ],
      payment_method: ["CASH", "CARD", "PAYME", "CLICK"],
      room_type: ["ECONOM", "STANDARD"],
      stay_status: ["BOOKED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"],
    },
  },
} as const
