#!/bin/bash
# =============================================================================
# Migration Execution Script
# Created: 2025-10-13
# Purpose: Execute all RDS migrations in correct order
# =============================================================================

set -e  # Exit on error

echo "=========================================================================="
echo "AWS RDS Migration Execution"
echo "=========================================================================="

# Load environment variables
if [ -f .env.migration ]; then
    export $(cat .env.migration | grep -v '^#' | xargs)
    echo "✓ Environment variables loaded from .env.migration"
else
    echo "✗ Error: .env.migration file not found"
    exit 1
fi

# Check required variables
if [ -z "$RDS_HOST" ] || [ -z "$RDS_DATABASE" ] || [ -z "$RDS_USERNAME" ]; then
    echo "✗ Error: Required RDS environment variables not set"
    echo "  Required: RDS_HOST, RDS_DATABASE, RDS_USERNAME, RDS_PASSWORD"
    exit 1
fi

echo "✓ RDS Host: $RDS_HOST"
echo "✓ Database: $RDS_DATABASE"
echo ""

# Test connection
echo "Testing database connection..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
else
    echo "✗ Database connection failed"
    exit 1
fi

echo ""
echo "=========================================================================="
echo "Executing Migrations"
echo "=========================================================================="

# Migration 1: JWT Extraction Function
echo "1/6 - Executing JWT extraction function..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f migrations/001_jwt_extraction_function.sql
if [ $? -eq 0 ]; then
    echo "✓ Migration 001 completed"
else
    echo "✗ Migration 001 failed"
    exit 1
fi

# Migration 2: Core Tables
echo "2/6 - Executing core tables schema..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f migrations/002_core_tables.sql
if [ $? -eq 0 ]; then
    echo "✓ Migration 002 completed"
else
    echo "✗ Migration 002 failed"
    exit 1
fi

# Migration 3: Permission Cache
echo "3/6 - Executing permission cache..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f migrations/003_permission_cache.sql
if [ $? -eq 0 ]; then
    echo "✓ Migration 003 completed"
else
    echo "✗ Migration 003 failed"
    exit 1
fi

# Migration 4: Enable RLS
echo "4/6 - Enabling Row Level Security..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f migrations/004_enable_rls.sql
if [ $? -eq 0 ]; then
    echo "✓ Migration 004 completed"
else
    echo "✗ Migration 004 failed"
    exit 1
fi

# Migration 5: RLS Policies
echo "5/6 - Executing unified RLS policies..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f migrations/005_unified_rls_policies.sql
if [ $? -eq 0 ]; then
    echo "✓ Migration 005 completed"
else
    echo "✗ Migration 005 failed"
    exit 1
fi

# Migration 6: Performance Indexes
echo "6/6 - Creating RLS performance indexes..."
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -f migrations/006_rls_performance_indexes.sql
if [ $? -eq 0 ]; then
    echo "✓ Migration 006 completed"
else
    echo "✗ Migration 006 failed"
    exit 1
fi

echo ""
echo "=========================================================================="
echo "Verification"
echo "=========================================================================="

# List all tables
echo "Tables created:"
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -c "\dt" | grep "public"

echo ""
echo "RLS Policies created:"
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -c "SELECT tablename, COUNT(*) as policy_count FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename;"

echo ""
echo "Functions created:"
PGPASSWORD=$RDS_PASSWORD psql -h $RDS_HOST -U $RDS_USERNAME -d $RDS_DATABASE -c "SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%user%' OR proname LIKE '%permission%';"

echo ""
echo "=========================================================================="
echo "✓ All migrations completed successfully!"
echo "=========================================================================="
