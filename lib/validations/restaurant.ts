import { z } from "zod"

export const restaurantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  // Branding fields
  logo_url: z.string().url().nullable().optional(),
  banner_image_url: z.string().url().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
  font_family: z.string().nullable().optional(),
  button_style: z.enum(["rounded", "square"]).nullable().optional(),
  menu_layout: z.enum(["grid", "list"]).nullable().optional(),
}).strict()

export const restaurantCreateSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  city: z.string().min(1),
  province: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
}).strict()
