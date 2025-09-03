#!/usr/bin/env node

/**
 * Test Identity Function Script
 * 
 * This script demonstrates the auth.user.id regeneration problem
 * and shows how the improved function solves it.
 * 
 * Usage: node scripts/test-identity-function.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Test the identity function behavior
 */
async function testIdentityFunction() {
  console.log('🧪 Testing Identity Function Behavior');
  console.log('=====================================\n');

  const testEmail = 'test.identity@example.com';
  const originalAuthId = '11111111-1111-1111-1111-111111111111';
  const regeneratedAuthId = '22222222-2222-2222-2222-222222222222';

  try {
    // Clean up any existing test data first
    await cleanupTestData(testEmail);

    console.log('📋 Test Scenario: Auth.user.id Regeneration');
    console.log(`Email: ${testEmail}`);
    console.log(`Original auth.user.id: ${originalAuthId}`);
    console.log(`Regenerated auth.user.id: ${regeneratedAuthId}\n`);

    // Step 1: Create initial identity
    console.log('1️⃣  Creating initial identity...');
    const { data: result1, error: error1 } = await supabase.rpc('ensure_user_identity', {
      new_auth_user_id: originalAuthId,
      user_email: testEmail
    });

    if (error1) {
      console.error('❌ Error creating initial identity:', error1);
      return;
    }

    console.log(`✅ Created identity: ${result1}`);
    
    // Verify initial state
    const initialState = await getIdentityState(testEmail);
    console.log('📊 Initial State:');
    displayIdentityState(initialState);

    // Step 2: Simulate auth.user.id regeneration  
    console.log('\n2️⃣  Simulating auth.user.id regeneration...');
    const { data: result2, error: error2 } = await supabase.rpc('ensure_user_identity', {
      new_auth_user_id: regeneratedAuthId,
      user_email: testEmail
    });

    if (error2) {
      console.error('❌ Error handling regeneration:', error2);
      return;
    }

    console.log(`✅ Handled regeneration: ${result2}`);

    // Verify final state
    const finalState = await getIdentityState(testEmail);
    console.log('📊 Final State:');
    displayIdentityState(finalState);

    // Analysis
    console.log('\n🔍 Analysis:');
    if (result1 === result2) {
      console.log('✅ SUCCESS: Same identity returned (no duplicates)');
      console.log('✅ Function correctly handled auth.user.id regeneration');
      
      if (finalState.length === 1) {
        const state = finalState[0];
        if (state.auth_user_id === regeneratedAuthId && state.provider_user_id === regeneratedAuthId) {
          console.log('✅ Auth mapping updated correctly');
        } else {
          console.log('⚠️  Auth mapping inconsistent');
        }
      }
    } else {
      console.log('❌ PROBLEM: Different identities returned (duplicate created)');
      console.log('❌ Function did NOT handle auth.user.id regeneration properly');
    }

    if (finalState.length > 1) {
      console.log('❌ CRITICAL: Multiple identities found for same email');
    } else {
      console.log('✅ Single identity maintained');
    }

    console.log('\n📈 Summary:');
    console.log(`Initial identity count: 1`);
    console.log(`Final identity count: ${finalState.length}`);
    console.log(`Identity ID consistency: ${result1 === result2 ? 'PASS' : 'FAIL'}`);
    console.log(`Auth mapping updated: ${finalState[0]?.auth_user_id === regeneratedAuthId ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup test data
    await cleanupTestData(testEmail);
    console.log('\n🧹 Test data cleaned up');
  }
}

/**
 * Get identity state for an email
 */
async function getIdentityState(email) {
  const { data, error } = await supabase
    .from('identities')
    .select(`
      id,
      auth_user_id,
      status,
      role,
      user_profiles!inner(email),
      auth_methods(provider_user_id, provider_type, is_primary)
    `)
    .eq('user_profiles.email', email);

  if (error) {
    console.error('Error getting identity state:', error);
    return [];
  }

  return data || [];
}

/**
 * Display identity state
 */
function displayIdentityState(states) {
  if (states.length === 0) {
    console.log('  No identities found');
    return;
  }

  states.forEach((state, index) => {
    console.log(`  Identity ${index + 1}:`);
    console.log(`    ID: ${state.id}`);
    console.log(`    auth_user_id: ${state.auth_user_id}`);
    console.log(`    Email: ${state.user_profiles[0]?.email}`);
    console.log(`    Provider User ID: ${state.auth_methods[0]?.provider_user_id}`);
    console.log(`    Status: ${state.status}`);
    console.log(`    Role: ${state.role}`);
    if (index < states.length - 1) console.log('  ---');
  });
}

/**
 * Clean up test data
 */
async function cleanupTestData(email) {
  try {
    // Get identities to delete
    const { data: identities } = await supabase
      .from('identities')
      .select('id, user_profiles!inner(email)')
      .eq('user_profiles.email', email);

    if (identities && identities.length > 0) {
      const identityIds = identities.map(i => i.id);
      
      // Delete will cascade to auth_methods and user_profiles
      await supabase
        .from('identities')
        .delete()
        .in('id', identityIds);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Test with old function (if available)
 */
async function testOldFunction() {
  console.log('🔄 Testing with old function signature...');
  
  const testEmail = 'test.old@example.com';
  const authId = '33333333-3333-3333-3333-333333333333';

  try {
    // Clean up first
    await cleanupTestData(testEmail);

    // Try old function signature (user_id, user_email)
    const { data, error } = await supabase.rpc('ensure_user_identity', {
      user_id: authId,
      user_email: testEmail
    });

    if (error) {
      console.log('ℹ️  Old function signature not available (expected)');
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`✅ Old function worked: ${data}`);
    }
  } catch (error) {
    console.log('ℹ️  Old function signature not available (expected)');
  } finally {
    await cleanupTestData(testEmail);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Identity Function Test Suite');
  console.log('================================\n');

  try {
    // Test current function
    await testIdentityFunction();
    
    console.log('\n' + '='.repeat(50));
    
    // Test old function compatibility
    await testOldFunction();

    console.log('\n✅ Test suite completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  testIdentityFunction,
  testOldFunction,
  getIdentityState,
  cleanupTestData
};