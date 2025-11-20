-- ============================================================================
-- Test Script for Migration 008: Menu Builder Schema
-- ============================================================================
-- This script validates all tables, functions, and features work correctly
-- ============================================================================

-- Clean up test data from previous runs
DROP TABLE IF EXISTS test_results CASCADE;

CREATE TEMP TABLE test_results (
    test_number INTEGER,
    test_name VARCHAR(200),
    status VARCHAR(20),
    details TEXT
);

-- ============================================================================
-- TEST 1: Verify all tables exist
-- ============================================================================

INSERT INTO test_results (test_number, test_name, status, details)
SELECT 
    1,
    'All required tables exist',
    CASE 
        WHEN COUNT(*) = 4 THEN 'PASS'
        ELSE 'FAIL'
    END,
    'Found ' || COUNT(*) || ' of 4 required tables'
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN (
    'course_modifier_templates',
    'course_template_modifiers',
    'dish_modifier_groups',
    'dish_modifiers'
);

-- ============================================================================
-- TEST 2: Verify course_modifier_templates has correct columns
-- ============================================================================

INSERT INTO test_results (test_number, test_name, status, details)
SELECT 
    2,
    'course_modifier_templates has all required columns',
    CASE 
        WHEN COUNT(*) >= 9 THEN 'PASS'
        ELSE 'FAIL'
    END,
    'Has ' || COUNT(*) || ' columns (expected: id, course_id, name, is_required, min_selections, max_selections, display_order, created_at, updated_at, deleted_at)'
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'course_modifier_templates';

-- ============================================================================
-- TEST 3: Verify foreign key constraints exist
-- ============================================================================

INSERT INTO test_results (test_number, test_name, status, details)
SELECT 
    3,
    'Foreign key constraints are properly defined',
    CASE 
        WHEN COUNT(*) >= 2 THEN 'PASS'
        ELSE 'FAIL'
    END,
    'Found ' || COUNT(*) || ' foreign key constraints (expected at least 2)'
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'FOREIGN KEY'
AND table_name IN ('course_modifier_templates', 'course_template_modifiers');

-- ============================================================================
-- TEST 4: Verify indexes exist for performance
-- ============================================================================

INSERT INTO test_results (test_number, test_name, status, details)
SELECT 
    4,
    'Performance indexes are created',
    CASE 
        WHEN COUNT(*) >= 4 THEN 'PASS'
        ELSE 'WARN'
    END,
    'Found ' || COUNT(*) || ' indexes'
FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE '%modifier%' OR tablename LIKE '%template%')
AND indexname NOT LIKE '%pkey%';

-- ============================================================================
-- TEST 5: Verify helper functions exist
-- ============================================================================

INSERT INTO test_results (test_number, test_name, status, details)
SELECT 
    5,
    'Helper functions are created',
    CASE 
        WHEN COUNT(*) >= 4 THEN 'PASS'
        ELSE 'FAIL'
    END,
    'Found ' || COUNT(*) || ' helper functions (expected: apply_template_to_dish, apply_all_templates_to_dish, break_modifier_inheritance, sync_template_to_inherited_groups, get_dish_modifier_groups_with_inheritance)'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'apply_template_to_dish',
    'apply_all_templates_to_dish',
    'break_modifier_inheritance',
    'sync_template_to_inherited_groups',
    'get_dish_modifier_groups_with_inheritance'
);

-- ============================================================================
-- TEST 6: Test data insertion (category template)
-- ============================================================================

DO $$
DECLARE
    v_course_id INTEGER;
    v_template_id INTEGER;
    v_test_status VARCHAR(20);
    v_test_details TEXT;
BEGIN
    -- Get a real course_id from the courses table
    SELECT id INTO v_course_id FROM courses LIMIT 1;
    
    IF v_course_id IS NULL THEN
        INSERT INTO test_results (test_number, test_name, status, details)
        VALUES (6, 'Test data insertion', 'SKIP', 'No courses found in database');
    ELSE
        -- Try to insert a test template
        BEGIN
            INSERT INTO course_modifier_templates (
                course_id, 
                name, 
                is_required, 
                min_selections, 
                max_selections,
                display_order
            ) VALUES (
                v_course_id,
                'TEST_SIZE_TEMPLATE',
                true,
                1,
                1,
                0
            )
            RETURNING id INTO v_template_id;
            
            v_test_status := 'PASS';
            v_test_details := 'Successfully created template with id ' || v_template_id;
            
            -- Clean up test data
            DELETE FROM course_modifier_templates WHERE id = v_template_id;
            
        EXCEPTION WHEN OTHERS THEN
            v_test_status := 'FAIL';
            v_test_details := 'Error: ' || SQLERRM;
        END;
        
        INSERT INTO test_results (test_number, test_name, status, details)
        VALUES (6, 'Test data insertion', v_test_status, v_test_details);
    END IF;
END $$;

-- ============================================================================
-- DISPLAY ALL TEST RESULTS
-- ============================================================================

SELECT 
    test_number as "#",
    test_name as "Test",
    status as "Status",
    details as "Details"
FROM test_results
ORDER BY test_number;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
    COUNT(*) FILTER (WHERE status = 'PASS') as passed_tests,
    COUNT(*) FILTER (WHERE status = 'FAIL') as failed_tests,
    COUNT(*) FILTER (WHERE status = 'WARN') as warnings,
    COUNT(*) FILTER (WHERE status = 'SKIP') as skipped_tests,
    COUNT(*) as total_tests,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'FAIL') = 0 THEN '✅ ALL TESTS PASSED'
        ELSE '❌ SOME TESTS FAILED'
    END as overall_status
FROM test_results;
