
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const userId = '6408d389-2021-4a2f-92b6-bebf0459a398';
  
  const { data, error } = await supabase
    .from('kyc_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`User Info for ${userId}:`, data.full_name);
}

checkUser();
