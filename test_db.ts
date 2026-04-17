import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function main() {
  const { data, error } = await supabase.from('ai_decision_log').select('created_at').order('created_at', { ascending: false }).limit(1);
  console.log(data, error);
}
main();
