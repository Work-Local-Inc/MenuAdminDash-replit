import { z } from 'zod';

// ============================================
// ENUM SCHEMAS
// ============================================

export const CampaignTypeSchema = z.enum([
  'coupon', 'deal', 'upsell', 'bundle', 'flash_sale', 'loyalty'
]);

export const TriggerTypeSchema = z.enum([
  'code_entry', 'automatic', 'suggestion', 'first_order', 'reorder', 'cart_threshold'
]);

export const DiscountTypeSchema = z.enum([
  'percent_off', 'amount_off', 'fixed_price', 'free_item', 'free_delivery', 'bogo', 'tiered'
]);

export const CampaignStatusSchema = z.enum([
  'draft', 'scheduled', 'active', 'paused', 'ended', 'archived'
]);

export const ScheduleTypeSchema = z.enum([
  'always', 'date_range', 'recurring', 'flash'
]);

export const CodeTypeSchema = z.enum([
  'standard', 'unique', 'referral', 'influencer'
]);

export const TargetTypeSchema = z.enum([
  'all_items', 'category', 'item', 'item_tag', 'exclude_category', 'exclude_item'
]);

export const UpsellTriggerTypeSchema = z.enum([
  'item_in_cart', 'category_in_cart', 'cart_value', 'checkout', 'item_customization'
]);

export const UpsellTypeSchema = z.enum([
  'add_item', 'upgrade_size', 'add_modifier', 'complete_combo', 'cross_sell'
]);

// ============================================
// RECURRING SCHEDULE SCHEMA
// ============================================

export const RecurringScheduleSchema = z.object({
  days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])),
  time_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  time_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
}).optional();

// ============================================
// CAMPAIGN SCHEMAS
// ============================================

