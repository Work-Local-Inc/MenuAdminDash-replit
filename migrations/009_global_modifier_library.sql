-- ============================================================================
-- Migration 009: Global Modifier Library System
-- ============================================================================
-- Purpose: Enable global modifier groups library with category associations
-- Created: November 21, 2025
-- Schema: menuca_v3
--
-- CHANGES:
-- 1. Make course_id nullable to support global library groups
-- 2. Add library_template_id to track associations
-- ============================================================================

SET search_path TO menuca_v3;

-- Make course_id nullable to support global library groups (course_id = NULL)
ALTER TABLE course_modifier_templates ALTER COLUMN course_id DROP NOT NULL;

-- Add library_template_id to track which library group a category template is associated with
ALTER TABLE course_modifier_templates 
ADD COLUMN IF NOT EXISTS library_template_id INTEGER REFERENCES course_modifier_templates(id) ON DELETE SET NULL;

-- Add index for library template lookups
CREATE INDEX IF NOT EXISTS idx_course_modifier_templates_library 
    ON course_modifier_templates(library_template_id) 
    WHERE deleted_at IS NULL AND library_template_id IS NOT NULL;

-- Add index for global library groups (course_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_course_modifier_templates_global 
    ON course_modifier_templates(id) 
    WHERE deleted_at IS NULL AND course_id IS NULL;

-- Add comments
COMMENT ON COLUMN course_modifier_templates.library_template_id IS 
'Reference to global library template. NULL for library groups themselves and custom category groups. Set for category associations.';

COMMENT ON INDEX idx_course_modifier_templates_global IS 
'Index for fetching global library modifier groups (course_id IS NULL)';

COMMENT ON INDEX idx_course_modifier_templates_library IS 
'Index for finding all category associations of a library group';
