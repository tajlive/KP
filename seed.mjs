import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding leaderboard explicitly...');
  
  // Create test results in leaderboard view if possible, else create a dedicated table
  const { error: createError } = await supabase.rpc('create_mock_leaderboard', {});
  console.log("Mock leaderboard creation attempt:", createError ? createError.message : 'Success');
  
  const bots = [
    { user_id: 'b0700000-0000-0000-0000-000000000001', username: 'Klarpakke DCA Algo', tier: 'professor', total_trades: 1420, win_rate: 0.783, total_pnl: 184320, roi_percent: 184.3 },
    { user_id: 'b0700000-0000-0000-0000-000000000002', username: 'Nordic Trend Following', tier: 'phd', total_trades: 856, win_rate: 0.712, total_pnl: 122450, roi_percent: 122.4 },
    { user_id: 'b0700000-0000-0000-0000-000000000003', username: 'Volatility Harvester', tier: 'phd', total_trades: 2104, win_rate: 0.820, total_pnl: 98700, roi_percent: 98.7 }
  ];

  // We can just bypass and insert into the materialized view directly for testing if it's a regular table masquerading as a view.
  const { data, error } = await supabase.from('leaderboard').insert(bots).select();
  console.log("Direct insert:", error ? error.message : "Success");
}

seed();
