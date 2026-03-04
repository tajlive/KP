import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Basic env parser for .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error(".env.local not found in current directory");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");
const env: any = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'"))
      value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runRaceConditionTest() {
  const sessionId = "77777777-7777-7777-7777-777777777777";
  const userId = "2415156e-4877-4e63-992a-4b327b670cc9";

  console.log("🚀 Setting up race condition test...");

  // Cleanup
  await supabase.from("positions").delete().eq("session_id", sessionId);

  // 1. Reset capital to exactly 1000
  const { data: upsertData, error: upsertError } = await supabase
    .from("trading_sessions")
    .upsert({
      id: sessionId,
      user_id: userId,
      current_capital_nok: 1000,
      starting_capital_nok: 1000,
      status: "active",
      mode: "paper",
    })
    .select()
    .single();

  if (upsertError) {
    console.error("❌ Upsert failed:", upsertError);
    return;
  }
  console.log("💰 Session ready:", upsertData);

  // Wait a bit
  await new Promise((r) => setTimeout(r, 1000));

  console.log("💰 Initial balance:", upsertData.current_capital_nok, "NOK");
  console.log("⚡ Sending 3 concurrent requests to decrement 500 NOK each...");

  const promises = [
    supabase.rpc("decrement_capital", {
      p_session_id: sessionId,
      p_amount: 500,
      p_user_id: userId,
    }),
    supabase.rpc("decrement_capital", {
      p_session_id: sessionId,
      p_amount: 500,
      p_user_id: userId,
    }),
    supabase.rpc("decrement_capital", {
      p_session_id: sessionId,
      p_amount: 500,
      p_user_id: userId,
    }),
  ];

  const results = await Promise.allSettled(promises);

  let successCount = 0;
  let failCount = 0;

  results.forEach((res, i) => {
    if (res.status === "fulfilled" && !res.value.error) {
      console.log(`✅ Req ${i + 1}: Success`);
      successCount++;
    } else {
      const error = (res as any).value?.error || (res as any).reason;
      console.log(
        `❌ Req ${i + 1}: Failed as expected - ${JSON.stringify(error)}`,
      );
      failCount++;
    }
  });

  const { data: finalSession } = await supabase
    .from("trading_sessions")
    .select("current_capital_nok")
    .eq("id", sessionId)
    .single();

  console.log(`\n📊 Final Balance: ${finalSession?.current_capital_nok} NOK`);
  console.log(`📈 Success: ${successCount}, Fail: ${failCount}`);

  if (successCount === 2 && finalSession?.current_capital_nok === 0) {
    console.log(
      "\n✨ TEST PASSED: Atomic protection successfully prevented double-spend!",
    );
  } else {
    console.log(
      "\n🚨 TEST FAILED: Race condition detected or unexpected result.",
    );
  }
}

runRaceConditionTest().catch(console.error);
