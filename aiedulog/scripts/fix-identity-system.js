#!/usr/bin/env node

/**
 * Identity System Fix Script
 * 
 * This script:
 * 1. Applies the improved ensure_user_identity() function
 * 2. Identifies and reports duplicate identities
 * 3. Fixes orphaned auth_methods
 * 4. Creates missing auth_methods
 * 5. Tests the improved function
 * 
 * Usage: node scripts/fix-identity-system.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Run SQL migration file
 */
async function runMigration() {
  console.log('🔄 Applying improved ensure_user_identity() function...');
  
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250903_fix_ensure_user_identity_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
    
    console.log('✅ Migration applied successfully');
    return true;
  } catch (error) {
    console.error('❌ Error reading migration file:', error);
    return false;
  }
}

/**
 * Identify duplicate identities
 */
async function identifyDuplicates() {
  console.log('\n🔍 Identifying duplicate identities...');
  
  const { data, error } = await supabase.rpc('identify_duplicate_identities');
  
  if (error) {
    console.error('❌ Error identifying duplicates:', error);
    return [];
  }
  
  if (data && data.length > 0) {
    console.log(`⚠️  Found ${data.length} emails with duplicate identities:`);
    data.forEach(duplicate => {
      console.log(`  Email: ${duplicate.email}`);
      console.log(`  Identity Count: ${duplicate.identity_count}`);
      console.log(`  Identity IDs: ${duplicate.identity_ids.join(', ')}`);
      console.log('  ---');
    });
  } else {
    console.log('✅ No duplicate identities found');
  }
  
  return data || [];
}

/**
 * Fix orphaned auth_methods
 */
async function fixOrphanedAuthMethods() {
  console.log('\n🔧 Fixing orphaned auth_methods...');
  
  const { data, error } = await supabase.rpc('fix_orphaned_auth_methods');
  
  if (error) {
    console.error('❌ Error fixing orphaned auth_methods:', error);
    return 0;
  }
  
  console.log(`✅ Fixed ${data} orphaned auth_methods`);
  return data;
}

/**
 * Fix missing auth_methods
 */
async function fixMissingAuthMethods() {
  console.log('\n🔧 Fixing missing auth_methods...');
  
  const { data, error } = await supabase.rpc('fix_missing_auth_methods');
  
  if (error) {
    console.error('❌ Error fixing missing auth_methods:', error);
    return 0;
  }
  
  console.log(`✅ Created ${data} missing auth_methods`);
  return data;
}

/**
 * Test the improved function with sample data
 */
async function testImprovedFunction() {
  console.log('\n🧪 Testing improved ensure_user_identity() function...');
  
  const testCases = [
    {
      name: 'New user creation',
      auth_user_id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test.user.new@example.com'
    },
    {
      name: 'Existing user (same auth_user_id)',
      auth_user_id: '123e4567-e89b-12d3-a456-426614174000', // Same ID
      email: 'test.user.new@example.com' // Same email
    },
    {
      name: 'Auth regeneration scenario',
      auth_user_id: '987fcdeb-51d3-12e4-b567-426614174001', // New auth ID
      email: 'test.user.new@example.com' // Same email
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n  Testing: ${testCase.name}`);
      
      const { data, error } = await supabase.rpc('ensure_user_identity_safe', {
        new_auth_user_id: testCase.auth_user_id,
        user_email: testCase.email
      });
      
      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        continue;
      }
      
      const result = data[0];
      if (result.success) {
        console.log(`  ✅ Success: Identity ID = ${result.identity_id}`);
        
        // Verify the identity was created/updated correctly
        const { data: verification, error: verifyError } = await supabase
          .from('identities')
          .select(`
            id,
            auth_user_id,
            user_profiles(email),
            auth_methods(provider_user_id, is_primary)
          `)
          .eq('id', result.identity_id)
          .single();
        
        if (!verifyError && verification) {
          console.log(`  📊 Verified: auth_user_id = ${verification.auth_user_id}`);
          console.log(`  📊 Verified: email = ${verification.user_profiles[0]?.email}`);
          console.log(`  📊 Verified: provider_user_id = ${verification.auth_methods[0]?.provider_user_id}`);
        }
      } else {
        console.error(`  ❌ Function failed: ${result.error_message}`);
      }
    } catch (error) {
      console.error(`  ❌ Test failed: ${error.message}`);
    }
  }
  
  // Cleanup test data
  try {
    await supabase
      .from('identities')
      .delete()
      .in('auth_user_id', testCases.map(tc => tc.auth_user_id));
    console.log('\n🧹 Cleaned up test data');
  } catch (error) {
    console.log('\n⚠️  Could not clean up test data:', error.message);
  }
}

/**
 * Generate summary report
 */
async function generateSummaryReport() {
  console.log('\n📊 Generating summary report...');
  
  try {
    // Count total identities
    const { count: identityCount } = await supabase
      .from('identities')
      .select('*', { count: 'exact', head: true });
    
    // Count total auth_methods
    const { count: authMethodCount } = await supabase
      .from('auth_methods')
      .select('*', { count: 'exact', head: true });
    
    // Count total user_profiles
    const { count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    // Count identities without profiles
    const { count: missingProfileCount } = await supabase
      .from('identities')
      .select('*', { count: 'exact', head: true })
      .not('id', 'in', `(SELECT identity_id FROM user_profiles)`);
    
    // Count identities without auth_methods
    const { count: missingAuthMethodCount } = await supabase
      .from('identities')
      .select('*', { count: 'exact', head: true })
      .not('id', 'in', `(SELECT identity_id FROM auth_methods)`);
    
    console.log('\n📈 Database Summary:');
    console.log(`  Total Identities: ${identityCount || 0}`);
    console.log(`  Total Auth Methods: ${authMethodCount || 0}`);
    console.log(`  Total User Profiles: ${profileCount || 0}`);
    console.log(`  Identities Missing Profiles: ${missingProfileCount || 0}`);
    console.log(`  Identities Missing Auth Methods: ${missingAuthMethodCount || 0}`);
    
    const healthScore = identityCount > 0 
      ? Math.round(((identityCount - (missingProfileCount + missingAuthMethodCount)) / identityCount) * 100)
      : 100;
    
    console.log(`\n🏥 Identity System Health: ${healthScore}%`);
    
    if (healthScore === 100) {
      console.log('✅ Identity system is healthy!');
    } else if (healthScore >= 90) {
      console.log('⚠️  Minor issues detected - consider running cleanup utilities');
    } else {
      console.log('❌ Significant issues detected - manual intervention may be required');
    }
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Identity System Fix Script');
  console.log('=====================================\n');
  
  try {
    // Step 1: Apply migration
    const migrationSuccess = await runMigration();
    if (!migrationSuccess) {
      console.error('❌ Migration failed. Aborting script.');
      process.exit(1);
    }
    
    // Step 2: Identify issues
    const duplicates = await identifyDuplicates();
    
    // Step 3: Fix data issues
    await fixOrphanedAuthMethods();
    await fixMissingAuthMethods();
    
    // Step 4: Test the improved function
    await testImprovedFunction();
    
    // Step 5: Generate report
    await generateSummaryReport();
    
    console.log('\n✅ Identity System Fix completed successfully!');
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  WARNING: Duplicate identities found.');
      console.log('   These require manual review and cleanup.');
      console.log('   Consider merging duplicate identities carefully.');
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  runMigration,
  identifyDuplicates,
  fixOrphanedAuthMethods,
  fixMissingAuthMethods,
  testImprovedFunction,
  generateSummaryReport
};