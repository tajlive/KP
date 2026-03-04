const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Check if we can just create the view if it doesn't exist
  // We can also insert into trades to populate it naturally
  console.log("Emptying and seeding the database...");
  
  const bots = [
    { id: 'b0700000-0000-0000-0000-000000000001', email: 'algo1@klarpakke.no', display_name: 'Klarpakke DCA Algo', tier: 'professor', role: 'admin' },
    { id: 'b0700000-0000-0000-0000-000000000002', email: 'algo2@klarpakke.no', display_name: 'Nordic Trend Following', tier: 'phd', role: 'admin' },
    { id: 'b0700000-0000-0000-0000-000000000003', email: 'algo3@klarpakke.no', display_name: 'Volatility Harvester', tier: 'phd', role: 'admin' }
  ];

  for (const bot of bots) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: bot.id,
      email: bot.email,
      display_name: bot.display_name,
      tier: bot.tier,
      role: bot.role,
      status: 'active' // Adding back status just in case it's in the DB now
    }).select();
    console.log("Profile", bot.display_name, profileError ? profileError.message : "Success");
  }
}
run();
