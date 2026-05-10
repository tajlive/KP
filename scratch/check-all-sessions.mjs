
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllSessions() {
  const { data: sessions, error } = await supabase
    .from('trading_sessions')
    .select('id, user_id, name, status, mode, created_at')
    .eq('status', 'active')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent active sessions:');
  sessions.forEach(s => console.log(`- User: ${s.user_id}, Name: ${s.name}, Mode: ${s.mode}, ID: ${s.id}`));
}

checkAllSessions();
