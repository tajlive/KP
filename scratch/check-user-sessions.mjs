
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSessions() {
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .ilike('full_name', '%Tom%');

  if (userError || !userData || userData.length === 0) {
    console.error('User not found by name: Tom');
    return;
  }

  const user = userData[0];
  console.log(`Found user: ${user.full_name} (${user.id}) [${user.email}]`);
  const userId = user.id;

  const { data: sessions, error: sessionsError } = await supabase
    .from('trading_sessions')
    .select('id, name, status, mode, created_at')
    .eq('user_id', userData.id)
    .eq('status', 'active')
    .is('archived', false);

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError);
    return;
  }

  console.log(`Active sessions for ${email}: ${sessions.length}`);
  sessions.forEach(s => {
    console.log(`- [${s.mode}] ${s.name} (ID: ${s.id}, Created: ${s.created_at})`);
  });
}

checkSessions();
