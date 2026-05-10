
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function countSessionsPerUser() {
  const { data: sessions, error } = await supabase
    .from('trading_sessions')
    .select('user_id, status')
    .eq('status', 'active');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  sessions.forEach(s => {
    counts[s.user_id] = (counts[s.user_id] || 0) + 1;
  });

  console.log('Active sessions per user:');
  for (const [userId, count] of Object.entries(counts)) {
    console.log(`- User ${userId}: ${count} active sessions`);
  }
}

countSessionsPerUser();
