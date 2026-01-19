/**
 * Supabase Database Types
 *
 * These types match the schema defined in /supabase/schema.sql
 * Update these if you modify the database schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          id: string
          user_id: string
          image_credits: number
          free_credits: number
          total_generations: number
          last_generation_at: string | null
          last_preset: string | null
          last_style: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_credits?: number
          free_credits?: number
          total_generations?: number
          last_generation_at?: string | null
          last_preset?: string | null
          last_style?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_credits?: number
          free_credits?: number
          total_generations?: number
          last_generation_at?: string | null
          last_preset?: string | null
          last_style?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      generations: {
        Row: {
          id: string
          user_id: string
          preset_id: string
          style_id: string | null
          image_urls: string[]
          input_image_url: string | null
          is_free_generation: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preset_id: string
          style_id?: string | null
          image_urls?: string[]
          input_image_url?: string | null
          is_free_generation?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preset_id?: string
          style_id?: string | null
          image_urls?: string[]
          input_image_url?: string | null
          is_free_generation?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      images: {
        Row: {
          id: string
          user_id: string
          generation_batch_id: string
          image_url: string
          storage_path: string | null
          preset_id: string
          style_id: string | null
          image_index: number
          is_public: boolean
          is_free_generation: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          generation_batch_id: string
          image_url: string
          storage_path?: string | null
          preset_id: string
          style_id?: string | null
          image_index: number
          is_public?: boolean
          is_free_generation?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          generation_batch_id?: string
          image_url?: string
          storage_path?: string | null
          preset_id?: string
          style_id?: string | null
          image_index?: number
          is_public?: boolean
          is_free_generation?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          rc_product_id: string
          rc_transaction_id: string | null
          rc_original_transaction_id: string | null
          credits_added: number
          amount_paid: number | null
          currency: string
          platform: 'ios' | 'android' | 'web' | null
          purchased_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          rc_product_id: string
          rc_transaction_id?: string | null
          rc_original_transaction_id?: string | null
          credits_added: number
          amount_paid?: number | null
          currency?: string
          platform?: 'ios' | 'android' | 'web' | null
          purchased_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          rc_product_id?: string
          rc_transaction_id?: string | null
          rc_original_transaction_id?: string | null
          credits_added?: number
          amount_paid?: number | null
          currency?: string
          platform?: 'ios' | 'android' | 'web' | null
          purchased_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_credits: {
        Args: {
          p_user_id: string
          p_preset: string | null
          p_style: string | null
        }
        Returns: boolean
      }
      add_credits: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: boolean
      }
      toggle_image_sharing: {
        Args: {
          p_image_id: string
        }
        Returns: boolean
      }
      get_user_gallery: {
        Args: {
          p_user_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          generation_batch_id: string
          image_url: string
          preset_id: string
          style_id: string | null
          image_index: number
          is_public: boolean
          is_free_generation: boolean
          created_at: string
        }[]
      }
      get_public_feed: {
        Args: {
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          user_id: string
          generation_batch_id: string
          image_url: string
          preset_id: string
          created_at: string
          user_avatar_url: string | null
          user_name: string | null
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

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Credits = Database['public']['Tables']['credits']['Row']
export type Generation = Database['public']['Tables']['generations']['Row']
export type Purchase = Database['public']['Tables']['purchases']['Row']
export type Image = Database['public']['Tables']['images']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type CreditsInsert = Database['public']['Tables']['credits']['Insert']
export type GenerationInsert = Database['public']['Tables']['generations']['Insert']
export type PurchaseInsert = Database['public']['Tables']['purchases']['Insert']
export type ImageInsert = Database['public']['Tables']['images']['Insert']

// Update types
export type ImageUpdate = Database['public']['Tables']['images']['Update']
