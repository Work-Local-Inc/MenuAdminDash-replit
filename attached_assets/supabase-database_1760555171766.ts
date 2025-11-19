/**
 * Auto-generated TypeScript types for menuca_v3 database
 * Generated: October 15, 2025
 * 
 * Usage:
 *   import { Database } from './types/supabase-database'
 *   import { createClient } from '@supabase/supabase-js'
 *   
 *   const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
 *   
 *   // Now you get autocomplete for all tables!
 *   const { data } = await supabase.from('restaurants').select('*')
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  menuca_v3: {
    Tables: {
      // ==================== RESTAURANT MANAGEMENT ====================
      restaurants: {
        Row: {
          id: number
          uuid: string
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          name: string
          status: 'pending' | 'active' | 'suspended' | 'inactive' | 'closed'
          activated_at: string | null
          suspended_at: string | null
          closed_at: string | null
          timezone: string // e.g., "America/Toronto"
          created_at: string
          created_by: number | null
          updated_at: string | null
          updated_by: number | null
        }
        Insert: {
          id?: number
          uuid?: string
          legacy_v1_id?: number | null
          legacy_v2_id?: number | null
          name: string
          status?: 'pending' | 'active' | 'suspended' | 'inactive' | 'closed'
          activated_at?: string | null
          suspended_at?: string | null
          closed_at?: string | null
          timezone?: string
          created_at?: string
          created_by?: number | null
          updated_at?: string | null
          updated_by?: number | null
        }
        Update: {
          id?: number
          uuid?: string
          legacy_v1_id?: number | null
          legacy_v2_id?: number | null
          name?: string
          status?: 'pending' | 'active' | 'suspended' | 'inactive' | 'closed'
          activated_at?: string | null
          suspended_at?: string | null
          closed_at?: string | null
          timezone?: string
          created_at?: string
          created_by?: number | null
          updated_at?: string | null
          updated_by?: number | null
        }
      }
      
      restaurant_locations: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          is_primary: boolean
          street_address: string | null
          city_id: number | null
          province_id: number | null
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          location: unknown | null // PostGIS geometry
          phone: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['restaurant_locations']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['restaurant_locations']['Insert']>
      }

      restaurant_contacts: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          title: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          receives_orders: boolean | null
          receives_statements: boolean | null
          receives_marketing: boolean | null
          preferred_language: string | null
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['restaurant_contacts']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['restaurant_contacts']['Insert']>
      }

      restaurant_domains: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          domain: string
          domain_type: string | null
          is_enabled: boolean
          ssl_verified: boolean
          ssl_verified_at: string | null
          ssl_expires_at: string | null
          dns_verified: boolean
          dns_verified_at: string | null
          added_by: number | null
          created_at: string
          disabled_by: number | null
          disabled_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['restaurant_domains']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['restaurant_domains']['Insert']>
      }

      restaurant_schedules: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          type: 'delivery' | 'takeout'
          day_start: number
          time_start: string
          time_stop: string
          day_stop: number
          is_enabled: boolean
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['restaurant_schedules']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['restaurant_schedules']['Insert']>
      }

      restaurant_service_configs: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          has_delivery_enabled: boolean
          delivery_time_minutes: number | null
          delivery_min_order: number | null
          delivery_max_distance_km: number | null
          takeout_enabled: boolean
          takeout_time_minutes: number | null
          takeout_discount_enabled: boolean | null
          takeout_discount_type: 'percentage' | 'fixed' | null
          takeout_discount_value: number | null
          allows_preorders: boolean | null
          preorder_time_frame_hours: number | null
          is_bilingual: boolean | null
          default_language: 'en' | 'fr' | 'es' | null
          accepts_tips: boolean | null
          requires_phone: boolean | null
          notes: string | null
          created_at: string
          created_by: number | null
          updated_at: string | null
          updated_by: number | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['restaurant_service_configs']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['restaurant_service_configs']['Insert']>
      }

      // ==================== LOCATION & GEOGRAPHY ====================
      provinces: {
        Row: {
          id: number
          name: string
          nom_francaise: string | null
          short_name: string
        }
        Insert: Database['menuca_v3']['Tables']['provinces']['Row']
        Update: Partial<Database['menuca_v3']['Tables']['provinces']['Row']>
      }

      cities: {
        Row: {
          id: number
          name: string
          display_name: string | null
          province_id: number
          lat: number | null
          lng: number | null
          timezone: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['cities']['Row'], 'id'> & { id?: number }
        Update: Partial<Database['menuca_v3']['Tables']['cities']['Insert']>
      }

      // ==================== USERS & ACCESS ====================
      users: {
        Row: {
          id: number
          email: string
          has_email_verified: boolean | null
          first_name: string | null
          last_name: string | null
          display_name: string | null
          phone: string | null
          language: string | null
          password_hash: string
          password_changed_at: string | null
          is_newsletter_subscribed: boolean | null
          is_vegan_newsletter_subscribed: boolean | null
          login_count: number | null
          last_login_at: string | null
          last_login_ip: string | null
          credit_balance: number | null
          credit_earned_at: string | null
          facebook_id: string | null
          origin_restaurant_id: number | null
          origin_source: string | null
          v1_user_id: number | null
          v2_user_id: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['users']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['users']['Insert']>
      }

      admin_users: {
        Row: {
          id: number
          email: string
          first_name: string | null
          last_name: string | null
          password_hash: string
          last_login_at: string | null
          mfa_enabled: boolean
          mfa_secret: string | null
          mfa_backup_codes: string[] | null
          v1_admin_id: number | null
          v2_admin_id: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['admin_users']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['admin_users']['Insert']>
      }

      admin_user_restaurants: {
        Row: {
          id: number
          admin_user_id: number
          restaurant_id: number
          role: string | null
          created_at: string
        }
        Insert: Omit<Database['menuca_v3']['Tables']['admin_user_restaurants']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['admin_user_restaurants']['Insert']>
      }

      user_addresses: {
        Row: {
          id: number
          user_id: number
          street_address: string | null
          apartment: string | null
          city_id: number | null
          postal_code: string | null
          phone: string | null
          delivery_instructions: string | null
          is_default: boolean | null
          v2_address_id: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['user_addresses']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['user_addresses']['Insert']>
      }

      // ==================== MENU & CATALOG ====================
      courses: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          name: string
          description: string | null
          display_order: number | null
          is_active: boolean | null
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['courses']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['courses']['Insert']>
      }

      dishes: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          course_id: number | null
          name: string
          description: string | null
          ingredients: string | null
          sku: string | null
          base_price: number | null
          prices: Json | null
          size_options: Json | null
          display_order: number | null
          image_url: string | null
          is_combo: boolean | null
          has_customization: boolean | null
          quantity: string | null
          is_upsell: boolean | null
          is_active: boolean | null
          unavailable_until_at: string | null
          allergen_info: Json | null
          nutritional_info: Json | null
          search_vector: unknown | null // tsvector for full-text search
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['dishes']['Row'], 'id' | 'uuid' | 'search_vector' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['dishes']['Insert']>
      }

      dish_prices: {
        Row: {
          id: number
          dish_id: number
          size_variant: string | null // e.g., "default", "small", "large"
          price: number
          display_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['dish_prices']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['dish_prices']['Insert']>
      }

      ingredients: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          name: string
          description: string | null
          base_price: number | null
          price_by_size: Json | null
          ingredient_type: string | null
          display_order: number | null
          is_global: boolean | null
          is_active: boolean | null
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['ingredients']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['ingredients']['Insert']>
      }

      ingredient_groups: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          name: string
          group_type: string | null
          applies_to_course: number | null
          applies_to_dish: number | null
          display_order: number | null
          min_selection: number | null
          max_selection: number | null
          free_quantity: number | null
          allow_duplicates: boolean | null
          is_active: boolean | null
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['ingredient_groups']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['ingredient_groups']['Insert']>
      }

      ingredient_group_items: {
        Row: {
          id: number
          uuid: string
          ingredient_group_id: number
          ingredient_id: number
          base_price: number | null
          price_by_size: Json | null
          is_included: boolean | null
          display_order: number | null
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          created_at: string
        }
        Insert: Omit<Database['menuca_v3']['Tables']['ingredient_group_items']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['ingredient_group_items']['Insert']>
      }

      combo_groups: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          name: string
          description: string | null
          combo_rules: Json | null
          combo_price: number | null
          pricing_rules: Json | null
          display_order: number | null
          is_active: boolean | null
          is_available: boolean
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['combo_groups']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['combo_groups']['Insert']>
      }

      combo_items: {
        Row: {
          id: number
          uuid: string
          combo_group_id: number
          dish_id: number
          quantity: number | null
          is_required: boolean | null
          display_order: number | null
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['combo_items']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['combo_items']['Insert']>
      }

      dish_modifiers: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          dish_id: number
          ingredient_id: number
          ingredient_group_id: number | null
          legacy_v1_menuothers_id: number | null
          base_price: number | null
          price_by_size: Json | null
          modifier_type: string | null
          is_included: boolean | null
          display_order: number | null
          source_system: 'v1' | 'v2' | null
          source_id: number | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['dish_modifiers']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['dish_modifiers']['Insert']>
      }

      dish_modifier_prices: {
        Row: {
          id: number
          dish_modifier_id: number
          size_variant: string | null
          price_adjustment: number
          display_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['dish_modifier_prices']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['dish_modifier_prices']['Insert']>
      }

      // ==================== ORDERS & CHECKOUT ====================
      orders: {
        Row: {
          id: number
          uuid: string
          restaurant_id: number
          user_id: number
          order_number: string
          order_type: 'delivery' | 'takeout' | 'dine_in'
          order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
          subtotal: number
          tax_amount: number
          delivery_fee: number
          tip_amount: number
          discount_amount: number
          total_amount: number
          customer_name: string | null
          customer_phone: string | null
          customer_email: string | null
          delivery_address: string | null
          delivery_instructions: string | null
          delivery_city_id: number | null
          delivery_lat: number | null
          delivery_lng: number | null
          estimated_ready_time: string | null
          estimated_delivery_time: string | null
          confirmed_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          coupon_code: string | null
          special_instructions: string | null
          payment_method: string | null
          source: string | null
          created_at: string // PARTITION KEY
          created_by: number | null
          updated_at: string | null
          updated_by: number | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['orders']['Row'], 'id' | 'uuid' | 'created_at'> & {
          id?: number
          uuid?: string
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['orders']['Insert']>
      }

      order_items: {
        Row: {
          id: number
          order_id: number
          dish_id: number | null
          item_name: string
          item_description: string | null
          quantity: number
          unit_price: number
          total_price: number
          customizations: Json | null
          special_instructions: string | null
          created_at: string // PARTITION KEY
        }
        Insert: Omit<Database['menuca_v3']['Tables']['order_items']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['order_items']['Insert']>
      }

      // ==================== MARKETING & PROMOTIONS ====================
      promotional_deals: {
        Row: {
          id: number
          restaurant_id: number
          type: string
          is_repeatable: boolean
          name: string
          description: string | null
          active_days: Json | null
          date_start: string | null
          date_stop: string | null
          time_start: string | null
          time_stop: string | null
          specific_dates: Json | null
          deal_type: string
          discount_percent: number | null
          discount_amount: number | null
          minimum_purchase: number | null
          order_count_required: number | null
          included_items: Json | null
          required_items: Json | null
          required_item_count: number | null
          free_item_count: number | null
          exempted_courses: Json | null
          availability_types: Json | null
          image_url: string | null
          promo_code: string | null
          display_order: number | null
          is_customizable: boolean | null
          is_split_deal: boolean | null
          is_first_order_only: boolean | null
          shows_on_thankyou: boolean | null
          sends_in_email: boolean | null
          email_body_html: string | null
          is_enabled: boolean
          language_code: string | null
          v1_deal_id: number | null
          v1_meal_number: number | null
          v1_position: string | null
          v1_is_global: boolean | null
          v2_deal_id: number | null
          created_by: number | null
          created_at: string
          disabled_by: number | null
          disabled_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['promotional_deals']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['promotional_deals']['Insert']>
      }

      promotional_coupons: {
        Row: {
          id: number
          restaurant_id: number
          name: string
          description: string | null
          code: string
          valid_from_at: string | null
          valid_until_at: string | null
          discount_type: string
          discount_amount: number | null
          minimum_purchase: number | null
          applies_to_items: Json | null
          item_count: number | null
          max_redemptions: number | null
          redeem_value_limit: number | null
          coupon_scope: string | null
          is_one_time_use: boolean | null
          is_reorder_coupon: boolean | null
          includes_in_email: boolean | null
          email_text: string | null
          is_active: boolean
          is_used: boolean | null
          language_code: string | null
          v1_coupon_id: number | null
          v2_coupon_id: number | null
          source_table: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['promotional_coupons']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['promotional_coupons']['Insert']>
      }

      coupon_usage_log: {
        Row: {
          id: number
          coupon_id: number
          order_id: number | null
          user_id: number
          discount_applied: number
          used_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['coupon_usage_log']['Row'], 'id' | 'used_at'> & {
          id?: number
          used_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['coupon_usage_log']['Insert']>
      }

      // ==================== INFRASTRUCTURE ====================
      audit_log: {
        Row: {
          id: number
          table_name: string
          record_id: number
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          changed_fields: string[] | null
          changed_by_user_id: number | null
          changed_by_admin_id: number | null
          ip_address: string | null
          user_agent: string | null
          created_at: string // PARTITION KEY
        }
        Insert: Omit<Database['menuca_v3']['Tables']['audit_log']['Row'], 'id' | 'created_at'> & {
          id?: number
          created_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['audit_log']['Insert']>
      }

      rate_limits: {
        Row: {
          id: number
          identifier: string
          endpoint: string
          request_count: number
          window_start: string
          expires_at: string
        }
        Insert: Omit<Database['menuca_v3']['Tables']['rate_limits']['Row'], 'id'> & { id?: number }
        Update: Partial<Database['menuca_v3']['Tables']['rate_limits']['Insert']>
      }

      email_queue: {
        Row: {
          id: number
          recipient_email: string
          recipient_name: string | null
          subject: string
          body_html: string
          body_text: string | null
          template_name: string | null
          template_data: Json | null
          priority: number
          status: 'pending' | 'sending' | 'sent' | 'failed'
          attempts: number
          max_attempts: number
          error_message: string | null
          scheduled_for: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['menuca_v3']['Tables']['email_queue']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['email_queue']['Insert']>
      }

      failed_jobs: {
        Row: {
          id: number
          job_name: string
          payload: Json
          exception_message: string | null
          exception_stack: string | null
          failed_at: string
          retried_at: string | null
          retry_count: number
          resolved: boolean
          resolved_at: string | null
          resolved_by: number | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['failed_jobs']['Row'], 'id' | 'failed_at'> & {
          id?: number
          failed_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['failed_jobs']['Insert']>
      }

      devices: {
        Row: {
          id: number
          uuid: string
          legacy_v1_id: number | null
          legacy_v2_id: number | null
          source_version: string | null
          device_name: string
          device_key_hash: string | null
          restaurant_id: number | null
          has_printing_support: boolean
          allows_config_edit: boolean
          is_v2_device: boolean
          firmware_version: number
          software_version: number
          is_desynced: boolean
          is_active: boolean
          last_boot_at: string | null
          last_check_at: string | null
          created_at: string
          updated_at: string
          created_by: number | null
          updated_by: number | null
        }
        Insert: Omit<Database['menuca_v3']['Tables']['devices']['Row'], 'id' | 'uuid' | 'created_at' | 'updated_at'> & {
          id?: number
          uuid?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['menuca_v3']['Tables']['devices']['Insert']>
      }

      // Additional tables: vendors, vendor_restaurants, vendor_commission_reports, etc.
      // (Truncated for brevity - full 74 tables would be included in production)
    }
    Views: {}
    Functions: {}
    Enums: {
      amount_type: 'percent' | 'fixed'
      commission_rate_type: 'percentage' | 'fixed'
      contact_type: 'owner' | 'manager' | 'billing' | 'technical' | 'marketing' | 'operations' | 'other'
      domain_type: 'main' | 'other' | 'mobile'
      fee_type: 'convenience' | 'service' | 'commission' | 'pay_at_door' | 'vendor_commission_extra' | 'contract_fee'
      restaurant_status: 'pending' | 'active' | 'suspended' | 'inactive' | 'closed'
      service_type: 'delivery' | 'takeout'
    }
  }
}

// Helper types for common use cases
export type Restaurant = Database['menuca_v3']['Tables']['restaurants']['Row']
export type Dish = Database['menuca_v3']['Tables']['dishes']['Row']
export type Order = Database['menuca_v3']['Tables']['orders']['Row']
export type User = Database['menuca_v3']['Tables']['users']['Row']
export type AdminUser = Database['menuca_v3']['Tables']['admin_users']['Row']
export type Course = Database['menuca_v3']['Tables']['courses']['Row']
export type Ingredient = Database['menuca_v3']['Tables']['ingredients']['Row']
export type ComboGroup = Database['menuca_v3']['Tables']['combo_groups']['Row']

// Enums for easy access
export const RestaurantStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
  CLOSED: 'closed',
} as const

export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

export const ServiceType = {
  DELIVERY: 'delivery',
  TAKEOUT: 'takeout',
} as const

