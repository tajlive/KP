/**
 * Supabase Connection Test
 * Tester at Supabase-tilkoblingen fungerer
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseKey) console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log(`URL: ${supabaseUrl.substring(0, 30)}...`)
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      process.exit(1)
    }
    
    console.log('✅ Supabase connection OK')
    console.log('   Data received:', data ? 'Yes' : 'No')
    process.exit(0)
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

testConnection()
