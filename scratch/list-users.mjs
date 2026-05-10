
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent profiles:');
  profiles.forEach(p => console.log(`- ${p.full_name} (${p.email}) ID: ${p.id}`));
}

listUsers();
