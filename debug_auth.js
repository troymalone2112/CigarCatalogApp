#!/usr/bin/env node

/**
 * Debug script to test Supabase connection and authentication
 * Run this with: node debug_auth.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkkbstwmzdbmlfsowwgt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra2JzdHdtemRibWxmc293d2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNzE2MzAsImV4cCI6MjA3NDk0NzYzMH0.CKoWTs7bCDymUteLM9BfG2ugl07N9fid1WV6mmabT-I';

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Check if we can connect
    console.log('📡 Testing basic connection...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else {
      console.log('✅ Session check successful:', session?.user?.id || 'No user logged in');
    }
    
    // Test 2: Check if profiles table is accessible
    console.log('📊 Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError);
    } else {
      console.log('✅ Profiles table accessible');
    }
    
    // Test 3: Check if user_roles table is accessible
    console.log('👥 Testing user_roles table access...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);
    
    if (rolesError) {
      console.log('⚠️  User roles table not accessible (this is normal if not set up yet):', rolesError.message);
    } else {
      console.log('✅ User roles table accessible');
    }
    
    // Test 4: Check network connectivity
    console.log('🌐 Testing network connectivity...');
    const response = await fetch('https://lkkbstwmzdbmlfsowwgt.supabase.co/rest/v1/', {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Network connectivity to Supabase is working');
    } else {
      console.error('❌ Network connectivity issue:', response.status, response.statusText);
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('- Supabase URL:', supabaseUrl);
    console.log('- Connection test:', sessionError ? 'FAILED' : 'PASSED');
    console.log('- Profiles table:', profilesError ? 'FAILED' : 'PASSED');
    console.log('- Network test:', response.ok ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testSupabaseConnection();







