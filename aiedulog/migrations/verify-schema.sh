#!/bin/bash
# =============================================================================
# Schema Verification Script
# Created: 2025-10-13
# Purpose: Verify RDS schema and RLS policies are correctly applied
# =============================================================================

set -e

echo "=========================================================================="
echo "AWS RDS Schema Verification"
echo "=========================================================================="

# Load environment variables
if [ -f .env.migration ]; then
    export $(cat .env.migration | grep -v '^#' | xargs)
else
    echo "✗ Error: .env.migration file not found"
    exit 1
fi

echo "Connecting to: $RDS_HOST / $RDS_DATABASE"
echo ""

# Test 1: Check all tables exist
echo "TEST 1: Verifying all tables exist..."
EXPECTED_TABLES=(
    "user_profiles"
    "auth_methods"
    "posts"
    "comments"
    "post_likes"
    "bookmarks"
    "chat_rooms"
    "chat_participants"
    "chat_messages"
    "lectures"
    "lecture_registrations"
    "notifications"
)

for table in "${EXPECTED_TABLES[@]}"; do
    result=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    if [[ $result == *"t"* ]]; then
        echo "  ✓ Table exists: $table"
    else
        echo "  ✗ Table missing: $table"
        exit 1
    fi
done

# Test 2: Check RLS is enabled
echo ""
echo "TEST 2: Verifying RLS is enabled..."
for table in "${EXPECTED_TABLES[@]}"; do
    result=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = '$table';")
    if [[ $result == *"t"* ]]; then
        echo "  ✓ RLS enabled: $table"
    else
        echo "  ✗ RLS not enabled: $table"
        exit 1
    fi
done

# Test 3: Check RLS policies count
echo ""
echo "TEST 3: Verifying RLS policies..."
policy_count=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
echo "  Total RLS policies: $policy_count"
if [ "$policy_count" -ge 23 ]; then
    echo "  ✓ Expected number of policies (23+)"
else
    echo "  ✗ Insufficient policies (expected 23+, got $policy_count)"
    exit 1
fi

# Test 4: Check functions exist
echo ""
echo "TEST 4: Verifying functions..."
EXPECTED_FUNCTIONS=(
    "get_current_user_id"
    "is_user_admin"
    "is_user_moderator"
    "refresh_user_permission_cache"
)

for func in "${EXPECTED_FUNCTIONS[@]}"; do
    result=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$func');")
    if [[ $result == *"t"* ]]; then
        echo "  ✓ Function exists: $func"
    else
        echo "  ✗ Function missing: $func"
        exit 1
    fi
done

# Test 5: Check materialized view exists
echo ""
echo "TEST 5: Verifying materialized view..."
result=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -t -c "SELECT EXISTS (SELECT FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'user_permission_cache');")
if [[ $result == *"t"* ]]; then
    echo "  ✓ Materialized view exists: user_permission_cache"
else
    echo "  ✗ Materialized view missing: user_permission_cache"
    exit 1
fi

# Test 6: Check indexes
echo ""
echo "TEST 6: Verifying RLS performance indexes..."
index_count=$(PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%rls%';")
echo "  RLS performance indexes: $index_count"
if [ "$index_count" -ge 10 ]; then
    echo "  ✓ Expected number of RLS indexes (10+)"
else
    echo "  ✗ Insufficient RLS indexes (expected 10+, got $index_count)"
fi

echo ""
echo "=========================================================================="
echo "✓ All schema verification tests passed!"
echo "=========================================================================="
echo ""
echo "Summary:"
echo "  - 12 tables created"
echo "  - $policy_count RLS policies active"
echo "  - 4 helper functions created"
echo "  - 1 materialized view for permission cache"
echo "  - $index_count RLS performance indexes"
echo ""
echo "Next steps:"
echo "  1. Run data migration: node scripts/extract-production-data.js"
echo "  2. Import data to RDS"
echo "  3. Verify data integrity"
echo "=========================================================================="