export const CreateCampaignSchema = z.object({
  restaurant_id: z.number().int().positive(),
  
  // Basic Info
  name: z.string().min(1).max(255),
  internal_name: z.string().max(255).optional(),
  description: z.string().optional(),
  
  // Type & Mechanism
  campaign_type: CampaignTypeSchema,
  trigger_type: TriggerTypeSchema,
  
  // Discount Configuration
  discount_type: DiscountTypeSchema,
  discount_value: z.number().min(0).optional(),
  discount_max_value: z.number().min(0).optional(),
  
  // BOGO specific
  bogo_buy_quantity: z.number().int().min(1).default(1),
  bogo_get_quantity: z.number().int().min(1).default(1),
  bogo_get_discount_percent: z.number().min(0).max(100).default(100),
  
  // Conditions
  minimum_order_value: z.number().min(0).optional(),
  minimum_item_quantity: z.number().int().min(1).optional(),
  maximum_discount_amount: z.number().min(0).optional(),
  
  // Scheduling
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  schedule_type: ScheduleTypeSchema.default('always'),
  recurring_schedule: RecurringScheduleSchema,
  
  // Limits
  total_usage_limit: z.number().int().min(1).optional(),
  per_customer_limit: z.number().int().min(1).optional(),
  daily_limit: z.number().int().min(1).optional(),
  quantity_available: z.number().int().min(1).optional(),
  
  // Order Type Restrictions
  applies_to_delivery: z.boolean().default(true),
  applies_to_takeout: z.boolean().default(true),
  applies_to_dine_in: z.boolean().default(true),
  
  // Status
  status: CampaignStatusSchema.default('draft'),
  is_featured: z.boolean().default(false),
  display_order: z.number().int().default(0),
  
  // Display
  customer_display_name: z.string().max(255).optional(),
  customer_description: z.string().optional(),
  badge_text: z.string().max(50).optional(),
  image_url: z.string().url().optional(),
  terms_and_conditions: z.string().optional(),
  
  // Coupon code (for coupon type)
  code: z.string().min(3).max(50).optional(),
  
  // Targets (what items it applies to)
  targets: z.array(z.object({
    target_type: TargetTypeSchema,
    course_id: z.number().int().optional(),
    dish_id: z.number().int().optional(),
    tag_name: z.string().optional(),
    is_qualifying_item: z.boolean().default(true),
  })).optional(),
  
  // Tiers (for tiered discounts)
  tiers: z.array(z.object({
    tier_order: z.number().int().min(1),
    threshold_amount: z.number().min(0),
    discount_type: z.enum(['percent_off', 'amount_off', 'free_item']),
    discount_value: z.number().min(0).optional(),
    free_item_dish_id: z.number().int().optional(),
    description: z.string().optional(),
  })).optional(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial().omit({
  restaurant_id: true,
});

export const CampaignFiltersSchema = z.object({
  restaurant_id: z.coerce.number().int().positive(),
  status: CampaignStatusSchema.optional(),
  campaign_type: CampaignTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================
// PROMOTION CODE SCHEMAS
// ============================================

export const CreateCodeSchema = z.object({
  campaign_id: z.number().int().positive(),
  code: z.string().min(3).max(50).toUpperCase(),
  code_type: CodeTypeSchema.default('standard'),
  generated_for_user_id: z.number().int().optional(),
  referrer_user_id: z.number().int().optional(),
  usage_limit: z.number().int().min(1).optional(),
  expires_at: z.string().datetime().optional(),
});

export const GenerateCodesSchema = z.object({
  campaign_id: z.number().int().positive(),
  count: z.number().int().min(1).max(1000),
  prefix: z.string().min(1).max(10).toUpperCase().optional(),
  code_type: CodeTypeSchema.default('unique'),
});

// ============================================
// UPSELL RULE SCHEMAS
// ============================================

export const CreateUpsellRuleSchema = z.object({
  restaurant_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  
  // Trigger
  trigger_type: UpsellTriggerTypeSchema,
  trigger_dish_id: z.number().int().optional(),
  trigger_course_id: z.number().int().optional(),
  trigger_cart_minimum: z.number().min(0).optional(),
  
  // Suggestion
  upsell_type: UpsellTypeSchema,
  upsell_dish_id: z.number().int().optional(),
  upsell_modifier_id: z.number().int().optional(),
  
  // Discount
  discount_percent: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
  
  // Display
  headline: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
  image_url: z.string().url().optional(),
  
  // Settings
  display_priority: z.number().int().default(0),
  max_shows_per_session: z.number().int().min(1).default(3),
  is_active: z.boolean().default(true),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});

export const UpdateUpsellRuleSchema = CreateUpsellRuleSchema.partial().omit({
  restaurant_id: true,
});

// ============================================
// VALIDATION (Customer-facing)
// ============================================

export const ValidateCodeSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  restaurant_id: z.number().int().positive(),
  cart: z.object({
    items: z.array(z.object({
      dish_id: z.number().int(),
      quantity: z.number().int().min(1),
      price: z.number().min(0),
      course_id: z.number().int().optional(),
    })),
    subtotal: z.number().min(0),
  }),
  user_id: z.number().int().optional(),
  order_type: z.enum(['delivery', 'takeout', 'dine_in']),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type DiscountType = z.infer<typeof DiscountTypeSchema>;
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;
export type CodeType = z.infer<typeof CodeTypeSchema>;
export type TargetType = z.infer<typeof TargetTypeSchema>;
export type UpsellTriggerType = z.infer<typeof UpsellTriggerTypeSchema>;
export type UpsellType = z.infer<typeof UpsellTypeSchema>;

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
export type CampaignFilters = z.infer<typeof CampaignFiltersSchema>;
export type CreateCodeInput = z.infer<typeof CreateCodeSchema>;
export type GenerateCodesInput = z.infer<typeof GenerateCodesSchema>;
export type CreateUpsellRuleInput = z.infer<typeof CreateUpsellRuleSchema>;
export type UpdateUpsellRuleInput = z.infer<typeof UpdateUpsellRuleSchema>;
export type ValidateCodeInput = z.infer<typeof ValidateCodeSchema>;

