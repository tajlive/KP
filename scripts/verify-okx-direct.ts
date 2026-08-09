import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { decryptApiKey } from "../src/lib/crypto/encrypt-api-keys";
import { OkxClient } from "../src/lib/exchanges/okx/client";

async function main() {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await sb.from("user_okx_keys")
    .select("api_key_encrypted, api_secret_encrypted, passphrase_encrypted")
    .eq("user_id", "0dd08529-b8a8-4fd3-9806-275e2d0135dd").eq("is_active", true).maybeSingle();

  const client = new OkxClient({
    apiKey: await decryptApiKey(data!.api_key_encrypted),
    apiSecret: await decryptApiKey(data!.api_secret_encrypted),
    passphrase: await decryptApiKey(data!.passphrase_encrypted),
  });

  try {
    const bal = await client.getBalance();
    console.log("RAW_BALANCE:", JSON.stringify(bal));
  } catch (e) {
    console.log("BALANCE_ERROR:", (e as Error).message);
  }

  try {
    const tick = await client.getTicker("SOL-USDT");
    console.log("SOL_TICKER:", JSON.stringify(tick));
  } catch (e) {
    console.log("TICKER_ERROR:", (e as Error).message);
  }
}
main();
